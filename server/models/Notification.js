const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    // Using ObjectId for efficient indexing and referencing the User (Shop Owner)
    shopId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        index: true 
    },
    // UPDATED: Expanded enum to include all types used in your notification logic
    type: { 
        type: String, 
        enum: ['inventory_low', 'credit_exceeded', 'system', 'success', 'system_update'], 
        required: true 
    },
    category: { 
        type: String, 
        default: 'Info' // Can be: Critical, Urgent, Info
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
        default: false 
    },
    metadata: { 
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Notification', NotificationSchema);