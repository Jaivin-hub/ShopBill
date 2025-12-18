const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Inventory = require('../models/Inventory');
const Customer = require('../models/Customer'); 

const router = express.Router();

/**
 * UTILITY: emitAlert
 * This function is exported so you can call it from salesRoutes.js or inventoryRoutes.js
 * to push real-time notifications to the frontend via Socket.io.
 */
const emitAlert = (req, shopId, type, data) => {
    const io = req.app.get('socketio');
    if (!io) return;

    let alertData = null;

    if (type === 'inventory_low') {
        alertData = {
            id: `inv-low-${data.name}-${Date.now()}`,
            type: 'inventory_low',
            category: 'Critical',
            title: 'Low Stock Alert',
            message: `${data.name} is critically low. Stock: ${data.quantity}`,
            timestamp: new Date(),
        };
    } else if (type === 'credit_exceeded') {
        alertData = {
            id: `cust-credit-${data.name}-${Date.now()}`,
            type: 'credit_exceeded',
            category: 'Urgent',
            title: 'Credit Limit Exceeded',
            message: `${data.name} has exceeded their limit of ₹${data.creditLimit}. Outstanding: ₹${data.outstandingCredit}`,
            timestamp: new Date(),
        };
    }

    if (alertData) {
        // Emit specifically to the shop's room (multi-tenancy)
        io.to(shopId.toString()).emit('new_notification', alertData);
    }
};

/**
 * @route GET /api/notifications/alerts
 * @desc Get historical/initial alerts for the dashboard (Initial load)
 * @access Private
 */
router.get('/alerts', protect, async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const criticalAlerts = [];
        
        // --- 1. Fetch Current Low Stock ---
        const lowStockItems = await Inventory.find({ 
            shopId: shopId,
            $expr: { $lte: ["$quantity", "$reorderLevel"] }
        })
        .select('name quantity reorderLevel -_id')
        .limit(10);

        lowStockItems.forEach(item => {
            criticalAlerts.push({
                id: `inv-low-${item.name}-${Date.now()}`,
                type: 'inventory_low',
                category: 'Critical',
                title: 'Low Stock Alert',
                message: `${item.name} is critically low. Stock: ${item.quantity}`,
                timestamp: new Date(),
            });
        });
        
        // --- 2. Fetch Current Exceeded Credit ---
        const exceededCreditCustomers = await Customer.find({
            shopId: shopId,
            $expr: { $gt: ["$outstandingCredit", "$creditLimit"] }
        })
        .select('name outstandingCredit creditLimit -_id')
        .limit(5);

        exceededCreditCustomers.forEach(cust => {
            criticalAlerts.push({
                id: `cust-credit-exceeded-${cust.name}-${Date.now()}`,
                type: 'credit_exceeded',
                category: 'Urgent',
                title: 'Credit Limit Exceeded',
                message: `${cust.name} has exceeded their limit of ₹${cust.creditLimit.toFixed(0)}.`,
                timestamp: new Date(),
            });
        });

        res.json({
            count: criticalAlerts.length,
            alerts: criticalAlerts.sort((a, b) => b.timestamp - a.timestamp)
        });

    } catch (error) {
        console.error('Notification Alert Error:', error.message || error);
        res.status(500).json({ error: 'Failed to fetch critical alerts.' });
    }
});

// We export the router for the app.use() and the utility for real-time triggers
module.exports = { router, emitAlert };