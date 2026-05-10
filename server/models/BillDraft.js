const mongoose = require('mongoose');

const DraftLineSchema = new mongoose.Schema(
    {
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
        originalPrice: { type: Number, default: 0 },
        discountAmount: { type: Number, default: 0 },
        appliedOfferId: { type: mongoose.Schema.Types.ObjectId, default: null },
        appliedOfferTitle: { type: String, default: '' },
        variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
        variantLabel: { type: String, default: '' },
        variantSize: { type: String, default: '' },
        variantColor: { type: String, default: '' },
    },
    { _id: false }
);

const BillDraftSchema = new mongoose.Schema(
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
            default: null,
        },
        label: { type: String, default: '' },
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
        customerName: { type: String, default: '' },
        totalAmount: { type: Number, required: true, min: 0 },
        items: { type: [DraftLineSchema], required: true, validate: [(v) => v.length > 0, 'items required'] },
    },
    { timestamps: true }
);

BillDraftSchema.index({ storeId: 1, updatedAt: -1 });

module.exports = mongoose.model('BillDraft', BillDraftSchema);
