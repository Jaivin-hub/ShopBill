const express = require('express');
const crypto = require('crypto'); // REQUIRED: For secure token generation
const Staff = require('../models/Staff'); 
const User = require('../models/User'); // REQUIRED: To create a login account
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
        // Find all staff belonging to the user's shop
        const staffList = await Staff.find({ shopId: req.user.shopId }).sort({ role: -1, name: 1 });
        res.json(staffList);
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
    // FIX: Use the corrected helper function 'isowner'
    if (!isowner(req.user.role)) {
        return res.status(403).json({ error: 'Access denied. Only the owner can add new staff.' });
    }
    
    const { name, email, role, phone } = req.body; // Added phone for completeness

    if (!name || !email || !role) {
        return res.status(400).json({ error: 'Please provide name, email, and role.' });
    }
    
    // FIX: Check for PascalCase 'owner' role escalation
    if (role === 'owner') {
        return res.status(400).json({ error: 'Cannot create an owner account through this route.' });
    }
    
    // Ensure the role is valid (Manager or Cashier - assuming PascalCase)
    if (role !== 'Manager' && role !== 'Cashier') {
        return res.status(400).json({ error: 'Invalid role specified. Must be Manager or Cashier.' });
    }

    let newUser = null;
    let newStaff = null;
    
    try {
        // --- 1. Check for Existing Staff/User ---
        // Check if a User account already exists with this email (prevents staff using existing owner email)
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser.shopId.toString() === req.user.shopId.toString()) {
            return res.status(409).json({ error: 'A user account with this email already exists in your shop.' });
        }
        
        // --- 2. Create the User Login Record (No Password) ---
        // This is the CRITICAL step for staff login capability
        newUser = await User.create({
            email,
            phone: phone || null,
            shopId: req.user.shopId,
            role, // Manager or Cashier
            // password is not set here, it will be set by the activation link
        });

        // --- 3. Create the Staff/Permission Record ---
        newStaff = await Staff.create({
            shopId: req.user.shopId,
            userId: newUser._id, // Link to the new User login account
            name,
            email,
            role,
            active: true 
        });

        // --- 4. Generate Activation Token ---
        const activationToken = crypto.randomBytes(32).toString('hex');
        const activationTokenHash = crypto
            .createHash('sha256')
            .update(activationToken)
            .digest('hex');

        // Store the hashed token and expiration time (24 hours) on the User model
        newUser.resetPasswordToken = activationTokenHash;
        newUser.resetPasswordExpire = Date.now() + 24 * 60 * 60 * 1000; 
        await newUser.save({ validateBeforeSave: false }); 
        
        // --- 5. Construct the Activation URL and Email Content ---
        const activationUrl = `${process.env.CLIENT_URL}/staff-setup/${activationToken}`;

        const message = `
            <h1>Welcome to Pocket POS, ${name}!</h1>
            <p>Your shop owner has added you as a **${role}** staff member.</p>
            <p>Please click on the link below to set your secure login password and activate your account:</p>
            <a href=${activationUrl} clicktracking=off style="display: inline-block; padding: 12px 25px; color: #ffffff; background-color: #4f46e5; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Set Up My Password</a>
            <p style="margin-top: 20px;">The link is valid for 24 hours.</p>
        `;

        try {
            await sendEmail({
                to: newUser.email,
                subject: 'Pocket POS Account Activation & Password Setup',
                html: message,
            });

            res.status(201).json({ 
                message: `Staff member ${newStaff.name} added. Activation email sent to ${newStaff.email}.`, 
                staff: newStaff,
                devActivationToken: process.env.NODE_ENV === 'development' ? activationToken : undefined
            });

        } catch (mailError) {
            console.error('Staff activation email failed:', mailError);
            
            // ROLLBACK: Delete the created User and Staff records if email fails
            if (newUser) await User.deleteOne({ _id: newUser._id });
            if (newStaff) await Staff.deleteOne({ _id: newStaff._id });

            return res.status(500).json({ error: 'Staff creation failed. Could not send the activation email.' });
        }

    } catch (error) {
        console.error('Staff POST error:', error.message);
        // If the error occurred before User/Staff creation, it's safe to return 500
        res.status(500).json({ error: error.message || 'Failed to add new staff member.' });
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
        const staffMember = await Staff.findOne({ _id: staffId, shopId: req.user.shopId });
        
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
        const staffMember = await Staff.findOne({ _id: staffId, shopId: req.user.shopId });
        
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


module.exports = router;