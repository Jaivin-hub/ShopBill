const mongoose = require('mongoose');
const crypto = require('crypto');

const MandateRestoreRequestSchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    email: { type: String, required: true, trim: true, lowercase: true },
    shopName: { type: String, trim: true },
    ownerMessage: { type: String, trim: true, maxlength: 2000 },
    /** halted = failed-payment recovery; renew = restart after cancel / access ended */
    requestType: {
        type: String,
        enum: ['halted', 'renew'],
        default: 'halted',
        index: true,
    },
    status: {
        type: String,
        enum: ['requested', 'link_ready', 'completed', 'dismissed'],
        default: 'requested',
        index: true,
    },
    razorpaySubscriptionId: { type: String, default: null },
    checkoutToken: {
        type: String,
        unique: true,
        sparse: true,
        default: () => crypto.randomBytes(24).toString('hex'),
    },
    paymentLinkUrl: { type: String, default: null },
    linkSentAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    adminNote: { type: String, trim: true, maxlength: 2000 },
}, { timestamps: true });

MandateRestoreRequestSchema.index({ ownerId: 1, status: 1 });
MandateRestoreRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('MandateRestoreRequest', MandateRestoreRequestSchema);
