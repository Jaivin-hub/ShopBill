const Razorpay = require('razorpay');

const { hasBillingAccess } = require('./ownerPaymentBucket');

const { DEFAULT_BILLING_TIMEZONE } = require('./billingDates');

const { createOwnerSubscription } = require('./razorpaySubscriptionFactory');
const { resolveSubscriptionStartAtUnix } = require('./subscriptionStartAt');



function isSubscriptionHalted(owner) {

    return String(owner?.subscriptionStatus || '').toLowerCase() === 'halted';

}



const razorpay = new Razorpay({

    key_id: process.env.RAZORPAY_KEY_ID,

    key_secret: process.env.RAZORPAY_KEY_SECRET,

});



const PLAN_DETAILS = {

    BASIC: { plan_id: process.env.BASIC_PLAN, description: 'Pocket POS Basic Plan' },

    PRO: { plan_id: process.env.PRO_PLAN, description: 'Pocket POS Pro Plan' },

    PREMIUM: { plan_id: process.env.PREMIUM_PLAN, description: 'Pocket POS Premium Plan' },

};



/** Owner may start a new mandate after paid access ended (not halted — use mandate restore). */

const RENEWABLE_STATUSES = new Set([

    'cancelled',

    'expired',

    'cancellation_no_refund',

    'cancellation_pending',

    'trial_cancellation_pending',

    'cancelled_replaced',

]);



function isOwnerRole(owner) {

    const role = String(owner?.role || 'owner').toLowerCase();

    return role === 'owner';

}



/** Owner login blocked after paid period — may restart (not halted; use mandate restore for that). */

function ownerNeedsSubscriptionRenew(owner, now = new Date()) {

    if (!owner || !isOwnerRole(owner)) return false;

    if (isSubscriptionHalted(owner)) return false;

    const tz = owner.timezone || DEFAULT_BILLING_TIMEZONE;

    if (hasBillingAccess(owner.planEndDate, now, tz)) return false;

    return true;

}



/** Self-serve Razorpay checkout on renew page (same gate as needs-renew). */

function canOwnerRenewSubscription(owner, now = new Date()) {

    return ownerNeedsSubscriptionRenew(owner, now);

}



async function createRenewalSubscriptionForOwner(owner) {

    const planKey = String(owner.plan || 'BASIC').toUpperCase();

    const planConfig = PLAN_DETAILS[planKey] || PLAN_DETAILS.BASIC;

    if (!planConfig.plan_id) {

        const err = new Error(`Razorpay plan ID missing for ${planKey}.`);

        err.statusCode = 400;

        throw err;

    }



    const startAtTimestamp = resolveSubscriptionStartAtUnix(owner, 'renew');

    return createOwnerSubscription(razorpay, {

        owner,

        planId: planConfig.plan_id,

        startAtTimestamp,

        notes: {

            plan_name: planKey,

            description: planConfig.description,

            subscription_renew: 'true',

        },

    });

}



module.exports = {

    razorpay,

    PLAN_DETAILS,

    RENEWABLE_STATUSES,

    isSubscriptionHalted,

    isOwnerRole,

    ownerNeedsSubscriptionRenew,

    canOwnerRenewSubscription,

    createRenewalSubscriptionForOwner,

};

