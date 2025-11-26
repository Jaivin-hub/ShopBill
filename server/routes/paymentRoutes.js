const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { protect } = require('../middleware/authMiddleware'); // For future paid-user features
const axios = require('axios');

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

    // CRITICAL PRE-CHECK: Ensure the Plan ID is actually loaded from environment variables
    if (!plan_id) {
        console.error(`Missing environment variable for ${plan} plan_id.`);
        return res.status(400).json({ 
            error: `Configuration Error: Razorpay Plan ID for '${plan}' is missing on the server. Please check environment variables (e.g., PREMIUM_PLAN).` 
        });
    }
    
    // --- 30-DAY FREE TRIAL LOGIC ---
    const trialDays = 30;
    // Calculate the timestamp 30 days from now (in seconds)
    const startAtTimestamp = Math.floor(Date.now() / 1000) + (trialDays * 24 * 60 * 60);

    const subscriptionOptions = {
        plan_id: plan_id, // The recurring plan created on the Razorpay Dashboard
        customer_notify: 1, // Notify customer of successful mandate setup
        
        // FIX: Setting total_count to the maximum allowed (1200 cycles, or 100 years 
        // for a monthly plan) to signify an indefinite subscription, as 9999 was too high.
        total_count: 1200, 
        
        // This ensures the first full payment occurs 30 days from now
        start_at: startAtTimestamp, 
        
        // Add a small ₹1 charge for mandate setup verification
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
            amount: subscription.amount, 
            keyId: process.env.RAZORPAY_KEY_ID, 
        });

    } catch (error) {
        console.error('Razorpay Subscription Creation Error:', error);

        // VERBOSE ERROR REPORTING: Extract and return the most specific error detail
        const specificApiError = error.error || error.message || 'Unknown Razorpay error.';
        const statusCode = error.statusCode || 500;

        res.status(statusCode).json({ 
            error: 'Failed to create subscription mandate.',
            razorpayApiError: specificApiError, 
            statusCode: statusCode, 
        });
    }
});


/**
 * @route POST /api/payment/verify-subscription
 * @desc Verifies the signature returned by the client-side checkout after mandate setup.
 * @access Public
 */
router.post('/verify-subscription', async (req, res) => {
    // 1. Extract verification data
    const { 
        razorpay_payment_id, 
        razorpay_signature,
        razorpay_subscription_id 
    } = req.body;

    if (!razorpay_payment_id || !razorpay_signature || !razorpay_subscription_id) {
        return res.status(400).json({ success: false, error: 'Missing required payment verification data for subscription mandate.' });
    }

    try {
        // --- MANDATE VERIFICATION ---
        // For subscription verification, the body is payment_id combined with the subscription_id.
        const body = razorpay_payment_id + '|' + razorpay_subscription_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');
            
        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            
            // --- 2. INSTANT REFUND LOGIC (NEW) ---
            const refundAmount = 100; // 100 paise = ₹1.00
            const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
            const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
            
            try {
                // Call Razorpay API to initiate the refund for the verification payment
                const refundResponse = await axios.post(
                    `https://api.razorpay.com/v1/payments/${razorpay_payment_id}/refunds`,
                    {
                        // The amount to be refunded in the smallest currency unit (paise)
                        amount: refundAmount, 
                        // optional: speed: 'instant' (default is normal/auto, which is usually fast)
                    },
                    {
                        auth: {
                            username: razorpayKeyId,
                            password: razorpayKeySecret,
                        },
                    }
                );

                console.log(`[REFUND SUCCESS] ₹1.00 refunded for Payment ID: ${razorpay_payment_id}`, refundResponse.data);
                // The refund is now processed. Proceed with the main success response.

            } catch (refundError) {
                // IMPORTANT: If refund fails, log the error but DO NOT fail the main transaction.
                // The mandate is already verified and the user should proceed to signup.
                console.error(`[REFUND FAILED] Failed to refund ₹1.00 for Payment ID: ${razorpay_payment_id}. Manual intervention required.`, refundError.response ? refundError.response.data : refundError.message);
            }

            // --- 3. FINAL SUCCESS RESPONSE ---
            res.json({
                success: true,
                message: 'Subscription mandate verified and verification fee refunded successfully.',
                transactionId: razorpay_subscription_id,
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


router.post('/cancel-subscription', protect, async (req, res) => {
    // Assumption: The protect middleware attaches the authenticated user to req.user
    const userId = req.user._id;

    try {
        // 1. Fetch the user to get the Subscription ID
        const user = await User.findById(userId);
        if (!user || !user.transactionId) {
            return res.status(404).json({ error: 'Subscription not found for this user.' });
        }
        
        const subscriptionId = user.transactionId;
        
        // 2. Define cancellation options
        const cancelOptions = {
            // true: Cancels at the end of the current billing cycle (recommended for user experience).
            // false (default): Cancels immediately.
            cancel_at_cycle_end: true 
        };

        // 3. Call Razorpay API to cancel the subscription
        const result = await razorpay.subscriptions.cancel(subscriptionId, cancelOptions);

        // 4. Update the User model status (Optional but good practice)
        // Note: The webhook for 'subscription.cancelled' will handle the final status update,
        // but updating it here provides immediate feedback to the user.
        await User.updateOne({ _id: userId }, { 
            $set: { 
                subscriptionStatus: 'cancellation_pending', // Custom status for 'cancel_at_cycle_end: true'
                lastStatusUpdate: new Date(),
            } 
        });

        console.log(`[SUBSCRIPTION CANCELLED] Subscription ${subscriptionId} cancelled for user ${userId}.`);

        res.json({
            success: true,
            message: 'Subscription will be cancelled at the end of the current billing cycle.',
            razorpayStatus: result.status, // Should be 'cancelled' or similar
        });

    } catch (error) {
        console.error('Razorpay Subscription Cancellation Error:', error);

        res.status(500).json({ 
            error: 'Failed to cancel subscription.',
            razorpayApiError: error.message, 
        });
    }
});

module.exports = router;