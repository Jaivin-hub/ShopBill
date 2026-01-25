const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Assuming path to User model
const JWT_SECRET = process.env.JWT_SECRET; // Get from env

// --- UPDATED AUTHENTICATION MIDDLEWARE ---
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
        
        // Fetch the user
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({ error: 'Not authorized, user not found' });
        }

        // ---------------------------------------------------------------------
        // SUBSCRIPTION & PLAN EXPIRY CHECK
        // ---------------------------------------------------------------------
        // 1. Superadmins always have access
        if (user.role !== 'superadmin') {
            
            // If the user is an owner, check their own status
            // If the user is staff, we check the owner's status (lookup via shopId)
            let ownerAccount = user;
            if (user.role !== 'owner') {
                ownerAccount = await User.findById(user.shopId);
            }

            if (!ownerAccount) {
                return res.status(404).json({ error: 'Shop owner account not found.' });
            }

            /**
             * ⭐ FIXED LOGIC:
             * Only block access if the status is explicitly terminal or halted.
             * This allows 'authenticated' and 'active' users to stay logged in 
             * while Razorpay attempts to process the payment today.
             */
            const blockedStatuses = ['halted', 'cancelled', 'expired'];
            const currentStatus = ownerAccount.subscriptionStatus;

            if (blockedStatuses.includes(currentStatus)) {
                return res.status(403).json({ 
                    error: 'Subscription Issue', 
                    message: currentStatus === 'halted' 
                        ? 'Access suspended due to payment failure. Please settle dues.' 
                        : 'Your access period has ended. Please renew your subscription.',
                    status: currentStatus,
                    expiredAt: ownerAccount.planEndDate
                });
            }

            // 2. Block if the owner's account is manually deactivated by Superadmin
            if (ownerAccount.isActive === false) {
                return res.status(403).json({ error: 'Account deactivated. Please contact support.' });
            }
        }
        // ---------------------------------------------------------------------

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

// --- 2. AUTHORIZE MIDDLEWARE (Ensure user has required role) ---
/**
 * Factory function that returns a middleware to restrict access to specified roles.
 * @param {...string} roles The allowed user roles (e.g., 'superadmin', 'owner', 'Manager')
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        // req.user is populated by the 'protect' middleware
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: `User role '${req.user.role}' is not authorized to access this route. Requires one of: ${roles.join(', ')}.` 
            });
        }
        next();
    };
};

module.exports = { protect, authorize };