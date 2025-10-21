const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the allowed roles for type safety and validation
const allowedRoles = ['owner', 'Manager', 'Cashier']; // Correct PascalCase roles

const StaffSchema = new Schema({
    // Link to the shop this staff member belongs to (CRITICAL for multi-tenancy)
    shopId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Shop' 
    },
    // The user's ID from the main 'User' collection (for login credentials)
    // FIX: Set required: true since staff must have a login account created
    userId: {
        type: Schema.Types.ObjectId,
        required: true, 
        ref: 'User'
    },
    // Display Name
    name: {
        type: String,
        required: [true, 'Staff member name is required.'],
        trim: true,
        maxlength: 100
    },
    // Unique identifier for login/setup
    email: {
        type: String,
        required: [true, 'Email is required.'],
        unique: false, // Unique within a shop, but not globally
        lowercase: true,
        match: [/.+\@.+\..+/, 'Please fill a valid email address']
    },
    // Role for permissions (owner, Manager, Cashier)
    role: {
        type: String,
        required: true,
        enum: allowedRoles,
        default: 'Cashier'
    },
    // Status to enable/disable access without deletion
    active: {
        type: Boolean,
        default: true
    },
    // Date the staff member was added
    createdAt: {
        type: Date,
        default: Date.now
    },
});

// Compound index to ensure email uniqueness *per shop*
StaffSchema.index({ shopId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('Staff', StaffSchema);