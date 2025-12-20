const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Notification = require('../models/Notification');

const router = express.Router();

/**
 * UTILITY: emitAlert
 * Saves the alert to the DB first for persistence, then pushes via Socket for real-time.
 */
const emitAlert = async (req, shopId, type, data) => {
    const io = req.app.get('socketio');
    let title = '';
    let category = 'Info';
    let message = '';
    let metadata = {};
    const shopIdStr = shopId.toString();

    switch (type) {
        case 'inventory_low':
            title = 'Low Stock Alert';
            category = 'Critical';
            message = `Low stock alert: ${data.name} (${data.quantity} remaining)`;
            metadata = { itemId: data._id };
            break;
        case 'credit_exceeded':
            title = 'Credit Limit Exceeded';
            category = 'Urgent';
            message = `${data.name} has exceeded their credit limit.`;
            metadata = { customerId: data._id };
            break;
        case 'success':
            title = 'Stock Updated';
            category = 'Info';
            message = data.message || 'Operation successful.';
            metadata = data._id ? { itemId: data._id } : {};
            break;
        default:
            title = 'System Notification';
            category = 'Info';
            message = data.message || 'New system update.';
    }

    try {
        const newNotification = await Notification.create({
            shopId: shopIdStr,
            type,
            category,
            title,
            message,
            metadata,
            isRead: false,
            createdAt: new Date()
        });

        if (io) {
            io.to(shopIdStr).emit('new_notification', newNotification);
        }
        return newNotification;
    } catch (error) {
        console.error("❌ Notification Emit Error:", error.message);
    }
};

/**
 * NEW UTILITY: resolveLowStockAlert
 * Call this when stock is re-added to remove old warnings automatically.
 */
const resolveLowStockAlert = async (req, shopId, itemId) => {
    const io = req.app.get('socketio');
    const shopIdStr = shopId.toString();

    try {
        // 1. Remove the "inventory_low" alerts for this specific item from DB
        await Notification.deleteMany({
            shopId: shopIdStr,
            type: 'inventory_low',
            'metadata.itemId': itemId
        });

        // 2. Tell the frontend to remove this item from the notification list
        if (io) {
            io.to(shopIdStr).emit('resolve_notification', { itemId });
            console.log(`🧹 Resolved alerts for item: ${itemId}`);
        }
    } catch (error) {
        console.error("❌ Failed to resolve alerts:", error.message);
    }
};

// --- API ROUTES ---

router.get('/alerts', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({ shopId: req.user.shopId })
            .sort({ createdAt: -1 })
            .limit(30);
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.json({
            count: notifications.filter(n => !n.isRead).length,
            alerts: notifications
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications.' });
    }
});

router.put('/read-all', protect, async (req, res) => {
    try {
        const result = await Notification.updateMany(
            { shopId: req.user.shopId, isRead: false },
            { $set: { isRead: true } }
        );
        res.json({ message: 'Success', updatedCount: result.modifiedCount });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update.' });
    }
});

// EXPORT resolveLowStockAlert so inventoryRoutes can use it
module.exports = { router, emitAlert, resolveLowStockAlert };