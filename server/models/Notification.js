const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    // Reference to the shop owner
    shopId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        index: true 
    },
    // Enum updated to match the logic in routes/notificationRoutes.js
    type: { 
        type: String, 
        enum: ['inventory_low', 'credit_exceeded', 'system', 'success', 'system_update'], 
        required: true 
    },
    category: { 
        type: String, 
        enum: ['Critical', 'Urgent', 'Info', 'Success'],
        default: 'Info'
    }, 
    title: { 
        type: String 
    },
    message: { 
        type: String, 
        required: true 
    },
    isRead: { 
        type: Boolean, 
        default: false,
        index: true // Added index to quickly fetch unread counts
    },
    // Flexible metadata to support resolving alerts via itemId or customerId
    metadata: { 
        itemId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Inventory',
            index: true // Important for resolveLowStockAlert utility
        },
        customerId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Customer',
            index: true
        }
    },
    createdAt: { 
        type: Date, 
        default: Date.now,
        index: true 
    }
});

/**
 * DATABASE OPTIMIZATION: TTL Index
 * Automatically delete notifications after 30 days to keep the DB clean.
 * (30 days * 24 hours * 60 mins * 60 secs = 2592000 seconds)
 */
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('Notification', NotificationSchema);