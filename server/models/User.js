const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    // Password is set to required: false because staff accounts are created without one initially, 
    // but the signup route ensures it's present for owners.
    password: { type: String, required: false }, 
    phone: { type: String, trim: true },
    
    // Updated role enum with consistent PascalCase
    role: { type: String, enum: ['superadmin', 'owner', 'Manager', 'Cashier'], required: true }, 
    
    shopId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', // Referencing the User collection itself for shop scoping
        required: true 
    }, 
    
    isActive: { 
        type: Boolean, 
        default: true 
    },

    // === FIELDS FOR PASSWORD RESET / ACTIVATION ===
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    
    // === FIELDS FOR SUBSCRIPTION / PAYMENT ===
    plan: { type: String, enum: ['BASIC', 'PRO', 'PREMIUM'], default: null },
    transactionId: String, // Store payment transaction ID (Razorpay Payment ID)
    // ===================================
}, { timestamps: true });

// Pre-save hook to hash password before saving
UserSchema.pre('save', async function (next) {
    // Only hash if the password field exists AND is modified
    if (this.isModified('password') && this.password) { 
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

// Instance method to generate and save the reset token (Used in forgot-password route)
UserSchema.methods.getResetPasswordToken = function () {
    // Generate a secure, unhashed token (sent to user via email/link)
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash the token and store the HASHED version in the database
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set token expiration time (e.g., 10 minutes)
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; 

    // Return the UNHASHED token to be sent in the email/link
    return resetToken;
};

// Instance method to compare passwords
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);