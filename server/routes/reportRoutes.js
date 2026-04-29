// routes/reportRoutes.js

const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');
const Sale = require('../models/Sale');
const Customer = require('../models/Customer');
const Inventory = require('../models/Inventory');
const Store = require('../models/Store');

const router = express.Router();

const canAccessReports = async (req) => {
    const role = req.user?.role;
    if (role === 'owner' || role === 'superadmin') return true;
    if (role !== 'Manager' && role !== 'Cashier') return false;
    if (!req.user?.storeId) return false;
    const store = await Store.findById(req.user.storeId).select('settings.rolePagePermissions').lean();
    const pagePermissions = store?.settings?.rolePagePermissions || {};
    const roleKey = role === 'Manager' ? 'manager' : 'cashier';
    return pagePermissions?.[roleKey]?.reports === true;
};

// --- HELPER 1: Date Range Filter ---
const getSalesDateFilter = (req) => {
    const { startDate, endDate } = req.query;
    let filter = {};

    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); 
        filter.$gte = start;
    }

    if (endDate) {
        // Use $lt (Less Than) the start of the NEXT day
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        end.setHours(0, 0, 0, 0);
        filter.$lt = end; 
    }

    return (startDate || endDate) ? { timestamp: filter } : {};
};

// --- HELPER 2: Chart Aggregation Logic (NEW/UPDATED) ---
const getChartAggregation = (viewType) => {
    // Normalize viewType to handle both lowercase and capitalized inputs
    const normalized = (viewType || '').toLowerCase();
    
    switch (normalized) {
        case 'month':
        case 'monthly':
            return { 
                id: { $month: "$timestamp" }, // Group by month number
                label: "Month", 
                sortKey: "_id" // Sort by the month number
            };
        case 'week':
        case 'weekly':
            return { 
                id: { $week: "$timestamp" }, // Group by week number
                label: "Week", 
                sortKey: "_id" // Sort by the week number
            };
        case 'day':
        case 'daily':
        default:
            return { 
                id: { $dayOfYear: "$timestamp" }, // Group by day of year
                label: "Day", 
                sortKey: "_id" // Sort by the day number
            };
    }
};

// --- API ENDPOINT: SUMMARY ---
router.get('/summary', protect, async (req, res) => {
    try {
        const hasAccess = await canAccessReports(req);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied. Reports access is disabled for your account.' });
        }
        const dateFilter = getSalesDateFilter(req);
        
        // SCOPED QUERY: Add shopId to dateFilter for sales
        if (!req.user.storeId) {
            return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
        }
        const salesFilter = { ...dateFilter, storeId: req.user.storeId };
        
        // Step 1: Fetch filtered sales, customers, AND ALL INVENTORY ITEMS (all scoped) - Optimized with lean and projections
        const [filteredSales, customers, inventoryItems, allTimeSales] = await Promise.all([
            Sale.find(salesFilter).select('totalAmount timestamp items paymentMethod amountPaid amountCredited').lean(),
            Customer.find({ storeId: req.user.storeId }).select('name outstandingCredit').lean(), // Scoped
            Inventory.find({ storeId: req.user.storeId }).select('name price _id textileMeta').lean(), // Scoped — textileMeta for fabric/brand sold
            Sale.find({ storeId: req.user.storeId }).select('totalAmount timestamp').lean(), // Scoped for all-time stats
        ]);
        
        // Lookup map: inventory line + textile meta (for fabric/brand attribution on sold qty)
        const inventoryMap = new Map();
        inventoryItems.forEach(item => {
            inventoryMap.set(item._id.toString(), { 
                name: item.name, 
                price: item.price,
                textileMeta: item.textileMeta || {}
            });
        });


        // Step 2: Calculate Metrics 
        let revenue = 0;
        let billsRaised = filteredSales.length; 
        let itemVolumeMap = new Map();
        let totalVolume = 0;
        const sizeCountMap = new Map();
        const colorCountMap = new Map();
        const fabricSoldMap = new Map();
        const brandSoldMap = new Map();
        let cashTotal = 0;
        let upiTotal = 0;
        let cardTotal = 0;
        let creditTotal = 0;
        let mixedPaidTotal = 0;
        let mixedCreditTotal = 0;

        filteredSales.forEach(sale => {
            revenue += sale.totalAmount;
            const method = String(sale.paymentMethod || '').trim();
            const amountPaid = Number(sale.amountPaid || 0);
            const amountCredited = Number(sale.amountCredited || 0);

            if (method === 'Cash') cashTotal += Number(sale.totalAmount || 0);
            else if (method === 'UPI') upiTotal += Number(sale.totalAmount || 0);
            else if (method === 'Card') cardTotal += Number(sale.totalAmount || 0);
            else if (method === 'Credit') creditTotal += Number(sale.totalAmount || 0);
            else if (method === 'Mixed') {
                mixedPaidTotal += amountPaid;
                mixedCreditTotal += amountCredited;
                creditTotal += amountCredited;
            }
            
            (sale.items || []).forEach(item => {
                // Ensure itemId is always treated as a string for Map key
                const key = item.itemId ? item.itemId.toString() : 'Unknown'; 
                
                // Use fallback item.name if current inventory item is missing (deleted)
                const currentInventoryData = inventoryMap.get(key);
                const itemName = currentInventoryData ? currentInventoryData.name : (item.name || 'Unknown Item');

                const current = itemVolumeMap.get(key) || { name: itemName, quantity: 0 };
                
                current.name = itemName; 
                current.quantity += item.quantity;
                
                itemVolumeMap.set(key, current);
                totalVolume += item.quantity;

                if (item.variantSize) {
                    const sizeKey = String(item.variantSize).trim().toLowerCase();
                    if (sizeKey) {
                        sizeCountMap.set(sizeKey, (sizeCountMap.get(sizeKey) || 0) + (item.quantity || 0));
                    }
                }
                if (item.variantColor) {
                    const colorKey = String(item.variantColor).trim().toLowerCase();
                    if (colorKey) {
                        colorCountMap.set(colorKey, (colorCountMap.get(colorKey) || 0) + (item.quantity || 0));
                    }
                }

                // Fabric / brand sold (units), from product textile meta — same as grocery when meta empty
                const tm = currentInventoryData?.textileMeta;
                if (tm && typeof tm === 'object') {
                    const fabricRaw = tm.fabric;
                    if (fabricRaw && String(fabricRaw).trim()) {
                        const fk = String(fabricRaw).trim().toLowerCase();
                        fabricSoldMap.set(fk, (fabricSoldMap.get(fk) || 0) + (item.quantity || 0));
                    }
                    const brandRaw = tm.brand;
                    if (brandRaw && String(brandRaw).trim()) {
                        const bk = String(brandRaw).trim().toLowerCase();
                        brandSoldMap.set(bk, (brandSoldMap.get(bk) || 0) + (item.quantity || 0));
                    }
                }
            });
        });

        const averageBillValue = billsRaised > 0 ? revenue / billsRaised : 0;
        
        // Get limit from query params, default to 5 for backward compatibility
        const limit = parseInt(req.query.topItemsLimit) || 5;
        
        const topItems = Array.from(itemVolumeMap.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, limit);
            
        const totalCreditOutstanding = customers.reduce((sum, cust) => sum + (cust.outstandingCredit || 0), 0);
        
        // Step 3: All-time stats for the Financial Summary block
        const totalAllTimeRevenue = allTimeSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalAllTimeBills = allTimeSales.length;

        const topSizes = Array.from(sizeCountMap.entries())
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 8);

        const topColors = Array.from(colorCountMap.entries())
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 8);

        const topFabrics = Array.from(fabricSoldMap.entries())
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 8);

        const topBrands = Array.from(brandSoldMap.entries())
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 8);


        res.json({
            revenue,
            billsRaised,
            averageBillValue,
            volume: totalVolume,
            topItems,
            totalCreditOutstanding,
            totalAllTimeRevenue, 
            totalAllTimeBills,
            paymentTotals: {
                cashTotal,
                upiTotal,
                cardTotal,
                creditTotal,
                mixedPaidTotal,
                mixedCreditTotal,
            },
            textileInsights: {
                topSizes,
                topColors,
                topFabrics,
                topBrands
            }
        });

    } catch (error) {
        console.error('Reports Summary API Error:', error);
        res.status(500).json({ error: 'Failed to generate report summary.' });
    }
});


// --- API ENDPOINT: CHART DATA ---
router.get('/chart-data', protect, async (req, res) => {
    try {
        const hasAccess = await canAccessReports(req);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied. Reports access is disabled for your account.' });
        }
        const dateFilter = getSalesDateFilter(req);
        const { viewType } = req.query; 
        
        // Normalize viewType to handle both lowercase and capitalized inputs
        const normalizedViewType = (viewType || '').toLowerCase();
        
        // Get the label name (e.g., 'Day', 'Week', 'Month')
        const { label: labelName } = getChartAggregation(viewType);

        // Define the date format based on normalized viewType
        let dateFormat = "%Y-%m-%d"; // Default for 'Day'
        if (normalizedViewType === 'month' || normalizedViewType === 'monthly') {
            dateFormat = "%Y-%m";
        } else if (normalizedViewType === 'week' || normalizedViewType === 'weekly') {
            dateFormat = "%Y-W%U";
        }

        // Check if storeId is available
        if (!req.user.storeId) {
            return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
        }

        // Build the match filter properly - ensure storeId is ObjectId
        const matchFilter = { 
            storeId: mongoose.Types.ObjectId.isValid(req.user.storeId) 
                ? new mongoose.Types.ObjectId(req.user.storeId) 
                : req.user.storeId
        };
        
        // Add date filter if it exists - properly structure it
        if (dateFilter && dateFilter.timestamp) {
            if (dateFilter.timestamp.$gte || dateFilter.timestamp.$lt) {
                matchFilter.timestamp = {};
                if (dateFilter.timestamp.$gte) {
                    matchFilter.timestamp.$gte = new Date(dateFilter.timestamp.$gte);
                }
                if (dateFilter.timestamp.$lt) {
                    matchFilter.timestamp.$lt = new Date(dateFilter.timestamp.$lt);
                }
            }
        }

        console.log('Chart Data Query:', JSON.stringify({
            storeId: req.user.storeId,
            storeIdType: typeof req.user.storeId,
            dateFilter: dateFilter,
            matchFilter: matchFilter,
            viewType: viewType,
            normalizedViewType: normalizedViewType,
            dateFormat: dateFormat,
            labelName: labelName
        }, null, 2));

        const chartData = await Sale.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    // Use dateToString to get an actual date string as the ID
                    _id: { 
                        $dateToString: { format: dateFormat, date: "$timestamp" } 
                    }, 
                    revenue: { $sum: "$totalAmount" },
                    bills: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    [labelName]: "$_id", 
                    revenue: 1,
                    bills: 1
                }
            },
            // Sorting by date string works alphabetically/chronologically for ISO formats
            { $sort: { [labelName]: 1 } }
        ]);

        console.log('Chart Data Result:', {
            count: chartData.length,
            sample: chartData.slice(0, 3),
            allData: chartData
        });

        // Always return 200 with an array, even if empty
        return res.status(200).json(chartData || []);
    } catch (error) {
        console.error('Reports Chart Data API Error:', error);
        res.status(500).json({ error: 'Failed to generate chart data.' });
    }
});


module.exports = router;