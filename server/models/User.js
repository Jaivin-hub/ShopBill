// models/User.js (ShopName Restored & Index Fixed - Sparse Index Null Fix)

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true, // Unique globally for login
        trim: true, 
        lowercase: true 
    },
    password: { 
        type: String, 
        required: false 
    }, 
    phone: { 
        type: String, 
        trim: true 
    },
    
    role: { 
        type: String, 
        enum: ['superadmin', 'owner', 'Manager', 'Cashier'], 
        required: true 
    }, 
    
    // Links to the Shop document
    shopId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Shop', 
        required: true 
    }, 
    
    // shopName is RESTORED for business needs.
    shopName: { 
        type: String, 
        required: function() { return this.role === 'owner'; },
        trim: true 
    },
    
    isActive: { 
        type: Boolean, 
        default: true 
    },

    resetPasswordToken: String,
    resetPasswordExpire: Date,
    
    plan: { 
        type: String, 
        enum: ['BASIC', 'PRO', 'PREMIUM'], 
        default: null 
    },
    // transactionId holds the current ACTIVE Razorpay Subscription ID
    transactionId: String, 
    
    planEndDate: { 
        type: Date, 
        default: null 
    },
    subscriptionStatus: { 
        type: String, 
        default: null 
    }, 

}, { timestamps: true });

// === CRITICAL FIX for E11000 Duplicate Key Error ===
// sparse: true ensures the index only applies to documents where shopName 
// *actually exists* (is not undefined).
UserSchema.index({ shopName: 1 }, { unique: true, sparse: true });
// ===================================================

// NEW HOOK: Ensure non-owner accounts do NOT have a shopName field (it must be undefined).
UserSchema.pre('save', function (next) {
    // Only run this logic if the role is being modified or this is a new document
    if (this.isModified('role') || this.isNew) {
        if (this.role !== 'owner') {
            // Explicitly set shopName to undefined. This tells Mongoose to
            // use the $unset operator, ensuring the field is removed from the document,
            // which satisfies the sparse index condition.
            this.shopName = undefined; 
        }
    }
    next();
});

// Existing Pre-save hook to hash password before saving
UserSchema.pre('save', async function (next) {
    // Only hash if the password field is modified and actually has a value
    if (this.isModified('password') && this.password) { 
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

// Instance methods (omitted for brevity, they remain unchanged)

// FIX for OverwriteModelError
module.exports = mongoose.models.User || mongoose.model('User', UserSchema);