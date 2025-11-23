const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { protect } = require('../middleware/authMiddleware'); // For future paid-user features

const router = express.Router();

// --- 1. Initialize Razorpay Instance ---
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// --- Constants for Payments (Updated to include Razorpay Plan IDs) ---
// NOTE: These IDs MUST be created on your Razorpay Dashboard in Live Mode
const PLAN_DETAILS = {
    BASIC: { 
        plan_id: process.env.BASIC_PLAN, // <<== REPLACE WITH YOUR LIVE BASIC PLAN ID
        description: 'Pocket POS Basic Plan'
    },
    PRO: { 
        plan_id: process.env.PRO_PLAN, // <<== REPLACE WITH YOUR LIVE PRO PLAN ID
        description: 'Pocket POS Pro Plan'
    },    
    PREMIUM: { 
        plan_id: process.env.PREMIUM_PLAN, // <<== REPLACE WITH YOUR LIVE PREMIUM PLAN ID
        description: 'Pocket POS Premium Plan'
    }, 
};

// ------------------------------------------------------------------
// --- CORE RAZORPAY SUBSCRIPTION FLOW ---
// ------------------------------------------------------------------

/**
 * @route POST /api/payment/create-subscription
 * @desc Creates a new Razorpay Subscription Mandate. Includes 30-day free trial logic.
 * @access Public
 */
router.post('/create-subscription', async (req, res) => {
    const { plan } = req.body;

    // 1. Basic validation
    if (!plan || !PLAN_DETAILS[plan]) {
        return res.status(400).json({ error: 'Invalid or missing plan selected.' });
    }

    const { plan_id, description } = PLAN_DETAILS[plan];
    
    // --- 30-DAY FREE TRIAL LOGIC ---
    // The payment mandate is set up immediately, but the first full charge is delayed.
    const trialDays = 30;
    const startAtTimestamp = Math.floor(Date.now() / 1000) + (trialDays * 24 * 60 * 60);

    const subscriptionOptions = {
        plan_id: plan_id, // The recurring plan created on the Razorpay Dashboard
        customer_notify: 1, // Notify customer of successful mandate setup
        total_count: 0, // 0 for infinite billing cycles (until cancelled)
        start_at: startAtTimestamp, // First full payment occurs 30 days from now
        
        // Add a small ₹1 charge for mandate setup verification (Mandatory for some methods)
        addons: [{
            item: {
                name: 'Verification Charge',
                amount: 100, // 100 paise = ₹1.00
                currency: 'INR'
            }
        }],
        notes: {
            plan_name: plan,
            description: description
        }
    };

    try {
        // 2. Call Razorpay API to create the Subscription
        const subscription = await razorpay.subscriptions.create(subscriptionOptions);

        // 3. Return the Subscription ID and other details to the frontend
        res.json({
            success: true,
            subscriptionId: subscription.id,
            currency: subscription.currency,
            amount: subscription.amount, // This will be the ₹1 verification charge
            keyId: process.env.RAZORPAY_KEY_ID, // Send key ID back for checkout integration
        });

    } catch (error) {
        console.error('Razorpay Subscription Creation Error:', error);
        res.status(500).json({ error: 'Failed to create subscription mandate.', details: error.message });
    }
});


/**
 * @route POST /api/payment/verify-subscription
 * @desc Verifies the signature returned by the client-side checkout after mandate setup.
 * @access Public
 */
router.post('/verify-subscription', async (req, res) => {
    // These three fields are returned by the Razorpay Checkout handler on the frontend
    // NOTE: The 'order' ID is now the ID of the internal order created for the mandate setup
    const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature,
        razorpay_subscription_id // New critical field for subscription verification
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !razorpay_subscription_id) {
        return res.status(400).json({ success: false, error: 'Missing payment verification data for subscription mandate.' });
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
            // SUCCESS: Signature verified, mandate setup is legitimate.
            // 4. Use the subscription ID as the transaction ID for the signup process.
            
            res.json({
                success: true,
                message: 'Subscription mandate verified successfully. Proceed to user signup.',
                transactionId: razorpay_subscription_id, // Use the SUBSCRIPTION ID as the transaction ID
            });
        } else {
            // FAILURE: Signature mismatch (potential fraud attempt)
            res.status(400).json({
                success: false,
                error: 'Subscription mandate verification failed. Signature mismatch.',
            });
        }

    } catch (error) {
        console.error('Razorpay Subscription Verification Error:', error);
        res.status(500).json({ success: false, error: 'Server error during subscription verification.' });
    }
});


module.exports = router;