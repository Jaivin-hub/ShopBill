const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Notification = require('../models/Notification');

const router = express.Router();

/**
 * UTILITY: emitAlert
 * Saves the alert to the DB first for persistence, then pushes via Socket for real-time.
 * Can be called from inventoryRoutes, salesRoutes, etc.
 */
const emitAlert = async (req, shopId, type, data) => {
    const io = req.app.get('socketio');
    
    let title = '';
    let category = 'Info';
    let message = '';
    let metadata = {};

    // Standardizing types to match Frontend (NotificationsPage.js)
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

        default:
            title = 'System Notification';
            category = 'Info';
            message = data.message || 'New system update available.';
    }

    try {
        // 1. Persist to Database (so it shows up on page refresh)
        const newNotification = await Notification.create({
            shopId,
            type,
            category,
            title,
            message,
            metadata,
            createdAt: new Date()
        });

        // 2. Push to Socket.io Room (Real-time update)
        if (io) {
            // Emit to the shop-specific room
            io.to(shopId.toString()).emit('new_notification', newNotification);
            console.log(`📡 Real-time Socket alert sent to Shop: ${shopId}`);
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
        
        // Fetch last 30 notifications for this shop, newest first
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
 * @desc Mark all unread notifications as read for the current shop
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

// Export both the router for index.js and the utility function for other routes
module.exports = { router, emitAlert };