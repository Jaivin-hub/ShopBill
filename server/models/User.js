// models/User.js (Updated & Finalized)

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true, 
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
    
    // CRITICAL FIX: The `ref` now points to the 'Shop' model 
    // (assuming you have a Shop model for your multi-tenancy setup).
    // The shopName field is removed, resolving the E11000 error.
    shopId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Shop', // <-- FIXED: Changed from 'User' to 'Shop'
        required: true 
    }, 
    
    // shopName field removed entirely.
    
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

// Pre-save hook to hash password before saving
UserSchema.pre('save', async function (next) {
    // Only hash the password if it's new or modified and is not null/empty
    if (this.isModified('password') && this.password) { 
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

// Instance methods 
// Method to generate a token for password reset/account activation
UserSchema.methods.getResetPasswordToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Token expires in 10 minutes (or 24 hours for staff setup, depending on usage)
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; 

    return resetToken;
};

// Method to compare entered password with hashed password
UserSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password) return false; // Handle case where password is not set yet (new staff)
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);