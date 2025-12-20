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
            message = `${data.name} has exceeded their credit limit of ₹${data.creditLimit}.`;
            metadata = { customerId: data._id };
            break;

        case 'success':
            title = 'Action Successful';
            category = 'Info';
            message = data.message || 'Operation completed successfully.';
            break;

        default:
            title = 'System Notification';
            category = 'Info';
            message = data.message || 'New system update available.';
    }

    try {
        const newNotification = await Notification.create({
            shopId: shopId.toString(),
            type,
            category,
            title,
            message,
            metadata,
            isRead: false,
            createdAt: new Date()
        });

        if (io) {
            io.to(shopId.toString()).emit('new_notification', newNotification);
            console.log(`📡 [Socket] Alert sent to Shop ${shopId}: ${message}`);
        }
        
        return newNotification;
    } catch (error) {
        console.error("❌ Failed to save or emit notification:", error);
    }
};

/**
 * @route GET /api/notifications/alerts
 * @desc Fetch persistent notification history from the DB
 */
router.get('/alerts', protect, async (req, res) => {
    try {
        const shopId = req.user.shopId;
        
        const notifications = await Notification.find({ shopId })
            .sort({ createdAt: -1 })
            .limit(30);

        // --- FIX: Disable Caching ---
        // 'no-store' tells the browser/client never to cache this response.
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        
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
 */
router.put('/read-all', protect, async (req, res) => {
    try {
        const result = await Notification.updateMany(
            { shopId: req.user.shopId, isRead: false },
            { $set: { isRead: true } }
        );
        res.json({ 
            message: 'All notifications marked as read.',
            updatedCount: result.modifiedCount 
        });
    } catch (error) {
        console.error('Read-all Route Error:', error);
        res.status(500).json({ error: 'Failed to update notifications.' });
    }
});

module.exports = { router, emitAlert };