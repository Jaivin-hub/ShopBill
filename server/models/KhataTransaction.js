const mongoose = require('mongoose');

/**
 * Schema to record every credit and payment event for a customer.
 * This forms the basis of the transaction history (Khata).
 */
const KhataTransactionSchema = new mongoose.Schema({
    // Security and Scoping
    shopId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    customerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Customer', 
        required: true 
    },
    
    // Transaction Details
    amount: { 
        type: Number, 
        required: true, 
        default: 0 
    },
    // 'credit_sale' (increase due), 'payment_received' (decrease due), 'initial_due' (starting balance)
    type: { 
        type: String, 
        enum: ['credit_sale', 'payment_received', 'initial_due'], 
        required: true 
    },
    
    // Reference to the source document (e.g., the Sale ID that created the credit)
    referenceId: { 
        type: mongoose.Schema.Types.ObjectId, 
        default: null 
    }, 
    
    // Optional field for notes
    details: { 
        type: String 
    }, 
    timestamp: { 
        type: Date, 
        default: Date.now 
    },
}, { 
    timestamps: true 
});

module.exports = mongoose.model('KhataTransaction', KhataTransactionSchema);
