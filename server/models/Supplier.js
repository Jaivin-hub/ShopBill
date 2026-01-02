const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    gstin: { type: String, trim: true },
    address: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);