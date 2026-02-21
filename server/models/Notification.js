const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    // UPDATED: Points to the specific Store. 
    // If it's a global system notification, this could be null, 
    // but for your features, store-specific is better.
    storeId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Store', 
        required: true
    },
    // Added ownerId to easily fetch all notifications across all stores for the owner
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Track who performed the action that triggered this notification
    // This allows us to exclude the actor from receiving their own action notifications
    actorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    type: { 
        type: String, 
        enum: [
            'inventory_low', 
            'inventory_added', 
            'inventory_updated', 
            'inventory_deleted',
            'purchase_recorded',
            'ledger_payment',
            'ledger_credit',
            'credit_exceeded', 
            'system', 
            'success', 
            'system_update',
            'profile_updated',
            'customer_added',
            'inventory_bulk_upload'
        ], 
        required: true 
    },
    category: { 
        type: String, 
        enum: ['Critical', 'Urgent', 'Info', 'Success'],
        default: 'Info'
    }, 
    title: { type: String },
    message: { type: String, required: true },
    
    // Replace isRead with readBy array (Good for Staff/Owner multi-user access)
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    }],
    // User dismissed = remove from their alert center permanently (per user)
    dismissedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    }],

    metadata: { 
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', index: true },
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
        variantId: { type: mongoose.Schema.Types.ObjectId, default: null }
    },
    createdAt: { 
        type: Date, 
        default: Date.now
    }
});

/**
 * INDEX STRATEGY:
 * 
 * We need THREE indexes for different purposes:
 * 
 * 1. TTL Index: { createdAt: 1 } with expireAfterSeconds
 *    Purpose: Automatically deletes notifications older than 30 days
 *    Why needed: Prevents database bloat, MongoDB requires createdAt as FIRST field for TTL
 *    Used by: MongoDB background task (runs every 60 seconds)
 * 
 * 2. Compound Index: { storeId: 1, createdAt: -1 }
 *    Purpose: Optimizes staff queries filtering by storeId and sorting by date
 *    Why needed: Staff members query: Notification.find({ storeId: ... }).sort({ createdAt: -1 })
 *    Also used by: deleteMany({ storeId: ... }) and updateMany({ storeId: ... })
 * 
 * 3. Compound Index: { ownerId: 1, createdAt: -1 }
 *    Purpose: Optimizes owner queries filtering by ownerId and sorting by date
 *    Why needed: Owners query: Notification.find({ ownerId: ... }).sort({ createdAt: -1 })
 *    Also used by: updateMany({ ownerId: ... })
 * 
 * WHY ALL THREE ARE NEEDED:
 * - TTL index cannot be combined with compound indexes (TTL requires createdAt as first field)
 * - Compound indexes have createdAt as second field (for sorting efficiency)
 * - Staff and Owner have different query patterns (storeId vs ownerId)
 * - MongoDB cannot use one compound index to efficiently serve both query patterns
 */

// TTL Index: Auto-delete notifications older than 30 days (2592000 seconds)
// NOTE: createdAt MUST be the first field for TTL to work
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

// Compound Index: Optimizes staff queries (filter by storeId, sort by createdAt descending)
NotificationSchema.index({ storeId: 1, createdAt: -1 });

// Compound Index: Optimizes owner queries (filter by ownerId, sort by createdAt descending)
NotificationSchema.index({ ownerId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
