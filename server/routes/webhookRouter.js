const express = require('express');
const crypto = require('crypto');
const User = require('../models/User'); 
const Payment = require('../models/Payment'); 
const router = express.Router();

// Your Razorpay Webhook Secret (MUST match the secret set in your Razorpay Dashboard)
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

/**
 * @route POST /api/webhooks/razorpay
 * @desc Handles incoming Razorpay subscription and payment events (Webhooks).
 * @access Public (But secured by a signature check)
 * * NOTE ON SECURITY: This Express route MUST be configured to use the raw body buffer 
 * before JSON parsing for the signature verification to work correctly.
 */
router.post('/razorpay', async (req, res) => {
    // 1. Get the signature from the header
    const signature = req.headers['x-razorpay-signature'];

    // 2. Verify the signature
    // CRITICAL: If your server uses body-parser, you must verify the signature
    // using the raw request body buffer, not the parsed JSON object.
    // If you haven't set up the raw body middleware, the current JSON.stringify
    // might fail the verification if the payload is complex.
    const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
        .update(JSON.stringify(req.body)) // Assuming req.body is the raw JSON string or the buffer is accessible
        .digest('hex');

    if (expectedSignature !== signature) {
        console.error('[WEBHOOK ERROR] Invalid Razorpay signature received. Signature:', signature);
        return res.status(400).send('Invalid signature.');
    }
    
    // Signature verified, proceed with event processing
    const event = req.body.event;
    const payload = req.body.payload;
    
    // --- UPDATED LIST OF EVENTS TO PROCESS ---
    const SUBSCRIPTION_EVENTS = [
        'subscription.charged', 
        'payment.failed',
        'subscription.activated', // NEW: Mandate successful
        'subscription.cancelled', // NEW: Subscription termination
        'subscription.halted',    // NEW: Subscription suspension (e.g., failed payments)
    ];
    
    if (!SUBSCRIPTION_EVENTS.includes(event)) {
        // Ignore events we don't need to track (e.g., payment.authorized, subscription.pending)
        return res.json({ success: true, message: `Ignored event: ${event}` });
    }

    try {
        const subscriptionId = payload.subscription?.entity?.id || payload.payment?.entity?.subscription_id;

        if (!subscriptionId) {
             console.error('[WEBHOOK LOG] Could not find subscription ID in payload:', req.body);
             return res.json({ success: true, message: 'Missing Subscription ID.' }); // Return 200 to Razorpay
        }
        
        // 3. Find the Shop/Owner associated with this subscription ID
        // NOTE: Assumes 'owner' role and 'transactionId' holds the Razorpay Subscription ID.
        const owner = await User.findOne({ 
            role: 'owner', 
            transactionId: subscriptionId 
        });

        if (!owner) {
            console.error(`[WEBHOOK LOG] Owner not found for Subscription ID: ${subscriptionId}`);
            return res.json({ success: true, message: 'Owner not found. Ignoring event.' }); 
        }
        
        // 4. Handle Subscription Status Changes (Updates the User model)
        if (event === 'subscription.activated') {
            // This is the initial success after mandate setup (after the 30-day trial setup)
            // CRITICAL: DO NOT create a Payment record for the ₹1 verification charge.
            await User.updateOne({ _id: owner._id }, { 
                $set: { 
                    subscriptionStatus: 'active', // Assumes you add this field to User model
                    lastStatusUpdate: new Date(),
                } 
            });
            console.log(`[WEBHOOK SUCCESS] Subscription ACTIVATED for ${owner.shopName}.`);
            return res.json({ success: true, message: 'Subscription activated and user status updated.' });
            
        } else if (event === 'subscription.cancelled') {
            await User.updateOne({ _id: owner._id }, { 
                $set: { 
                    subscriptionStatus: 'cancelled', // Disables premium features
                    lastStatusUpdate: new Date(),
                } 
            });
            console.log(`[WEBHOOK SUCCESS] Subscription CANCELLED for ${owner.shopName}.`);
            // If the user cancelled, we log it, but don't record a 'payment'.
            return res.json({ success: true, message: 'Subscription cancelled and user status updated.' });
            
        } else if (event === 'subscription.halted') {
            await User.updateOne({ _id: owner._id }, { 
                $set: { 
                    subscriptionStatus: 'halted', // Service suspension
                    lastStatusUpdate: new Date(),
                } 
            });
            console.log(`[WEBHOOK SUCCESS] Subscription HALTED for ${owner.shopName} (Failed payments).`);
            // If halted, we continue to the payment record step below to log the failed charge.
        }

        // --- 5. Handle Payment Attempt Events (Creates a Payment history record) ---
        
        // Only run for charged or failed events
        if (event === 'subscription.charged' || event === 'payment.failed') {
            const paymentEntity = payload.payment?.entity;
            let paymentStatus = 'pending';
            let paymentId = paymentEntity?.id;
            // The amount for the successful/failed attempt
            let amountInPaise = paymentEntity?.amount; 
            let amountInCurrency = amountInPaise / 100; 

            // Fallback prices if amount is missing (e.g., sometimes minimal data on failure)
            const fallbackPrices = { 'BASIC': 499, 'PRO': 799, 'PREMIUM': 999 };
            const fallbackAmount = fallbackPrices[owner.plan] || 0;

            if (event === 'subscription.charged' && paymentEntity?.status === 'captured') {
                paymentStatus = 'paid';
                // Also ensures the User status is active if it somehow wasn't (e.g., resuming service)
                await User.updateOne({ _id: owner._id }, { $set: { subscriptionStatus: 'active', lastStatusUpdate: new Date() } }); 
            } else if (event === 'payment.failed') {
                paymentStatus = 'failed';
                // Generate unique ID for failed attempt if Razorpay didn't provide one
                if (!paymentId) {
                    paymentId = `ATTEMPT_${Date.now()}_${subscriptionId}`;
                }
            } 
            
            // Save the Payment Record
            const paymentRecord = await Payment.create({
                shopId: owner.shopId,
                subscriptionId: subscriptionId,
                paymentId: paymentId,
                eventType: event,
                amount: amountInCurrency || fallbackAmount, 
                status: paymentStatus,
                paymentDate: new Date(),
                razorpayPayload: req.body,
            });

            console.log(`[WEBHOOK SUCCESS] Payment recorded for ${owner.shopName}. Status: ${paymentStatus}. Event: ${event}`);
        }
        
        // 6. Send successful response to Razorpay (required for all processed events)
        res.json({ success: true, message: 'Webhook received and processed.' });

    } catch (error) {
        console.error('[WEBHOOK CRITICAL ERROR] Failed to process webhook:', error);
        // CRITICAL: Always respond with 200 OK to prevent Razorpay from endlessly retrying
        res.json({ success: true, message: 'Server error during processing, but acknowledged.' });
    }
});

module.exports = router;