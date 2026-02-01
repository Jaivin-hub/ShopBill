const express = require('express');
const crypto = require('crypto'); // REQUIRED: For secure token generation
const Staff = require('../models/Staff'); 
const User = require('../models/User'); // REQUIRED: To create a login account
const Chat = require('../models/Chat'); // REQUIRED: To add staff to outlet groups
const Store = require('../models/Store'); // REQUIRED: To get outlet name for group lookup
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
        // Fetch owner details to get the latest plan info
        if (!req.user.storeId) {
            return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
        }
        const owner = await User.findById(req.user.id);
        const currentStaffCount = await Staff.countDocuments({ storeId: req.user.storeId });

        const plan = owner.plan || 'BASIC'; // Fallback to BASIC if null

        if (plan === 'BASIC') {
            // Basic: 1 Owner + 1 Staff total
            if (currentStaffCount >= 1) {
                return res.status(403).json({ 
                    error: 'Plan Limit Reached: The BASIC plan allows only 1 staff member. Please upgrade to PRO for more seats.' 
                });
            }
        } else if (plan === 'PRO') {
            // Pro: 1 Owner + 1 Manager + 1 Cashier (Total 2 staff)
            if (currentStaffCount >= 2) {
                return res.status(403).json({ 
                    error: 'Plan Limit Reached: The PRO plan allows 2 staff members (1 Manager & 1 Cashier). Upgrade to PREMIUM for unlimited staff.' 
                });
            }
            
            // Optional: Strict check if you want exactly one of each for PRO
            const existingRoleCount = await Staff.countDocuments({ storeId: req.user.storeId, role: role });
            if (existingRoleCount >= 1) {
                return res.status(403).json({ 
                    error: `Plan Limit Reached: The PRO plan allows only one ${role}.` 
                });
            }
        } 
        // PREMIUM plan allows unlimited, so no check needed here.

        // --- 1. Check for Existing Staff/User ---
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ 
                error: `The email ${email} is already registered. Please use a different email.` 
            });
        }
        
        // --- 2. Create the User Login Record ---
        // Get the owner's ID (req.user.id is the owner who is creating the staff)
        const ownerId = req.user.id;
        
        const newUser = await User.create({
            email,
            phone: phone || null,
            role, 
            shopName: `staff-temp-${req.user.storeId}-${email}`,
            isActive: true,
            activeStoreId: req.user.storeId,
            shopId: ownerId // Set shopId to owner's ID for token generation and owner lookup
        });

        // --- 3. Create the Staff record ---
        const newStaff = await Staff.create({
            storeId: req.user.storeId,
            userId: newUser._id,
            name,
            email,
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

        // --- 4.5. Add staff to outlet's default group ---
        try {
            if (req.user.storeId) {
                const store = await Store.findById(req.user.storeId);
                if (store) {
                    const storeGroupName = `${store.name} Group`;
                    const outletGroup = await Chat.findOne({
                        name: storeGroupName,
                        type: 'group',
                        createdBy: ownerId,
                        isDefault: true,
                        outletId: req.user.storeId
                    });

                    if (outletGroup) {
                        // Add the new staff member to the outlet group if not already a participant
                        if (!outletGroup.participants.includes(newUser._id)) {
                            outletGroup.participants.push(newUser._id);
                            await outletGroup.save();
                        }
                    }
                }
            }
        } catch (groupError) {
            // Log error but don't fail staff creation if group update fails
            console.error('Error adding staff to outlet group:', groupError);
        }
        
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
        console.error('Staff POST error:', error.message);
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

        // CRITICAL: Delete the linked User record first
        if (staffMember.userId) {
            await User.findByIdAndDelete(staffMember.userId);
        }

        // Delete the Staff entry
        await Staff.findByIdAndDelete(staffId);

        res.json({ message: `${staffMember.name} successfully removed.` });

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

        // 4. PLAN LIMIT VALIDATION (Logic similar to POST route)
        const owner = await User.findById(req.user.id);
        const plan = owner.plan || 'BASIC';

        if (plan === 'PRO') {
            // Check if they already have a staff member with this specific role
            const roleCount = await Staff.countDocuments({ 
                storeId: req.user.storeId, 
                role: newRole 
            });

            if (roleCount >= 1) {
                return res.status(403).json({ 
                    error: `Plan Limit: Your PRO plan only allows one ${newRole}. Upgrade to PREMIUM for more.` 
                });
            }
        }
        // BASIC plan allows 1 staff of any role, so changing the role of the existing 
        // 1 staff member doesn't break the count limit. 
        // PREMIUM is unlimited.

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