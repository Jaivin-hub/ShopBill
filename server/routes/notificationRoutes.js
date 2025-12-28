const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Notification = require('../models/Notification');

const router = express.Router();

/**
 * UTILITY: emitAlert
 * Saves the alert to the DB first for persistence, then pushes via Socket for real-time.
 * UPDATED: Ensures readBy is initialized as an empty array.
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
            readBy: [], // Ensure this is initialized as empty
            createdAt: new Date()
        });

        if (io) {
            // For real-time, we tell the client it is NOT read (false)
            io.to(shopIdStr).emit('new_notification', { ...newNotification.toObject(), isRead: false });
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
        await Notification.deleteMany({
            shopId: shopIdStr,
            type: 'inventory_low',
            'metadata.itemId': itemId
        });

        if (io) {
            io.to(shopIdStr).emit('resolve_notification', { itemId });
            console.log(`🧹 Resolved alerts for item: ${itemId}`);
        }
    } catch (error) {
        console.error("❌ Failed to resolve alerts:", error.message);
    }
};

// --- API ROUTES ---

/**
 * GET /alerts
 * Fetches notifications and calculates 'isRead' specifically for the logged-in user.
 */
router.get('/alerts', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({ shopId: req.user.shopId })
            .sort({ createdAt: -1 })
            .limit(30);

        // Map notifications to include an 'isRead' boolean specific to THIS user
        const formattedAlerts = notifications.map(n => {
            const doc = n.toObject();
            return {
                ...doc,
                // Check if current logged-in user ID exists in the readBy array
                isRead: n.readBy && n.readBy.some(userId => userId.toString() === req.user._id.toString())
            };
        });

        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.json({
            count: formattedAlerts.filter(n => !n.isRead).length,
            alerts: formattedAlerts
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications.' });
    }
});

/**
 * PUT /read-all
 * Adds the current user's ID to the readBy array of all unread notifications for their shop.
 */
router.put('/read-all', protect, async (req, res) => {
    try {
        const result = await Notification.updateMany(
            { 
                shopId: req.user.shopId, 
                readBy: { $ne: req.user._id } // Filter notifications where this user ID is NOT present
            },
            { $addToSet: { readBy: req.user._id } } // Add the user ID to the array
        );
        res.json({ message: 'Success', updatedCount: result.modifiedCount });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update.' });
    }
});

module.exports = { router, emitAlert, resolveLowStockAlert };