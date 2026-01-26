const jwt = require('jsonwebtoken');
const User = require('../models/User'); 
const Staff = require('../models/Staff'); // Added for multi-store staff lookup
const Store = require('../models/Store'); // Added to link staff to owner
const JWT_SECRET = process.env.JWT_SECRET; 

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
        // MULTI-STORE SUBSCRIPTION & PLAN EXPIRY CHECK
        // ---------------------------------------------------------------------
        if (user.role !== 'superadmin') {
            
            let ownerAccount;

            if (user.role === 'owner') {
                // If user is owner, they are their own ownerAccount
                ownerAccount = user;
            } else {
                /**
                 * ⭐ STAFF LOGIC UPDATE:
                 * Since we removed shopId from User, we find the store the staff belongs to,
                 * then we find the owner of that store to check subscription status.
                 */
                const staffRecord = await Staff.findOne({ userId: user._id }).populate('storeId');
                
                if (!staffRecord || !staffRecord.storeId) {
                    return res.status(403).json({ error: 'Staff member is not assigned to any store.' });
                }

                // Find the owner of this specific store
                ownerAccount = await User.findById(staffRecord.storeId.ownerId);

                /**
                 * Attach the storeId to req.user. This is critical so your 
                 * controllers know which shop the staff is currently working in.
                 */
                user.activeStoreId = staffRecord.storeId._id;
            }

            if (!ownerAccount) {
                return res.status(404).json({ error: 'Business owner account not found.' });
            }

            /**
             * Only block access if the status is explicitly terminal or halted.
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

            // Block if the owner's account is manually deactivated by Superadmin
            if (ownerAccount.isActive === false) {
                return res.status(403).json({ error: 'Account deactivated. Please contact support.' });
            }
        }
        // ---------------------------------------------------------------------

        /**
         * OUTLET CONTEXT HANDLING FOR OWNERS:
         * For owners with PREMIUM plan, they can have multiple outlets.
         * We check for x-store-id header or use their activeStoreId.
         * If no outlet is specified and they have outlets, use the first active one.
         * For non-PREMIUM owners, create a default store if it doesn't exist.
         */
        if (user.role === 'owner') {
            let storeId = null;

            // Check if storeId is provided in headers (for outlet switching)
            if (req.headers['x-store-id']) {
                storeId = req.headers['x-store-id'];
                // Verify the outlet belongs to this owner
                const store = await Store.findOne({ _id: storeId, ownerId: user._id, isActive: true });
                if (store) {
                    user.activeStoreId = storeId;
                    // Update user's activeStoreId in database
                    await User.findByIdAndUpdate(user._id, { activeStoreId: storeId });
                } else {
                    return res.status(403).json({ error: 'Invalid outlet or outlet does not belong to you.' });
                }
            } else if (user.activeStoreId) {
                // Use saved activeStoreId
                const store = await Store.findOne({ _id: user.activeStoreId, ownerId: user._id, isActive: true });
                if (store) {
                    storeId = user.activeStoreId;
                } else {
                    // Active store no longer exists or is inactive, find another one
                    const firstStore = await Store.findOne({ ownerId: user._id, isActive: true }).sort({ createdAt: 1 });
                    if (firstStore) {
                        storeId = firstStore._id;
                        user.activeStoreId = storeId;
                        await User.findByIdAndUpdate(user._id, { activeStoreId: storeId });
                    }
                }
            } else {
                // No active store set, find or create one
                if (user.plan === 'PREMIUM') {
                    // For PREMIUM users, find first active outlet
                    const firstStore = await Store.findOne({ ownerId: user._id, isActive: true }).sort({ createdAt: 1 });
                    if (firstStore) {
                        storeId = firstStore._id;
                        user.activeStoreId = storeId;
                        await User.findByIdAndUpdate(user._id, { activeStoreId: storeId });
                    }
                    // If no outlets exist, storeId remains null (user needs to create one)
                } else {
                    // For non-PREMIUM users, create a default store if it doesn't exist
                    let defaultStore = await Store.findOne({ ownerId: user._id, name: 'Main Store' });
                    if (!defaultStore) {
                        defaultStore = await Store.create({
                            name: 'Main Store',
                            ownerId: user._id,
                            taxId: user.taxId || '',
                            address: user.address || '',
                            phone: user.phone || '',
                            email: user.email || '',
                            isActive: true
                        });
                    }
                    storeId = defaultStore._id;
                    user.activeStoreId = storeId;
                    if (!user.activeStoreId) {
                        await User.findByIdAndUpdate(user._id, { activeStoreId: storeId });
                    }
                }
            }

            // Attach storeId to req.user for use in routes
            req.user.storeId = storeId;
            req.user.activeStoreId = storeId;
        } else if (user.role !== 'superadmin') {
            // For staff, storeId is already set from activeStoreId above
            req.user.storeId = user.activeStoreId;
        }

        req.user = user;
        req.user.id = user._id; 

        next();

    } catch (error) {
        console.error('Auth Error:', error.message);
        
        const errorMessage = error.name === 'TokenExpiredError' 
            ? 'Not authorized, token expired. Please log in again.' 
            : 'Not authorized, invalid token.';
            
        res.status(401).json({ error: errorMessage });
    }
};

// --- 2. AUTHORIZE MIDDLEWARE ---
/**
 * Factory function that returns a middleware to restrict access to specified roles.
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: `User role '${req.user.role}' is not authorized to access this route. Requires one of: ${roles.join(', ')}.` 
            });
        }
        next();
    };
};

module.exports = { protect, authorize };