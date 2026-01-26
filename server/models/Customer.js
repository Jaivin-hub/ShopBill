const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    phone: { type: String, sparse: true, trim: true}, 
    outstandingCredit: { type: Number, default: 0, min: 0 },
    creditLimit: { type: Number, default: 5000, min: 0 },
    
    // UPDATED: Points to the specific Store, not the Owner (User)
    storeId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Store', 
        required: true 
    },
    
}, { timestamps: true });

// UPDATED: The unique index now ensures a phone number is unique 
// WITHIN a specific store, not across the entire app or owner.
CustomerSchema.index(
    { phone: 1, storeId: 1 }, 
    { 
        unique: true, 
        partialFilterExpression: { phone: { $exists: true, $ne: null, $ne: '' }  }
    }
);

module.exports = mongoose.model('Customer', CustomerSchema);