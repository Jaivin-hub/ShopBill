const express = require('express');
const mongoose = require('mongoose'); // Needed for new ObjectId in signup
const jwt = require('jsonwebtoken');   // Needed for token generation
const User = require('../models/User'); 
const { protect } = require('../middleware/authMiddleware');

// NOTE: For security, a 'protect' middleware should be used on the 
// change password route to extract the userId from the JWT.

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET; 

// Function from server.js
const generateToken = (id, shopId, role) => {
    return jwt.sign({ id, shopId, role }, JWT_SECRET, {
        expiresIn: '30d', 
    });
};

// --- Existing Routes ---

// Login User
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
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
            res.status(401).json({ error: 'Invalid email or password.' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

// Register a New Owner/Shop
router.post('/signup', async (req, res) => {
    const { email, password, phone } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ error: 'User already exists with this email.' });
        }

        const newUser = await User.create({
            email,
            password,
            phone: phone || null,
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

// --- New Route: Change Password ---

/**
 * @route PUT /api/auth/password/change
 * @desc Allows an authenticated user to change their password.
 * @access Private (Requires 'protect' middleware)
 */
router.put('/password/change', protect,
    async (req, res) => {
    
    const { currentPassword, newPassword } = req.body;
    console.log('inside here')
    
    // In a real application, userId would be extracted from the JWT via middleware (req.user.id)
    // For this example, we assume req.user.id is available, but you must implement the middleware.
    const userId = req.user?.id; // Safely access user ID
    console.log('userId',userId)
    if (!userId) {
        // This condition should ideally be caught by the 'protect' middleware
        return res.status(401).json({ error: 'Not authorized, token failed.' });
    }

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    try {
        const user = await User.findById(userId);
        console.log('user',user)
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // 1. Verify current password
        if (!(await user.matchPassword(currentPassword))) {
            return res.status(401).json({ error: 'Invalid current password.' });
        }
        console.log('user match')
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


module.exports = router;
