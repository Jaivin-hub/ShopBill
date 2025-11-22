const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { protect } = require('../middleware/authMiddleware'); // Assuming this is needed for future paid-user features

const router = express.Router();

// --- 1. Initialize Razorpay Instance ---
// This uses your keys from the environment variables (dotenv is loaded in server.js)
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// --- Constants for Payments (Example Values) ---
const PLAN_DETAILS = {
    BASIC: { amount: 499, currency: 'INR', description: 'Pocket POS Basic Plan' }, // Amount in Rupees
    PRO: { amount: 999, currency: 'INR', description: 'Pocket POS Pro Plan' },    // Amount in Rupees
    PREMIUM: { amount: 1999, currency: 'INR', description: 'Pocket POS Premium Plan' }, // Amount in Rupees
};

// --- Health Check Routes (Kept for completeness) ---

/**
 * @route GET /api/payment/test
 * @desc Test endpoint to verify payment routes are working
 * @access Public
 */
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Razorpay Payment routes are active and initialized!',
        endpoints: {
            createOrder: 'POST /api/payment/create-order',
            verifyPayment: 'POST /api/payment/verify',
        },
        timestamp: new Date().toISOString()
    });
});

// ------------------------------------------------------------------
// --- CORE RAZORPAY FLOW ---
// ------------------------------------------------------------------

/**
 * @route POST /api/payment/create-order
 * @desc Creates a new Razorpay Order on the server.
 * @access Public (This happens before the user is a registered owner)
 */
router.post('/create-order', async (req, res) => {
    const { plan } = req.body;

    // 1. Basic validation
    if (!plan || !PLAN_DETAILS[plan]) {
        return res.status(400).json({ error: 'Invalid or missing plan selected.' });
    }

    const { amount, currency, description } = PLAN_DETAILS[plan];
    
    // Razorpay amount is in the smallest currency unit (Paisa for INR)
    const amountInPaise = amount * 100;

    const options = {
        amount: amountInPaise, 
        currency: currency,
        receipt: `receipt_pos_${Date.now()}`, // Unique receipt ID for idempotency
        payment_capture: 1, // Auto capture the payment upon success
        notes: {
            plan_name: plan,
            description: description
        }
    };

    try {
        // 2. Call Razorpay API to create the Order
        const order = await razorpay.orders.create(options);

        // 3. Return the Order details to the frontend
        res.json({
            success: true,
            orderId: order.id,
            currency: order.currency,
            amount: order.amount, // Amount in paise
            keyId: process.env.RAZORPAY_KEY_ID, // Send key ID back to frontend for checkout
        });

    } catch (error) {
        console.error('Razorpay Order Creation Error:', error);
        res.status(500).json({ error: 'Failed to create payment order.', details: error.message });
    }
});


/**
 * @route POST /api/payment/verify
 * @desc Verifies the payment signature returned by the client-side checkout.
 * @access Public
 */
router.post('/verify', async (req, res) => {
    // These three fields are returned by the Razorpay Checkout handler on the frontend
    const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature 
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ success: false, error: 'Missing payment verification data.' });
    }

    try {
        // 1. Combine the order ID and payment ID with a '|' separator
        const body = razorpay_order_id + '|' + razorpay_payment_id;

        // 2. Create the expected signature using HMAC-SHA256
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');
            
        // 3. Compare the generated signature with the signature from Razorpay
        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            // SUCCESS: Signature verified, payment is legitimate.
            // In a real application, you would:
            // a) Find the pending payment/user record by razorpay_order_id
            // b) Update the record as 'paid'
            // c) Proceed to the signup logic using the payment ID as the transaction ID

            res.json({
                success: true,
                message: 'Payment verified successfully. Proceed to user signup.',
                transactionId: razorpay_payment_id, // Use this for the signup process!
            });
        } else {
            // FAILURE: Signature mismatch (potential fraud attempt)
            res.status(400).json({
                success: false,
                error: 'Payment verification failed. Signature mismatch.',
            });
        }

    } catch (error) {
        console.error('Razorpay Verification Error:', error);
        res.status(500).json({ success: false, error: 'Server error during payment verification.' });
    }
});


module.exports = router;