// models/User.js (ShopName Restored & Index Fixed)

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
    // The conditional unique property is removed from the field definition.
    shopName: { 
        type: String, 
        required: function() { return this.role === 'owner'; },
        trim: true 
        // DO NOT set 'unique: true' here, we manage uniqueness via an index below.
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
// We define a unique index on shopName but add the 'sparse: true' option.
// sparse: true ensures the index only applies to documents where shopName
// *actually exists*. Staff users without a shopName (i.e., shopName is null/undefined)
// will bypass this index, allowing unlimited staff to be created.
UserSchema.index({ shopName: 1 }, { unique: true, sparse: true });
// ===================================================

// Pre-save hook to hash password before saving
UserSchema.pre('save', async function (next) {
    if (this.isModified('password') && this.password) { 
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

// Instance methods (omitted for brevity, they remain unchanged)

// FIX for OverwriteModelError (from previous discussion)
module.exports = mongoose.models.User || mongoose.model('User', UserSchema);