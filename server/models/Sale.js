// models/Sale.js
const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
    totalAmount: { type: Number, required: true, min: 0 },
    // FIX: Add 'Mixed' to the allowed enum values
    paymentMethod: { type: String, enum: ['Cash', 'Credit', 'UPI', 'Mixed'], required: true }, 
    // Link to the Customer model for credit sales
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null }, 
    shopId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    timestamp: { type: Date, default: Date.now },
    
    // CRITICAL ADDITIONS for Khata calculation audit (from previous steps)
    amountPaid: { type: Number, required: false, default: 0 }, // Amount paid by UPI/Cash
    amountCredited: { type: Number, required: false, default: 0 }, // Amount added to Khata
    
    // CRITICAL ADDITION: Item details for reporting
    items: [{
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 }, // Price at time of sale
        // Total price for item can be calculated as quantity * price
    }],
}, { timestamps: true });

module.exports = mongoose.model('Sale', SaleSchema);