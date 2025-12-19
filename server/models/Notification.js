const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['inventory_low', 'credit_exceeded', 'system'], required: true },
    category: { type: String, default: 'Info' }, // Critical, Urgent, Info
    title: { type: String },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    metadata: { 
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', NotificationSchema);