// routes/notificationRoutes.js

const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Inventory = require('../models/Inventory');
// NOTE: Customer model import is added here, as it will be needed for future credit alerts.
const Customer = require('../models/Customer'); 

const router = express.Router();

/**
 * @route GET /api/notifications/alerts
 * @desc Get all critical, in-app alerts for the current shop (e.g., Low Stock).
 * @access Private
 */
router.get('/alerts', protect, async (req, res) => {
    try {
        // We only check for alerts related to the user's shopId (multi-tenancy)
        const shopId = req.user.shopId;
        
        const criticalAlerts = [];
        
        // --- 1. Low Stock Alerts ---
        
        // Find inventory items where quantity is less than or equal to the reorderLevel
        // FIX: Replaced $where with $expr: { $lte: [...] } for MongoDB Atlas compatibility.
        const lowStockItems = await Inventory.find({ 
            shopId: shopId,
            $expr: { $lte: ["$quantity", "$reorderLevel"] }
        })
        .select('name quantity reorderLevel -_id') // Select only needed fields
        .limit(10); // Limit to the top 10 most critical alerts

        if (lowStockItems.length > 0) {
            lowStockItems.forEach(item => {
                criticalAlerts.push({
                    id: `inv-low-${item.name}-${new Date().getTime()}`, // Ensure ID is unique
                    type: 'inventory_low',
                    category: 'Critical',
                    title: 'Low Stock Alert',
                    message: `${item.name} is critically low. Stock: ${item.quantity}`,
                    timestamp: new Date(),
                });
            });
        }
        
        // --- 2. Add other types of alerts here (e.g., Customer Credit) ---
        
        // Example Credit Alert Logic: Find customers who have exceeded their credit limit
        const exceededCreditCustomers = await Customer.find({
            shopId: shopId,
            // Find where outstandingCredit is greater than creditLimit
            $expr: { $gt: ["$outstandingCredit", "$creditLimit"] }
        }).select('name outstandingCredit creditLimit -_id').limit(5);

        exceededCreditCustomers.forEach(cust => {
            criticalAlerts.push({
                id: `cust-credit-exceeded-${cust.name}-${new Date().getTime()}`,
                type: 'credit_exceeded',
                category: 'Urgent',
                title: 'Credit Limit Exceeded',
                message: `${cust.name} has exceeded their limit of ₹${cust.creditLimit.toFixed(0)}. Outstanding: ₹${cust.outstandingCredit.toFixed(0)}.`,
                timestamp: new Date(),
            });
        });


        res.json({
            count: criticalAlerts.length,
            alerts: criticalAlerts.sort((a, b) => b.timestamp - a.timestamp) // Sort by most recent
        });

    } catch (error) {
        // Console log only the message and not the entire verbose error object
        console.error('Notification Alert Error:', error.message || error);
        res.status(500).json({ error: 'Failed to fetch critical alerts.' });
    }
});

module.exports = router;
