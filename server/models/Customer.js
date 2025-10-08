const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    phone: { type: String, sparse: true, trim: true}, 
    outstandingCredit: { type: Number, default: 0, min: 0 },
    creditLimit: { type: Number, default: 5000, min: 0 },
    shopId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    
}, { timestamps: true });

CustomerSchema.index(
    { phone: 1, shopId: 1 }, 
    { 
        unique: true, 
        partialFilterExpression: { phone: { $exists: true, $ne: '' } }
    }
);

module.exports = mongoose.model('Customer', CustomerSchema);