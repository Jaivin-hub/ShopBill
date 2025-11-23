// models/Payment.js
const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    // Shop ID linked to the payment
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference the User model (where shopId = owner._id)
        required: true,
        index: true,
    },
    // Razorpay Subscription ID (from User.transactionId)
    subscriptionId: {
        type: String,
        required: true,
        index: true,
    },
    // Razorpay Payment ID (unique for each charge/payment)
    paymentId: {
        type: String,
        unique: true,
        sparse: true, // Allows null values, but unique when present
    },
    // The specific event type from Razorpay (e.g., 'subscription.charged', 'payment.failed')
    eventType: {
        type: String,
        required: true,
    },
    amount: {
        type: Number, // Stored in Rupees (or your primary currency unit)
        required: true,
    },
    status: {
        type: String,
        enum: ['paid', 'failed', 'pending', 'overdue'],
        default: 'pending',
    },
    // Date/time of the payment event (e.g., when the charge was successful)
    paymentDate: {
        type: Date,
        default: Date.now,
    },
    // Full payload received from Razorpay (useful for debugging)
    razorpayPayload: {
        type: mongoose.Schema.Types.Mixed,
    },
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);