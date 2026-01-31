// models/Sale.js
const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
    totalAmount: { type: Number, required: true, min: 0 },
    // paymentMethod: 'Mixed' allows splitting between Cash, Card, UPI, and Credit
    paymentMethod: { type: String, enum: ['Cash', 'Card', 'Credit', 'UPI', 'Mixed'], required: true }, 
    
    // Link to the Customer model (Customer must belong to the same storeId)
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null }, 
    
    // UPDATED: Points to the specific Store, not the Owner (User)
    storeId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Store', 
        required: true,
        index: true 
    },

    timestamp: { type: Date, default: Date.now },
    
    // Amount details for Khata calculation audit
    amountPaid: { type: Number, required: false, default: 0 }, // Amount paid by UPI/Cash
    amountCredited: { type: Number, required: false, default: 0 }, // Amount added to Khata
    
    // Item details for reporting
    items: [{
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 }, // Price at time of sale
        variantId: { type: mongoose.Schema.Types.ObjectId, default: null }, // Variant ID if this is a variant sale
        variantLabel: { type: String, default: '' }, // Variant label (e.g., "500ml", "1L") for display
    }],
}, { timestamps: true });

// Added an index for reporting: finding all sales for a store within a date range
SaleSchema.index({ storeId: 1, timestamp: -1 });

module.exports = mongoose.model('Sale', SaleSchema);