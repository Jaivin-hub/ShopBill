const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    shopId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        index: true 
    },
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
    title: { type: String },
    message: { type: String, required: true },
    
    // CHANGE: Replace isRead with readBy array
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    }],

    metadata: { 
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', index: true },
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true }
    },
    createdAt: { 
        type: Date, 
        default: Date.now,
        index: true 
    }
});

NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('Notification', NotificationSchema);