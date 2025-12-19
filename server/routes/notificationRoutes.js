const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Inventory = require('../models/Inventory');
const Customer = require('../models/Customer'); 

const router = express.Router();

/**
 * UTILITY: emitAlert
 * Call this from salesRoutes.js or inventoryRoutes.js.
 * It sends a real-time signal to the specific shop's room.
 */
const emitAlert = (req, shopId, type, data) => {
    const io = req.app.get('socketio');
    if (!io) {
        console.error("Socket.io instance not found on req.app");
        return;
    }

    let alertData = null;
    const timestamp = new Date();
    const uniqueId = `${type}-${data._id || Math.random().toString(36).substr(2, 9)}-${timestamp.getTime()}`;

    if (type === 'inventory_low') {
        alertData = {
            id: uniqueId,
            type: 'inventory_low',
            category: 'Critical',
            title: 'Low Stock Alert',
            message: `${data.name} is critically low. Remaining: ${data.quantity}`,
            timestamp: timestamp,
        };
    } else if (type === 'credit_exceeded') {
        alertData = {
            id: uniqueId,
            type: 'credit_exceeded',
            category: 'Urgent',
            title: 'Credit Limit Exceeded',
            message: `${data.name} has exceeded limit of ₹${data.creditLimit}. Outstanding: ₹${data.outstandingCredit}`,
            timestamp: timestamp,
        };
    }

    if (alertData) {
        // Multi-tenancy: Only send to the specific shop's room
        io.to(shopId.toString()).emit('new_notification', alertData);
        console.log(`📡 Alert Emitted to Shop ${shopId}: ${alertData.message}`);
    }
};

/**
 * @route GET /api/notifications/alerts
 * @desc Fetch current active alerts (Low stock & Exceeded credit)
 */
router.get('/alerts', protect, async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const criticalAlerts = [];
        
        // 1. Fetch Items where quantity <= reorderLevel
        const lowStockItems = await Inventory.find({ 
            shopId: shopId,
            $expr: { $lte: ["$quantity", "$reorderLevel"] }
        }).limit(15);

        lowStockItems.forEach(item => {
            criticalAlerts.push({
                id: `inv-${item._id}`,
                type: 'inventory_low',
                category: 'Critical',
                message: `${item.name} is critically low. Stock: ${item.quantity}`,
                timestamp: item.updatedAt || new Date(),
            });
        });
        
        // 2. Fetch Customers where outstanding > limit
        const exceededCustomers = await Customer.find({
            shopId: shopId,
            $expr: { $gt: ["$outstandingCredit", "$creditLimit"] }
        }).limit(10);

        exceededCustomers.forEach(cust => {
            criticalAlerts.push({
                id: `cred-${cust._id}`,
                type: 'credit_exceeded',
                category: 'Urgent',
                message: `${cust.name} exceeded credit limit (₹${cust.creditLimit}).`,
                timestamp: cust.updatedAt || new Date(),
            });
        });

        // Sort by newest first
        res.json({
            count: criticalAlerts.length,
            alerts: criticalAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        });

    } catch (error) {
        console.error('Notification Route Error:', error);
        res.status(500).json({ error: 'Failed to fetch alerts.' });
    }
});

module.exports = { router, emitAlert };