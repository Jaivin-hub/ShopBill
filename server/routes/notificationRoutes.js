const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Notification = require('../models/Notification');

const router = express.Router();

/**
 * UTILITY: emitAlert
 * Saves the alert to the DB first for persistence, then pushes via Socket for real-time.
 * This function can be called from any route (Inventory, Sales, etc.)
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
        // 1. Persist to Database (ensures it shows up on page refresh/fetch)
        const newNotification = await Notification.create({
            shopId: shopId.toString(),
            type,
            category,
            title,
            message,
            metadata,
            isRead: false, // Explicitly set to false for Header badge counting
            createdAt: new Date()
        });

        // 2. Push to Socket.io Room (Real-time update)
        if (io) {
            // We emit the object created by Mongoose so it includes the generated _id
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

module.exports = { router, emitAlert };