// paymentRoutes.js (Full file with the correct cancellation logic)

const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { protect } = require('../middleware/authMiddleware'); 
const axios = require('axios');
const User = require('../models/User')

const router = express.Router();

// --- 1. Initialize Razorpay Instance ---
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// --- Constants for Payments ---
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

    if (!plan || !PLAN_DETAILS[plan]) {
        return res.status(400).json({ error: 'Invalid or missing plan selected.' });
    }

    const { plan_id, description } = PLAN_DETAILS[plan];

    if (!plan_id) {
        console.error(`Missing environment variable for ${plan} plan_id.`);
        return res.status(400).json({ 
            error: `Configuration Error: Razorpay Plan ID for '${plan}' is missing on the server. Please check environment variables (e.g., PREMIUM_PLAN).` 
        });
    }
    
    // --- 30-DAY FREE TRIAL LOGIC ---
    const trialDays = 30;
    const startAtTimestamp = Math.floor(Date.now() / 1000) + (trialDays * 24 * 60 * 60);

    const subscriptionOptions = {
        plan_id: plan_id, 
        customer_notify: 1, 
        total_count: 1200, 
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
        const subscription = await razorpay.subscriptions.create(subscriptionOptions);

        res.json({
            success: true,
            subscriptionId: subscription.id,
            currency: subscription.currency,
            amount: subscription.amount, 
            keyId: process.env.RAZORPAY_KEY_ID, 
        });

    } catch (error) {
        console.error('Razorpay Subscription Creation Error:', error);
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
 * @desc Verifies the signature and refunds the verification fee.
 * @access Public
 */
router.post('/verify-subscription', async (req, res) => { 
    
    // 1. Extract verification data
    const { 
        razorpay_payment_id, 
        razorpay_signature,
        razorpay_subscription_id,
        // The plan is optional here, but kept for future logging/debugging
    } = req.body;

    if (!razorpay_payment_id || !razorpay_signature || !razorpay_subscription_id) {
        return res.status(400).json({ success: false, error: 'Missing required payment verification data.' });
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
                console.log(`[REFUND SUCCESS] ₹1.00 refunded for Payment ID: ${razorpay_payment_id}`);

            } catch (refundError) {
                console.error(`[REFUND FAILED] Failed to refund ₹1.00 for Payment ID: ${razorpay_payment_id}.`);
                // Proceed with success as the mandate is verified.
            }
            
            // --- 3. FINAL SUCCESS RESPONSE ---
            res.json({
                success: true,
                message: 'Subscription mandate verified and refund initiated.',
                transactionId: razorpay_subscription_id, // Return the subscription ID for signup
            });
            
        } else {
            // FAILURE: Signature mismatch 
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


/**
 * @route POST /api/payment/cancel-subscription
 * @desc Cancels a Razorpay subscription dynamically based on trial or paid cycle.
 * @access Private (Requires 'protect')
 */
router.post('/cancel-subscription', protect, async (req, res) => {
    const userId = req.user._id;

    try {
        const user = await User.findById(userId).select('transactionId plan planEndDate subscriptionStatus');
        
        if (!user || !user.transactionId) { 
            return res.status(404).json({ error: 'Subscription not found for this user. transactionId is missing.' });
        }
        
        const subscriptionId = user.transactionId;
        
        // 1. Fetch the Subscription details from Razorpay
        const subscription = await razorpay.subscriptions.fetch(subscriptionId);
        
        // --- Core Logic Refinement ---
        const razorpayStatus = subscription.status;
        
        const isPreBilling = razorpayStatus === 'created' || razorpayStatus === 'authenticated';
        const isPaidCycleRunning = razorpayStatus === 'active';
        
        // Use a broader check for local intent to avoid redundant actions
        const isCancellationPendingLocally = ['cancellation_pending', 'trial_cancellation_pending', 'cancellation_no_refund'].includes(user.subscriptionStatus);
        
        let cancellationMessage;
        let updateStatus = user.subscriptionStatus; // Default to current local status
        let cancellationAction;
        
        let attemptRazorpayImmediateCancel = false; // Flag for RZP API call
        
        // ---------------------------------------------------------------------
        // 2. DETERMINE ACTION BASED ON STATUS
        // ---------------------------------------------------------------------

        if (isCancellationPendingLocally) {
            // 2A. ALREADY PENDING: Redundant request.
            cancellationMessage = `Your subscription is already scheduled for cancellation. Access ends on ${user.planEndDate.toLocaleDateString()}.`;
            cancellationAction = 'already_pending';
            
        } else if (isPreBilling) {
            // 2B. TRIAL/AUTHENTICATED (Immediate RZP Cancel, Access until planEndDate)
            
            cancellationMessage = `Subscription mandate cancellation confirmed (no charge). Your ${user.plan} access will continue until ${user.planEndDate.toLocaleDateString()}.`;
            updateStatus = 'trial_cancellation_pending';
            cancellationAction = 'immediate_mandate_end_access';
            attemptRazorpayImmediateCancel = true; 
            
        } else if (isPaidCycleRunning) {
            // 2C. 🔥 REQUIRED ACTION: IMMEDIATE RZP CANCEL, EXTENDED LOCAL ACCESS
            
            cancellationMessage = `Subscription cancelled immediately. You retain access until ${user.planEndDate.toLocaleDateString()} as the payment was already made.`;
            // Set a custom local status to track that the subscription is cancelled but access remains.
            updateStatus = 'cancellation_no_refund'; 
            cancellationAction = 'immediate_cancel_extended_access';
            attemptRazorpayImmediateCancel = true; 
            
        } else {
            // 2D. FALLBACK
             cancellationMessage = `Subscription status is already ${razorpayStatus}. No action taken.`;
             updateStatus = razorpayStatus; 
             cancellationAction = 'no_action_needed';
        }

        // ---------------------------------------------------------------------
        // --- EXECUTE RAZORPAY API CALLS ---
        // ---------------------------------------------------------------------

        if (attemptRazorpayImmediateCancel) {
            // This is executed for both trial and paid cycles (2B & 2C).
            try {
                // Cancels immediately on Razorpay (Stops future billing)
                await razorpay.subscriptions.cancel(subscriptionId); 
            } catch (razorpayCancelError) {
                 // CRITICAL: If RZP fails, the billing will continue. We must throw an error.
                 console.error(`[RZP ERROR - IMMEDIATE] Failed to cancel Razorpay Subscription ID: ${subscriptionId}. Error: ${razorpayCancelError.error?.description || razorpayCancelError.message}`);
                 throw new Error(`Razorpay API failed to perform immediate cancellation: ${razorpayCancelError.error?.description || 'Unknown error.'}`);
            }
        }
        
        // 3. Update the User model status
        if (cancellationAction !== 'already_pending' && cancellationAction !== 'no_action_needed') {
            await User.updateOne({ _id: userId }, { 
                $set: { 
                    subscriptionStatus: updateStatus, 
                    // planEndDate is NOT updated, retaining the original cycle end date.
                } 
            });
        }

        console.log(`[SUBSCRIPTION CANCELLED] Subscription ${subscriptionId} - Action: ${cancellationAction}`);

        res.json({
            success: true,
            message: cancellationMessage,
            action: cancellationAction, 
            planEndDate: user.planEndDate, // The date they retain access until
        });

    } catch (error) {
        console.error('Razorpay Subscription Cancellation Error:', error);
        
        const apiError = error.error || {};
        
        const errorMessage = error.message.startsWith('Razorpay API failed') 
            ? error.message 
            : apiError.description || error.message;

        res.status(400).json({ 
            error: 'Failed to process cancellation.',
            razorpayApiError: errorMessage,
        });
    }
});

module.exports = router;