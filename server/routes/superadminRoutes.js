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
        // Find all users who are owners, as in this design, the owner represents the shop entry.
        // We exclude the superadmin user from this list.
        const shops = await User.find({ role: 'owner' }).select('-password -resetPasswordToken -resetPasswordExpire');

        if (!shops.length) {
            return res.status(200).json({ success: true, message: 'No shops registered yet.', data: [] });
        }

        // Get staff counts for each shop
        const shopIds = shops.map(shop => shop._id);
        const staffCounts = await User.aggregate([
            { $match: { shopId: { $in: shopIds }, role: { $in: ['Manager', 'Cashier', 'manager', 'cashier'] } } },
            {
                $group: {
                    _id: '$shopId',
                    managers: {
                        $sum: {
                            $cond: [
                                { $in: ['$role', ['Manager', 'manager']] },
                                1,
                                0
                            ]
                        }
                    },
                    cashiers: {
                        $sum: {
                            $cond: [
                                { $in: ['$role', ['Cashier', 'cashier']] },
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
            staffCountMap.set(item._id.toString(), { manager: item.managers, cashier: item.cashiers });
        });

        // Enhance shop data with calculated tenure and mock performance (30D)
        const shopsWithDetails = shops.map(shop => {
            // Calculate tenure in days using the Mongoose 'createdAt' timestamp
            // --- CORE LOGIC FOR TENURE ---
            const daysActive = Math.floor((Date.now() - shop.createdAt.getTime()) / (1000 * 60 * 60 * 24));
            // ----------------------------

            // Mocking Performance Trend (0: flat, 1: up, 2: down)
            const trendValue = Math.floor(Math.random() * 3);
            let trendType = 'flat';
            if (trendValue === 1) trendType = 'up';
            else if (trendValue === 2) trendType = 'down';

            // Mock performance metric (e.g., Revenue change)
            const performanceMetric = (Math.random() * 10).toFixed(2) + '%';

            // Get staff counts
            const staffCount = staffCountMap.get(shop._id.toString()) || { manager: 0, cashier: 0 };

            // Generate payment status (mock - would need actual payment model)
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

            return {
                ...shop.toObject(), // Convert Mongoose document to plain object
                // Injecting the requested fields for the frontend table:
                dateJoined: shop.createdAt.toISOString().split('T')[0], // YYYY-MM-DD for reliable date sorting
                tenureDays: daysActive, // 🚀 This is the field the frontend needs
                performanceTrend: { metric: performanceMetric, trend: trendType },
                // Add sensible defaults for other missing fields needed by the frontend, 
                // e.g., plan, managerCount, cashierCount, location, if they aren't on the User model
                plan: shop.plan || 'Basic', // Use plan from user or default
                managerCount: staffCount.manager,
                cashierCount: staffCount.cashier,
                location: shop.location || 'City, State', // Use location from user or default
                paymentStatus: paymentStatus, // Current month payment status
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
        // Find the user by ID and ensure they have the 'owner' role
        const shop = await User.findOne({ _id: req.params.id, role: 'owner' }).select('-password -resetPasswordToken -resetPasswordExpire');

        if (!shop) {
            return res.status(404).json({ success: false, message: `Shop with ID ${req.params.id} not found or is not an owner account.` });
        }

        res.json({
            success: true,
            data: shop
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
        const shop = await User.findOne({ _id: shopId, role: 'owner' });

        if (!shop) {
            return res.status(404).json({ success: false, message: `Shop with ID ${shopId} not found or is not an owner account.` });
        }

        // 2. Perform the deletion of the owner document (representing the shop)
        await shop.deleteOne();

        // 3. Respond success
        res.json({
            success: true,
            message: `Shop '${shop.email}' (ID: ${shopId}) and associated owner account successfully deleted.`
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
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        // Get all shops
        const allShops = await User.find({ role: 'owner' });
        const totalShops = allShops.length;
        const activeShops = allShops.filter(shop => shop.isActive !== false).length;

        // Get all sales (this month and last month)
        const [thisMonthSales, lastMonthSales, allTimeSales] = await Promise.all([
            Sale.find({ timestamp: { $gte: thisMonth } }),
            Sale.find({ timestamp: { $gte: lastMonth, $lt: thisMonth } }),
            Sale.find({})
        ]);

        // Calculate revenue
        const monthlyRevenue = thisMonthSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const lastMonthRevenue = lastMonthSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalRevenue = allTimeSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const revenueGrowth = lastMonthRevenue > 0
            ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
            : 0;

        // Get all users (handle both cases for roles)
        const allUsers = await User.find({ role: { $in: ['owner', 'Owner', 'Manager', 'manager', 'Cashier', 'cashier'] } });
        const totalUsers = allUsers.length;
        const activeUsers = allUsers.filter(user => user.isActive !== false).length;

        // Calculate plan distribution (count shops by plan)
        const planCounts = {
            basic: allShops.filter(s => (s.plan || 'Basic').toLowerCase() === 'basic').length,
            pro: allShops.filter(s => (s.plan || 'Basic').toLowerCase() === 'pro').length,
            enterprise: allShops.filter(s => (s.plan || 'Basic').toLowerCase() === 'enterprise').length
        };

        // Calculate revenue per plan (from sales)
        const planRevenue = { basic: 0, pro: 0, enterprise: 0 };
        const planPrices = { basic: 2499, pro: 6999, enterprise: 16999 };

        allShops.forEach(shop => {
            const plan = (shop.plan || 'Basic').toLowerCase();
            if (plan === 'basic' || plan === 'pro' || plan === 'enterprise') {
                planRevenue[plan] += planPrices[plan] || 0;
            }
        });

        const totalPlanRevenue = Object.values(planRevenue).reduce((sum, rev) => sum + rev, 0);
        const planDistribution = {
            basic: {
                count: planCounts.basic,
                revenue: planRevenue.basic,
                percentage: totalShops > 0 ? Math.round((planCounts.basic / totalShops) * 100) : 0
            },
            pro: {
                count: planCounts.pro,
                revenue: planRevenue.pro,
                percentage: totalShops > 0 ? Math.round((planCounts.pro / totalShops) * 100) : 0
            },
            enterprise: {
                count: planCounts.enterprise,
                revenue: planRevenue.enterprise,
                percentage: totalShops > 0 ? Math.round((planCounts.enterprise / totalShops) * 100) : 0
            }
        };

        // Calculate new shops this month
        const newShopsThisMonth = allShops.filter(shop =>
            shop.createdAt >= thisMonth
        ).length;
        const shopsGrowth = (totalShops - newShopsThisMonth) > 0
            ? (newShopsThisMonth / (totalShops - newShopsThisMonth)) * 100
            : 0;

        // Calculate new users this month
        const newUsersThisMonth = allUsers.filter(user =>
            user.createdAt >= thisMonth
        ).length;

        // Payment status (mock - would need payment model)
        const paymentStatus = {
            paid: Math.floor(totalShops * 0.7),
            pending: Math.floor(totalShops * 0.2),
            failed: Math.floor(totalShops * 0.08),
            overdue: Math.floor(totalShops * 0.02)
        };

        // Generate monthly revenue trend (last 6 months) from actual sales
        const monthlyTrend = [];
        for (let i = 5; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            monthEnd.setHours(23, 59, 59, 999);

            const monthSales = allTimeSales.filter(sale =>
                sale.timestamp >= monthStart && sale.timestamp <= monthEnd
            );

            monthlyTrend.push({
                month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
                revenue: monthSales.reduce((sum, sale) => sum + sale.totalAmount, 0)
            });
        }

        res.json({
            success: true,
            data: {
                totalRevenue,
                monthlyRevenue,
                revenueGrowth,
                totalShops,
                activeShops,
                newShopsThisMonth,
                shopsGrowth,
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