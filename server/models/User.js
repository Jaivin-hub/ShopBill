const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: false },
    phone: { type: String, trim: true },

    role: { type: String, enum: ['superadmin', 'owner', 'Manager', 'Cashier'], required: true },

    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // --- Profile & Business Identity Fields ---
    shopName: {
        type: String,
        required: function () { return this.role === 'owner'; },
        // Unique index only applied if the value exists to prevent null collisions
        sparse: true, 
        trim: true
    },
    
    profileImageUrl: { 
        type: String, 
        default: 'https://cdn.vectorstock.com/i/500p/23/78/shopping-bag-icon-vector-27812378.jpg' 
    },

    taxId: { 
        type: String, 
        trim: true, 
        default: '' 
    }, // GST / EIN / Business Tax ID

    address: { 
        type: String, 
        trim: true, 
        default: '' 
    }, // Full Business Address for Invoices

    currency: { 
        type: String, 
        default: 'INR', 
        uppercase: true 
    }, // Default Currency Setting

    timezone: { 
        type: String, 
        default: 'Asia/Kolkata' 
    }, // Business Timezone Setting

    isActive: {
        type: Boolean,
        default: true
    },

    resetPasswordToken: String,
    resetPasswordExpire: Date,

    plan: { type: String, enum: ['BASIC', 'PRO', 'PREMIUM'], default: null },

    // transactionId holds the current ACTIVE Razorpay Subscription ID
    transactionId: String,

    planEndDate: { type: Date, default: null },
    subscriptionStatus: { type: String, default: null },

}, { timestamps: true });

// Pre-save hook to hash password before saving
UserSchema.pre('save', async function (next) {
    if (this.isModified('password') && this.password) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

// Instance methods
UserSchema.methods.getResetPasswordToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    return resetToken;
};

UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);