// models/Customer.js
const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
    // ... existing fields
    name: { type: String, required: true, trim: true },
    phone: { type: String, sparse: true, trim: true, default: null }, 
    outstandingCredit: { type: Number, default: 0, min: 0 },
    creditLimit: { type: Number, default: 5000, min: 0 },
    
    // NEW: Link to the shop owner (User)
    shopId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    
}, { timestamps: true });

// Optional: You might want a unique index on (phone, shopId) if you want phone numbers to be unique per shop.
// CustomerSchema.index({ phone: 1, shopId: 1 }, { unique: true, partialFilterExpression: { phone: { $exists: true, $ne: null } } });

module.exports = mongoose.model('Customer', CustomerSchema);