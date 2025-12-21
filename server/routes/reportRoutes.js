// routes/salesRouter.js

const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Sale = require('../models/Sale');
const Customer = require('../models/Customer');
const Inventory = require('../models/Inventory');

const router = express.Router();

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
    const defaultAggregation = { $dayOfYear: "$timestamp" };
    const defaultLabel = "Day";
    const defaultSortKey = "timestamp";

    switch (viewType) {
        case 'monthly':
            return { 
                id: { $month: "$timestamp" }, // Group by month number
                label: "Month", 
                sortKey: "_id" // Sort by the month number
            };
        case 'weekly':
            return { 
                id: { $week: "$timestamp" }, // Group by week number
                label: "Week", 
                sortKey: "_id" // Sort by the week number
            };
        case 'daily': // Fallthrough or explicit
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
        const dateFilter = getSalesDateFilter(req);
        
        // SCOPED QUERY: Add shopId to dateFilter for sales
        const salesFilter = { ...dateFilter, shopId: req.user.shopId };
        
        // Step 1: Fetch filtered sales, customers, AND ALL INVENTORY ITEMS (all scoped)
        const [filteredSales, customers, inventoryItems, allTimeSales] = await Promise.all([
            Sale.find(salesFilter),
            Customer.find({ shopId: req.user.shopId }), // Scoped
            Inventory.find({ shopId: req.user.shopId }), // Scoped
            Sale.find({ shopId: req.user.shopId }), // Scoped for all-time stats
        ]);
        
        // Create a quick lookup map for current inventory names and prices
        const inventoryMap = new Map();
        inventoryItems.forEach(item => {
            inventoryMap.set(item._id.toString(), { 
                name: item.name, 
                price: item.price
            });
        });


        // Step 2: Calculate Metrics 
        let revenue = 0;
        let billsRaised = filteredSales.length; 
        let itemVolumeMap = new Map();
        let totalVolume = 0;

        filteredSales.forEach(sale => {
            revenue += sale.totalAmount;
            
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
            });
        });

        const averageBillValue = billsRaised > 0 ? revenue / billsRaised : 0;
        
        const topItems = Array.from(itemVolumeMap.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
            
        const totalCreditOutstanding = customers.reduce((sum, cust) => sum + (cust.outstandingCredit || 0), 0);
        
        // Step 3: All-time stats for the Financial Summary block
        const totalAllTimeRevenue = allTimeSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalAllTimeBills = allTimeSales.length;


        res.json({
            revenue,
            billsRaised,
            averageBillValue,
            volume: totalVolume,
            topItems,
            totalCreditOutstanding,
            totalAllTimeRevenue, 
            totalAllTimeBills,
        });

    } catch (error) {
        console.error('Reports Summary API Error:', error);
        res.status(500).json({ error: 'Failed to generate report summary.' });
    }
});


// --- API ENDPOINT: CHART DATA ---
router.get('/chart-data', protect, async (req, res) => {
    try {
        const dateFilter = getSalesDateFilter(req);
        const { viewType } = req.query; 
        
        // We still call this to get the labelName (e.g., 'Day')
        const { label: labelName } = getChartAggregation(viewType);

        // Define the date format based on viewType
        let dateFormat = "%Y-%m-%d"; // Default for 'Day'
        if (viewType === 'Month') dateFormat = "%Y-%m";
        if (viewType === 'Week') dateFormat = "%Y-W%U";

        const matchStage = { $match: { 
            ...dateFilter, 
            shopId: req.user.shopId 
        } }; 

        const chartData = await Sale.aggregate([
            matchStage,
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

        res.json(chartData);
    } catch (error) {
        console.error('Reports Chart Data API Error:', error);
        res.status(500).json({ error: 'Failed to generate chart data.' });
    }
});


module.exports = router;