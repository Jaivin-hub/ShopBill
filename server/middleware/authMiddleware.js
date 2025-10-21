const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Assuming path to User model
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev'; // Get from env

// --- NEW AUTHENTICATION MIDDLEWARE ---
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        const parts = req.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer' && parts[1]) {
            token = parts[1];
        }
    }

    if (!token) {
        return res.status(401).json({ error: 'Not authorized, token missing or badly formatted.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
         if (!user) {
            return res.status(401).json({ error: 'Not authorized, user not found' });
        }
        
        // **CRITICAL FIX/UPDATE:** // Ensure req.user has an 'id' property by explicitly setting it from Mongoose's _id
        // (This makes it compatible with your router logic: const userId = req.user?.id;)
        req.user = user;
        req.user.id = user._id; // Attach the ID as 'id' for consistency

        next();

    } catch (error) {
        console.error('Auth Error:', error.message);
        
        const errorMessage = error.name === 'TokenExpiredError' 
            ? 'Not authorized, token expired. Please log in again.' 
            : 'Not authorized, invalid token.';
            
        res.status(401).json({ error: errorMessage });
    }
};

module.exports = { protect };