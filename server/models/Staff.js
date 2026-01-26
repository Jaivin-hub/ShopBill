const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the allowed roles for type safety and validation
const allowedRoles = ['owner', 'Manager', 'Cashier']; 

const StaffSchema = new Schema({
    // UPDATED: Renamed from shopId to storeId for consistency
    // Points to the specific Store/Branch they work at.
    storeId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Store' // Ensure this matches your Store model name
    },
    // The user's ID from the main 'User' collection (for login credentials)
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
        unique: false, 
        lowercase: true,
        match: [/.+\@.+\..+/, 'Please fill a valid email address']
    },
    // Role for permissions
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
}, { timestamps: true }); // Added timestamps for better auditing

// ✅ Compound index: Ensures an email is unique within a specific store.
// UPDATED: Changed from shopId to storeId
StaffSchema.index({ storeId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('Staff', StaffSchema);