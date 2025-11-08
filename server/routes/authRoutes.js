const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');   
const crypto = require('crypto');     
const User = require('../models/User'); 
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
    const { identifier, password } = req.body; // Use 'identifier' to accept email or phone
    
    // Basic validation
    if (!identifier || !password) {
        return res.status(400).json({ error: 'Email/Phone and password are required.' });
    }

    try {
        // --- NEW NORMALIZATION LOGIC ---
        let searchIdentifiers = [];
        const isEmail = identifier.includes('@');
        
        // 1. If it looks like an email, search only by email
        if (isEmail) {
            searchIdentifiers.push(identifier.toLowerCase());
        } 
        // 2. If it looks like a phone number (no '@'), generate potential matches
        else {
            // Clean up the identifier: remove spaces, dashes, parentheses
            const cleanedIdentifier = identifier.replace(/[\s\-\(\)]/g, '');
            
            // A. Full identifier (Assumes user provided country code, e.g., "+91...")
            searchIdentifiers.push(cleanedIdentifier);

            // B. Check against common/default country codes if it's a number without '+'
            const defaultCountryCode = process.env.DEFAULT_COUNTRY_CODE || '+91'; 

            // If the cleaned identifier does not start with a '+' (i.e., local number only)
            if (!cleanedIdentifier.startsWith('+')) {
                // Add the default country code prefix for search
                searchIdentifiers.push(defaultCountryCode + cleanedIdentifier);
            }
        }

        // 3. Construct the Mongoose $or query using the generated identifiers
        const orQuery = searchIdentifiers.flatMap(id => [
            { email: id },
            // Phone numbers are typically stored with the '+' and country code
            { phone: id } 
        ]);
        // --- END NORMALIZATION LOGIC ---

        const user = await User.findOne({ $or: orQuery });

        if (user && (await user.matchPassword(password))) {
            // Check if the user is active (especially important for staff)
            // Assuming your User model has an 'isActive' field or similar logic
            if (user.isActive === false) { 
                 return res.status(401).json({ error: 'Account is inactive. Please contact your shop owner.' });
            }
            
            const token = generateToken(user._id, user.shopId, user.role);
            res.json({
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    role: user.role,
                    shopId: user.shopId,
                    phone: user.phone
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

// Register a New owner/Shop
router.post('/signup', async (req, res) => {
    const { email, password, phone } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        // Check if user exists by email OR phone number
        const userExists = await User.findOne({ $or: [{ email }, { phone }] });
        if (userExists) {
            return res.status(400).json({ error: 'User already exists with this email or phone number.' });
        }

        const newUser = await User.create({
            email,
            password,
            phone: phone || null,
            // FIX: Changed role from lowercase 'owner' to PascalCase 'owner' for consistency
            role: 'owner', 
            // Create a new ObjectID to use temporarily until we save the user's ID as their shopId
            shopId: new mongoose.Types.ObjectId(), 
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

            }
        });

    } catch (error) {
        console.error('Signup Error:', error);
        res.status(500).json({ error: 'Server error during signup.' });
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
    console.log('activationToken',activationToken);
    console.log('newPassword',newPassword)

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

        // 5. Success response
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
    
    // In a real application, userId would be extracted from the JWT via middleware (req.user.id)
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
        
        // In a real MERN app, this would involve:
        // 1. Calling a Data Service to fetch all required collections (Inventory, Customers, Sales, etc.) 
        //    based on the req.user.shopId.
        // 2. Packaging this data into a JSON structure.
        // 3. Sending the packaged data back to the client.
        
        // For now, we simulate the success response which the frontend expects:
        
        // const allShopData = await dataService.getSyncData(shopId); 
        
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


module.exports = router;