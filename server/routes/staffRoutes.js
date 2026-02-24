const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto'); // REQUIRED: For secure token generation
const Staff = require('../models/Staff');
const User = require('../models/User'); // REQUIRED: To create a login account
const Attendance = require('../models/Attendance');
const Chat = require('../models/Chat');
const { protect } = require('../middleware/authMiddleware');
const sendEmail = require('../utils/sendEmail'); // REQUIRED: To send the activation link

const router = express.Router();

// Helper to check if the user is the owner
// FIX: Changed helper function name and logic to use PascalCase 'owner'
// to match the convention established in authRoutes.js and StaffSchema.
const isowner = (userRole) => userRole === 'owner';

// ====================================================================
// @route   GET /api/staff
// @desc    Get all staff members for the current shop
// @access  Private (owner/Manager level access)
// ====================================================================
router.get('/', protect, async (req, res) => {
    // FIX: Changed role checks to use PascalCase 'owner' and 'Manager'
    if (!isowner(req.user.role) && req.user.role !== 'Manager') {
        return res.status(403).json({ error: 'Access denied. Requires owner or Manager role.' });
    }

    try {
        // Find all staff belonging to the user's stores
        if (!req.user.storeId) {
            return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
        }
        const staffList = await Staff.find({ storeId: req.user.storeId })
            .select('name email role phone active storeId userId')
            .populate('userId', 'resetPasswordToken')
            .lean()
            .sort({ role: -1, name: 1 });
        
        // Add passwordSetupStatus to each staff member
        const enrichedStaffList = staffList.map(staff => ({
            ...staff,
            passwordSetupStatus: staff.userId?.resetPasswordToken ? 'pending' : 'completed'
        }));
        
        res.json(enrichedStaffList);
    } catch (error) {
        console.error('Staff GET all error:', error.message);
        res.status(500).json({ error: 'Failed to fetch staff list.' });
    }
});

// ====================================================================
// @route   POST /api/staff
// @desc    Add a new staff member (Creates User + Staff record and sends activation email)
// @access  Private (owner-only access for security)
// ====================================================================
router.post('/', protect, async (req, res) => {
    if (!isowner(req.user.role)) {
        return res.status(403).json({ error: 'Access denied. Only the owner can add new staff.' });
    }
    
    const { name, email, role, phone } = req.body;

    if (!name || !email || !role) {
        return res.status(400).json({ error: 'Please provide name, email, and role.' });
    }
    
    if (role === 'owner') {
        return res.status(400).json({ error: 'Cannot create an owner account through this route.' });
    }
    
    if (role !== 'Manager' && role !== 'Cashier') {
        return res.status(400).json({ error: 'Invalid role specified. Must be Manager or Cashier.' });
    }

    try {
        // --- 0. PLAN LIMIT VALIDATION ---
        if (!req.user.storeId) {
            return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
        }
        const storeIdObj = new mongoose.Types.ObjectId(req.user.storeId);
        const owner = await User.findById(req.user.id);
        const currentStaffCount = await Staff.countDocuments({ storeId: storeIdObj });

        const plan = owner.plan || 'BASIC'; // Fallback to BASIC if null

        if (plan === 'BASIC') {
            // Basic: 1 Owner + 2 Staff total
            if (currentStaffCount >= 2) {
                return res.status(403).json({ 
                    error: 'Plan Limit Reached: The BASIC plan allows up to 2 staff members. Please upgrade to PRO for unlimited staff.' 
                });
            }
        }
        // PRO and PREMIUM plans allow unlimited staff; no further check needed.

        // --- 1. Email uniqueness per shop: only block if this email is already staff in THIS shop ---
        const normalizedEmail = String(email || '').trim().toLowerCase();
        if (!normalizedEmail || !normalizedEmail.includes('@')) {
            return res.status(400).json({ error: 'Please provide a valid email address.' });
        }
        // Use exact same storeId as GET /api/staff (req.user.storeId) so we only see staff for this shop
        const storeIdForStaff = req.user.storeId;
        const existingActiveStaffInThisShop = await Staff.findOne({
            storeId: storeIdForStaff,
            email: normalizedEmail,
            active: true,
        });
        if (existingActiveStaffInThisShop) {
            return res.status(409).json({
                error: `The email ${normalizedEmail} is already added in your shop. Please use a different email.`
            });
        }

        // If same email exists in this shop but inactive, reactivate and update instead of creating duplicate
        const existingInactiveStaffInThisShop = await Staff.findOne({
            storeId: storeIdForStaff,
            email: normalizedEmail,
            active: false,
        });
        if (existingInactiveStaffInThisShop) {
            const linkedUser = await User.findById(existingInactiveStaffInThisShop.userId);
            if (linkedUser) {
                await User.findByIdAndUpdate(linkedUser._id, { isActive: true });
            }
            const updated = await Staff.findByIdAndUpdate(
                existingInactiveStaffInThisShop._id,
                { active: true, name, role },
                { new: true }
            );
            try {
                await sendEmail({
                    to: normalizedEmail,
                    subject: 'Reactivated – Pocket POS',
                    html: `<p>Your staff account has been reactivated. You can log in with your existing password.</p>`,
                });
            } catch (_) { /* non-fatal */ }
            return res.status(201).json({
                message: `Staff member ${updated.name} reactivated successfully.`,
                staff: updated,
            });
        }

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            if (existingUser._id.toString() === req.user.id.toString()) {
                return res.status(400).json({ error: 'You cannot add yourself as staff. Use a different email.' });
            }
            // User exists (e.g. staff at another shop): add them as staff in this shop only, no new User
            const newStaff = await Staff.create({
                storeId: storeIdForStaff,
                userId: existingUser._id,
                name,
                email: normalizedEmail,
                role,
                active: false,
            });
            try {
                await sendEmail({
                    to: normalizedEmail,
                    subject: 'Added to a new shop – Pocket POS',
                    html: `<h1>You've been added to another shop</h1><p>You were added as <strong>${role}</strong>. Log in with your existing Pocket POS password.</p>`,
                });
            } catch (_) { /* non-fatal */ }
            return res.status(201).json({
                message: `Staff member ${newStaff.name} added. They can log in with their existing account.`,
                staff: newStaff,
            });
        }

        // --- 2. Create the User Login Record (new email) ---
        // Get the owner's ID (req.user.id is the owner who is creating the staff)
        const ownerId = req.user.id;
        
        const newUser = await User.create({
            email: normalizedEmail,
            phone: phone || null,
            role,
            shopName: `staff-temp-${storeIdObj}-${normalizedEmail}`,
            isActive: true,
            activeStoreId: storeIdObj,
            shopId: ownerId // Set shopId to owner's ID for token generation and owner lookup
        });

        // --- 3. Create the Staff record ---
        const newStaff = await Staff.create({
            storeId: storeIdForStaff,
            userId: newUser._id,
            name,
            email: normalizedEmail,
            role,
            active: false // Staff starts as inactive until they set their password
        });
        
        // --- 4. Generate Activation Token ---
        const activationToken = crypto.randomBytes(32).toString('hex');
        const activationTokenHash = crypto
            .createHash('sha256')
            .update(activationToken)
            .digest('hex');

        newUser.resetPasswordToken = activationTokenHash;
        newUser.resetPasswordExpire = Date.now() + 24 * 60 * 60 * 1000; 
        await newUser.save({ validateBeforeSave: false }); 
        
        // --- 5. Email Sending ---
        const activationUrl = `${process.env.CLIENT_URL}/staff-setup/${activationToken}`;
        const message = `
            <h1>Welcome to Pocket POS, ${name}!</h1>
            <p>Your shop owner has added you as a <strong>${role}</strong>.</p>
            <p>Click below to set your password and activate your account:</p>
            <a href="${activationUrl}" style="display: inline-block; padding: 12px 25px; color: #ffffff; background-color: #4f46e5; border-radius: 8px; text-decoration: none; font-weight: bold;">Set Up My Password</a>
        `;

        try {
            await sendEmail({
                to: newUser.email,
                subject: 'Pocket POS Account Activation',
                html: message,
            });

            res.status(201).json({ 
                message: `Staff member ${newStaff.name} added. Activation email sent.`, 
                staff: newStaff 
            });

        } catch (mailError) {
            await User.deleteOne({ _id: newUser._id });
            await Staff.deleteOne({ _id: newStaff._id });
            return res.status(500).json({ error: 'Failed to send activation email. Rolling back.' });
        }

    } catch (error) {
        console.error('Staff POST error:', error.message, error);
        if (error.code === 11000) {
            return res.status(409).json({
                error: 'The email is already added in your shop. Please use a different email.'
            });
        }
        res.status(500).json({ error: 'Internal Server Error.' });
    }
});

// ====================================================================
// @route   PUT /api/staff/:id/toggle
// @desc    Toggle a staff member's active status
// @access  Private (owner-only access)
// ====================================================================
router.put('/:id/toggle', protect, async (req, res) => {
    // FIX: Use the corrected helper function 'isowner'
    if (!isowner(req.user.role)) {
        return res.status(403).json({ error: 'Access denied. Only the owner can update staff status.' });
    }
    
    const staffId = req.params.id;

    try {
        if (!req.user.storeId) {
            return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
        }
        const staffMember = await Staff.findOne({ _id: staffId, storeId: req.user.storeId });
        
        if (!staffMember) {
            return res.status(404).json({ error: 'Staff member not found or unauthorized.' });
        }
        
        // FIX: Use the corrected helper function 'isowner'
        if (isowner(staffMember.role)) {
            return res.status(400).json({ error: 'Cannot deactivate the primary owner account.' });
        }

        const newStatus = !staffMember.active;
        
        // 1. Update the Staff model status
        const updatedStaff = await Staff.findByIdAndUpdate(
            staffId, 
            { active: newStatus }, 
            { new: true, runValidators: true }
        );
        
        // 2. CRITICAL: Update the linked User model status (to block/allow login)
        await User.findByIdAndUpdate(
            updatedStaff.userId, 
            { isActive: newStatus }, // Assuming your User model has an 'isActive' field
            { new: true, runValidators: true }
        );


        res.json({ 
            message: `${updatedStaff.name} status set to ${newStatus ? 'ACTIVE' : 'INACTIVE'}.`, 
            staff: updatedStaff 
        });
        
    } catch (error) {
        console.error('Staff toggle error:', error.message);
        res.status(500).json({ error: 'Failed to update staff status.' });
    }
});


// ====================================================================
// @route   DELETE /api/staff/:id
// @desc    Remove a staff member (Requires cleanup in User model)
// @access  Private (owner-only access)
// ====================================================================
router.delete('/:id', protect, async (req, res) => {
    // FIX: Use the corrected helper function 'isowner'
    if (!isowner(req.user.role)) {
        return res.status(403).json({ error: 'Access denied. Only the owner can remove staff.' });
    }
    
    const staffId = req.params.id;

    try {
        if (!req.user.storeId) {
            return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
        }
        const staffMember = await Staff.findOne({ _id: staffId, storeId: req.user.storeId });
        
        if (!staffMember) {
            return res.status(404).json({ error: 'Staff member not found or unauthorized.' });
        }
        
        // FIX: Use the corrected helper function 'isowner'
        if (isowner(staffMember.role)) {
            return res.status(400).json({ error: 'Cannot remove the primary owner account.' });
        }

        const userId = staffMember.userId;

        // 1. Delete all attendance records for this staff
        await Attendance.deleteMany({ staffId });

        // 2. Remove this user from all chat participants (so chats don't reference deleted user)
        if (userId) {
            await Chat.updateMany(
                { participants: userId },
                { $pull: { participants: userId } }
            );
        }

        // 3. Delete the linked User record (staff cannot log in again)
        if (userId) {
            await User.findByIdAndDelete(userId);
        }

        // 4. Delete the Staff entry
        await Staff.findByIdAndDelete(staffId);

        res.json({ message: `${staffMember.name} permanently removed. All data deleted; they cannot log in again.` });

    } catch (error) {
        console.error('Staff DELETE error:', error.message);
        res.status(500).json({ error: 'Failed to remove staff member.' });
    }
});

router.put('/:id/role', protect, async (req, res) => {
    if (!isowner(req.user.role)) {
        return res.status(403).json({ error: 'Access denied. Only the owner can change roles.' });
    }

    const { role: newRole } = req.body;
    const staffId = req.params.id;

    // 1. Validation
    if (!newRole || (newRole !== 'Manager' && newRole !== 'Cashier')) {
        return res.status(400).json({ error: 'Invalid role. Must be Manager or Cashier.' });
    }

    try {
        // 2. Find the staff member
        if (!req.user.storeId) {
            return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
        }
        const staffMember = await Staff.findOne({ _id: staffId, storeId: req.user.storeId });
        if (!staffMember) {
            return res.status(404).json({ error: 'Staff member not found.' });
        }

        // 3. Skip check if the role isn't actually changing
        if (staffMember.role === newRole) {
            return res.json({ message: 'Role updated (no change).', staff: staffMember });
        }

        // 4. PLAN LIMIT: Only BASIC has staff limits. PRO and PREMIUM allow unlimited staff and any role mix.

        // 5. Update both Staff and User records
        const updatedStaff = await Staff.findByIdAndUpdate(
            staffId,
            { role: newRole },
            { new: true, runValidators: true }
        );

        if (updatedStaff.userId) {
            await User.findByIdAndUpdate(updatedStaff.userId, { role: newRole });
        }

        res.json({ 
            message: `Role for ${updatedStaff.name} updated to ${newRole}.`, 
            staff: updatedStaff 
        });

    } catch (error) {
        console.error('Staff role update error:', error.message);
        res.status(500).json({ error: 'Failed to update staff role.' });
    }
});


module.exports = router;