const mongoose = require('mongoose');

const PurchaseSchema = new mongoose.Schema({
    // UPDATED: Changed from shopId to storeId for multi-outlet support
    storeId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Store', 
        required: true,
        index: true 
    },
    productId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Inventory', 
        required: true 
    },
    supplierId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Supplier', 
        required: true 
    },
    quantity: { 
        type: Number, 
        required: true, 
        min: 1 
    },
    purchasePrice: { 
        type: Number, 
        required: true, 
        min: 0 
    },
    invoiceNumber: { 
        type: String, 
        trim: true 
    },
    date: { 
        type: Date, 
        default: Date.now 
    }
}, { timestamps: true });

// Index for faster lookups
PurchaseSchema.index({ storeId: 1, date: -1 });
PurchaseSchema.index({ storeId: 1, productId: 1 });

module.exports = mongoose.model('Purchase', PurchaseSchema);
