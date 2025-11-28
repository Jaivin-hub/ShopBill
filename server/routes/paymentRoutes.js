const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { protect } = require('../middleware/authMiddleware'); // For future paid-user features
const axios = require('axios');
const User = require('../models/User')

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
        plan_id: process.env.BASIC_PLAN, 
        description: 'Pocket POS Basic Plan'
    },
    PRO: { 
        plan_id: process.env.PRO_PLAN, 
        description: 'Pocket POS Pro Plan'
    },    
    PREMIUM: { 
        plan_id: process.env.PREMIUM_PLAN, 
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
 * @desc Verifies the signature, saves the subscription ID to the user record, and refunds the verification fee.
 * @access Private (Requires Authentication)
 * NOTE: This route MUST be called by an authenticated user (after login/signup)
 */
router.post('/verify-subscription', protect, async (req, res) => { // <<< ADDED 'protect'
    const userId = req.user._id; 
    
    // 1. Extract verification data
    const { 
        razorpay_payment_id, 
        razorpay_signature,
        razorpay_subscription_id,
        plan // <<< REQUIRED: Plan name (e.g., 'PREMIUM')
    } = req.body;

    if (!razorpay_payment_id || !razorpay_signature || !razorpay_subscription_id || !plan) {
        return res.status(400).json({ success: false, error: 'Missing required payment verification data (payment ID, signature, subscription ID, or plan).' });
    }

    try {
        // --- MANDATE VERIFICATION ---
        const body = razorpay_payment_id + '|' + razorpay_subscription_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');
            
        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            
            // --- 2. INSTANT REFUND LOGIC ---
            const refundAmount = 100; 
            const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
            const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
            
            try {
                const refundResponse = await axios.post(
                    `https://api.razorpay.com/v1/payments/${razorpay_payment_id}/refunds`,
                    { amount: refundAmount },
                    { auth: { username: razorpayKeyId, password: razorpayKeySecret } }
                );
                console.log(`[REFUND SUCCESS] ₹1.00 refunded for Payment ID: ${razorpay_payment_id}`, refundResponse.data);

            } catch (refundError) {
                console.error(`[REFUND FAILED] Failed to refund ₹1.00 for Payment ID: ${razorpay_payment_id}.`, refundError.response ? refundError.response.data : refundError.message);
                // Proceed with success as the mandate is verified.
            }
            
            // --- 3. SAVE SUBSCRIPTION ID TO USER MODEL (CRITICAL NEW STEP) ---
            await User.updateOne({ _id: userId }, {
                $set: {
                    plan: plan.toUpperCase(), // Save the chosen plan (e.g., 'PREMIUM')
                    transactionId: razorpay_subscription_id, // Save the subscription ID
                }
            });

            // --- 4. FINAL SUCCESS RESPONSE ---
            res.json({
                success: true,
                message: 'Subscription mandate verified and user record updated.',
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
    console.log('userId',userId)

    try {
        // 1. Fetch the user to get the Subscription ID
        const user = await User.findById(userId);
        
        // This check will now pass if the transactionId was saved in /verify-subscription
        if (!user || !user.transactionId) { 
            return res.status(404).json({ error: 'Subscription not found for this user. transactionId is missing.' });
        }
        
        const subscriptionId = user.transactionId;
        
        // 2. Define cancellation options
        const cancelOptions = {
            cancel_at_cycle_end: true // Cancels at the end of the current billing cycle
        };

        // 3. Call Razorpay API to cancel the subscription
        const result = await razorpay.subscriptions.cancel(subscriptionId, cancelOptions);

        // 4. Update the User model status (Optional but good practice)
        await User.updateOne({ _id: userId }, { 
            $set: { 
                subscriptionStatus: 'cancellation_pending', 
                lastStatusUpdate: new Date(),
            } 
        });

        console.log(`[SUBSCRIPTION CANCELLED] Subscription ${subscriptionId} cancelled for user ${userId}.`);

        res.json({
            success: true,
            message: 'Subscription will be cancelled at the end of the current billing cycle.',
            razorpayStatus: result.status, 
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