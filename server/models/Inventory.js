// models/Inventory.js
const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, default: 0, min: 0 },
    reorderLevel: { type: Number, default: 5, min: 0 },
    hsn: { type: String, trim: true, default: '' },
    
    // UPDATED: Now points to the specific Store model
    // This allows different stock levels for the same item in different locations.
    storeId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Store', 
        required: true 
    },
}, { timestamps: true });

// Added an index for faster lookups when filtering by store
InventorySchema.index({ storeId: 1, name: 1 });

module.exports = mongoose.model('Inventory', InventorySchema);