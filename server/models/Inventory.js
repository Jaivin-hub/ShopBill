// models/Inventory.js
const mongoose = require('mongoose');

// Variant Schema for products with multiple options (e.g., different sizes, brands, prices)
const VariantSchema = new mongoose.Schema({
    label: { type: String, required: true, trim: true }, // e.g., "500ml", "1L", "Brand A", "Premium"
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, default: 0, min: 0 },
    reorderLevel: { type: Number, default: null, min: 0 }, // Optional, inherits from parent if null
    hsn: { type: String, trim: true, default: '' }, // Optional, inherits from parent if empty
    sku: { type: String, trim: true, default: '' }, // Optional SKU/barcode for this variant
}, { _id: true });

const InventorySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    // Base price - required if no variants, optional if variants exist
    price: { type: Number, required: function() { return !this.variants || this.variants.length === 0; }, min: 0 },
    // Base quantity - required if no variants, optional if variants exist
    quantity: { type: Number, default: function() { return (this.variants && this.variants.length > 0) ? null : 0; }, min: 0 },
    reorderLevel: { type: Number, default: 5, min: 0 },
    hsn: { type: String, trim: true, default: '' },
    
    // Product variants (e.g., different sizes, brands, prices for the same product)
    variants: [VariantSchema],
    
    // UPDATED: Now points to the specific Store model
    // This allows different stock levels for the same item in different locations.
    storeId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Store', 
        required: true 
    },
}, { timestamps: true });

// Validation: If variants exist, at least one variant is required
InventorySchema.pre('validate', function(next) {
    if (this.variants && this.variants.length > 0) {
        if (this.variants.length === 0) {
            return next(new Error('If variants are defined, at least one variant is required.'));
        }
    }
    next();
});

// Virtual: Get total quantity (sum of all variants or base quantity)
InventorySchema.virtual('totalQuantity').get(function() {
    if (this.variants && this.variants.length > 0) {
        return this.variants.reduce((sum, variant) => sum + (variant.quantity || 0), 0);
    }
    return this.quantity || 0;
});

// Added an index for faster lookups when filtering by store
InventorySchema.index({ storeId: 1, name: 1 });

module.exports = mongoose.model('Inventory', InventorySchema);