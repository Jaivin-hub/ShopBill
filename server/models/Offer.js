const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    offerType: {
      type: String,
      enum: ['product', 'all_products', 'custom'],
      required: true,
      default: 'custom',
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
      default: null,
    },
    productName: { type: String, trim: true, default: '' },
    discountType: {
      type: String,
      enum: ['percentage', 'flat'],
      required: true,
      default: 'percentage',
    },
    discountValue: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

OfferSchema.index({ storeId: 1, offerType: 1, isActive: 1 });

module.exports = mongoose.model('Offer', OfferSchema);
