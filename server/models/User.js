const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    // NOTE: Password should NOT be required if a user is created via the Staff POST route (until they activate).
    // The pre-save hook handles this by hashing only if 'password' is modified. We will keep 'required: true'
    // for owner signup, but be mindful when creating staff users without an initial password.
    password: { type: String, required: false }, // CHANGED to required: false, but signup ensures it is present.
    phone: { type: String, trim: true },
    
    // FIX: Update role enum to include all possible roles, and use PascalCase for consistency
    role: { type: String, enum: ['owner', 'Manager', 'Cashier'], required: true }, 
    
    shopId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', // This should probably be 'Shop' or the primary User model if no Shop model exists
        required: true 
    }, 
    
    // NEW FIELD: Used by PUT /api/staff/:id/toggle to immediately block/allow login
    isActive: { 
        type: Boolean, 
        default: true 
    },

    // === NEW FIELDS FOR PASSWORD RESET / ACTIVATION ===
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    // ===================================
}, { timestamps: true });

// Pre-save hook to hash password before saving
UserSchema.pre('save', async function (next) {
    // FIX: Only hash if the password field exists AND is modified
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

    // Set token expiration time (e.g., 10 minutes for reset, 24 hours for staff activation)
    // NOTE: This generic method should be kept, and staff activation should set expiry directly.
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; 

    // Return the UNHASHED token to be sent in the email/link
    return resetToken;
};

// Instance method to compare passwords
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);