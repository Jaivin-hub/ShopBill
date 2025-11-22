const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const User = require('../models/User'); // Reusing the User model for shop data (as shopId is linked)
const Sale = require('../models/Sale');
const Customer = require('../models/Customer');
const Inventory = require('../models/Inventory');

const router = express.Router();

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
 * @route GET /api/superadmin/shops
 * @desc Get a list of all shops (User documents where role is 'owner')
 * @access Private (Superadmin only)
 */
router.get('/shops', superadminProtect, async (req, res) => {
    try {
        // Find all users who are owners, as the owner represents the shop entry.
        // 1. SORTING: Add .sort({ createdAt: -1 }) for Last-In, First-Out order.
        const shops = await User.find({ role: 'owner' })
            .sort({ createdAt: -1 }) // Sort by creation date descending (newest first)
            .select('-password -resetPasswordToken -resetPasswordExpire');

        if (!shops.length) {
            return res.status(200).json({ success: true, message: 'No shops registered yet.', data: [] });
        }

        // Get staff counts for each shop
        const shopIds = shops.map(shop => shop._id);
        const staffCounts = await User.aggregate([
            { $match: { shopId: { $in: shopIds }, role: { $in: ['Manager', 'Cashier'] } } }, // Match only relevant staff roles
            {
                $group: {
                    _id: '$shopId',
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
                    }
                }
            }
        ]);

        const staffCountMap = new Map();
        staffCounts.forEach(item => {
            staffCountMap.set(item._id.toString(), { managerCount: item.managerCount, cashierCount: item.cashierCount });
        });

        // Enhance shop data with calculated tenure, payment status, and mock performance
        const shopsWithDetails = shops.map(shop => {
            const shopObject = shop.toObject();
            
            // --- CORE LOGIC FOR TENURE ---
            const daysActive = Math.floor((Date.now() - shop.createdAt.getTime()) / (1000 * 60 * 60 * 24));
            
            // --- PAYMENT STATUS LOGIC (Mocked, but using transactionId for stability) ---
            let paymentStatus = 'paid';
            
            // Generate a 'deterministic' random value based on the transactionId or shopId
            // This makes the mock status stick to the shop entry across multiple API calls.
            const hash = shopObject.transactionId ? shopObject.transactionId.charCodeAt(0) : shopObject._id.toString().charCodeAt(0);
            
            if (hash % 10 === 0) {
                paymentStatus = 'overdue'; // ~10% chance
            } else if (hash % 7 === 0) {
                paymentStatus = 'failed'; // ~14% chance
            } else if (hash % 5 === 0) {
                paymentStatus = 'pending'; // ~20% chance
            } else {
                paymentStatus = 'paid';
            }
            // --------------------------------------------------------------------------

            // Mock Performance Trend (0: flat, 1: up, 2: down) - Still uses pure random as it's time-based data
            const trendValue = Math.floor(Math.random() * 3);
            let trendType = 'flat';
            if (trendValue === 1) trendType = 'up';
            else if (trendValue === 2) trendType = 'down';

            // Mock performance metric
            const performanceMetric = (Math.random() * 10).toFixed(2) + '%';

            // Get staff counts
            const staffCount = staffCountMap.get(shop._id.toString()) || { managerCount: 0, cashierCount: 0 };


            return {
                ...shopObject, 
                // shopName is now available because it's on the User schema and returned by find()
                shopName: shopObject.shopName, 
                dateJoined: shop.createdAt.toISOString().split('T')[0], // YYYY-MM-DD
                tenureDays: daysActive, 
                performanceTrend: { metric: performanceMetric, trend: trendType },
                plan: shop.plan || 'BASIC', 
                managerCount: staffCount.managerCount,
                cashierCount: staffCount.cashierCount,
                location: shop.location || 'N/A', 
                paymentStatus: paymentStatus, 
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
                    price: 2499,
                    features: ['Basic Inventory Management', 'Up to 5 Users', 'Email Support'],
                    maxUsers: 5,
                    maxInventory: 1000,
                    maxStorage: 10,
                },
                pro: {
                    name: 'Pro',
                    price: 6999,
                    features: ['Advanced Inventory', 'Up to 20 Users', 'Priority Support', 'Advanced Reports'],
                    maxUsers: 20,
                    maxInventory: 10000,
                    maxStorage: 50,
                },
                enterprise: {
                    name: 'Enterprise',
                    price: 16999,
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
router.get('/dashboard', superadminProtect, async (req, res) => {
    try {
        // --- Date Helpers ---
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        
        // Plan Mapping (Must match UserSchema)
        const PLANS = ['BASIC', 'PRO', 'PREMIUM'];
        const planPrices = { BASIC: 2499, PRO: 6999, PREMIUM: 16999 };

        // --- Parallel Data Fetching & Aggregation ---
        const [
            shopStats,
            allUserStats,
            monthlySales,
            lastMonthSales,
            allTimeSales,
            newShopsThisMonth,
            newUsersThisMonth
        ] = await Promise.all([
            // 1. Shop Counts and Plan Distribution (Owners only)
            User.aggregate([
                { $match: { role: 'owner' } },
                {
                    $group: {
                        _id: '$plan',
                        count: { $sum: 1 },
                        activeCount: { $sum: { $cond: ['$isActive', 1, 0] } }
                    }
                }
            ]),
            
            // 2. Total User and Active User Counts (All Non-Superadmin)
            User.aggregate([
                { $match: { role: { $in: ['owner', 'Manager', 'Cashier'] } } },
                {
                    $group: {
                        _id: null,
                        totalUsers: { $sum: 1 },
                        activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } }
                    }
                }
            ]),
            
            // 3. Current Month Sales
            Sale.aggregate([
                { $match: { timestamp: { $gte: thisMonthStart } } },
                { $group: { _id: null, totalAmount: { $sum: '$totalAmount' } } }
            ]),

            // 4. Last Month Sales
            Sale.aggregate([
                { $match: { timestamp: { $gte: lastMonthStart, $lt: thisMonthStart } } },
                { $group: { _id: null, totalAmount: { $sum: '$totalAmount' } } }
            ]),

            // 5. All Sales (Used for trend, will optimize later if volume is huge)
            Sale.find({}).select('totalAmount timestamp'),
            
            // 6. New Shops This Month
            User.countDocuments({ role: 'owner', createdAt: { $gte: thisMonthStart } }),

            // 7. New Users This Month
            User.countDocuments({ role: { $in: ['owner', 'Manager', 'Cashier'] }, createdAt: { $gte: thisMonthStart } }),
        ]);

        // --- Process Aggregation Results ---
        
        // --- Shops and Plans ---
        const planCountsMap = new Map();
        let totalShops = 0;
        let activeShops = 0;
        
        shopStats.forEach(stat => {
            const plan = stat._id || 'BASIC'; // Handle null plan as BASIC
            planCountsMap.set(plan, {
                count: stat.count,
                activeCount: stat.activeCount,
                revenue: (stat.activeCount || 0) * (planPrices[plan] || 0) // Mock subscription revenue
            });
            totalShops += stat.count;
            activeShops += stat.activeCount;
        });

        // Structure Plan Distribution
        const planDistribution = PLANS.reduce((acc, plan) => {
            const data = planCountsMap.get(plan) || { count: 0, revenue: 0 };
            acc[plan.toLowerCase()] = {
                count: data.count,
                revenue: data.revenue,
                percentage: totalShops > 0 ? Math.round((data.count / totalShops) * 100) : 0
            };
            return acc;
        }, {});
        
        const totalPlanRevenue = Object.values(planDistribution).reduce((sum, item) => sum + item.revenue, 0);

        // --- Revenue and Growth ---
        const monthlyRevenue = monthlySales[0]?.totalAmount || 0;
        const lastMonthRevenue = lastMonthSales[0]?.totalAmount || 0;
        const totalRevenue = allTimeSales.reduce((sum, sale) => sum + sale.totalAmount, 0); // Still relying on JS reduction of a large array for this single field
        
        const revenueGrowth = lastMonthRevenue > 0
            ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
            : 0;

        // --- Users ---
        const totalUsers = allUserStats[0]?.totalUsers || 0;
        const activeUsers = allUserStats[0]?.activeUsers || 0;

        // --- Growth Metrics ---
        const shopsGrowth = (totalShops - newShopsThisMonth) > 0
            ? (newShopsThisMonth / (totalShops - newShopsThisMonth)) * 100
            : 0;

        // --- Payment Status (Mocked) ---
        // Using fixed percentages for dashboard view (75% Paid, 20% Pending, 3% Failed, 2% Overdue)
        const paymentStatus = {
            paid: Math.floor(totalShops * 0.75),
            pending: Math.floor(totalShops * 0.20),
            failed: Math.floor(totalShops * 0.03),
            overdue: totalShops - Math.floor(totalShops * 0.75) - Math.floor(totalShops * 0.20) - Math.floor(totalShops * 0.03)
        };
        
        // --- Monthly Revenue Trend (Last 6 months) ---
        const monthlyTrend = [];
        for (let i = 5; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            monthEnd.setHours(23, 59, 59, 999);

            // Filter sales for this specific month (O(N) operation on the allTimeSales array)
            const monthSales = allTimeSales.filter(sale =>
                sale.timestamp >= monthStart && sale.timestamp <= monthEnd
            );

            monthlyTrend.push({
                month: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                revenue: monthSales.reduce((sum, sale) => sum + sale.totalAmount, 0)
            });
        }
        
        res.json({
            success: true,
            data: {
                // Revenue
                totalSalesRevenue: totalRevenue, // Renamed for clarity
                monthlySalesRevenue: monthlyRevenue,
                revenueGrowth: revenueGrowth.toFixed(2), // Sales Revenue Growth %
                totalPlanRevenue: totalPlanRevenue, // Mocked Subscription Revenue
                
                // Shops
                totalShops,
                activeShops,
                newShopsThisMonth,
                shopsGrowth: shopsGrowth.toFixed(2), // Shop Growth %
                
                // Users
                totalUsers,
                activeUsers,
                newUsersThisMonth,
                
                // Distribution & Status
                planDistribution,
                paymentStatus,
                monthlyTrend // Last 6 months sales trend
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

        // Verify shop exists
        const shop = await User.findOne({ _id: shopId, role: 'owner' });
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: 'Shop not found.'
            });
        }

        // In a real system, this would query a Payment model
        // For now, we'll generate mock payment history based on shop creation date
        const now = new Date();
        const paymentHistory = [];
        const planPrices = {
            'Basic': 2499,
            'Pro': 6999,
            'Enterprise': 16999
        };
        const plan = shop.plan || 'Basic';
        const price = planPrices[plan] || planPrices['Basic'];

        // Generate last 6 months of payment history
        for (let i = 5; i >= 0; i--) {
            const paymentDate = new Date(now);
            paymentDate.setMonth(paymentDate.getMonth() - i);

            const isPaid = Math.random() > 0.15;
            const status = isPaid ? 'paid' : 'failed';

            paymentHistory.push({
                id: `payment-${i}`,
                date: paymentDate.toISOString(),
                amount: price,
                status: status,
                transactionId: `TXN${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
                method: ['Credit Card', 'Debit Card', 'Bank Transfer', 'UPI'][Math.floor(Math.random() * 4)],
            });
        }

        // Generate upcoming payment
        const nextPaymentDate = new Date(now);
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        nextPaymentDate.setDate(1);
        const daysUntilPayment = Math.ceil((nextPaymentDate - now) / (1000 * 60 * 60 * 24));

        res.json({
            success: true,
            data: {
                paymentHistory: paymentHistory.sort((a, b) => new Date(b.date) - new Date(a.date)),
                upcomingPayment: {
                    date: nextPaymentDate.toISOString(),
                    amount: price,
                    daysUntil: daysUntilPayment
                },
                currentPlan: plan,
                billingCycle: 'Monthly'
            }
        });
    } catch (error) {
        console.error('Payment History Error:', error);
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