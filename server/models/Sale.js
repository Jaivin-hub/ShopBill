// models/Sale.js
const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['Cash', 'Credit', 'UPI'], required: true },
    // Link to the Customer model for credit sales
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null }, 
    timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Sale', SaleSchema);
