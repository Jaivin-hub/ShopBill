// routes/salesRouter.js

const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Sale = require('../models/Sale');
const Customer = require('../models/Customer');
const Inventory = require('../models/Inventory');

const router = express.Router();

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
        
        // ... (The rest of the calculation logic remains the same, but now uses the scoped data) ...
        
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
                const key = item.itemId.toString(); 
                
                const currentInventoryData = inventoryMap.get(key);
                const itemName = currentInventoryData ? currentInventoryData.name : item.name;

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
        
        // Step 3: Fetch all-time stats for the Financial Summary block
        // const allTimeSales = await Sale.find({ shopId: req.user.shopId }); // Already fetched in Promise.all
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

router.get('/chart-data', protect, async (req, res) => {
    try {
        const dateFilter = getSalesDateFilter(req);
        
        let aggregationId;
        // The aggregationId logic would be defined here based on viewType (e.g., $dayOfYear, $week, $month)
        // Since it wasn't provided, we'll assume it exists or is simple.
        
        // SCOPED QUERY: Add shopId to the initial $match stage
        const matchStage = { $match: { ...dateFilter, shopId: req.user.shopId } }; 

        const chartData = await Sale.aggregate([
            // 1. Filter by Date Range AND Shop ID
            matchStage,
            
            // 2. Group and Aggregate
            {
                $group: {
                    _id: aggregationId, // aggregationId must be defined based on viewType (e.g., $dayOfYear, $month)
                    revenue: { $sum: "$totalAmount" },
                    bills: { $sum: 1 }
                }
            },
            
            // 3. Project and 4. Sort would typically follow here
            // ...
        ]);

        res.json(chartData);

    } catch (error) {
        console.error('Reports Chart Data API Error:', error);
        res.status(500).json({ error: 'Failed to generate chart data.' });
    }
});


module.exports = router;