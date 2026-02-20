const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Store = require('../models/Store');
const Staff = require('../models/Staff');
const Chat = require('../models/Chat');
const { protect } = require('../middleware/authMiddleware');
const sendEmail = require('../utils/sendEmail');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Function from server.js
const generateToken = (id, shopId, role) => {
    return jwt.sign({ id, shopId, role }, JWT_SECRET, {
        expiresIn: '30d',
    });
};

// --- Existing Routes ---

/**
 * @route POST /api/auth/login
 * @desc Authenticate user by email OR phone and password.
 * @access Public
 */
router.post('/login', async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ error: 'Email/Phone and password are required.' });
    }

    try {
        let searchIdentifiers = [];
        const isEmail = identifier.includes('@');

        if (isEmail) {
            searchIdentifiers.push(identifier.toLowerCase());
        } else {
            const cleanedIdentifier = identifier.replace(/[\s\-\(\)]/g, '');
            searchIdentifiers.push(cleanedIdentifier);
            const defaultCountryCode = process.env.DEFAULT_COUNTRY_CODE || '+91';
            if (!cleanedIdentifier.startsWith('+')) {
                searchIdentifiers.push(defaultCountryCode + cleanedIdentifier);
            }
        }

        const orQuery = searchIdentifiers.flatMap(id => [
            { email: id },
            { phone: id }
        ]);

        const user = await User.findOne({ $or: orQuery });

        if (user && (await user.matchPassword(password))) {

            // 1. Basic Active Check - Block login if account is deactivated
            // Only block if explicitly set to false (default is true, so null/undefined should allow login)
            if (user.isActive === false) {
                return res.status(401).json({ error: 'Account is inactive. Please contact your shop owner.' });
            }

            // --- SUBSCRIPTION VALIDATION ---
            // Declare ownerAccount in outer scope so it's available for token generation
            let ownerAccount = user; // Default to user (for owners)
            
            if (user.role !== 'superadmin') {
                if (user.role !== 'owner') {
                    // For staff members (Manager/Cashier), find the owner through the Store
                    if (user.activeStoreId) {
                        const store = await Store.findById(user.activeStoreId);
                        if (store && store.ownerId) {
                            ownerAccount = await User.findById(store.ownerId);
                        }
                    }
                    // Fallback: if no store found, try to find owner by shopId (for backward compatibility)
                    if (!ownerAccount && user.shopId) {
                        ownerAccount = await User.findById(user.shopId);
                    }
                }

                if (!ownerAccount) {
                    return res.status(404).json({ error: 'Shop owner account not found.' });
                }

                /**
                 * ⭐ UPDATED LOGIC:
                 * We ONLY block if the status is 'halted', 'cancelled', or 'expired'.
                 * Statuses like 'active', 'authenticated', 'created', or 'pending' 
                 * should ALWAYS be allowed, regardless of the 'planEndDate'.
                 */
                const blockedStatuses = ['halted', 'cancelled', 'expired'];
                const currentStatus = ownerAccount.subscriptionStatus;

                if (blockedStatuses.includes(currentStatus)) {
                    return res.status(403).json({
                        error: 'Access Restricted',
                        message: currentStatus === 'halted' 
                            ? 'Your subscription is halted due to a payment failure. Please settle the dues.' 
                            : 'Your subscription has expired or was cancelled.',
                        status: currentStatus,
                        planEndDate: ownerAccount.planEndDate
                    });
                }
            }
            // --- END SUBSCRIPTION VALIDATION ---

            // For token generation, use owner's ID as shopId for staff members
            let tokenShopId = user.shopId;
            if (user.role !== 'owner' && user.role !== 'superadmin') {
                // For staff, use owner's ID as shopId
                if (ownerAccount && ownerAccount._id) {
                    tokenShopId = ownerAccount._id;
                } else if (user.activeStoreId) {
                    // Fallback: get owner from store
                    const store = await Store.findById(user.activeStoreId);
                    if (store && store.ownerId) {
                        tokenShopId = store.ownerId;
                    }
                }
            }

            // Get effective plan (owner's plan for staff, user's plan for owners)
            let effectivePlan = user.plan;
            if (user.role !== 'owner' && user.role !== 'superadmin' && ownerAccount) {
                effectivePlan = ownerAccount.plan;
            }

            const token = generateToken(user._id, tokenShopId || user._id, user.role);
            res.json({
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    role: user.role,
                    shopId: tokenShopId || user._id,
                    phone: user.phone,
                    plan: effectivePlan // Return effective plan (owner's plan for staff)
                }
            });
        } else {
            res.status(401).json({ error: 'Invalid email/phone or password.' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

/**
 * @route POST /api/auth/signup
 * @desc Register a New owner/Shop after successful payment verification.
 * @access Public
 */
router.post('/signup', async (req, res) => {
    // UPDATED: Destructure shopName, plan, and transactionId
    const { email, password, phone, plan, transactionId, shopName } = req.body;

    // REQUIREMENT: Must have a verified transaction ID, plan, and shopName to sign up as an owner
    if (!email || !password || !plan || !transactionId || !shopName) {
        return res.status(400).json({ error: 'Email, password, shop name, plan, and transaction ID are required for owner signup.' });
    }

    try {
        // Check if user exists by email OR phone number
        const userExists = await User.findOne({ $or: [{ email }, { phone }] });
        if (userExists) {
            return res.status(400).json({ error: 'User already exists with this email or phone number.' });
        }

        // Also check if a shop with this name already exists
        const shopNameExists = await User.findOne({ shopName });
        if (shopNameExists) {
            return res.status(400).json({ error: 'A shop with this name is already registered. Please choose a different name.' });
        }

        // --- NEW: Calculate the initial plan end date (30 days from now for the trial) ---
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 30);
        // ----------------------------------------------------------------------------------

        const newUser = await User.create({
            email,
            password,
            phone: phone || null,
            role: 'owner',
            // Temporary shopId, will be replaced by _id immediately after creation
            shopId: new mongoose.Types.ObjectId(),
            plan: plan.toUpperCase(), // Save the plan (e.g., 'PREMIUM')
            transactionId: transactionId, // Save the subscription ID
            shopName: shopName,
            planEndDate: trialEndDate, // 🔥 INITIALIZE THE END DATE
            subscriptionStatus: 'authenticated',
        });

        // Set the shopId to the user's own ID as they are the first user/owner of this shop.
        newUser.shopId = newUser._id;
        await newUser.save();

        const token = generateToken(newUser._id, newUser.shopId, newUser.role);

        res.json({
            token,
            user: {
                id: newUser._id,
                email: newUser.email,
                role: newUser.role,
                shopId: newUser.shopId,
                phone: newUser.phone,
                plan: newUser.plan,
                shopName: newUser.shopName,
            }
        });

    } catch (error) {
        console.error('Signup Error:', error);
        // Mongoose validation errors will be caught here if they involve unique constraints
        if (error.code === 11000) { // Duplicate key error code
            return res.status(400).json({ error: 'A user or shop with this email/shop name already exists.' });
        }
        res.status(500).json({ error: 'Server error during signup.' });
    }
});

/**
 * @route   GET /api/profile
 * @desc    Get current user profile data (outlet-specific for business details)
 * @access  Private
 */
router.get('/profile', protect, async (req, res) => {
    try {
        // req.user is already populated by 'protect' middleware
        const user = await User.findById(req.user.id).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if we have an active outlet/store context
        const storeId = req.user.storeId || req.user.activeStoreId;
        let shopName = '';
        let taxId = '';
        let address = '';
        let currency = 'INR';
        let profileImageUrl = user.profileImageUrl;

        if (storeId && (user.role === 'owner' || user.role === 'superadmin')) {
            // Fetch outlet-specific business details
            const store = await Store.findOne({ _id: storeId, ownerId: user._id, isActive: true });
            if (store) {
                shopName = store.name || '';
                taxId = store.taxId || '';
                address = store.address || '';
                // Currency and timezone come from user (owner-level settings)
                currency = user.currency || 'INR';
            } else {
                // Fallback to user-level business details if store not found
                shopName = user.shopName || '';
                taxId = user.taxId || '';
                address = user.address || '';
                currency = user.currency || 'INR';
            }
        } else {
            // For staff or when no outlet context, use owner's or user's business details
            let businessDetails = user;
            if (user.role !== 'owner' && user.role !== 'superadmin' && user.shopId) {
                businessDetails = await User.findById(user.shopId).select('shopName taxId address currency profileImageUrl');
            }
            shopName = businessDetails.shopName || '';
            taxId = businessDetails.taxId || '';
            address = businessDetails.address || '';
            currency = businessDetails.currency || 'INR';
            profileImageUrl = businessDetails.profileImageUrl || user.profileImageUrl;
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                phone: user.phone,
                role: user.role,
                // Business Details (outlet-specific for owners, user-level for others)
                shopName: shopName,
                taxId: taxId,
                address: address,
                currency: currency,
                profileImageUrl: profileImageUrl,
                timezone: user.timezone,
                plan: user.plan,
                planEndDate: user.planEndDate
            }
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Server error fetching profile data.' });
    }
});

/**
 * @route   PUT /api/profile
 * @desc    Update user profile and business settings (outlet-specific for business details)
 * @access  Private
 */
router.put('/profile', protect, async (req, res) => {
    const {
        phone,
        shopName,
        taxId,
        address,
        profileImageUrl
    } = req.body;

    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 1. Update Personal Fields (Allowed for everyone)
        if (phone !== undefined) user.phone = phone;
        if (profileImageUrl) user.profileImageUrl = profileImageUrl;

        // 2. Update Business Fields
        const storeId = req.user.storeId || req.user.activeStoreId;
        
        if (storeId && (user.role === 'owner' || user.role === 'superadmin')) {
            // Update outlet-specific business details
            const store = await Store.findOne({ _id: storeId, ownerId: user._id, isActive: true });
            if (store) {
                if (shopName !== undefined) store.name = shopName;
                if (taxId !== undefined) store.taxId = taxId;
                if (address !== undefined) store.address = address;
                await store.save();
                
                // Return outlet-specific data
                return res.json({
                    success: true,
                    message: 'Profile updated successfully',
                    user: {
                        id: user._id,
                        email: user.email,
                        phone: user.phone,
                        shopName: store.name,
                        taxId: store.taxId,
                        address: store.address,
                        profileImageUrl: user.profileImageUrl,
                        role: user.role,
                        currency: user.currency,
                        timezone: user.timezone,
                    }
                });
            }
        }

        // Fallback: Update user-level business fields (for staff or when no outlet context)
        if (user.role === 'owner' || user.role === 'superadmin') {
            if (shopName !== undefined) user.shopName = shopName;
            if (taxId !== undefined) user.taxId = taxId;
            if (address !== undefined) user.address = address;
            // Currency and Timezone remain read-only for safety as per your UI
        }

        const updatedUser = await user.save();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: updatedUser._id,
                email: updatedUser.email,
                phone: updatedUser.phone,
                shopName: updatedUser.shopName,
                taxId: updatedUser.taxId,
                address: updatedUser.address,
                profileImageUrl: updatedUser.profileImageUrl,
                role: updatedUser.role,
                currency: updatedUser.currency,
                timezone: updatedUser.timezone,
            }
        });

    } catch (error) {
        console.error('Error updating profile:', error);

        // Handle MongoDB Unique Error for ShopName
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Shop name is already taken. Please choose another.' });
        }

        res.status(500).json({ error: 'Server error updating profile.' });
    }
});

// --- Forgot Password (Request Token) ---

/**
 * @route POST /api/auth/forgot-password
 * @desc Accepts an email, generates a token, stores hash, and sends reset email.
 * @access Public
 * * NOTE: This route typically still uses email to send the link.
 */
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    let user = null;

    if (!email) {
        return res.status(400).json({ error: 'Email is required to request a password reset.' });
    }

    try {
        user = await User.findOne({ email });

        if (!user) {
            // SECURITY BEST PRACTICE: Respond with a generic success message 
            return res.json({ message: 'Password reset link has been sent.' });
        }

        // 1. Generate a secure, unique, and non-hashed token for the email link
        const resetToken = crypto.randomBytes(32).toString('hex');

        // 2. Hash the token to store in the database (ensuring security)
        const resetTokenHash = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // 3. Set the hashed token and expiration time (e.g., 10 minutes)
        user.resetPasswordToken = resetTokenHash;
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

        await user.save({ validateBeforeSave: false });

        // 4. Construct the reset URL using the plaintext token
        const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

        const message = `
            <h1>Password Reset Request for Pocket POS</h1>
            <p>You requested a password reset. Please click on the link below to reset your password:</p>
            <a href=${resetUrl} clicktracking=off style="display: inline-block; padding: 10px 20px; color: #ffffff; background-color: #4f46e5; border-radius: 5px; text-decoration: none; font-weight: bold;">Reset Password</a>
            <p style="margin-top: 20px;">The link will expire in 10 minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
        `;

        try {
            // 5. Send the email using the utility function
            await sendEmail({
                to: user.email,
                subject: 'Pocket POS Password Reset Request',
                html: message,
            });

            // 6. Send generic success response
            res.json({
                message: 'Password reset link has been sent.',
                devResetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
            });

        } catch (mailError) {
            console.error('Email sending failed:', mailError);

            // If email fails, clear the token from the user
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });

            return res.status(500).json({ error: 'Password reset request failed. Could not send the email.' });
        }

    } catch (error) {
        console.error('Forgot Password Error (Database/Token):', error);
        res.status(500).json({ error: 'Server error during password reset request.' });
    }
});


// --- Existing Route: Reset Password (Final Step) ---

/**
 * @route PUT /api/auth/reset-password/:resetToken
 * @desc Accepts token and new password to reset the user's password.
 * @access Public
 */
router.put('/reset-password/:resetToken', async (req, res) => {
    const { resetToken } = req.params;
    const { newPassword } = req.body;

    // 1. Basic password validation
    if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    try {
        // 2. Hash the URL token to match the database stored hash (MUST be the same method)
        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // 3. Find user by hashed token and ensure token hasn't expired
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired password reset token. Please request a new one.' });
        }

        // 4. Update the password
        user.password = newPassword;

        // 5. Clear the reset fields to invalidate the token immediately
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        // 6. Success response
        res.json({ message: 'Password reset successfully. You can now log in with your new password.' });

    } catch (error) {
        console.error('Password Reset Error:', error);
        res.status(500).json({ error: 'Server error during password reset.' });
    }
});


// --- Existing Route: Staff Account Activation (Final Step) ---

/**
 * @route PUT /api/auth/activate/:activationToken
 * @desc Accepts activation token and new password to set the user's initial password.
 * @access Public
 */
router.put('/activate/:activationToken', async (req, res) => {
    const { activationToken } = req.params;
    const { newPassword } = req.body;
    console.log('activationToken', activationToken);
    console.log('newPassword', newPassword)

    // 1. Basic password validation
    if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    try {
        // 2. Hash the URL token to match the database stored hash (MUST be the same method)
        const hashedToken = crypto
            .createHash('sha256')
            .update(activationToken)
            .digest('hex');

        // 3. Find user by hashed token and ensure token hasn't expired
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired activation token. Please ask your manager to resend the link.' });
        }

        // 4. Update the password and clear the reset/activation fields
        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        // Mongoose pre-save hook will hash the new password before saving
        await user.save();

        // 5. Activate the staff member (set active: true)
        const staff = await Staff.findOne({ userId: user._id });
        if (staff) {
            staff.active = true;
            await staff.save();

            // 5.1. Add staff to outlet's default group after activation
            try {
                if (staff.storeId) {
                    const store = await Store.findById(staff.storeId);
                    if (store) {
                        const owner = await User.findById(store.ownerId);
                        if (owner) {
                            const storeGroupName = `${store.name} Group`;
                            const outletGroup = await Chat.findOne({
                                name: storeGroupName,
                                type: 'group',
                                createdBy: owner._id,
                                isDefault: true,
                                outletId: staff.storeId
                            });

                            if (outletGroup) {
                                // Add the staff member to the outlet group if not already a participant
                                if (!outletGroup.participants.includes(user._id)) {
                                    outletGroup.participants.push(user._id);
                                    await outletGroup.save();
                                }
                            }

                            // Also add to "All Outlet Staffs" group if it exists
                            const allOutletsGroup = await Chat.findOne({
                                name: 'All Outlet Staffs',
                                type: 'group',
                                createdBy: owner._id,
                                isDefault: true,
                                outletId: null
                            });

                            if (allOutletsGroup) {
                                // Add the staff member to the all outlets group if not already a participant
                                if (!allOutletsGroup.participants.includes(user._id)) {
                                    allOutletsGroup.participants.push(user._id);
                                    await allOutletsGroup.save();
                                }
                            }
                        }
                    }
                }
            } catch (groupError) {
                // Log error but don't fail activation if group update fails
                console.error('Error adding staff to outlet group after activation:', groupError);
            }
        }

        // 6. Success response
        res.json({ message: 'Account activated and password set successfully. You can now log in.' });

    } catch (error) {
        console.error('Staff Activation Error:', error);
        res.status(500).json({ error: 'Server error during account activation.' });
    }
});


// --- Existing Route: Change Password ---

/**
 * @route PUT /api/auth/password/change
 * @desc Allows an authenticated user to change their password.
 * @access Private (Requires 'protect' middleware)
 */
router.put('/password/change', protect,
    async (req, res) => {

        const { currentPassword, newPassword } = req.body;

        // We rely on 'protect' middleware to set req.user.id
        const userId = req.user?.id; // Safely access user ID
        if (!userId) {
            // This condition should only be hit if the middleware failed to attach the user
            return res.status(401).json({ error: 'Not authorized, token failed.' });
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required.' });
        }

        try {
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }

            // 1. Verify current password
            if (!(await user.matchPassword(currentPassword))) {
                return res.status(401).json({ error: 'Invalid current password.' });
            }
            // 2. Check if new password is too short (or add other validation)
            if (newPassword.length < 8) {
                return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
            }

            // 3. Update password
            user.password = newPassword;

            // The User model's pre-save hook will automatically hash the new password.
            await user.save();

            // Send a success response
            res.json({ message: 'Password updated successfully. You will be logged out to re-authenticate with your new password.' });

        } catch (error) {
            console.error('Change Password Error:', error);
            res.status(500).json({ error: 'Server error during password change.' });
        }
    });


router.post('/data/sync', protect, async (req, res) => {
    try {
        // 1. User is already authenticated by the 'protect' middleware.
        const { id: userId, shopId, role } = req.user;

        console.log(`Force Sync requested by User: ${userId} for Shop: ${shopId}`);

        // --- Mock Data Sync Logic (Replace with actual data fetching/packaging) ---

        // For now, we simulate the success response which the frontend expects:

        res.json({
            success: true,
            message: 'Server data retrieved and ready for client update.',
            recordsUpdated: 150, // Example of useful metadata to send back
            // data: allShopData, // Send the actual data payload here if needed for sync
        });

    } catch (error) {
        console.error('Force Sync Server Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to complete server synchronization.',
            message: error.message
        });
    }
});

router.get('/current-plan', protect, async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Find the user by ID and SELECT the new fields
        const user = await User.findById(userId).select('plan planEndDate subscriptionStatus role activeStoreId shopId');

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Get effective plan (owner's plan for staff, user's plan for owners)
        let effectivePlan = user.plan || 'BASIC';
        let planEndDate = user.planEndDate;
        let subscriptionStatus = user.subscriptionStatus;

        if (user.role !== 'owner' && user.role !== 'superadmin') {
            // For staff, get owner's plan details
            let owner = null;
            if (user.activeStoreId) {
                const store = await Store.findById(user.activeStoreId);
                if (store && store.ownerId) {
                    owner = await User.findById(store.ownerId).select('plan planEndDate subscriptionStatus');
                }
            } else if (user.shopId) {
                owner = await User.findById(user.shopId).select('plan planEndDate subscriptionStatus');
            }
            
            if (owner) {
                effectivePlan = owner.plan || 'BASIC';
                planEndDate = owner.planEndDate;
                subscriptionStatus = owner.subscriptionStatus;
            }
        }

        // 2. Return the plan and end date
        res.json({
            success: true,
            plan: effectivePlan, // Effective plan (owner's plan for staff)
            planEndDate: planEndDate, // 🔥 Include the end date
            subscriptionStatus: subscriptionStatus, // Include status
        });

    } catch (error) {
        console.error('Fetch Current Plan Error:', error);
        res.status(500).json({ error: 'Server error while fetching user plan.' });
    }
});



module.exports = router;