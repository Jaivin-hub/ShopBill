// models/Customer.js
const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    phone: { type: String, unique: true, sparse: true, trim: true, default: null }, // sparse allows multiple nulls
    outstandingCredit: { type: Number, default: 0, min: 0 },
    creditLimit: { type: Number, default: 5000, min: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema);
