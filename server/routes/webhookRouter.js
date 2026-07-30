// webhooks/razorpay.js (FINAL FIXED VERSION - SYNCED WITH RAZORPAY TIMESTAMPS)

const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const Payment = require('../models/Payment');
const MandateRestoreRequest = require('../models/MandateRestoreRequest');
const { razorpay: rzpClient } = require('../utils/mandateRestore');
const { daysBetweenCalendar, formatDateInEnIn } = require('../utils/billingDates');
const {
    notifyOwnerPaymentFailedGrace,
    notifyOwnerMandateCancelled,
    notifySuperadminsBillingActivated,
    notifySuperadminsMandateActivated,
    notifySuperadminsMandateRevoked,
    notifySuperadminsSubscriptionCancelled,
    notifySuperadminsSubscriptionHalted,
    notifySuperadminsPaymentFailed,
} = require('../services/notifySubscriptionBilling');
const { classifyRazorpayFailure } = require('../utils/razorpayPaymentFailure');
const { USER_CANCELLED_ACCESS_STATUSES } = require('../utils/subscriptionAccess');
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
        'invoice.payment_failed',
        'subscription.pending',
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

        // 3. Find the Shop/Owner (current sub, mandate-restore sub, or notes.userId)
        let owner = await User.findOne({
            role: 'owner',
            transactionId: subscriptionId,
        }).select('_id shopName plan subscriptionStatus planEndDate transactionId paymentFailedAt email');

        if (!owner) {
            const restoreReq = await MandateRestoreRequest.findOne({
                razorpaySubscriptionId: subscriptionId,
            }).lean();
            if (restoreReq?.ownerId) {
                owner = await User.findById(restoreReq.ownerId).select(
                    '_id shopName plan subscriptionStatus planEndDate transactionId paymentFailedAt email'
                );
            }
        }

        if (!owner) {
            try {
                const subEntity = payload.subscription?.entity;
                const notesUserId = subEntity?.notes?.userId;
                if (notesUserId) {
                    owner = await User.findById(notesUserId).select(
                        '_id shopName plan subscriptionStatus planEndDate transactionId paymentFailedAt email'
                    );
                } else if (rzpClient) {
                    const subDetails = await rzpClient.subscriptions.fetch(subscriptionId);
                    if (subDetails?.notes?.userId) {
                        owner = await User.findById(subDetails.notes.userId).select(
                            '_id shopName plan subscriptionStatus planEndDate transactionId paymentFailedAt email'
                        );
                    }
                }
            } catch (lookupErr) {
                console.warn('[WEBHOOK] Mandate-restore owner lookup failed:', lookupErr.message);
            }
        }

        if (!owner) {
            console.warn(`[WEBHOOK LOG] Owner not found for Subscription ID: ${subscriptionId}. Skipping update.`);
            return res.json({ success: true, message: 'Owner not found. Ignoring event.' });
        }
        
        // 🔥 DEBUG: Log the user found
        console.log(`[WEBHOOK USER FOUND] Shop: ${owner.shopName}, Current Plan: ${owner.plan}, Status: ${owner.subscriptionStatus}, Shop ID (User _id): ${owner._id}`);

        // 4. Handle Subscription Status Changes (Updates the User model)

        if (event === 'subscription.activated') {
            const activatedUpdate = { lastStatusUpdate: new Date() };
            const currentStatus = String(owner.subscriptionStatus || '').toLowerCase();
            // Keep halted until subscription.charged restores access (international dunning).
            // Do not overwrite user-initiated cancellation states.
            if (
                currentStatus !== 'halted' &&
                !USER_CANCELLED_ACCESS_STATUSES.has(currentStatus)
            ) {
                activatedUpdate.subscriptionStatus = 'authenticated';
            }
            if (subscriptionId && subscriptionId !== owner.transactionId) {
                activatedUpdate.transactionId = subscriptionId;
            }
            await User.updateOne({ _id: owner._id }, { $set: activatedUpdate });
            console.log(
                `[WEBHOOK SUCCESS] Subscription ACTIVATED for ${owner.shopName}.` +
                    (currentStatus === 'halted' ? ' (halted until payment confirmed)' : " Status → 'authenticated'.")
            );

            if (activatedUpdate.subscriptionStatus === 'authenticated') {
                const io = req.app && req.app.get ? req.app.get('socketio') : null;
                const ownerForNotify = await User.findById(owner._id)
                    .select('_id shopName email plan deviceTokens pushNotificationsEnabled')
                    .lean();
                if (ownerForNotify) {
                    await notifySuperadminsMandateActivated(io, ownerForNotify, {
                        subscriptionId,
                    });
                }
            }

            return res.json({ success: true, message: 'Subscription mandate activated and user status updated.' });
            
        } else if (event === 'subscription.cancelled') {
            const localStatus = String(owner.subscriptionStatus || '').toLowerCase();
            const userInitiatedCancel = USER_CANCELLED_ACCESS_STATUSES.has(localStatus);

            if (owner.subscriptionStatus !== 'cancelled_replaced' && !userInitiatedCancel) {
                const failure = classifyRazorpayFailure(req.body, event);
                await User.updateOne({ _id: owner._id }, {
                    $set: {
                        subscriptionStatus: 'cancelled',
                        lastStatusUpdate: new Date(),
                        lastPaymentFailureReason: failure.code,
                        lastPaymentFailureDetail: failure.razorpayDescription || failure.razorpayReason,
                    },
                });
                console.log(`[WEBHOOK SUCCESS] Subscription CANCELLED for ${owner.shopName}. Status updated to 'cancelled'.`);

                const io = req.app && req.app.get ? req.app.get('socketio') : null;
                const ownerForNotify = await User.findById(owner._id)
                    .select('_id shopName email deviceTokens pushNotificationsEnabled planEndDate')
                    .lean();
                if (ownerForNotify) {
                    await notifyOwnerMandateCancelled(io, ownerForNotify);
                }

                const ownerForSa = await User.findById(owner._id)
                    .select('_id shopName email plan')
                    .lean();
                if (ownerForSa) {
                    await notifySuperadminsMandateRevoked(io, ownerForSa, { subscriptionId });
                }
            } else if (userInitiatedCancel) {
                console.log(
                    `[WEBHOOK LOG] subscription.cancelled for ${owner.shopName} — keeping local status "${owner.subscriptionStatus}" (user-initiated cancel).`
                );
                const io = req.app && req.app.get ? req.app.get('socketio') : null;
                const ownerForSa = await User.findById(owner._id)
                    .select('_id shopName email plan planEndDate')
                    .lean();
                if (ownerForSa) {
                    const accessEndLabel = ownerForSa.planEndDate
                        ? formatDateInEnIn(new Date(ownerForSa.planEndDate))
                        : null;
                    await notifySuperadminsSubscriptionCancelled(io, ownerForSa, {
                        subscriptionStatus: localStatus,
                        cancellationAction: 'webhook_confirmed',
                        subscriptionId,
                        accessEndLabel,
                        dedupeKey: `cancel_${owner._id}_${subscriptionId}_${localStatus}`,
                    }).catch((err) =>
                        console.error('[Notify] superadmin cancel (webhook):', err?.message || err)
                    );
                }
            }

            return res.json({ success: true, message: 'Subscription cancelled event handled.' });

        } else if (event === 'subscription.halted') {
            const failure = classifyRazorpayFailure(req.body, event);
            await User.updateOne({ _id: owner._id }, {
                $set: {
                    subscriptionStatus: 'halted',
                    lastStatusUpdate: new Date(),
                    lastPaymentFailureReason: failure.code,
                    lastPaymentFailureDetail: failure.razorpayDescription || failure.razorpayReason,
                },
            });
            console.log(`[WEBHOOK SUCCESS] Subscription HALTED for ${owner.shopName}. Status updated to 'halted'.`);

            const ioHalt = req.app && req.app.get ? req.app.get('socketio') : null;
            const ownerHalted = await User.findById(owner._id)
                .select('_id shopName email plan')
                .lean();
            if (ownerHalted) {
                await notifySuperadminsSubscriptionHalted(ioHalt, ownerHalted, {
                    subscriptionId,
                    failureCode: failure.code,
                });
            }
        }

        // --- 5. Handle Payment Attempt Events (Creates a Payment history record) ---
        
        if (
            event === 'subscription.charged' ||
            event === 'payment.failed' ||
            event === 'invoice.payment_failed' ||
            event === 'subscription.pending' ||
            event === 'subscription.halted'
        ) {
            const paymentEntity = payload.payment?.entity;
            const subscriptionEntity = payload.subscription?.entity; // Get subscription details
            
            let paymentStatus = 'pending';
            let paymentId = paymentEntity?.id;
            const amountInPaise = paymentEntity?.amount;
            let amountInCurrency =
                amountInPaise != null && !Number.isNaN(Number(amountInPaise))
                    ? Number(amountInPaise) / 100
                    : 0;
            let failureForPayment = null;

            const fallbackPrices = { 'BASIC': 499, 'PRO': 999, 'PREMIUM': 2999 };
            const finalAmount = amountInCurrency || fallbackPrices[owner.plan] || 0; 

            const updateFields = { lastStatusUpdate: new Date() };
            const isFailureEvent =
                event === 'payment.failed' ||
                event === 'invoice.payment_failed' ||
                event === 'subscription.pending' ||
                event === 'subscription.halted';

            if (event === 'subscription.charged' && paymentEntity?.status === 'captured') {
                paymentStatus = 'paid';
                
                // ⭐ CRITICAL FIX: Use the 'current_end' timestamp provided by Razorpay
                // This converts Razorpay's UNIX timestamp (seconds) to Javascript Date (milliseconds)
                // This ensures the date matches the dashboard (e.g., Jan 14) exactly.
                let nextBillingDate;
                if (subscriptionEntity && subscriptionEntity.current_end) {
                    nextBillingDate = new Date(subscriptionEntity.current_end * 1000);
                } else {
                    // Fallback only if payload data is missing
                    nextBillingDate = new Date();
                    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
                }
                
                const localStatus = String(owner.subscriptionStatus || '').toLowerCase();
                if (localStatus === 'cancellation_pending') {
                    updateFields.subscriptionStatus = 'cancellation_no_refund';
                    console.log(
                        `[WEBHOOK] Due payment collected for ${owner.shopName} while cancel scheduled — status cancellation_no_refund.`
                    );
                } else {
                    updateFields.subscriptionStatus = 'active';
                }
                updateFields.planEndDate = nextBillingDate;
                updateFields.paymentFailedAt = null;
                updateFields.lastPaymentFailureReason = null;
                updateFields.lastPaymentFailureDetail = null;
                updateFields.isActive = true;
                updateFields.transactionId = subscriptionId;

                await User.updateOne({ _id: owner._id }, { $set: updateFields });

                await MandateRestoreRequest.updateMany(
                    { ownerId: owner._id, status: { $in: ['requested', 'link_ready'] } },
                    { $set: { status: 'completed', completedAt: new Date() } }
                );
                
                console.log(`[WEBHOOK SUCCESS] Plan End Date SYNCED with Razorpay: ${nextBillingDate.toISOString()}. Status set to 'active'.`);

                const ioCharge = req.app && req.app.get ? req.app.get('socketio') : null;
                const ownerCharged = await User.findById(owner._id)
                    .select('_id shopName email plan')
                    .lean();
                if (ownerCharged) {
                    await notifySuperadminsBillingActivated(ioCharge, ownerCharged, {
                        amount: finalAmount,
                        paymentId,
                        subscriptionId,
                        planEndDate: nextBillingDate,
                    });
                }

            } else if (isFailureEvent) {
                const paymentFailed =
                    event === 'payment.failed' ||
                    event === 'invoice.payment_failed' ||
                    event === 'subscription.halted' ||
                    (event === 'subscription.pending' &&
                        String(paymentEntity?.status || '').toLowerCase() === 'failed');
                paymentStatus = paymentFailed ? 'failed' : 'pending';
                if (!paymentId) {
                    paymentId = `ATTEMPT_${Date.now()}_${subscriptionId}`;
                }

                failureForPayment = classifyRazorpayFailure(req.body, event === 'invoice.payment_failed' ? 'payment.failed' : event);
                console.warn(
                    `[WEBHOOK FAILED] Payment attempt failed for ${owner.shopName}. Payment ID: ${paymentId}. Reason: ${failureForPayment.code}`
                );

                const io = req.app && req.app.get ? req.app.get('socketio') : null;
                const failedAt = owner.paymentFailedAt ? new Date(owner.paymentFailedAt) : new Date();
                const accessEnd = owner.planEndDate ? new Date(owner.planEndDate) : null;
                const daysLeft = accessEnd
                    ? Math.max(0, daysBetweenCalendar(new Date(), accessEnd))
                    : 0;

                await User.updateOne(
                    { _id: owner._id },
                    {
                        $set: {
                            paymentFailedAt: failedAt,
                            subscriptionStatus:
                                event === 'subscription.halted'
                                    ? 'halted'
                                    : event === 'subscription.pending'
                                      ? 'pending'
                                      : owner.subscriptionStatus,
                            lastStatusUpdate: new Date(),
                            lastPaymentFailureReason: failureForPayment.code,
                            lastPaymentFailureDetail:
                                failureForPayment.razorpayDescription ||
                                failureForPayment.razorpayReason ||
                                null,
                        },
                    }
                );

                const ownerForNotify = await User.findById(owner._id)
                    .select('_id shopName email deviceTokens pushNotificationsEnabled paymentFailedAt planEndDate')
                    .lean();
                if (ownerForNotify?.planEndDate && daysLeft >= 0) {
                    await notifyOwnerPaymentFailedGrace(
                        io,
                        ownerForNotify,
                        daysLeft,
                        ownerForNotify.planEndDate,
                        failureForPayment.code
                    );
                }

                if (paymentFailed && event !== 'subscription.halted') {
                    const ownerForSa = await User.findById(owner._id)
                        .select('_id shopName email plan')
                        .lean();
                    if (ownerForSa) {
                        await notifySuperadminsPaymentFailed(io, ownerForSa, {
                            amount: finalAmount,
                            paymentId,
                            subscriptionId,
                            failureCode: failureForPayment?.code,
                            failureDetail:
                                failureForPayment?.razorpayDescription ||
                                failureForPayment?.razorpayReason ||
                                null,
                            eventType: event,
                        });
                    }
                }
            }

            // Save the Payment Record (upsert so retries / duplicate webhooks still appear once)
            const paymentRecord = await Payment.findOneAndUpdate(
                { paymentId },
                {
                    shopId: owner._id,
                    subscriptionId: subscriptionId,
                    paymentId: paymentId,
                    eventType: event,
                    amount: finalAmount,
                    status: paymentStatus,
                    paymentDate: new Date(),
                    razorpayPayload: req.body,
                    failureReason: failureForPayment?.code || null,
                    failureDetail: failureForPayment
                        ? failureForPayment.razorpayDescription || failureForPayment.razorpayReason
                        : null,
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            console.log(`[WEBHOOK SUCCESS] Payment recorded in DB. ID: ${paymentRecord._id}. Status: ${paymentStatus}.`);
        }

        res.json({ success: true, message: 'Webhook received and processed.' });

    } catch (error) {
        console.error('[WEBHOOK CRITICAL ERROR] Failed to process webhook:', error);
        res.json({ success: true, message: 'Server error during processing, but acknowledged.' });
    }
});

module.exports = router;