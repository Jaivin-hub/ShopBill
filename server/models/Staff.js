const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the allowed roles for type safety and validation
const allowedRoles = ['owner', 'Manager', 'Cashier']; 

const StaffSchema = new Schema({
    // Link to the shop this staff member belongs to (CRITICAL for multi-tenancy)
    // Ref points to the Shop collection/model.
    shopId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Shop' 
    },
    // The user's ID from the main 'User' collection (for login credentials)
    // Links to the User collection/model.
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
        // Set to false here, but uniqueness is enforced by the compound index below.
        unique: false, 
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

// ✅ Compound index: This is the correct way to ensure an email is unique 
// only within the context of a single shop (shopId).
StaffSchema.index({ shopId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('Staff', StaffSchema);