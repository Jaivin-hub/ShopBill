const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { protect } = require('../middleware/authMiddleware');
const axios = require('axios');
const User = require('../models/User');
const Store = require('../models/Store');
const MandateRestoreRequest = require('../models/MandateRestoreRequest');
const { requiresMandateRestoreGate } = require('../utils/subscriptionAccess');
const { USER_CANCELLED_ACCESS_STATUSES } = require('../utils/subscriptionAccess');
const {
    createRecoverySubscriptionForOwner,
    getPublicMandateRestoreUrl,
    getPublicRenewCheckoutUrl,
    notifySuperadminMandateRequest,
    upsertMandateRestoreRequest,
    findOpenMandateRequest,
} = require('../utils/mandateRestore');
const {
    canOwnerRenewSubscription,
    ownerNeedsSubscriptionRenew,
    isSubscriptionHalted,
    createRenewalSubscriptionForOwner,
} = require('../utils/subscriptionRenew');
const {
    createSignupSubscription,
    createOwnerSubscription,
    ownerSubscriptionUpdateAfterVerify,
} = require('../utils/razorpaySubscriptionFactory');
const {
    resolveSubscriptionStartAtUnix,
    describeFirstChargeForOwner,
} = require('../utils/subscriptionStartAt');
const {
    notifySuperadminsSubscriptionCancelled,
    notifySuperadminsPlanUpgraded,
    notifySuperadminsResubscribed,
} = require('../services/notifySubscriptionBilling');
const router = express.Router();

/** Billing actions apply to the shop owner account only. */
async function resolveBillingOwner(req) {
    if (req.user.role === 'owner') {
        return User.findById(req.user._id || req.user.id).select(
            'transactionId plan planEndDate subscriptionStatus role'
        );
    }
    return null;
}

function isRazorpayAlreadyCancelledError(err) {
    const desc = String(err?.error?.description || err?.message || '').toLowerCase();
    return /already cancelled|already been cancelled|not cancellable|cancelled subscription/i.test(desc);
}

/**
 * @param {string} subscriptionId
 * @param {boolean} cancelAtCycleEnd - true: finish current cycle (Razorpay may still retry due invoice), then cancel
 */
async function cancelRazorpaySubscription(subscriptionId, cancelAtCycleEnd = false) {
    try {
        if (cancelAtCycleEnd) {
            await razorpay.subscriptions.cancel(subscriptionId, true);
        } else {
            await razorpay.subscriptions.cancel(subscriptionId);
        }
    } catch (err) {
        if (isRazorpayAlreadyCancelledError(err)) {
            console.log(`[RZP] Subscription ${subscriptionId} already cancelled on Razorpay — continuing.`);
            return;
        }
        throw err;
    }
}

const PLAN_MONTHLY_PRICES_INR = { BASIC: 499, PRO: 999, PREMIUM: 2999 };

function getPlanMonthlyAmountInr(planKey, subscriptionEntity) {
    const key = String(planKey || 'BASIC').toUpperCase();
    if (subscriptionEntity?.plan_amount) {
        return Math.round(Number(subscriptionEntity.plan_amount) / 100);
    }
    return PLAN_MONTHLY_PRICES_INR[key] || PLAN_MONTHLY_PRICES_INR.BASIC;
}

function formatAccessEndDate(planEndDate) {
    if (!planEndDate) return 'the end of your current access period';
    return new Date(planEndDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    });
}

function hasFuturePlanAccess(planEndDate, timeZone) {
    if (!planEndDate) return false;
    const { hasBillingAccess } = require('../utils/ownerPaymentBucket');
    const { DEFAULT_BILLING_TIMEZONE } = require('../utils/billingDates');
    return hasBillingAccess(planEndDate, new Date(), timeZone || DEFAULT_BILLING_TIMEZONE);
}
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});
/** Mandate verification refunds ₹1; log clearly when Razorpay says it is already done or not allowed. */
function logMandateRefundOutcome(razorpay_payment_id, refundError) {
    const data = refundError.response?.data;
    const desc = String(
        data?.error?.description || data?.description || refundError.message || ''
    );
    const benign =
        /already.*refunded|fully refunded|already been fully refunded|duplicate refund|refund.*already processed/i.test(
            desc
        );
    if (benign) {
        console.log(`[REFUND SKIP] ${razorpay_payment_id}: ${desc}`);
        return;
    }
    console.error(`[REFUND FAILED] ${razorpay_payment_id}:`, data || refundError.message);
}

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
router.post('/create-subscription', async (req, res) => {
    const { plan, email, name, phone } = req.body;

    if (!plan || !PLAN_DETAILS[plan]) {
        return res.status(400).json({ error: 'Invalid or missing plan selected.' });
    }

    const normEmail = String(email || '')
        .trim()
        .toLowerCase();
    if (!normEmail) {
        return res.status(400).json({ error: 'Email is required before starting payment.' });
    }

    const { plan_id, description } = PLAN_DETAILS[plan];

    if (!plan_id) {
        console.error(`Missing environment variable for ${plan} plan_id.`);
        return res.status(400).json({
            error: `Configuration Error: Razorpay Plan ID for '${plan}' is missing on the server. Please check environment variables (e.g., PREMIUM_PLAN).`
        });
    }
    let startAtTimestamp = resolveSubscriptionStartAtUnix(null, 'signup');

    try {
        const existingOwner = await User.findOne({ role: 'owner', email: normEmail }).select(
            'planEndDate subscriptionStatus timezone transactionId'
        );
        if (existingOwner) {
            startAtTimestamp = resolveSubscriptionStartAtUnix(existingOwner, 'resubscribe');
        }

        const subscription = await createSignupSubscription(razorpay, {
            email: normEmail,
            name: name || normEmail,
            phone,
            planId: plan_id,
            planKey: plan,
            description,
            startAtTimestamp,
        });

        res.json({
            success: true,
            subscriptionId: subscription.id,
            currency: subscription.currency,
            amount: subscription.amount,
            keyId: process.env.RAZORPAY_KEY_ID,
        });

    } catch (error) {
        const specificApiError = error.error || error.message || 'Unknown Razorpay error.';
        const statusCode = error.statusCode || 500;
        const keyMode = String(process.env.RAZORPAY_KEY_ID || '').startsWith('rzp_live_') ? 'live' : 'test';
        console.error('Razorpay Subscription Creation Error:', {
            plan,
            plan_id,
            keyMode,
            statusCode,
            error: specificApiError,
        });
        const invalidId =
            statusCode === 400 &&
            String(specificApiError?.description || specificApiError).includes('invalid') &&
            String(specificApiError?.description || specificApiError).includes('not be found');

        res.status(statusCode).json({
            error: invalidId
                ? `Razorpay plan ID for ${plan} is invalid or missing in ${keyMode} mode. Update BASIC_PLAN / PRO_PLAN / PREMIUM_PLAN in server .env with Plan IDs from Razorpay Dashboard → Subscriptions → Plans (same mode as your API keys), then restart the server.`
                : 'Failed to create subscription mandate.',
            razorpayApiError: specificApiError,
            statusCode,
            ...(invalidId ? { plan, plan_id, keyMode } : {}),
        });
    }
});


router.post('/verify-subscription', async (req, res) => {
    const {
        razorpay_payment_id,
        razorpay_signature,
        razorpay_subscription_id,
    } = req.body;

    // 1. Debugging: Log incoming data to verify what the frontend is sending
    console.log("--- New Verification Request ---");
    console.log("Payment ID:", razorpay_payment_id);
    console.log("Subscription ID:", razorpay_subscription_id);
    console.log("Received Signature:", razorpay_signature);

    if (!razorpay_payment_id || !razorpay_signature || !razorpay_subscription_id) {
        return res.status(400).json({ success: false, error: 'Missing required payment verification data.' });
    }

    try {
        // 2. Construct the body string
        // Order: Payment ID | Subscription ID
        const generated_signature_body = `${razorpay_payment_id}|${razorpay_subscription_id}`;
        
        // 3. Generate Expected Signature
        // Ensure RAZORPAY_KEY_SECRET is the one paired with your Key ID
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(generated_signature_body)
            .digest('hex');

        console.log("Generated Body String:", generated_signature_body);
        console.log("Expected Signature:", expectedSignature);

        // 4. Compare
        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            console.log("✅ Signature Match: Success");

            // Optional: You mentioned not hardcoding. Ensure refundAmount is consistent with your setup.
            const refundAmount = 100; // 100 paise = ₹1.00
            const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
            const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

            try {
                // Initiating the refund for the authorization amount (₹1)
                await axios.post(
                    `https://api.razorpay.com/v1/payments/${razorpay_payment_id}/refunds`,
                    { amount: refundAmount },
                    { auth: { username: razorpayKeyId, password: razorpayKeySecret } }
                );
                console.log(`[REFUND SUCCESS] ₹1.00 refunded for Payment ID: ${razorpay_payment_id}`);

            } catch (refundError) {
                logMandateRefundOutcome(razorpay_payment_id, refundError);
            }

            return res.json({
                success: true,
                message: 'Subscription mandate verified and refund initiated.',
                transactionId: razorpay_subscription_id,
            });

        } else {
            console.error("❌ Signature Mismatch!");
            return res.status(400).json({
                success: false,
                error: 'Subscription mandate verification failed. Signature mismatch.',
            });
        }

    } catch (error) {
        console.error('Razorpay Subscription Verification Error:', error);
        return res.status(500).json({ success: false, error: 'Server error during subscription verification.' });
    }
});

router.post('/cancel-subscription', protect, async (req, res) => {
    try {
        if (req.user.role !== 'owner') {
            return res.status(403).json({
                success: false,
                error: 'Only the shop owner can cancel the subscription.',
            });
        }

        const user = await resolveBillingOwner(req);
        const userId = user?._id;

        if (!user || !user.transactionId) {
            return res.status(404).json({
                success: false,
                error: 'Subscription not found for this account. transactionId is missing.',
            });
        }

        const subscriptionId = user.transactionId;

        // 1. Fetch the Subscription details from Razorpay
        const subscription = await razorpay.subscriptions.fetch(subscriptionId);

        // --- Core Logic Refinement ---
        const razorpayStatus = subscription.status;

        const { isSubscriptionInTrial, getSubscriptionChargeDate } = require('../utils/subscriptionTrial');
        const inTrialPeriod = isSubscriptionInTrial(subscription);
        const chargeFromRzp = getSubscriptionChargeDate(subscription);
        const effectivePlanEndDate = user.planEndDate || chargeFromRzp;
        const isPreBilling =
            razorpayStatus === 'created' ||
            razorpayStatus === 'authenticated' ||
            inTrialPeriod;
        const isPaidCycleRunning = razorpayStatus === 'active' && !inTrialPeriod;
        const isHaltedOnRzp = razorpayStatus === 'halted';

        const isCancellationPendingLocally = USER_CANCELLED_ACCESS_STATUSES.has(
            String(user.subscriptionStatus || '').toLowerCase()
        );

        let cancellationMessage;
        let updateStatus = user.subscriptionStatus; // Default to current local status
        let cancellationAction;

        let attemptRazorpayCancel = false;
        let cancelAtCycleEnd = false;

        // ---------------------------------------------------------------------
        // 2. DETERMINE ACTION BASED ON STATUS
        // ---------------------------------------------------------------------

        const accessEndLabel = inTrialPeriod && !user.planEndDate && chargeFromRzp
            ? formatAccessEndDate(chargeFromRzp)
            : formatAccessEndDate(effectivePlanEndDate);
        const hasAccess = hasFuturePlanAccess(effectivePlanEndDate);

        if (isCancellationPendingLocally) {
            cancellationMessage = `Cancellation is already scheduled. Razorpay may still retry your due payment if applicable. After that, auto-debit stops. You can use Pocket POS until ${accessEndLabel}. You do not need to cancel again.`;
            cancellationAction = 'already_cancelled_local';
            updateStatus = user.subscriptionStatus;

        } else if (isPreBilling) {
            cancellationMessage = inTrialPeriod
                ? `Your free trial is cancelled. No monthly plan charge will be made. You can use Pocket POS until ${accessEndLabel}.`
                : `Auto-debit cancelled. Your ${user.plan} access continues until ${accessEndLabel} — no further charges will be made.`;
            updateStatus = 'trial_cancellation_pending';
            cancellationAction = 'immediate_mandate_end_access';
            attemptRazorpayCancel = true;

        } else if (razorpayStatus === 'pending') {
            // Failed renewal: allow Razorpay to retry collecting this cycle, then end subscription (cancel at cycle end).
            const dueInr = getPlanMonthlyAmountInr(user.plan, subscription);
            cancellationMessage =
                `Your ${dueInr > 0 ? `₹${dueInr} ` : ''}subscription payment for this billing period did not complete (that is what "pending" means — not that cancellation is waiting). ` +
                `Cancellation is now scheduled: Razorpay will retry your bank a few times to collect this due amount. ` +
                `If payment succeeds, this period is settled and no further monthly charges will be made after ${accessEndLabel}. ` +
                `If all retries fail, the subscription ends without that charge. You do not need to tap cancel again.`;
            updateStatus = 'cancellation_pending';
            cancellationAction = 'cancel_at_cycle_end_pending_payment';
            attemptRazorpayCancel = true;
            cancelAtCycleEnd = true;

        } else if (isPaidCycleRunning) {
            cancellationMessage = `Subscription cancelled. Future billing is stopped. You can keep using Pocket POS until ${accessEndLabel}.`;
            updateStatus = 'cancellation_no_refund';
            cancellationAction = 'immediate_cancel_extended_access';
            attemptRazorpayCancel = true;

        } else if (isHaltedOnRzp) {
            cancellationMessage = `Subscription cancelled. Retries have ended. You can keep using Pocket POS until ${accessEndLabel} if your access period is still valid.`;
            updateStatus = 'cancellation_no_refund';
            cancellationAction = 'halted_cancel_extended_access';
            attemptRazorpayCancel = true;

        } else if (razorpayStatus === 'cancelled' || razorpayStatus === 'completed') {
            cancellationMessage = `Your subscription is already cancelled with the payment provider. Access continues until ${accessEndLabel}.`;
            updateStatus = hasAccess ? 'cancellation_no_refund' : 'cancelled';
            cancellationAction = 'already_cancelled_rzp';

        } else if (razorpayStatus === 'created') {
            cancellationMessage = `Subscription setup cancelled. Access continues until ${accessEndLabel}.`;
            updateStatus = hasAccess ? 'trial_cancellation_pending' : 'cancelled';
            cancellationAction = 'created_subscription_cancel';
            attemptRazorpayCancel = true;

        } else {
            console.warn(`[CANCEL] Unhandled Razorpay subscription status: ${razorpayStatus} for ${subscriptionId}`);
            return res.status(400).json({
                success: false,
                error: 'We could not cancel your subscription for the current billing state. Please contact support.',
                razorpayStatus,
            });
        }

        // ---------------------------------------------------------------------
        // --- EXECUTE RAZORPAY API CALLS ---
        // ---------------------------------------------------------------------

        if (attemptRazorpayCancel) {
            try {
                await cancelRazorpaySubscription(subscriptionId, cancelAtCycleEnd);
            } catch (razorpayCancelError) {
                console.error(
                    `[RZP ERROR - CANCEL] Failed to cancel Razorpay Subscription ID: ${subscriptionId} (atCycleEnd=${cancelAtCycleEnd}). Error: ${razorpayCancelError.error?.description || razorpayCancelError.message}`
                );
                throw new Error(
                    `Razorpay could not schedule cancellation: ${razorpayCancelError.error?.description || 'Unknown error.'}`
                );
            }
        }

        const skipDbUpdate = ['already_cancelled_local'].includes(cancellationAction);
        if (!skipDbUpdate) {
            await User.updateOne({ _id: userId }, {
                $set: {
                    subscriptionStatus: updateStatus,
                },
            });
        }

        const cancelledActions = new Set([
            'immediate_mandate_end_access',
            'immediate_cancel_extended_access',
            'halted_cancel_extended_access',
            'cancel_at_cycle_end_pending_payment',
            'created_subscription_cancel',
            'already_cancelled_rzp',
            'already_cancelled_local',
        ]);

        const situationLabels = {
            immediate_mandate_end_access: 'trial_cancelled',
            immediate_cancel_extended_access: 'paid_plan_cancelled',
            halted_cancel_extended_access: 'paid_plan_cancelled_after_halt',
            cancel_at_cycle_end_pending_payment: 'cancel_scheduled_collect_due_payment',
            created_subscription_cancel: 'setup_cancelled',
            already_cancelled_rzp: 'already_cancelled_provider',
            already_cancelled_local: 'already_cancelled',
        };

        console.log(`[SUBSCRIPTION CANCELLED] Subscription ${subscriptionId} - Action: ${cancellationAction}`);

        const didCancel = cancelledActions.has(cancellationAction);
        if (didCancel && cancellationAction !== 'already_cancelled_local') {
            const io = req.app && req.app.get ? req.app.get('socketio') : null;
            const ownerForSa = await User.findById(userId)
                .select('_id shopName email plan')
                .lean();
            if (ownerForSa) {
                await notifySuperadminsSubscriptionCancelled(io, ownerForSa, {
                    subscriptionStatus: updateStatus,
                    cancellationAction,
                    subscriptionId,
                    accessEndLabel,
                    dedupeKey: `cancel_${userId}_${subscriptionId}_${updateStatus}`,
                }).catch((err) => console.error('[Notify] superadmin cancel:', err?.message || err));
            }
        }

        res.json({
            success: true,
            cancelled: didCancel,
            situation: situationLabels[cancellationAction] || cancellationAction,
            userTitle: didCancel
                ? ['already_cancelled_local', 'already_cancelled_rzp'].includes(cancellationAction)
                    ? 'Already cancelled'
                    : cancellationAction === 'cancel_at_cycle_end_pending_payment'
                      ? 'Cancellation scheduled'
                      : 'Cancellation confirmed'
                : 'Cancellation status',
            message: cancellationMessage,
            action: cancellationAction,
            subscriptionStatus: updateStatus,
            planEndDate: user.planEndDate,
            razorpayStatus,
            cancelAtCycleEnd,
            pendingCollectionInr:
                cancellationAction === 'cancel_at_cycle_end_pending_payment'
                    ? getPlanMonthlyAmountInr(user.plan, subscription)
                    : null,
        });

    } catch (error) {
        console.error('Razorpay Subscription Cancellation Error:', error);

        const apiError = error.error || {};
        const msg = String(error?.message || '');
        const errorMessage = msg.startsWith('Razorpay API failed')
            ? msg
            : apiError.description || msg || 'Unknown error';

        res.status(400).json({
            success: false,
            error: 'Failed to process cancellation.',
            razorpayApiError: errorMessage,
        });
    }
});

router.post('/upgrade-plan', protect, async (req, res) => {
    const userId = req.user._id;
    const { newPlan } = req.body; // e.g., 'PRO' or 'PREMIUM'

    // Fetch user with current plan and status for robust checks
    const user = await User.findById(userId).select(
        'transactionId plan subscriptionStatus email shopName phone razorpayCustomerId pendingRazorpaySubscriptionId planEndDate timezone'
    );
    const currentPlan = user.plan;
    const currentStatus = user.subscriptionStatus;

    // --- 1. VALIDATION ---
    if (!newPlan || !PLAN_DETAILS[newPlan]) {
        return res.status(400).json({ error: 'Invalid or missing plan selected for change.' });
    }

    // Allow re-subscription if the user is selecting the same plan AND it is already cancelled/expired
    const isSamePlan = currentPlan?.toUpperCase() === newPlan.toUpperCase();
    const isTerminalStatus = ['cancelled', 'expired', 'cancellation_no_refund', 'cancellation_pending', 'trial_cancellation_pending', 'cancelled_replaced'].includes(currentStatus);

    if (isSamePlan && !isTerminalStatus) {
        return res.status(400).json({ error: `You are currently active on the ${newPlan} plan.` });
    }

    const PLAN_TIER = { BASIC: 1, PRO: 2, PREMIUM: 3 };
    const currentTier = PLAN_TIER[currentPlan?.toUpperCase()] || 0;
    const newTier = PLAN_TIER[newPlan.toUpperCase()] || 0;
    if (!isSamePlan && newTier < currentTier) {
        return res.status(400).json({
            error: 'Downgrading to a lower plan is not allowed. You can upgrade or cancel your subscription.',
        });
    }

    const { plan_id, description } = PLAN_DETAILS[newPlan];

    try {
        if (user?.transactionId) {
            await User.updateOne({ _id: userId }, {
                $set: { subscriptionStatus: 'cancelled_replaced' },
            });
        }

        const startAtTimestamp = resolveSubscriptionStartAtUnix(user, 'upgrade');
        const chargeHint = describeFirstChargeForOwner(user, startAtTimestamp, 'upgrade');

        const newSubscription = await createOwnerSubscription(razorpay, {
            owner: user,
            planId: plan_id,
            startAtTimestamp,
            notes: {
                plan_name: newPlan,
                description,
                change_from: user.plan || 'NONE',
                plan_change: 'true',
            },
        });

        // ---------------------------------------------------------------------
        // 4. TEMPORARILY STORE NEW ID & RETURN RESPONSE
        // ---------------------------------------------------------------------

        // ❌ REMOVED: Remove the unstable pendingTransactionId update
        /*
        await User.updateOne({ _id: userId }, {
            $set: {
                pendingTransactionId: newSubscription.id
            }
        });
        */


        res.json({
            success: true,
            message: `Please complete mandate setup for ${newPlan}. You will be charged ₹1 now to verify your bank. ${chargeHint}`,
            subscriptionId: newSubscription.id,
            currency: newSubscription.currency,
            amount: 100,
            keyId: process.env.RAZORPAY_KEY_ID,
            firstChargeAt: new Date(startAtTimestamp * 1000).toISOString(),
            includesTrial: false,
        });

    } catch (error) {
        const specificApiError = error.error || error.message || 'Unknown Razorpay error.';
        const statusCode = error.statusCode || 500;
        const keyMode = String(process.env.RAZORPAY_KEY_ID || '').startsWith('rzp_live_') ? 'live' : 'test';
        console.error('Plan Change / New Subscription Creation Error:', {
            newPlan,
            plan_id,
            keyMode,
            statusCode,
            error: specificApiError,
        });
        res.status(statusCode).json({
            error: 'Server error during plan change processing.',
            razorpayApiError: specificApiError,
            plan: newPlan,
            plan_id,
            keyMode,
        });
    }
});

router.post('/verify-plan-change', async (req, res) => {
    const {
        razorpay_payment_id,
        razorpay_signature,
        razorpay_subscription_id, // This is the new subscription ID
        newPlan,
    } = req.body;

    if (!razorpay_payment_id || !razorpay_signature || !razorpay_subscription_id || !newPlan) {
        return res.status(400).json({ success: false, error: 'Missing required plan change verification data.' });
    }

    try {
        // --- MANDATE VERIFICATION ---
        const body = razorpay_payment_id + '|' + razorpay_subscription_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        const isAuthentic = expectedSignature === razorpay_signature;
        
        if (!isAuthentic) {
            return res.status(400).json({
                success: false,
                error: 'Subscription mandate verification failed. Signature mismatch.',
            });
        }
        
        // --- 2. INSTANT REFUND LOGIC ---
        const refundAmount = 100;
        const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
        const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

        try {
            await axios.post(
                `https://api.razorpay.com/v1/payments/${razorpay_payment_id}/refunds`,
                { amount: refundAmount },
                { auth: { username: razorpayKeyId, password: razorpayKeySecret } }
            );
            console.log(`[REFUND SUCCESS] ₹1.00 refunded for Payment ID: ${razorpay_payment_id}`);
        } catch (refundError) {
            logMandateRefundOutcome(razorpay_payment_id, refundError);
        }

        // --- 3. FINAL USER MODEL UPDATE ---
        
        // Fetch the subscription details from Razorpay to get User ID and Official Dates
        const subscriptionDetails = await razorpay.subscriptions.fetch(razorpay_subscription_id);
        const storedUserId = subscriptionDetails.notes?.userId;
        
        if (!storedUserId) {
            console.error(`[VERIFY ERROR] Subscription ${razorpay_subscription_id} missing stored userId in RZP notes.`);
            return res.status(404).json({ 
                success: false, 
                error: 'Could not find user information in transaction data.' 
            });
        }

        const userToUpdate = await User.findById(storedUserId);

        if (!userToUpdate) {
             console.warn(`CRITICAL WARNING: User for plan change verification not found. Query ID: ${storedUserId}`);
             return res.status(404).json({ 
                 success: false, 
                 error: 'Could not find user for plan verification.' 
             });
        }
        
        // --- SYNC DATE WITH RAZORPAY ---

        /**
         * ⭐ FIXED LOGIC: Instead of manually adding 30 days, we use Razorpay's schedule.
         * For a new trial/mandate, Razorpay uses 'charge_at' for the first full payment.
         * If 'charge_at' is missing, we use 'current_end'.
         */
        const rzpTimestamp = subscriptionDetails.charge_at || subscriptionDetails.current_end;
        
        let officialBillingDate;
        if (rzpTimestamp) {
            // Convert UNIX seconds to JS Milliseconds
            officialBillingDate = new Date(rzpTimestamp * 1000);
        } else {
            // Absolute fallback if Razorpay doesn't return a timestamp
            officialBillingDate = new Date();
            officialBillingDate.setDate(officialBillingDate.getDate() + 30);
        }

        const { recordPlanChange, normalizePlan } = require('../utils/planHistory');
        const changeFrom = String(subscriptionDetails.notes?.change_from || userToUpdate.plan || '')
            .toUpperCase()
            .trim();
        if (changeFrom && changeFrom !== 'NONE' && changeFrom !== newPlan.toUpperCase()) {
            const history = Array.isArray(userToUpdate.planHistory) ? [...userToUpdate.planHistory] : [];
            const hasFrom = history.some((e) => e && normalizePlan(e.plan) === changeFrom);
            if (!hasFrom && userToUpdate.createdAt) {
                history.unshift({
                    plan: changeFrom,
                    startedAt: userToUpdate.createdAt,
                    endedAt: new Date(),
                    source: 'upgrade_inferred',
                });
                await User.updateOne({ _id: userToUpdate._id }, { $set: { planHistory: history } });
            }
        }
        await recordPlanChange(userToUpdate._id, newPlan, { source: 'upgrade' });

        const normalizedNewPlan = normalizePlan(newPlan);
        const isPlanChange = subscriptionDetails.notes?.plan_change === 'true';
        if (isPlanChange && userToUpdate.planEndDate) {
            const prevEnd = new Date(userToUpdate.planEndDate);
            const now = new Date();
            if (!Number.isNaN(prevEnd.getTime()) && prevEnd > now) {
                officialBillingDate = prevEnd;
            }
        }

        const updateFields = {
            plan: normalizedNewPlan,
            planEndDate: officialBillingDate,
            subscriptionStatus: 'active',
            transactionId: razorpay_subscription_id,
        };

        await User.updateOne(
            { _id: userToUpdate._id },
            ownerSubscriptionUpdateAfterVerify(updateFields)
        );

        const io = req.app && req.app.get ? req.app.get('socketio') : null;
        const ownerForSa = await User.findById(userToUpdate._id)
            .select('_id shopName email plan')
            .lean();
        if (ownerForSa) {
            const normalizedNew = String(newPlan || '').toUpperCase();
            const normalizedFrom = changeFrom && changeFrom !== 'NONE' ? changeFrom : String(userToUpdate.plan || '').toUpperCase();
            const PLAN_TIER = { BASIC: 1, PRO: 2, PREMIUM: 3 };
            const fromTier = PLAN_TIER[normalizedFrom] || 0;
            const newTier = PLAN_TIER[normalizedNew] || 0;
            const isUpgrade = normalizedFrom && normalizedFrom !== normalizedNew && newTier > fromTier;

            if (isUpgrade) {
                notifySuperadminsPlanUpgraded(io, ownerForSa, {
                    fromPlan: normalizedFrom,
                    toPlan: normalizedNew,
                    subscriptionId: razorpay_subscription_id,
                }).catch((err) => console.error('[Notify] superadmin upgrade:', err?.message || err));
            } else {
                notifySuperadminsResubscribed(io, ownerForSa, {
                    plan: normalizedNew,
                    source: 'billing',
                    subscriptionId: razorpay_subscription_id,
                }).catch((err) => console.error('[Notify] superadmin resubscribe:', err?.message || err));
            }
        }

        // --- 4. SUCCESS RESPONSE ---
        res.json({
            success: true,
            message: `Successfully switched to the ${newPlan} plan. Your first full charge is scheduled for ${officialBillingDate.toLocaleDateString('en-IN')}.`,
            transactionId: razorpay_subscription_id,
        });

    } catch (error) {
        console.error('Plan Change Verification Error:', error);
        res.status(500).json({ success: false, error: 'Server error during subscription verification.' });
    }
});

// --- Subscription renew (after cancel / access ended — existing store) ---

async function applyOwnerRenewalAfterMandate(ownerId, razorpay_subscription_id) {
    const subscriptionDetails = await razorpay.subscriptions.fetch(razorpay_subscription_id);
    const rzpTimestamp = subscriptionDetails.charge_at || subscriptionDetails.current_end;
    let officialBillingDate;
    if (rzpTimestamp) {
        officialBillingDate = new Date(rzpTimestamp * 1000);
    } else {
        officialBillingDate = new Date();
        officialBillingDate.setUTCDate(officialBillingDate.getUTCDate() + 30);
    }
    await User.updateOne(
        { _id: ownerId },
        ownerSubscriptionUpdateAfterVerify({
            transactionId: razorpay_subscription_id,
            subscriptionStatus: 'active',
            planEndDate: officialBillingDate,
            isActive: true,
            paymentFailedAt: null,
            lastPaymentFailureReason: null,
            lastPaymentFailureDetail: null,
            lastStatusUpdate: new Date(),
        })
    );
    return officialBillingDate;
}

router.get('/subscription-renew/status', async (req, res) => {
    try {
        const email = String(req.query?.email || '')
            .trim()
            .toLowerCase();
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required.' });
        }

        const owner = await User.findOne({ role: 'owner', email }).select(
            '_id email shopName plan role subscriptionStatus planEndDate isActive timezone'
        );
        if (!owner) {
            return res.status(404).json({ success: false, error: 'No shop account found for this email.' });
        }

        const status = String(owner.subscriptionStatus || '').toLowerCase();
        if (status === 'halted') {
            return res.json({
                success: true,
                needsRenew: false,
                canPayOnline: false,
                redirectPage: 'mandateRestore',
                message: 'Your subscription is halted. Use mandate restore instead.',
            });
        }

        if (!ownerNeedsSubscriptionRenew(owner)) {
            const { hasBillingAccess } = require('../utils/ownerPaymentBucket');
            const { getSubscriptionAccessMessage } = require('../utils/subscriptionAccess');
            const tz = owner.timezone || require('../utils/billingDates').DEFAULT_BILLING_TIMEZONE;
            if (hasBillingAccess(owner.planEndDate, new Date(), tz)) {
                return res.json({
                    success: true,
                    needsRenew: false,
                    canPayOnline: false,
                    message: `Your subscription is still active until ${formatAccessEndDate(owner.planEndDate)}.`,
                });
            }
            const detail =
                getSubscriptionAccessMessage(owner) ||
                'This account is not set up for subscription restart. Contact support.';
            return res.json({
                success: true,
                needsRenew: false,
                canPayOnline: false,
                message: detail,
            });
        }

        const pending = await findOpenMandateRequest(owner._id, 'renew');
        return res.json({
            success: true,
            needsRenew: true,
            canPayOnline: canOwnerRenewSubscription(owner),
            requestFlow: true,
            shopName: owner.shopName,
            plan: owner.plan || 'BASIC',
            pendingRequest: pending
                ? {
                      status: pending.status,
                      createdAt: pending.createdAt,
                  }
                : null,
        });
    } catch (err) {
        console.error('[subscription-renew/status]', err);
        return res.status(500).json({ success: false, error: 'Could not check renewal status.' });
    }
});

router.post('/subscription-renew/request', async (req, res) => {
    try {
        const email = String(req.body?.email || '')
            .trim()
            .toLowerCase();
        const ownerMessage = String(req.body?.message || '').trim().slice(0, 2000);

        if (!email) {
            return res.status(400).json({ success: false, error: 'Registered email is required.' });
        }

        const owner = await User.findOne({ role: 'owner', email }).select(
            '_id email shopName plan role subscriptionStatus planEndDate isActive timezone'
        );
        if (!owner) {
            return res.status(404).json({ success: false, error: 'No shop account found for this email.' });
        }

        if (isSubscriptionHalted(owner)) {
            return res.status(400).json({
                success: false,
                error: 'Your subscription is halted. Use the mandate restore page instead.',
                redirectPage: 'mandateRestore',
            });
        }

        if (!ownerNeedsSubscriptionRenew(owner)) {
            const { hasBillingAccess } = require('../utils/ownerPaymentBucket');
            const { getSubscriptionAccessMessage } = require('../utils/subscriptionAccess');
            const tz = owner.timezone || require('../utils/billingDates').DEFAULT_BILLING_TIMEZONE;
            if (hasBillingAccess(owner.planEndDate, new Date(), tz)) {
                return res.status(400).json({
                    success: false,
                    error: `Your subscription is still active until ${formatAccessEndDate(owner.planEndDate)}.`,
                });
            }
            return res.status(400).json({
                success: false,
                error:
                    getSubscriptionAccessMessage(owner) ||
                    'This account is not eligible to restart. Contact support.',
            });
        }

        const { request, created } = await upsertMandateRestoreRequest(owner, ownerMessage, 'renew');
        if (created) {
            const io = req.app?.get?.('socketio');
            await notifySuperadminMandateRequest(io, owner, request._id, 'renew');
        }

        return res.json({
            success: true,
            message:
                'Request received. Pocket POS will email you a secure payment link for your store. You can also contact support if you need help sooner.',
            requestId: request._id,
            status: request.status,
            ownerEmail: owner.email,
        });
    } catch (err) {
        console.error('[subscription-renew/request]', err);
        return res.status(500).json({ success: false, error: 'Could not submit your request.' });
    }
});

router.get('/subscription-renew/checkout/:token', async (req, res) => {
    try {
        const token = String(req.params.token || '').trim();
        if (!token) {
            return res.status(400).json({ success: false, error: 'Invalid link.' });
        }

        const request = await MandateRestoreRequest.findOne({
            checkoutToken: token,
            requestType: 'renew',
        }).lean();
        if (!request) {
            return res.status(404).json({ success: false, error: 'This payment link is invalid or expired.' });
        }
        if (request.status === 'completed') {
            return res.json({
                success: true,
                alreadyCompleted: true,
                message: 'Subscription is already active. You can sign in to Pocket POS.',
            });
        }
        if (request.status === 'dismissed') {
            return res.status(410).json({
                success: false,
                error: 'This request was closed. Contact support for a new link.',
            });
        }
        if (!request.razorpaySubscriptionId) {
            return res.status(409).json({
                success: false,
                pendingLink: true,
                message:
                    'Your payment link is being prepared. Check your email — our team will send it shortly.',
            });
        }

        const owner = await User.findById(request.ownerId).select('plan shopName email').lean();
        return res.json({
            success: true,
            subscriptionId: request.razorpaySubscriptionId,
            keyId: process.env.RAZORPAY_KEY_ID,
            amount: 100,
            currency: 'INR',
            shopName: owner?.shopName || request.shopName,
            plan: owner?.plan || 'BASIC',
            email: owner?.email || request.email,
        });
    } catch (err) {
        console.error('[subscription-renew/checkout]', err);
        return res.status(500).json({ success: false, error: 'Could not load payment checkout.' });
    }
});

router.post('/subscription-renew/checkout-verify', async (req, res) => {
    const {
        razorpay_payment_id,
        razorpay_signature,
        razorpay_subscription_id,
        checkoutToken,
    } = req.body;

    if (!razorpay_payment_id || !razorpay_signature || !razorpay_subscription_id || !checkoutToken) {
        return res.status(400).json({ success: false, error: 'Missing payment verification data.' });
    }

    try {
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, error: 'Payment verification failed.' });
        }

        const request = await MandateRestoreRequest.findOne({
            checkoutToken,
            requestType: 'renew',
        });
        if (!request || request.razorpaySubscriptionId !== razorpay_subscription_id) {
            return res.status(400).json({ success: false, error: 'Invalid renewal session.' });
        }

        try {
            await axios.post(
                `https://api.razorpay.com/v1/payments/${razorpay_payment_id}/refunds`,
                { amount: 100 },
                {
                    auth: {
                        username: process.env.RAZORPAY_KEY_ID,
                        password: process.env.RAZORPAY_KEY_SECRET,
                    },
                }
            );
        } catch (refundError) {
            logMandateRefundOutcome(razorpay_payment_id, refundError);
        }

        const officialBillingDate = await applyOwnerRenewalAfterMandate(
            request.ownerId,
            razorpay_subscription_id
        );

        request.status = 'completed';
        request.completedAt = new Date();
        await request.save();

        const io = req.app && req.app.get ? req.app.get('socketio') : null;
        const ownerForSa = await User.findById(request.ownerId)
            .select('_id shopName email plan')
            .lean();
        if (ownerForSa) {
            notifySuperadminsResubscribed(io, ownerForSa, {
                plan: ownerForSa.plan,
                source: 'renew_checkout',
                subscriptionId: razorpay_subscription_id,
            }).catch((err) => console.error('[Notify] superadmin renew checkout:', err?.message || err));
        }

        return res.json({
            success: true,
            message: `Subscription restarted. You can sign in now. Your next plan charge is scheduled for ${officialBillingDate.toLocaleDateString('en-IN', { timeZone: 'UTC' })}.`,
        });
    } catch (err) {
        console.error('[subscription-renew/checkout-verify]', err);
        return res.status(500).json({ success: false, error: 'Server error during verification.' });
    }
});

router.post('/subscription-renew/start', async (req, res) => {
    try {
        const email = String(req.body?.email || '')
            .trim()
            .toLowerCase();
        if (!email) {
            return res.status(400).json({ success: false, error: 'Registered email is required.' });
        }

        const owner = await User.findOne({ role: 'owner', email }).select(
            '_id email shopName plan role subscriptionStatus planEndDate isActive transactionId timezone'
        );
        if (!owner) {
            return res.status(404).json({ success: false, error: 'No shop account found for this email.' });
        }

        if (isSubscriptionHalted(owner)) {
            return res.status(400).json({
                success: false,
                error: 'Your subscription is halted due to failed payments. Use the payment mandate restore page instead.',
                redirectPage: 'mandateRestore',
            });
        }

        if (!ownerNeedsSubscriptionRenew(owner)) {
            if (hasFuturePlanAccess(owner.planEndDate, owner.timezone)) {
                return res.status(400).json({
                    success: false,
                    error: `Your subscription is still active until ${formatAccessEndDate(owner.planEndDate)}. Sign in to use Pocket POS.`,
                });
            }
            const { getSubscriptionAccessMessage } = require('../utils/subscriptionAccess');
            return res.status(400).json({
                success: false,
                error:
                    getSubscriptionAccessMessage(owner) ||
                    'This account is not eligible to restart. Contact support.',
            });
        }

        const subscription = await createRenewalSubscriptionForOwner(owner);

        return res.json({
            success: true,
            message: 'Complete mandate setup to restart your subscription.',
            subscriptionId: subscription.id,
            keyId: process.env.RAZORPAY_KEY_ID,
            amount: 100,
            currency: subscription.currency || 'INR',
            plan: owner.plan || 'BASIC',
            shopName: owner.shopName,
        });
    } catch (err) {
        console.error('[subscription-renew/start]', err);
        return res.status(err.statusCode || 500).json({
            success: false,
            error: err.message || 'Could not start subscription renewal.',
        });
    }
});

router.post('/subscription-renew/verify', async (req, res) => {
    const {
        razorpay_payment_id,
        razorpay_signature,
        razorpay_subscription_id,
        email,
    } = req.body;

    if (!razorpay_payment_id || !razorpay_signature || !razorpay_subscription_id || !email) {
        return res.status(400).json({ success: false, error: 'Missing payment verification data.' });
    }

    try {
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, error: 'Payment verification failed.' });
        }

        const owner = await User.findOne({
            role: 'owner',
            email: String(email).trim().toLowerCase(),
        });
        if (!owner) {
            return res.status(404).json({ success: false, error: 'No shop account found for this email.' });
        }

        const subscriptionDetails = await razorpay.subscriptions.fetch(razorpay_subscription_id);
        const noteUserId = subscriptionDetails.notes?.userId;
        if (noteUserId && noteUserId !== owner._id.toString()) {
            return res.status(400).json({ success: false, error: 'Payment does not match this account.' });
        }

        const status = String(owner.subscriptionStatus || '').toLowerCase();
        if (status === 'halted') {
            return res.status(400).json({
                success: false,
                error: 'Your subscription is halted. Use the payment mandate restore page instead.',
                redirectPage: 'mandateRestore',
            });
        }
        if (hasFuturePlanAccess(owner.planEndDate, owner.timezone)) {
            return res.status(400).json({
                success: false,
                error: 'Your subscription is still active. Sign in to use Pocket POS.',
            });
        }

        try {
            await axios.post(
                `https://api.razorpay.com/v1/payments/${razorpay_payment_id}/refunds`,
                { amount: 100 },
                {
                    auth: {
                        username: process.env.RAZORPAY_KEY_ID,
                        password: process.env.RAZORPAY_KEY_SECRET,
                    },
                }
            );
        } catch (refundError) {
            logMandateRefundOutcome(razorpay_payment_id, refundError);
        }

        const officialBillingDate = await applyOwnerRenewalAfterMandate(
            owner._id,
            razorpay_subscription_id
        );

        const io = req.app && req.app.get ? req.app.get('socketio') : null;
        notifySuperadminsResubscribed(io, owner, {
            plan: owner.plan,
            source: 'renew',
            subscriptionId: razorpay_subscription_id,
        }).catch((err) => console.error('[Notify] superadmin renew:', err?.message || err));

        return res.json({
            success: true,
            message: `Subscription restarted. You can sign in now. Your next plan charge is scheduled for ${officialBillingDate.toLocaleDateString('en-IN', { timeZone: 'UTC' })}.`,
        });
    } catch (err) {
        console.error('[subscription-renew/verify]', err);
        return res.status(500).json({ success: false, error: 'Server error during renewal verification.' });
    }
});

// --- Mandate restore (halted subscription recovery) ---

async function resolveMandateOwner(req) {
    if (req.user.role === 'owner') {
        return User.findById(req.user._id || req.user.id).select(
            '_id email shopName plan subscriptionStatus'
        );
    }
    let ownerId = req.user.shopId;
    if (req.user.activeStoreId) {
        const store = await Store.findById(req.user.activeStoreId).select('ownerId').lean();
        if (store?.ownerId) ownerId = store.ownerId;
    }
    return ownerId
        ? User.findById(ownerId).select('_id email shopName plan subscriptionStatus')
        : null;
}

function buildMandateCheckoutPayload(request, owner) {
    if (!request?.razorpaySubscriptionId) {
        return {
            success: false,
            pendingLink: true,
            message: 'Your mandate link is being prepared. Submit a request below or contact support.',
        };
    }
    return {
        success: true,
        subscriptionId: request.razorpaySubscriptionId,
        keyId: process.env.RAZORPAY_KEY_ID,
        amount: 100,
        currency: 'INR',
        plan: owner?.plan || 'BASIC',
        shopName: owner?.shopName || request.shopName,
        email: owner?.email || request.email,
        checkoutToken: request.checkoutToken,
    };
}

router.get('/mandate-restore/me', protect, async (req, res) => {
    try {
        const owner = await resolveMandateOwner(req);
        if (!owner) {
            return res.status(404).json({ success: false, error: 'Shop owner not found.' });
        }
        const request = await MandateRestoreRequest.findOne({
            ownerId: owner._id,
            status: { $in: ['requested', 'link_ready'] },
        })
            .sort({ createdAt: -1 })
            .lean();

        return res.json({
            success: true,
            shopName: owner.shopName,
            email: owner.email,
            plan: owner.plan,
            subscriptionStatus: owner.subscriptionStatus,
            mandateRestoreRequired: requiresMandateRestoreGate(owner),
            request: request
                ? {
                      id: request._id,
                      status: request.status,
                      checkoutToken: request.checkoutToken,
                      paymentLinkUrl: request.paymentLinkUrl,
                  }
                : null,
        });
    } catch (err) {
        console.error('[mandate-restore/me]', err);
        return res.status(500).json({ success: false, error: 'Could not load mandate status.' });
    }
});

router.post('/mandate-restore/request-me', protect, async (req, res) => {
    try {
        const owner = await resolveMandateOwner(req);
        if (!owner) {
            return res.status(404).json({ success: false, error: 'Shop owner not found.' });
        }
        if (!requiresMandateRestoreGate(owner)) {
            return res.status(400).json({
                success: false,
                error: 'Mandate restore is only required when billing is halted.',
            });
        }
        const ownerMessage = String(req.body?.message || '').trim().slice(0, 2000);
        const { request, created } = await upsertMandateRestoreRequest(owner, ownerMessage, 'halted');
        if (created) {
            const io = req.app?.get?.('socketio');
            await notifySuperadminMandateRequest(io, owner, request._id, 'halted');
        }
        return res.json({
            success: true,
            message:
                'Request received. Our team will prepare your payment mandate link. Refresh this page when ready, or contact support.',
            requestId: request._id,
            status: request.status,
            checkoutToken: request.checkoutToken,
        });
    } catch (err) {
        console.error('[mandate-restore/request-me]', err);
        return res.status(500).json({ success: false, error: 'Could not submit request.' });
    }
});

router.get('/mandate-restore/my-checkout', protect, async (req, res) => {
    try {
        const owner = await resolveMandateOwner(req);
        if (!owner) {
            return res.status(404).json({ success: false, error: 'Shop owner not found.' });
        }
        const request = await MandateRestoreRequest.findOne({
            ownerId: owner._id,
            status: { $in: ['requested', 'link_ready'] },
        })
            .sort({ createdAt: -1 })
            .lean();
        if (!request) {
            return res.status(404).json({
                success: false,
                error: 'No active mandate request. Submit a request first.',
            });
        }
        if (request.status === 'completed') {
            return res.json({
                success: true,
                alreadyCompleted: true,
                message: 'Payment confirmed. Your store access is being restored.',
            });
        }
        const payload = buildMandateCheckoutPayload(request, owner);
        if (payload.pendingLink) {
            return res.status(409).json(payload);
        }
        return res.json(payload);
    } catch (err) {
        console.error('[mandate-restore/my-checkout]', err);
        return res.status(500).json({ success: false, error: 'Could not load checkout.' });
    }
});

router.post('/mandate-restore/request', async (req, res) => {
    try {
        const email = String(req.body?.email || '')
            .trim()
            .toLowerCase();
        const ownerMessage = String(req.body?.message || '').trim().slice(0, 2000);

        if (!email) {
            return res.status(400).json({ success: false, error: 'Registered email is required.' });
        }

        const owner = await User.findOne({ role: 'owner', email }).select(
            '_id email shopName plan subscriptionStatus'
        );
        if (!owner) {
            return res.status(404).json({
                success: false,
                error: 'No shop account found for this email.',
            });
        }

        const status = String(owner.subscriptionStatus || '').toLowerCase();
        if (status !== 'halted') {
            return res.status(400).json({
                success: false,
                error:
                    status === 'pending'
                        ? 'Your subscription is still retrying payment. Sign in if you still have access, or wait for retries to finish.'
                        : 'Mandate restore is only needed when billing is halted after failed retries. Contact support if you need help.',
            });
        }

        const { request, created } = await upsertMandateRestoreRequest(owner, ownerMessage, 'halted');
        if (created) {
            const io = req.app?.get?.('socketio');
            await notifySuperadminMandateRequest(io, owner, request._id, 'halted');
        }

        return res.json({
            success: true,
            message:
                'Request received. Our team will share a secure payment mandate link with you shortly. You can also contact support for faster help.',
            requestId: request._id,
            status: request.status,
        });
    } catch (err) {
        console.error('[mandate-restore/request]', err);
        return res.status(500).json({ success: false, error: 'Could not submit mandate restore request.' });
    }
});

router.get('/mandate-restore/checkout/:token', async (req, res) => {
    try {
        const token = String(req.params.token || '').trim();
        if (!token) {
            return res.status(400).json({ success: false, error: 'Invalid link.' });
        }

        const request = await MandateRestoreRequest.findOne({ checkoutToken: token }).lean();
        if (!request) {
            return res.status(404).json({ success: false, error: 'This payment link is invalid or expired.' });
        }
        if (request.status === 'completed') {
            return res.json({
                success: true,
                alreadyCompleted: true,
                message: 'Payment mandate is already active. You can sign in to Pocket POS.',
            });
        }
        if (request.status === 'dismissed') {
            return res.status(410).json({ success: false, error: 'This request was closed. Contact support for a new link.' });
        }
        if (!request.razorpaySubscriptionId) {
            return res.status(409).json({
                success: false,
                pendingLink: true,
                message: 'Your mandate link is being prepared. Please check your email or contact support.',
            });
        }

        const owner = await User.findById(request.ownerId).select('plan shopName email').lean();
        return res.json({
            success: true,
            subscriptionId: request.razorpaySubscriptionId,
            keyId: process.env.RAZORPAY_KEY_ID,
            amount: 100,
            currency: 'INR',
            plan: owner?.plan || 'BASIC',
            shopName: owner?.shopName || request.shopName,
            email: owner?.email || request.email,
        });
    } catch (err) {
        console.error('[mandate-restore/checkout]', err);
        return res.status(500).json({ success: false, error: 'Could not load payment checkout.' });
    }
});

router.post('/mandate-restore/verify', async (req, res) => {
    const {
        razorpay_payment_id,
        razorpay_signature,
        razorpay_subscription_id,
        checkoutToken,
    } = req.body;

    if (!razorpay_payment_id || !razorpay_signature || !razorpay_subscription_id || !checkoutToken) {
        return res.status(400).json({ success: false, error: 'Missing payment verification data.' });
    }

    try {
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, error: 'Payment verification failed.' });
        }

        const request = await MandateRestoreRequest.findOne({ checkoutToken });
        if (!request || request.razorpaySubscriptionId !== razorpay_subscription_id) {
            return res.status(400).json({ success: false, error: 'Invalid mandate restore session.' });
        }

        try {
            await axios.post(
                `https://api.razorpay.com/v1/payments/${razorpay_payment_id}/refunds`,
                { amount: 100 },
                {
                    auth: {
                        username: process.env.RAZORPAY_KEY_ID,
                        password: process.env.RAZORPAY_KEY_SECRET,
                    },
                }
            );
        } catch (refundError) {
            logMandateRefundOutcome(razorpay_payment_id, refundError);
        }

        await User.updateOne(
            { _id: request.ownerId },
            ownerSubscriptionUpdateAfterVerify({
                transactionId: razorpay_subscription_id,
                lastStatusUpdate: new Date(),
            })
        );

        return res.json({
            success: true,
            message:
                'Mandate verified. Your store will unlock automatically once the payment is confirmed (usually within a few minutes).',
        });
    } catch (err) {
        console.error('[mandate-restore/verify]', err);
        return res.status(500).json({ success: false, error: 'Server error during mandate verification.' });
    }
});

module.exports = router;