const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
    // UPDATED: Changed from shopId (ref User) to storeId (ref Store)
    // This identifies which branch this supplier is associated with.
    storeId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Store', 
        required: true,
        index: true 
    },
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    gstin: { type: String, trim: true },
    address: { type: String }
}, { timestamps: true });

// Added index to quickly find suppliers by name within a specific store
supplierSchema.index({ storeId: 1, name: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);