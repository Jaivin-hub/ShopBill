// routes/authRoutes.js

const express = require('express');
const mongoose = require('mongoose'); // Needed for new ObjectId in signup
const jwt = require('jsonwebtoken');   // Needed for token generation
const User = require('../models/User'); 
// Assuming you move utility functions to a separate file, or keep it local:

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET; 

// Function from server.js
const generateToken = (id, shopId, role) => {
    return jwt.sign({ id, shopId, role }, JWT_SECRET, {
        expiresIn: '30d', 
    });
};

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
            shopId: new mongoose.Types.ObjectId(),
        });
        
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

module.exports = router;