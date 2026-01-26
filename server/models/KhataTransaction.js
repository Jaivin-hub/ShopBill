const mongoose = require('mongoose');

/**
 * Schema to record every credit and payment event for a customer.
 * This forms the basis of the transaction history (Khata).
 */
const KhataTransactionSchema = new mongoose.Schema({
    // Security and Scoping
    // UPDATED: Changed from shopId (ref User) to storeId (ref Store)
    storeId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Store', 
        required: true,
        index: true 
    },
    customerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Customer', 
        required: true,
        index: true 
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
        enum: ['credit_sale', 'payment_received', 'initial_due', 'reminder_sent'],
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

// Added a compound index to speed up loading a specific customer's history within a store
KhataTransactionSchema.index({ storeId: 1, customerId: 1, timestamp: -1 });

module.exports = mongoose.model('KhataTransaction', KhataTransactionSchema);