const jwt = require('jsonwebtoken');
const User = require('../models/User'); 
const Staff = require('../models/Staff'); // Added for multi-store staff lookup
const Store = require('../models/Store'); // Added to link staff to owner
const JWT_SECRET = process.env.JWT_SECRET; 

// --- UPDATED AUTHENTICATION MIDDLEWARE ---
const protect = async (req, res, next) => {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        const parts = req.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer' && parts[1]) {
            token = parts[1];
        }
    }

    if (!token) {
        console.error('DEBUG: [401] Token missing in request headers');
        return res.status(401).json({ error: 'Not authorized, token missing or badly formatted.' });
    }

    try {
        // Verify JWT - If this fails, it jumps straight to the catch block
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Fetch the user
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            console.error(`DEBUG: [401] Token valid for ID ${decoded.id}, but User not found in DB.`);
            return res.status(401).json({ error: 'Not authorized, user not found' });
        }

        // ---------------------------------------------------------------------
        // MULTI-STORE SUBSCRIPTION & PLAN EXPIRY CHECK
        // ---------------------------------------------------------------------
        if (user.role !== 'superadmin') {
            
            let ownerAccount;

            if (user.role === 'owner') {
                ownerAccount = user;
            } else {
                // STAFF LOGIC (user may have multiple Staff records for different shops – prefer activeStoreId)
                let staffRecord = user.activeStoreId
                    ? await Staff.findOne({ userId: user._id, storeId: user.activeStoreId }).populate('storeId')
                    : null;
                if (!staffRecord) {
                    staffRecord = await Staff.findOne({ userId: user._id }).populate('storeId');
                }

                if (!staffRecord || !staffRecord.storeId) {
                    console.error(`DEBUG: [403] Staff user ${user._id} has no linked store record.`);
                    return res.status(403).json({ error: 'Staff member is not assigned to any store.' });
                }

                if (staffRecord.active === false || user.isActive === false) {
                    return res.status(403).json({
                        error: 'Account deactivated',
                        message: 'Your account has been deactivated by the owner. Please contact your shop owner to reactivate.',
                        code: 'ACCOUNT_DEACTIVATED'
                    });
                }

                ownerAccount = await User.findById(staffRecord.storeId.ownerId);
                user.activeStoreId = staffRecord.storeId._id;
            }

            if (!ownerAccount) {
                console.error(`DEBUG: [404] Could not find owner account for user ${user._id}`);
                return res.status(404).json({ error: 'Business owner account not found.' });
            }

            // Subscription blocking logic
            const blockedStatuses = ['halted', 'cancelled', 'expired'];
            const currentStatus = ownerAccount.subscriptionStatus;

            if (blockedStatuses.includes(currentStatus)) {
                console.error(`DEBUG: [403] Access denied for ${user._id} due to owner status: ${currentStatus}`);
                return res.status(403).json({ 
                    error: 'Subscription Issue', 
                    message: currentStatus === 'halted' 
                        ? 'Access suspended due to payment failure. Please settle dues.' 
                        : 'Your access period has ended. Please renew your subscription.',
                    status: currentStatus,
                    expiredAt: ownerAccount.planEndDate
                });
            }

            if (ownerAccount.isActive === false) {
                console.error(`DEBUG: [403] Access denied: Owner account ${ownerAccount._id} is inactive.`);
                return res.status(403).json({ error: 'Account deactivated. Please contact support.' });
            }
        }

        // ---------------------------------------------------------------------
        // OUTLET CONTEXT HANDLING FOR OWNERS
        // ---------------------------------------------------------------------
        if (user.role === 'owner') {
            let storeId = null;

            if (req.headers['x-store-id']) {
                storeId = req.headers['x-store-id'];
                const store = await Store.findOne({ _id: storeId, ownerId: user._id, isActive: true });
                if (store) {
                    user.activeStoreId = storeId;
                    await User.findByIdAndUpdate(user._id, { activeStoreId: storeId });
                } else {
                    console.error(`DEBUG: [403] Owner ${user._id} attempted access to invalid/unowned store: ${storeId}`);
                    return res.status(403).json({ error: 'Invalid outlet or outlet does not belong to you.' });
                }
            } else if (user.activeStoreId) {
                const store = await Store.findOne({ _id: user.activeStoreId, ownerId: user._id, isActive: true });
                if (store) {
                    storeId = user.activeStoreId;
                } else {
                    const firstStore = await Store.findOne({ ownerId: user._id, isActive: true }).sort({ createdAt: 1 });
                    if (firstStore) {
                        storeId = firstStore._id;
                        user.activeStoreId = storeId;
                        await User.findByIdAndUpdate(user._id, { activeStoreId: storeId });
                    }
                }
            } else {
                if (user.plan === 'PREMIUM') {
                    const firstStore = await Store.findOne({ ownerId: user._id, isActive: true }).sort({ createdAt: 1 });
                    if (firstStore) {
                        storeId = firstStore._id;
                        user.activeStoreId = storeId;
                        await User.findByIdAndUpdate(user._id, { activeStoreId: storeId });
                    }
                } else {
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
                    await User.findByIdAndUpdate(user._id, { activeStoreId: storeId });
                }
            }

            req.user = user;
            req.user.storeId = storeId;
            req.user.activeStoreId = storeId;
        } else if (user.role !== 'superadmin') {
            req.user = user;
            req.user.storeId = user.activeStoreId;
        } else {
            req.user = user;
        }

        req.user.id = user._id; 
        next();

    } catch (error) {
        // Identify exactly why JWT failed
        console.error('🔥 CRITICAL AUTH ERROR:', error.name, '-', error.message);
        
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