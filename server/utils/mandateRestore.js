const crypto = require('crypto');
const Razorpay = require('razorpay');
const MandateRestoreRequest = require('../models/MandateRestoreRequest');
const { createOwnerSubscription } = require('./razorpaySubscriptionFactory');
const { resolveSubscriptionStartAtUnix } = require('./subscriptionStartAt');
const { notifySuperadminsShopSubscriptionEvent } = require('../services/notifySubscriptionBilling');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const PLAN_DETAILS = {
    BASIC: { plan_id: process.env.BASIC_PLAN, description: 'Pocket POS Basic Plan' },
    PRO: { plan_id: process.env.PRO_PLAN, description: 'Pocket POS Pro Plan' },
    PREMIUM: { plan_id: process.env.PREMIUM_PLAN, description: 'Pocket POS Premium Plan' },
};

/** First full charge 3 days after mandate (recovery — not a new 30-day trial). */
const RECOVERY_BILLING_DEFERRAL_DAYS = 3;

function getAppPublicBaseUrl() {
    return String(
        process.env.PWA_PUBLIC_URL || process.env.FRONTEND_URL || 'https://app.pocketpos.io'
    ).replace(/\/$/, '');
}

function getPublicMandateRestoreUrl(checkoutToken) {
    return `${getAppPublicBaseUrl()}/?page=mandateRestore&token=${encodeURIComponent(checkoutToken)}`;
}

function getPublicRenewCheckoutUrl(checkoutToken) {
    return `${getAppPublicBaseUrl()}/?page=renewSubscription&token=${encodeURIComponent(checkoutToken)}`;
}

async function createRecoverySubscriptionForOwner(owner) {
    const planKey = String(owner.plan || 'BASIC').toUpperCase();
    const planConfig = PLAN_DETAILS[planKey] || PLAN_DETAILS.BASIC;
    if (!planConfig.plan_id) {
        const err = new Error(`Razorpay plan ID missing for ${planKey}.`);
        err.statusCode = 400;
        throw err;
    }

    const startAtTimestamp = resolveSubscriptionStartAtUnix(owner, 'recovery');

    return createOwnerSubscription(razorpay, {
        owner,
        planId: planConfig.plan_id,
        startAtTimestamp,
        addons: [
            {
                item: {
                    name: 'Mandate verification',
                    amount: 100,
                    currency: 'INR',
                },
            },
        ],
        notes: {
            plan_name: planKey,
            description: planConfig.description,
            mandate_restore: 'true',
        },
    });
}

async function notifySuperadminMandateRequest(io, owner, requestId, requestType = 'halted') {
    const isRenew = requestType === 'renew';
    const type = isRenew ? 'subscription_renew_requested' : 'mandate_restore_requested';
    const title = isRenew
        ? 'Subscription restart — payment link requested'
        : 'Payment mandate restore requested';
    const shop = owner.shopName || owner.email;
    const message = isRenew
        ? `${shop} (${owner.email}) asked for a payment link to restart their subscription. Generate a link and email it to them.`
        : `${shop} (${owner.email}) requested a new payment mandate after subscription was halted.`;

    await notifySuperadminsShopSubscriptionEvent(io, owner, {
        type,
        title,
        message,
        category: 'Urgent',
        metadata: {
            mandateRestoreRequestId: String(requestId),
            requestType,
        },
        dedupeKey: `${type}_${requestId}`,
    });
}

async function findOpenMandateRequest(ownerId, requestType = 'halted') {
    return MandateRestoreRequest.findOne({
        ownerId,
        requestType,
        status: { $in: ['requested', 'link_ready'] },
    }).sort({ createdAt: -1 });
}

async function upsertMandateRestoreRequest(owner, ownerMessage, requestType = 'halted') {
    let existing = await findOpenMandateRequest(owner._id, requestType);
    if (existing) {
        if (ownerMessage && ownerMessage !== existing.ownerMessage) {
            existing.ownerMessage = ownerMessage;
            await existing.save();
        }
        return { request: existing, created: false };
    }

    const request = await MandateRestoreRequest.create({
        ownerId: owner._id,
        email: owner.email,
        shopName: owner.shopName,
        ownerMessage: ownerMessage || '',
        requestType,
        status: 'requested',
        checkoutToken: crypto.randomBytes(24).toString('hex'),
    });
    return { request, created: true };
}

module.exports = {
    razorpay,
    PLAN_DETAILS,
    RECOVERY_BILLING_DEFERRAL_DAYS,
    getAppPublicBaseUrl,
    getPublicMandateRestoreUrl,
    getPublicRenewCheckoutUrl,
    createRecoverySubscriptionForOwner,
    notifySuperadminMandateRequest,
    findOpenMandateRequest,
    upsertMandateRestoreRequest,
};
