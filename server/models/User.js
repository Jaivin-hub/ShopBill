const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // <-- Import crypto here to define the method

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: ['owner', 'cashier'], required: true },
    shopId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    }, 
    // === NEW FIELDS FOR PASSWORD RESET ===
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    // ===================================
}, { timestamps: true });

// Pre-save hook to hash password before saving
UserSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
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

    // Set token expiration time (e.g., 10 minutes from now)
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Return the UNHASHED token to be sent in the email/link
    return resetToken;
};

// Instance method to compare passwords
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);