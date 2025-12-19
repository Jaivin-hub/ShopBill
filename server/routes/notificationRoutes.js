const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Notification = require('../models/Notification'); // New Model

const router = express.Router();

/**
 * UTILITY: emitAlert
 * Saves the alert to the DB first, then pushes via Socket.
 */
const emitAlert = async (req, shopId, type, data) => {
    const io = req.app.get('socketio');
    
    let title = '';
    let category = 'Info';
    let message = '';
    let metadata = {};

    if (type === 'inventory_low') {
        title = 'Low Stock Alert';
        category = 'Critical';
        message = `${data.name} is low. Remaining: ${data.quantity}`;
        metadata = { itemId: data._id };
    } else if (type === 'credit_exceeded') {
        title = 'Credit Limit Exceeded';
        category = 'Urgent';
        message = `${data.name} has exceeded limit of ₹${data.creditLimit}.`;
        metadata = { customerId: data._id };
    }

    try {
        // 1. Persist to Database so it's available on other devices/refresh
        const newNotification = await Notification.create({
            shopId,
            type,
            category,
            title,
            message,
            metadata
        });

        // 2. Push to Socket for real-time UI update
        if (io) {
            io.to(shopId.toString()).emit('new_notification', newNotification);
            console.log(`📡 Real-time Socket Sent to Shop ${shopId}`);
        }
        
        return newNotification;
    } catch (error) {
        console.error("❌ Failed to save/emit notification:", error);
    }
};

/**
 * @route GET /api/notifications/alerts
 * @desc Fetch persistent notifications from the DB
 */
router.get('/alerts', protect, async (req, res) => {
    try {
        const shopId = req.user.shopId;
        
        // Fetch last 30 notifications from the DB (read and unread)
        const notifications = await Notification.find({ shopId })
            .sort({ createdAt: -1 })
            .limit(30);

        res.json({
            count: notifications.length,
            alerts: notifications
        });
    } catch (error) {
        console.error('Notification Route Error:', error);
        res.status(500).json({ error: 'Failed to fetch notification history.' });
    }
});

/**
 * @route PUT /api/notifications/read-all
 * @desc Mark all notifications as read for the shop
 */
router.put('/read-all', protect, async (req, res) => {
    try {
        await Notification.updateMany(
            { shopId: req.user.shopId, isRead: false },
            { $set: { isRead: true } }
        );
        res.json({ message: 'All notifications marked as read.' });
    } catch (error) {
        res.status(500).json({ error: 'Update failed.' });
    }
});

module.exports = { router, emitAlert };