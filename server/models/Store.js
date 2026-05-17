const mongoose = require('mongoose');

const StoreSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    
    // The Owner who "owns" this store. 
    // This connects back to the User model where the subscription Plan is stored.
    ownerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        index: true // Added index for fast retrieval of an owner's stores
    },

    taxId: { type: String, trim: true }, // Store-specific GSTIN
    address: { type: String, trim: true },
    phone: { type: String },
    
    // Optional: useful for receipt headers or specific store branding
    email: { type: String, lowercase: true, trim: true }, 
    
    // Status to allow owners to "close" or "archive" a branch without deleting data
    isActive: { type: Boolean, default: true },

    // Configuration can be store-specific (e.g., one branch uses different receipt settings)
    settings: {
        lowStockThreshold: { type: Number, default: 5 },
        receiptFooter: { type: String, default: 'Thank you for shopping!' },
        /** Owner-controlled page access for Manager/Cashier (grant permissions UI). */
        rolePagePermissions: {
            manager: {
                dashboard: { type: Boolean, default: true },
                billing: { type: Boolean, default: true },
                khata: { type: Boolean, default: true },
                salesActivity: { type: Boolean, default: true },
                inventory: { type: Boolean, default: true },
                scm: { type: Boolean, default: true },
                staffPermissions: { type: Boolean, default: true },
                offers: { type: Boolean, default: true }
            },
            cashier: {
                dashboard: { type: Boolean, default: true },
                billing: { type: Boolean, default: true },
                khata: { type: Boolean, default: true },
                salesActivity: { type: Boolean, default: true },
                inventory: { type: Boolean, default: false },
                scm: { type: Boolean, default: false },
                staffPermissions: { type: Boolean, default: false },
                offers: { type: Boolean, default: false }
            }
        },
        attendancePolicy: {
            enabled: { type: Boolean, default: false },
            defaultPunchInStart: { type: String, default: '' }, // HH:mm
            defaultPunchInEnd: { type: String, default: '' }, // HH:mm
            defaultAutoPunchOutTime: { type: String, default: '' }, // HH:mm
            defaultAutoPunchOutEnabled: { type: Boolean, default: false },
            allowShiftOverrides: { type: Boolean, default: true }
        }
    }
}, { timestamps: true });

// Ensure an owner doesn't accidentally name two stores exactly the same
StoreSchema.index({ ownerId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Store', StoreSchema);