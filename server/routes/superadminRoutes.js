const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const User = require('../models/User'); // Reusing the User model for shop data (as shopId is linked)
const Store = require('../models/Store');
const Sale = require('../models/Sale');
const Customer = require('../models/Customer');
const Inventory = require('../models/Inventory');
const Payment = require('../models/Payment');
const router = express.Router();
const Razorpay = require('razorpay');
const rzp = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Superadmin middleware wrapper:
 * 1. protect: Ensure user is logged in
 * 2. authorize('superadmin'): Ensure user role is 'superadmin'
 */
const superadminProtect = [protect, authorize('superadmin')];


// ====================================================
// --- SHOP MANAGEMENT (/api/superadmin/shops) ---
// ====================================================

/**
 * Compute a 0-100 performance score from components (growth, revenue, activity, scale, engagement, tenure).
 * Label: High 70+, Medium 40-69, Low 0-39.
 */
function compositePerformanceScore(opts) {
    const {
        growthPct = 0,
        revenueLast30 = 0,
        salesCountLast30 = 0,
        storeCount = 0,
        staffTotal = 0,
        customerCount = 0,
        inventoryCount = 0,
        tenureDays = 0
    } = opts;

    // Growth: -50% to +50% -> 0 to 25 points
    const growthScore = Math.max(0, Math.min(25, 12.5 + (growthPct * 0.25)));

    // Revenue (log-like bands): 0->0, 1k->5, 10k->12, 50k->18, 100k->21, 500k+->25
    let revenueScore = 0;
    if (revenueLast30 >= 500000) revenueScore = 25;
    else if (revenueLast30 >= 100000) revenueScore = 21;
    else if (revenueLast30 >= 50000) revenueScore = 18;
    else if (revenueLast30 >= 10000) revenueScore = 12;
    else if (revenueLast30 >= 1000) revenueScore = 5;

    // Activity: sales count last 30 -> 0–20 points (bands)
    let activityScore = 0;
    if (salesCountLast30 >= 100) activityScore = 20;
    else if (salesCountLast30 >= 50) activityScore = 15;
    else if (salesCountLast30 >= 25) activityScore = 10;
    else if (salesCountLast30 >= 1) activityScore = 5;

    // Scale: stores*3 + staff*2, max 15
    const scaleScore = Math.min(15, storeCount * 3 + staffTotal * 2);

    // Engagement: customers/10 + inventory/50, max 10
    const engagementScore = Math.min(10, Math.floor(customerCount / 10) + Math.floor(inventoryCount / 50));

    // Tenure: 30+ days = 5, else proportional
    const tenureScore = tenureDays >= 30 ? 5 : (tenureDays / 30) * 5;

    const total = Math.round(growthScore + revenueScore + activityScore + scaleScore + engagementScore + tenureScore);
    const score = Math.max(0, Math.min(100, total));
    const label = score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low';
    return { score, label };
}

/**
 * Compute performance metrics for shops (owners) using full shop data.
 * Uses: sales (last 30 vs previous 30), store count, staff, customers, inventory, tenure.
 * @param {ObjectId[]} ownerIds - Owner (shop) user IDs
 * @param {Map<string, { managerCount, cashierCount }>} staffCountMap - Staff counts per owner
 * @param {Map<string, number>} tenureDaysMap - Tenure in days per owner (optional)
 * @returns {Promise<Map<string, { revenueLast30, revenuePrev30, salesCountLast30, growthPct, trend, metric, score, label, storeCount, customerCount, inventoryCount }>>}
 */
async function computeShopsPerformance(ownerIds, staffCountMap = new Map(), tenureDaysMap = new Map()) {
    if (!ownerIds || ownerIds.length === 0) return new Map();
    const now = new Date();
    const ms30 = 30 * 24 * 60 * 60 * 1000;
    const ms60 = 60 * 24 * 60 * 60 * 1000;
    const startLast30 = new Date(now.getTime() - ms30);
    const startPrev30 = new Date(now.getTime() - ms60);

    const stores = await Store.find({ ownerId: { $in: ownerIds } }).select('_id ownerId').lean();
    const ownerToStores = new Map();
    stores.forEach(s => {
        const oid = s.ownerId.toString();
        if (!ownerToStores.has(oid)) ownerToStores.set(oid, []);
        ownerToStores.get(oid).push(s._id);
    });
    const allStoreIds = stores.map(s => s._id);

    const [last30Agg, prev30Agg, customerCounts, inventoryCounts] = await Promise.all([
        Sale.aggregate([
            { $match: { storeId: { $in: allStoreIds }, timestamp: { $gte: startLast30 } } },
            { $group: { _id: '$storeId', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
        ]),
        Sale.aggregate([
            { $match: { storeId: { $in: allStoreIds }, timestamp: { $gte: startPrev30, $lt: startLast30 } } },
            { $group: { _id: '$storeId', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
        ]),
        Customer.aggregate([
            { $match: { storeId: { $in: allStoreIds } } },
            { $group: { _id: '$storeId', count: { $sum: 1 } } }
        ]),
        Inventory.aggregate([
            { $match: { storeId: { $in: allStoreIds } } },
            { $group: { _id: '$storeId', count: { $sum: 1 } } }
        ])
    ]);

    const last30ByStore = new Map();
    last30Agg.forEach(r => last30ByStore.set(r._id.toString(), { total: r.total || 0, count: r.count || 0 }));
    const prev30ByStore = new Map();
    prev30Agg.forEach(r => prev30ByStore.set(r._id.toString(), { total: r.total || 0, count: r.count || 0 }));
    const storeToOwner = new Map();
    stores.forEach(s => storeToOwner.set(s._id.toString(), s.ownerId.toString()));
    const customerByStore = new Map();
    customerCounts.forEach(r => customerByStore.set(r._id.toString(), r.count || 0));
    const inventoryByStore = new Map();
    inventoryCounts.forEach(r => inventoryByStore.set(r._id.toString(), r.count || 0));

    const result = new Map();
    ownerIds.forEach(id => {
        const oid = id.toString();
        const storeIds = ownerToStores.get(oid) || [];
        let revenueLast30 = 0, revenuePrev30 = 0, salesCountLast30 = 0, customerCount = 0, inventoryCount = 0;
        storeIds.forEach(sid => {
            const s = sid.toString();
            const l = last30ByStore.get(s) || { total: 0, count: 0 };
            const p = prev30ByStore.get(s) || { total: 0, count: 0 };
            revenueLast30 += l.total;
            revenuePrev30 += p.total;
            salesCountLast30 += l.count;
            customerCount += customerByStore.get(s) || 0;
            inventoryCount += inventoryByStore.get(s) || 0;
        });
        const growthPct = revenuePrev30 > 0
            ? ((revenueLast30 - revenuePrev30) / revenuePrev30) * 100
            : (revenueLast30 > 0 ? 100 : 0);
        const trend = growthPct > 5 ? 'up' : growthPct < -5 ? 'down' : 'flat';
        const metric = (growthPct >= 0 ? '+' : '') + Number(growthPct).toFixed(1) + '%';
        const staffCount = staffCountMap.get(oid) || { managerCount: 0, cashierCount: 0 };
        const staffTotal = (staffCount.managerCount || 0) + (staffCount.cashierCount || 0);
        const tenureDays = tenureDaysMap.get(oid) ?? 0;
        const { score, label } = compositePerformanceScore({
            growthPct,
            revenueLast30,
            salesCountLast30,
            storeCount: storeIds.length,
            staffTotal,
            customerCount,
            inventoryCount,
            tenureDays
        });
        result.set(oid, {
            revenueLast30,
            revenuePrev30,
            salesCountLast30,
            growthPct,
            trend,
            metric,
            score,
            label,
            storeCount: storeIds.length,
            customerCount,
            inventoryCount
        });
    });
    return result;
}

/**
 * @route GET /api/superadmin/shops
 * @desc Get a list of all shops (User documents where role is 'owner') with real performance metrics
 * @access Private (Superadmin only)
 */
router.get('/shops', superadminProtect, async (req, res) => {
    try {
        // Find all users who are owners, as the owner represents the shop entry.
        const shops = await User.find({ role: 'owner' })
            .sort({ createdAt: -1 })
            .select('-password -resetPasswordToken -resetPasswordExpire');

        if (!shops.length) {
            return res.status(200).json({ success: true, message: 'No shops registered yet.', data: [] });
        }

        const shopIds = shops.map(shop => shop._id);

        // Get staff counts for each shop
        const staffCounts = await User.aggregate([
            { $match: { shopId: { $in: shopIds }, role: { $in: ['Manager', 'Cashier'] } } },
            {
                $group: {
                    _id: '$shopId',
                    managerCount: { $sum: { $cond: [{ $eq: ['$role', 'Manager'] }, 1, 0] } },
                    cashierCount: { $sum: { $cond: [{ $eq: ['$role', 'Cashier'] }, 1, 0] } }
                }
            }
        ]);
        const staffCountMap = new Map();
        staffCounts.forEach(item => {
            staffCountMap.set(item._id.toString(), { managerCount: item.managerCount, cashierCount: item.cashierCount });
        });

        const tenureDaysMap = new Map();
        shops.forEach(shop => {
            const daysActive = Math.floor((Date.now() - shop.createdAt.getTime()) / (1000 * 60 * 60 * 24));
            tenureDaysMap.set(shop._id.toString(), daysActive);
        });

        // Full performance: sales, growth, scale, engagement, tenure
        const performanceMap = await computeShopsPerformance(shopIds, staffCountMap, tenureDaysMap);

        const shopsWithDetails = shops.map(shop => {
            const shopObject = shop.toObject();
            const daysActive = tenureDaysMap.get(shop._id.toString()) ?? 0;
            const subscriptionStatus = shop.subscriptionStatus || 'created';
            const staffCount = staffCountMap.get(shop._id.toString()) || { managerCount: 0, cashierCount: 0 };
            const perf = performanceMap.get(shop._id.toString()) || {
                revenueLast30: 0,
                revenuePrev30: 0,
                salesCountLast30: 0,
                growthPct: 0,
                trend: 'flat',
                metric: '0.0%',
                score: 50,
                label: 'Low',
                storeCount: 0,
                customerCount: 0,
                inventoryCount: 0
            };

            return {
                ...shopObject,
                shopName: shopObject.shopName,
                dateJoined: shop.createdAt.toISOString().split('T')[0],
                tenureDays: daysActive,
                performanceTrend: { metric: perf.metric, trend: perf.trend, score: perf.score, label: perf.label },
                performance: {
                    revenueLast30: perf.revenueLast30,
                    salesCountLast30: perf.salesCountLast30,
                    growthPct: perf.growthPct,
                    score: perf.score,
                    label: perf.label,
                    storeCount: perf.storeCount,
                    customerCount: perf.customerCount,
                    inventoryCount: perf.inventoryCount
                },
                plan: shop.plan || 'BASIC',
                managerCount: staffCount.managerCount,
                cashierCount: staffCount.cashierCount,
                location: shop.location || 'N/A',
                subscriptionStatus,
            };
        });

        res.json({
            success: true,
            count: shopsWithDetails.length,
            data: shopsWithDetails
        });
    } catch (error) {
        console.error('Superadmin Shop List Error:', error);
        res.status(500).json({ error: 'Server error retrieving shop list.' });
    }
});

/**
 * @route GET /api/superadmin/performance
 * @desc Get performance metrics for all shops (composite score, growth, revenue, scale, engagement)
 * @access Private (Superadmin only)
 */
router.get('/performance', superadminProtect, async (req, res) => {
    try {
        const shops = await User.find({ role: 'owner' })
            .sort({ createdAt: -1 })
            .select('_id shopName email createdAt');

        if (!shops.length) {
            return res.status(200).json({ success: true, data: [] });
        }

        const shopIds = shops.map(s => s._id);
        const staffCounts = await User.aggregate([
            { $match: { shopId: { $in: shopIds }, role: { $in: ['Manager', 'Cashier'] } } },
            {
                $group: {
                    _id: '$shopId',
                    managerCount: { $sum: { $cond: [{ $eq: ['$role', 'Manager'] }, 1, 0] } },
                    cashierCount: { $sum: { $cond: [{ $eq: ['$role', 'Cashier'] }, 1, 0] } }
                }
            }
        ]);
        const staffCountMap = new Map();
        staffCounts.forEach(item => staffCountMap.set(item._id.toString(), { managerCount: item.managerCount, cashierCount: item.cashierCount }));
        const tenureDaysMap = new Map();
        shops.forEach(shop => {
            tenureDaysMap.set(shop._id.toString(), Math.floor((Date.now() - shop.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
        });

        const performanceMap = await computeShopsPerformance(shopIds, staffCountMap, tenureDaysMap);

        const data = shops.map(shop => {
            const oid = shop._id.toString();
            const perf = performanceMap.get(oid) || { revenueLast30: 0, salesCountLast30: 0, growthPct: 0, trend: 'flat', metric: '0.0%', score: 50, label: 'Low', storeCount: 0, customerCount: 0, inventoryCount: 0 };
            return {
                shopId: oid,
                shopName: shop.shopName || shop.email?.split('@')[0] || 'Shop',
                email: shop.email,
                performance: {
                    score: perf.score,
                    label: perf.label,
                    revenueLast30: perf.revenueLast30,
                    growthPct: perf.growthPct,
                    trend: perf.trend,
                    metric: perf.metric,
                    salesCountLast30: perf.salesCountLast30,
                    storeCount: perf.storeCount,
                    customerCount: perf.customerCount,
                    inventoryCount: perf.inventoryCount
                }
            };
        });

        res.json({ success: true, data });
    } catch (error) {
        console.error('Superadmin Performance API Error:', error);
        res.status(500).json({ error: 'Server error retrieving performance.' });
    }
});

/**
 * @route GET /api/superadmin/shops/:id
 * @desc Get details for a single shop/owner
 * @access Private (Superadmin only)
 */
router.get('/shops/:id', superadminProtect, async (req, res) => {
    try {
        const shopId = req.params.id;

        // 1. Find the owner account by ID and ensure they have the 'owner' role
        const shop = await User.findOne({ _id: shopId, role: 'owner' })
            .select('-password -resetPasswordToken -resetPasswordExpire');

        if (!shop) {
            return res.status(404).json({ success: false, message: `Shop with ID ${shopId} not found or is not an owner account.` });
        }

        // 2. Aggregate staff counts for this specific shop
        const staffCounts = await User.aggregate([
            // Match staff records belonging to this shopId (which is the owner's _id)
            { $match: { shopId: shop._id, role: { $in: ['Manager', 'Cashier'] } } },
            {
                $group: {
                    _id: null, // Group all results together
                    managerCount: {
                        $sum: {
                            $cond: [
                                { $eq: ['$role', 'Manager'] },
                                1,
                                0
                            ]
                        }
                    },
                    cashierCount: {
                        $sum: {
                            $cond: [
                                { $eq: ['$role', 'Cashier'] },
                                1,
                                0
                            ]
                        }
                    },
                    totalStaff: { $sum: 1 } // Total staff count (excluding owner)
                }
            }
        ]);
        
        // 3. Prepare the final response object
        const staffData = staffCounts[0] || { managerCount: 0, cashierCount: 0, totalStaff: 0 };
        
        const shopObject = shop.toObject();
        
        // Calculate tenure in days (copied from your /shops route for consistency)
        const daysActive = Math.floor((Date.now() - shop.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        
        // Combine shop details with staff counts
        res.json({
            success: true,
            data: {
                ...shopObject,
                dateJoined: shop.createdAt.toISOString().split('T')[0],
                tenureDays: daysActive,
                managerCount: staffData.managerCount,
                cashierCount: staffData.cashierCount,
                totalStaff: staffData.totalStaff,
                // You might also add paymentStatus, performanceTrend mocks here if needed for consistency
            }
        });

    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid shop ID format.' });
        }
        console.error('Superadmin Get Single Shop Error:', error);
        res.status(500).json({ success: false, error: 'Server error retrieving shop details.' });
    }
});



/**
 * @route DELETE /api/superadmin/shops/:id
 * @desc Delete a shop (deletes the owner user and associated data)
 * @access Private (Superadmin only)
 * * NOTE: In a full system, deleting the User/Owner document here should trigger 
 * a cascade operation to clean up all related Inventory, Sales, and Staff data 
 * linked to this shop ID. For this implementation, we focus on deleting the primary User/Owner document.
 */
router.delete('/shops/:id', superadminProtect, async (req, res) => {
    try {
        const shopId = req.params.id;

        // 1. Find and ensure the user exists and has the 'owner' role
        // We use findOneAndDelete for atomic operation, but finding first is better 
        // if you need the 'shop' object for the message and have pre/post hooks.
        const shop = await User.findOne({ _id: shopId, role: 'owner' });

        if (!shop) {
            return res.status(404).json({ success: false, message: `Shop with ID ${shopId} not found or is not an owner account.` });
        }

        // --- CRUCIAL IMPROVEMENT: Delete All Associated Staff ---
        // The shop's ID is the shopId for all its staff members.
        const deleteStaffResult = await User.deleteMany({ shopId: shop._id, role: { $in: ['Manager', 'Cashier'] } });
        // --------------------------------------------------------

        // 2. Perform the deletion of the owner document (representing the shop)
        await shop.deleteOne();
        
        // 3. Respond success
        res.json({
            success: true,
            message: `Shop '${shop.shopName}' (Owner: ${shop.email}) and ${deleteStaffResult.deletedCount} associated staff accounts successfully deleted.`
        });

    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid shop ID format.' });
        }
        console.error('Superadmin Delete Shop Error:', error);
        res.status(500).json({ success: false, error: 'Server error during shop deletion.' });
    }
});



/**
 * @route POST /api/superadmin/shops
 * @desc Create a new shop (Superadmin creates the owner account)
 * @access Private (Superadmin only)
 * * NOTE: This is complex as it involves creating an owner user and linking the shop. 
 * We will keep this as a placeholder for now.
 */
router.post('/shops', superadminProtect, (req, res) => {
    res.status(501).json({ message: 'Route not implemented yet. Logic needed to create an Owner user and their Shop ID.' });
});


// ====================================================
// --- SYSTEM CONFIGURATION (/api/superadmin/config) ---
// ====================================================

/**
 * @route GET /api/superadmin/config
 * @desc Get global system configuration (e.g., plans, pricing, global features)
 * @access Private (Superadmin only)
 */
router.get('/config', superadminProtect, async (req, res) => {
    try {
        // In a real system, this would be stored in a database
        // For now, we'll return a default config that can be updated
        const config = {
            plans: {
                basic: {
                    name: 'Basic',
                    price: 499,
                    features: ['Basic Inventory Management', 'Up to 5 Users', 'Email Support'],
                    maxUsers: 5,
                    maxInventory: 1000,
                    maxStorage: 10,
                },
                pro: {
                    name: 'Pro',
                    price: 799,
                    features: ['Advanced Inventory', 'Up to 20 Users', 'Priority Support', 'Advanced Reports'],
                    maxUsers: 20,
                    maxInventory: 10000,
                    maxStorage: 50,
                },
                enterprise: {
                    name: 'Enterprise',
                    price: 999,
                    features: ['Unlimited Everything', 'Custom Integrations', '24/7 Support', 'Dedicated Manager'],
                    maxUsers: -1,
                    maxInventory: -1,
                    maxStorage: 500,
                }
            },
            system: {
                baseCurrency: 'INR',
                taxRate: 18.0,
                timezone: 'Asia/Kolkata',
                dateFormat: 'DD/MM/YYYY',
                language: 'en'
            },
            featureFlags: {
                aiReports: true,
                globalNotifications: true,
                advancedAnalytics: false,
                apiAccess: true,
                customBranding: false,
                multiCurrency: false
            },
            security: {
                twoFactorAuth: true,
                sessionTimeout: 30,
                passwordMinLength: 8,
                requireStrongPassword: true,
                ipWhitelist: false
            },
            email: {
                smtpEnabled: true,
                smtpHost: 'smtp.example.com',
                smtpPort: 587,
                smtpUser: 'noreply@shopbill.com',
                smtpSecure: true
            },
            maintenance: {
                maintenanceMode: false,
                maintenanceMessage: 'System is under maintenance. Please check back later.'
            },
            lastUpdated: new Date().toISOString()
        };

        res.json({
            success: true,
            data: config,
            message: 'Global system configuration retrieved.'
        });
    } catch (error) {
        console.error('Get Config Error:', error);
        res.status(500).json({ success: false, error: 'Server error retrieving configuration.' });
    }
});

/**
 * @route PUT /api/superadmin/config
 * @desc Update global system configuration
 * @access Private (Superadmin only)
 */
router.put('/config', superadminProtect, async (req, res) => {
    try {
        // In a real system, this would save to a database
        // For now, we'll just validate and return success
        const config = req.body;

        // Basic validation
        if (!config.plans || !config.system || !config.featureFlags) {
            return res.status(400).json({
                success: false,
                error: 'Invalid configuration format.'
            });
        }

        // TODO: Save to database in production
        // await SystemConfig.findOneAndUpdate({}, config, { upsert: true, new: true });

        res.json({
            success: true,
            data: config,
            message: 'Configuration updated successfully.'
        });
    } catch (error) {
        console.error('Update Config Error:', error);
        res.status(500).json({ success: false, error: 'Server error updating configuration.' });
    }
});

/**
 * @route GET /api/superadmin/dashboard
 * @desc Get superadmin dashboard statistics
 * @access Private (Superadmin only)
 */
// salesRouter.js (Updated /dashboard route)

router.get('/dashboard', superadminProtect, async (req, res) => {
    try {
        // --- Date Helpers ---
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        // ... (rest of date helpers)
        
        // Plan Mapping (Must match UserSchema)
        const PLANS = ['BASIC', 'PRO', 'PREMIUM'];

        // --- Parallel Data Fetching & Aggregation ---
        const [
            shopStats,
            allUserStats,
            newShopsThisMonth,
            newUsersThisMonth,
            allTimeSubscriptionRevenue,
            monthlyPlanRevenueBreakdown
        ] = await Promise.all([
            // 1. Shop Counts and Activity
            User.aggregate([
                { $match: { role: 'owner' } },
                { $group: { _id: '$plan', count: { $sum: 1 }, activeCount: { $sum: { $cond: ['$isActive', 1, 0] } } } }
            ]),
            // 2. User Counts
            User.aggregate([
                { $match: { role: { $in: ['owner', 'manager', 'cashier'] } } }, 
                { $group: { _id: null, totalUsers: { $sum: 1 }, activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } } } }
            ]),
            // 3. New Shops This Month
            User.countDocuments({ role: 'owner', createdAt: { $gte: thisMonthStart } }),
            // 4. New Users This Month
            User.countDocuments({ role: { $in: ['owner', 'manager', 'cashier'] }, createdAt: { $gte: thisMonthStart } }),

            // 5. Total Lifetime Subscription Revenue
            Payment.aggregate([
                { $match: { status: 'paid' } },
                { $group: { _id: null, totalLifetime: { $sum: '$amount' } } }
            ]),

            // 6. Monthly Subscription Revenue Aggregation and Breakdown
            Payment.aggregate([
                { 
                    $match: { 
                        paymentDate: { $gte: thisMonthStart, $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1) }, 
                        status: 'paid' 
                    } 
                },
                // De-duplication: Group by shopId to get the latest payment per shop
                { 
                    $group: {
                        _id: '$shopId',
                        latestAmount: { $last: '$amount' }, 
                    }
                },
                // Join with User to get plan if not available on Payment model
                { 
                    $lookup: {
                        from: 'users', 
                        localField: '_id', 
                        foreignField: '_id',
                        as: 'ownerDetails'
                    }
                },
                { $unwind: '$ownerDetails' },
                // Group by the plan and sum the latest amounts
                {
                    $group: {
                        _id: '$ownerDetails.plan',
                        revenue: { $sum: '$latestAmount' }
                    }
                }
            ]),
        ]);

        // --- Calculate totalPlanRevenue from the breakdown result ---
        const actualPlanRevenueMap = new Map();
        let calculatedMonthlyPlanRevenue = 0;

        monthlyPlanRevenueBreakdown.forEach(item => {
            if (item._id) {
                actualPlanRevenueMap.set(item._id, item.revenue);
                calculatedMonthlyPlanRevenue += item.revenue;
            }
        });

        const monthlyPlanRevenue = calculatedMonthlyPlanRevenue;
        const totalPlanRevenue = allTimeSubscriptionRevenue[0]?.totalLifetime || 0;
        
        // --- Revenue Trend (Last 6 months - Plan Revenue) ---
        const monthlyTrendData = await Payment.aggregate([
            { 
                $match: { 
                    paymentDate: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
                    status: 'paid'
                } 
            },
            {
                // FIX IS HERE: The $group _id must be an object with fields pointing to expressions.
                $group: {
                    _id: { 
                        month: { $month: '$paymentDate' }, // Group by month
                        year: { $year: '$paymentDate' }   // And year
                    },
                    revenue: { $sum: '$amount' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } } // Sort by the grouped fields
        ]);
        
        // --- Process Aggregation Results ---
        
        // --- Shops and Plans (No Change) ---
        const planCountsMap = new Map();
        let totalShops = 0;
        let activeShops = 0;
        
        shopStats.forEach(stat => {
            const plan = stat._id || 'BASIC'; 
            planCountsMap.set(plan, { count: stat.count, activeCount: stat.activeCount, revenue: 0 });
            totalShops += stat.count;
            activeShops += stat.activeCount;
        });
        
        // Structure Plan Distribution
        const planDistribution = PLANS.reduce((acc, plan) => {
            const data = planCountsMap.get(plan) || { count: 0 };
            
            acc[plan.toLowerCase()] = {
                count: data.count,
                revenue: actualPlanRevenueMap.get(plan) || 0,
                percentage: totalShops > 0 ? Math.round((data.count / totalShops) * 100) : 0
            };
            return acc;
        }, {});
        
        // --- Remaining Metrics ---
        const revenueGrowth = 0; 
        
        const totalUsers = allUserStats[0]?.totalUsers || 0;
        const activeUsers = allUserStats[0]?.activeUsers || 0;
        
        const shopsGrowth = (totalShops - newShopsThisMonth) > 0
            ? (newShopsThisMonth / (totalShops - newShopsThisMonth)) * 100
            : 0;

        const paymentStatus = {
            paid: Math.floor(totalShops * 0.75),
            pending: Math.floor(totalShops * 0.20),
            failed: Math.floor(totalShops * 0.03),
            overdue: Math.max(0, totalShops - Math.floor(totalShops * 0.75) - Math.floor(totalShops * 0.20) - Math.floor(totalShops * 0.03))
        };
        
        // Map trend data
        const monthlyTrend = [];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        // Create a map key based on the correct grouping structure: { month: M, year: Y }
        const trendMap = new Map(monthlyTrendData.map(d => [`${d._id.year}-${d._id.month}`, d]));
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthIndex = date.getMonth() + 1; // 1-indexed month
            const year = date.getFullYear();
            const key = `${year}-${monthIndex}`;

            monthlyTrend.push({
                month: monthNames[date.getMonth()],
                revenue: trendMap.get(key) ? trendMap.get(key).revenue : 0
            });
        }
        
        res.json({
            success: true,
            data: {
                totalPlanRevenue: totalPlanRevenue,
                monthlyPlanRevenue: monthlyPlanRevenue,
                revenueGrowth: 0, 
                totalShops,
                activeShops,
                newShopsThisMonth,
                shopsGrowth: shopsGrowth.toFixed(2), 
                totalUsers,
                activeUsers,
                newUsersThisMonth, 
                planDistribution, 
                paymentStatus,
                monthlyTrend 
            }
        });
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({ success: false, error: 'Server error retrieving dashboard statistics.' });
    }
});

/**
 * @route GET /api/superadmin/reports
 * @desc Get global reports across all shops
 * @access Private (Superadmin only)
 */
router.get('/reports', superadminProtect, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const now = new Date();

        // Build date filter
        const dateFilter = {};
        if (startDate) {
            dateFilter.timestamp = { ...dateFilter.timestamp, $gte: new Date(startDate) };
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.timestamp = { ...dateFilter.timestamp, $lte: end };
        }

        // Get all sales in date range
        const sales = await Sale.find(dateFilter);

        // Calculate overall metrics
        const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalBills = sales.length;
        const averageBillValue = totalBills > 0 ? totalRevenue / totalBills : 0;

        // Get all shops
        const allShops = await User.find({ role: 'owner' });
        const totalShops = allShops.length;
        const activeShops = allShops.filter(shop => shop.isActive !== false).length;

        // Get all users (handle both cases for roles)
        const allUsers = await User.find({ role: { $in: ['owner', 'Owner', 'Manager', 'manager', 'Cashier', 'cashier'] } });
        const totalUsers = allUsers.length;

        // Top performing shops by revenue
        const shopRevenueMap = new Map();
        sales.forEach(sale => {
            const shopId = sale.shopId.toString();
            const current = shopRevenueMap.get(shopId) || { revenue: 0, bills: 0 };
            current.revenue += sale.totalAmount;
            current.bills += 1;
            shopRevenueMap.set(shopId, current);
        });

        const topShops = Array.from(shopRevenueMap.entries())
            .map(([shopId, data]) => {
                const shop = allShops.find(s => s._id.toString() === shopId);
                return {
                    shopId,
                    name: shop ? shop.email.split('@')[0] : 'Unknown',
                    location: shop?.location || 'N/A',
                    revenue: data.revenue,
                    bills: data.bills,
                    growth: (Math.random() * 20 - 5).toFixed(1) // Mock growth
                };
            })
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        // Plan performance (mock - would need plan field)
        const planPerformance = {
            basic: { shops: Math.floor(totalShops * 0.57), revenue: totalRevenue * 0.3, bills: Math.floor(totalBills * 0.3), avgRevenue: totalRevenue * 0.3 / Math.max(Math.floor(totalShops * 0.57), 1) },
            pro: { shops: Math.floor(totalShops * 0.33), revenue: totalRevenue * 0.5, bills: Math.floor(totalBills * 0.5), avgRevenue: totalRevenue * 0.5 / Math.max(Math.floor(totalShops * 0.33), 1) },
            enterprise: { shops: Math.floor(totalShops * 0.1), revenue: totalRevenue * 0.2, bills: Math.floor(totalBills * 0.2), avgRevenue: totalRevenue * 0.2 / Math.max(Math.floor(totalShops * 0.1), 1) }
        };

        // Calculate revenue trend (last 12 months)
        const revenueTrend = [];
        for (let i = 11; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            monthEnd.setHours(23, 59, 59, 999);

            const monthSales = sales.filter(sale =>
                sale.timestamp >= monthStart && sale.timestamp <= monthEnd
            );

            revenueTrend.push({
                month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                revenue: monthSales.reduce((sum, sale) => sum + sale.totalAmount, 0),
                bills: monthSales.length
            });
        }

        // Daily revenue (last 30 days)
        const dailyRevenue = [];
        for (let i = 29; i >= 0; i--) {
            const dayStart = new Date(now);
            dayStart.setDate(dayStart.getDate() - i);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setHours(23, 59, 59, 999);

            const daySales = sales.filter(sale =>
                sale.timestamp >= dayStart && sale.timestamp <= dayEnd
            );

            dailyRevenue.push({
                date: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                revenue: daySales.reduce((sum, sale) => sum + sale.totalAmount, 0),
                bills: daySales.length
            });
        }

        // Geographic distribution (mock - would need location field)
        const geographicData = [
            { state: 'Maharashtra', shops: Math.floor(totalShops * 0.29), revenue: totalRevenue * 0.35 },
            { state: 'Delhi', shops: Math.floor(totalShops * 0.21), revenue: totalRevenue * 0.25 },
            { state: 'Karnataka', shops: Math.floor(totalShops * 0.18), revenue: totalRevenue * 0.22 },
            { state: 'Tamil Nadu', shops: Math.floor(totalShops * 0.16), revenue: totalRevenue * 0.19 },
            { state: 'Gujarat', shops: Math.floor(totalShops * 0.12), revenue: totalRevenue * 0.14 },
            { state: 'Others', shops: totalShops % 5, revenue: totalRevenue * 0.05 }
        ];

        const previousPeriodRevenue = totalRevenue * 0.92;
        const revenueGrowth = ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100;

        res.json({
            success: true,
            data: {
                totalRevenue,
                totalBills,
                totalShops,
                activeShops,
                totalUsers,
                averageBillValue,
                revenueGrowth,
                topShops,
                planPerformance,
                revenueTrend,
                dailyRevenue,
                geographicData
            }
        });
    } catch (error) {
        console.error('Global Reports Error:', error);
        res.status(500).json({ success: false, error: 'Server error retrieving global reports.' });
    }
});

/**
 * @route GET /api/superadmin/shops/:id/payments
 * @desc Get payment history for a specific shop
 * @access Private (Superadmin only)
 */
router.get('/shops/:id/payments', superadminProtect, async (req, res) => {
    try {
        const shopId = req.params.id;

        // 1. Verify shop owner
        const owner = await User.findOne({ _id: shopId, role: 'owner' });
        if (!owner) {
            return res.status(404).json({ success: false, message: 'Shop/Owner not found.' });
        }

        const plan = owner.plan || 'BASIC';
        const subscriptionId = owner.transactionId;

        // 2. Fetch Local Payment History
        const paymentHistory = await Payment.find({ shopId: shopId })
            .sort({ paymentDate: -1 })
            .limit(12);

        // 3. FETCH DATA DIRECTLY FROM RAZORPAY API (The Source of Truth)
        let nextPaymentDate = null;

        if (subscriptionId) {
            try {
                // Fetch the live subscription object
                const subscription = await razorpay.subscriptions.fetch(subscriptionId);
                
                /**
                 * ⭐ FIXED LOGIC:
                 * During trial, Razorpay uses 'charge_at'.
                 * During active billing, Razorpay uses 'current_end'.
                 * We take whichever one represents the "Next Due Date".
                 */
                const rzpTimestamp = subscription.charge_at || subscription.current_end;
                
                if (rzpTimestamp) {
                    nextPaymentDate = new Date(rzpTimestamp * 1000);
                }
            } catch (rzpError) {
                console.error('Razorpay API Sync Error:', rzpError.description || rzpError);
            }
        }

        // 4. FALLBACK (Only if Razorpay API fails or subscriptionId is missing)
        if (!nextPaymentDate) {
            // Use the planEndDate stored in DB (which is now synced via Webhook/Verify routes)
            // or default to owner creation + 30 days
            nextPaymentDate = owner.planEndDate || new Date(new Date(owner.createdAt).setDate(new Date(owner.createdAt).getDate() + 30));
        }

        // 5. Response Formatting
        const planPrices = { 'BASIC': 499, 'PRO': 799, 'PREMIUM': 999 };
        const price = planPrices[plan] || planPrices['BASIC'];

        const now = new Date();
        const diffTime = nextPaymentDate - now;
        const daysUntilPayment = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        res.json({
            success: true,
            data: {
                paymentHistory: paymentHistory.map(p => ({
                    id: p._id,
                    date: p.paymentDate.toISOString(),
                    amount: p.amount, 
                    status: p.status, 
                    transactionId: p.paymentId || p.subscriptionId, 
                    method: 'Razorpay Auto-Debit', 
                })),
                upcomingPayment: {
                    date: nextPaymentDate.toISOString(),
                    amount: price,
                    daysUntil: daysUntilPayment
                },
                currentPlan: plan,
                billingCycle: 'Monthly',
                subscriptionId: subscriptionId
            }
        });
    } catch (error) {
        console.error('Payment History Fetch Error:', error);
        res.status(500).json({ success: false, error: 'Server error retrieving payment history.' });
    }
});

/**
 * @route   GET /api/superadmin/recent-activity
 * @desc    Get recent activity across shops for superadmin
 * @access  Private (Superadmin only)
 *
 * Query params:
 *  - limit (optional) : max number of activity items to return (default 20)
 *  - days  (optional) : lookback window in days (default 30)
 */
router.get('/recent-activity', superadminProtect, async (req, res) => {
    try {
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
        const days = Math.max(1, parseInt(req.query.days, 10) || 30);
        const since = new Date();
        since.setDate(since.getDate() - days);

        // Fetch recent items from multiple collections in parallel
        const [recentShops, recentSales, recentCustomers, recentInventories] = await Promise.all([
            // newly created owner accounts (shops)
            User.find({ role: 'owner', createdAt: { $gte: since } })
                .select('email createdAt location plan')
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean(),

            // recent sales
            Sale.find({ timestamp: { $gte: since } })
                .select('shopId totalAmount timestamp items paymentMethod')
                .sort({ timestamp: -1 })
                .limit(limit)
                .lean(),

            // newly created customers
            Customer.find({ createdAt: { $gte: since } })
                .select('shopId name phone createdAt outstandingCredit')
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean(),

            // inventory created/updated recently
            Inventory.find({
                $or: [
                    { createdAt: { $gte: since } },
                    { updatedAt: { $gte: since } }
                ]
            })
                .select('shopId name sku qty createdAt updatedAt action')
                .sort({ updatedAt: -1, createdAt: -1 })
                .limit(limit)
                .lean()
        ]);

        // Build map of shop details referenced in results
        const shopIds = new Set();
        recentShops.forEach(s => shopIds.add(s._id.toString()));
        recentSales.forEach(s => s.shopId && shopIds.add(s.shopId.toString()));
        recentCustomers.forEach(c => c.shopId && shopIds.add(c.shopId.toString()));
        recentInventories.forEach(i => i.shopId && shopIds.add(i.shopId.toString()));

        const shopDocs = await User.find({ _id: { $in: Array.from(shopIds) } })
            .select('email location')
            .lean();

        const shopMap = new Map(shopDocs.map(s => [s._id.toString(), s]));

        // Normalize each type into a common activity shape
        const activities = [];

        recentShops.forEach(s => {
            activities.push({
                type: 'shop_created',
                time: s.createdAt,
                shopId: s._id,
                shop: shopMap.get(s._id.toString())?.email || s.email,
                location: s.location || null,
                plan: s.plan || 'Basic',
                meta: { message: 'New shop created' }
            });
        });

        recentSales.forEach(sale => {
            activities.push({
                type: 'sale',
                time: sale.timestamp,
                shopId: sale.shopId,
                shop: sale.shopId ? (shopMap.get(sale.shopId.toString())?.email || sale.shopId.toString()) : 'Unknown',
                amount: sale.totalAmount,
                items: sale.items || [],
                meta: { paymentMethod: sale.paymentMethod || 'N/A' }
            });
        });

        recentCustomers.forEach(cust => {
            activities.push({
                type: 'customer_created',
                time: cust.createdAt,
                shopId: cust.shopId,
                shop: cust.shopId ? (shopMap.get(cust.shopId.toString())?.email || cust.shopId.toString()) : 'Unknown',
                customerName: cust.name,
                phone: cust.phone,
                outstandingCredit: cust.outstandingCredit || 0,
                meta: {}
            });
        });

        recentInventories.forEach(inv => {
            activities.push({
                type: 'inventory_change',
                time: inv.updatedAt || inv.createdAt,
                shopId: inv.shopId,
                shop: inv.shopId ? (shopMap.get(inv.shopId.toString())?.email || inv.shopId.toString()) : 'Unknown',
                itemName: inv.name,
                sku: inv.sku,
                qty: inv.qty,
                action: inv.action || (inv.createdAt && inv.updatedAt && inv.createdAt.getTime() === inv.updatedAt.getTime() ? 'created' : 'updated'),
                meta: {}
            });
        });

        // Sort by time desc and apply overall limit
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));
        const result = activities.slice(0, limit);

        res.json({ success: true, count: result.length, data: result });
    } catch (error) {
        console.error('Superadmin Recent Activity Error:', error);
        res.status(500).json({ success: false, error: 'Server error retrieving recent activity.' });
    }
})

/**
 * @route GET /api/superadmin/shops/:id/payment-status
 * @desc Get current month payment status for a shop
 * @access Private (Superadmin only)
 */
router.get('/shops/:id/payment-status', superadminProtect, async (req, res) => {
    try {
        const shopId = req.params.id;

        // Verify shop exists
        const shop = await User.findOne({ _id: shopId, role: 'owner' });
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: 'Shop not found.'
            });
        }

        // In a real system, this would query actual payment records
        // For now, generate status based on shop data
        const statuses = ['paid', 'pending', 'failed', 'overdue'];
        const weights = [0.7, 0.15, 0.1, 0.05];
        const random = Math.random();
        let cumulative = 0;
        let paymentStatus = 'paid';

        for (let i = 0; i < statuses.length; i++) {
            cumulative += weights[i];
            if (random < cumulative) {
                paymentStatus = statuses[i];
                break;
            }
        }

        res.json({
            success: true,
            data: {
                status: paymentStatus,
                currentMonth: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            }
        });
    } catch (error) {
        console.error('Payment Status Error:', error);
        res.status(500).json({ success: false, error: 'Server error retrieving payment status.' });
    }
});



module.exports = router;