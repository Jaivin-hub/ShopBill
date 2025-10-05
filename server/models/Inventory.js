// models/Inventory.js
const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, default: 0, min: 0 },
    reorderLevel: { type: Number, default: 5, min: 0 },
    hsn: { type: String, trim: true, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Inventory', InventorySchema);
