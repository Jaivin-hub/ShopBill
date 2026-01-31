const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Notification = require('../models/Notification');

const router = express.Router();

/**
 * UTILITY: emitAlert
 * Saves the alert to the DB first for persistence, then pushes via Socket for real-time.
 * UPDATED: Ensures readBy is initialized as an empty array.
 */
const emitAlert = async (req, storeId, type, data) => {
    const io = req.app.get('socketio');
    let title = '';
    let category = 'Info';
    let message = '';
    let metadata = {};
    const storeIdStr = storeId.toString();
    const ownerId = req.user.role === 'owner' ? req.user._id : (req.user.ownerId || req.user._id);

    switch (type) {
        case 'inventory_low':
            title = 'Low Stock Alert';
            category = 'Critical';
            message = `Low stock alert: ${data.name} (${data.quantity} remaining)`;
            metadata = { 
                itemId: data._id,
                variantId: data.variantId || null
            };
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
            storeId: storeIdStr,
            ownerId: ownerId,
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
            io.to(storeIdStr).emit('new_notification', { ...newNotification.toObject(), isRead: false });
        }
        return newNotification;
    } catch (error) {
        console.error("❌ Notification Emit Error:", error.message);
    }
};

/**
 * NEW UTILITY: resolveLowStockAlert
 * Call this when stock is re-added to remove old warnings automatically.
 * @param {Object} req - Express request object
 * @param {String} storeId - Store ID
 * @param {String} itemId - Item ID
 * @param {String} variantId - Optional variant ID for variant-specific resolution
 */
const resolveLowStockAlert = async (req, storeId, itemId, variantId = null) => {
    const io = req.app.get('socketio');
    const storeIdStr = storeId.toString();

    try {
        const query = {
            storeId: storeIdStr,
            type: 'inventory_low',
            'metadata.itemId': itemId
        };
        
        // If variantId is provided, only resolve alerts for that specific variant
        if (variantId) {
            query['metadata.variantId'] = variantId;
        }

        await Notification.deleteMany(query);

        if (io) {
            io.to(storeIdStr).emit('resolve_notification', { itemId, variantId });
            console.log(`🧹 Resolved alerts for item: ${itemId}${variantId ? ` (variant: ${variantId})` : ''}`);
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
        if (!req.user.storeId) {
            return res.json({ count: 0, alerts: [] });
        }
        // For owners, get notifications from all their stores. For staff, only current store.
        const filter = req.user.role === 'owner' 
            ? { ownerId: req.user._id }
            : { storeId: req.user.storeId };
        const notifications = await Notification.find(filter)
            .select('type category title message metadata storeId ownerId readBy createdAt')
            .lean()
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
        const filter = req.user.role === 'owner' 
            ? { ownerId: req.user._id, readBy: { $ne: req.user._id } }
            : { storeId: req.user.storeId, readBy: { $ne: req.user._id } };
        const result = await Notification.updateMany(
            filter,
            { $addToSet: { readBy: req.user._id } } // Add the user ID to the array
        );
        res.json({ message: 'Success', updatedCount: result.modifiedCount });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update.' });
    }
});

module.exports = { router, emitAlert, resolveLowStockAlert };