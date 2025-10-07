// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: ['owner', 'cashier'], required: true },
    // CRITICAL: This is the identifier for data separation.
    // For the initial 'owner' signup, this is typically the user's own _id.
    shopId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    }, 
}, { timestamps: true });

// Pre-save hook to hash password before saving
UserSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

// Instance method to compare passwords
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);