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
 */
router.post('/razorpay', async (req, res) => {
    
    // 🔥 DEBUG: Log the start of webhook processing
    console.log('\n--- RAZORPAY WEBHOOK RECEIVED ---'); 
    
    // 1. Get the signature from the header
    const signature = req.headers['x-razorpay-signature'];

    // 2. Verify the signature
    const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');

    if (expectedSignature !== signature) {
        console.error('[WEBHOOK ERROR] Invalid Razorpay signature received. Signature:', signature);
        console.log(`[WEBHOOK ERROR] Expected: ${expectedSignature}, Received: ${signature}`);
        return res.status(400).send('Invalid signature.');
    }
    
    // 🔥 DEBUG: Log successful signature validation
    console.log('[WEBHOOK SUCCESS] Signature validated.'); 

    // Signature verified, proceed with event processing
    const event = req.body.event;
    const payload = req.body.payload;
    
    // 🔥 DEBUG: Log the event type
    console.log(`[WEBHOOK EVENT] Processing event: ${event}`); 

    // --- UPDATED LIST OF EVENTS TO PROCESS ---
    const SUBSCRIPTION_EVENTS = [
        'subscription.charged',
        'payment.failed',
        'subscription.activated', 
        'subscription.cancelled', 
        'subscription.halted',    
    ];

    if (!SUBSCRIPTION_EVENTS.includes(event)) {
        // Ignore events we don't need to track
        console.log(`[WEBHOOK LOG] Ignored event: ${event}`);
        return res.json({ success: true, message: `Ignored event: ${event}` });
    }

    try {
        const subscriptionId = payload.subscription?.entity?.id || payload.payment?.entity?.subscription_id;

        if (!subscriptionId) {
             console.error('[WEBHOOK LOG] Could not find subscription ID in payload. Payload Dump:', JSON.stringify(req.body, null, 2));
             return res.json({ success: true, message: 'Missing Subscription ID.' }); 
        }
        
        // 🔥 DEBUG: Log the subscription ID being processed
        console.log(`[WEBHOOK SUBSCRIPTION ID] ${subscriptionId}`); 

        // 3. Find the Shop/Owner associated with this subscription ID
        const owner = await User.findOne({ 
            role: 'owner', 
            transactionId: subscriptionId 
        }).select('shopName plan subscriptionStatus planEndDate'); // Select key fields for logging

        if (!owner) {
            console.error(`[WEBHOOK LOG] Owner not found for Subscription ID: ${subscriptionId}`);
            return res.json({ success: true, message: 'Owner not found. Ignoring event.' }); 
        }
        
        // 🔥 DEBUG: Log the user found
        console.log(`[WEBHOOK USER FOUND] Shop: ${owner.shopName}, Current Plan: ${owner.plan}, Status: ${owner.subscriptionStatus}`);

        // 4. Handle Subscription Status Changes (Updates the User model)
        if (event === 'subscription.activated') {
            await User.updateOne({ _id: owner._id }, {
                $set: {
                    subscriptionStatus: 'active',
                    lastStatusUpdate: new Date(),
                }
            });
            console.log(`[WEBHOOK SUCCESS] Subscription ACTIVATED (Mandate confirmed) for ${owner.shopName}. Status updated to 'active'.`);
            return res.json({ success: true, message: 'Subscription mandate activated and user status updated.' });

        } else if (event === 'subscription.cancelled') {
            await User.updateOne({ _id: owner._id }, {
                $set: {
                    subscriptionStatus: 'cancelled',
                    lastStatusUpdate: new Date(),
                }
            });
            console.log(`[WEBHOOK SUCCESS] Subscription CANCELLED for ${owner.shopName}. Status updated to 'cancelled'.`);
            return res.json({ success: true, message: 'Subscription cancelled and user status updated.' });

        } else if (event === 'subscription.halted') {
            await User.updateOne({ _id: owner._id }, {
                $set: {
                    subscriptionStatus: 'halted',
                    lastStatusUpdate: new Date(),
                }
            });
            console.log(`[WEBHOOK SUCCESS] Subscription HALTED for ${owner.shopName}. Status updated to 'halted'.`);
            // Continue to payment record step to log the failed charge.
        }

        // --- 5. Handle Payment Attempt Events (Creates a Payment history record) ---

        // Only run for charged or failed events
        if (event === 'subscription.charged' || event === 'payment.failed') {
            const paymentEntity = payload.payment?.entity;
            let paymentStatus = 'pending';
            let paymentId = paymentEntity?.id;
            let amountInPaise = paymentEntity?.amount;
            let amountInCurrency = amountInPaise / 100;

            const fallbackPrices = { 'BASIC': 499, 'PRO': 799, 'PREMIUM': 999 };
            const fallbackAmount = fallbackPrices[owner.plan] || 0;

            const updateFields = { lastStatusUpdate: new Date() };

            if (event === 'subscription.charged' && paymentEntity?.status === 'captured') {
                paymentStatus = 'paid';
                
                // Determine the next billing date (always assume 1 month/30 days from now)
                const nextMonth = new Date();
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                
                // 🔥 CRITICAL FIX: Update the plan end date on successful charge
                updateFields.subscriptionStatus = 'active'; // Ensure status is active
                updateFields.planEndDate = nextMonth;      // Set the new expiration date

                await User.updateOne({ _id: owner._id }, { $set: updateFields });
                
                // 🔥 DEBUG: Log the date update
                console.log(`[WEBHOOK CHARGED] Plan End Date updated to: ${nextMonth.toISOString()}`);

            } else if (event === 'payment.failed') {
                paymentStatus = 'failed';
                if (!paymentId) {
                    paymentId = `ATTEMPT_${Date.now()}_${subscriptionId}`;
                }
                
                // Log the failure details
                console.warn(`[WEBHOOK FAILED] Payment attempt failed for ${owner.shopName}. Payment ID: ${paymentId}`);
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

            // 🔥 DEBUG: Log the payment record creation
            console.log(`[WEBHOOK SUCCESS] Payment recorded in DB. ID: ${paymentRecord._id}. Status: ${paymentStatus}.`);
        }

        // 6. Send successful response to Razorpay (required for all processed events)
        res.json({ success: true, message: 'Webhook received and processed.' });

    } catch (error) {
        console.error('[WEBHOOK CRITICAL ERROR] Failed to process webhook:', error);
        console.error('Error Details:', error.message);
        // CRITICAL: Always respond with 200 OK to prevent Razorpay from endlessly retrying
        res.json({ success: true, message: 'Server error during processing, but acknowledged.' });
    }
});

module.exports = router;