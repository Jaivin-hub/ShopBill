// models/Sale.js
const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
    /** Sum of line items before bill-level discount */
    subtotalAmount: { type: Number, default: null, min: 0 },
    /** Optional flat discount in ₹ applied at checkout (not per-item offers) */
    billDiscount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    // paymentMethod: 'Mixed' allows splitting between Cash, Card, UPI, and Credit
    paymentMethod: { type: String, enum: ['Cash', 'Card', 'Credit', 'UPI', 'Mixed'], required: true }, 
    // For mixed payments, tracks which mode carried the paid portion (cash/upi/card).
    paidVia: { type: String, enum: ['Cash', 'Card', 'UPI', null], default: null },
    
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
        price: { type: Number, required: true, min: 0 }, // Final unit price at time of sale
        originalPrice: { type: Number, default: null }, // Pre-offer unit price (null = same as price for legacy rows)
        discountAmount: { type: Number, default: 0 }, // Per-unit discount in ₹ (from offer)
        appliedOfferId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', default: null },
        appliedOfferTitle: { type: String, default: '' },
        variantId: { type: mongoose.Schema.Types.ObjectId, default: null }, // Variant ID if this is a variant sale
        variantLabel: { type: String, default: '' }, // Variant label (e.g., "500ml", "1L") for display
        // Optional textile metadata at line-item level
        variantSize: { type: String, default: '' },
        variantColor: { type: String, default: '' },
    }],
}, { timestamps: true });

// Added an index for reporting: finding all sales for a store within a date range
SaleSchema.index({ storeId: 1, timestamp: -1 });

module.exports = mongoose.model('Sale', SaleSchema);