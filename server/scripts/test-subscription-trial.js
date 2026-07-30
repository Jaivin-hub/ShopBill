/**
 * Simulates trial detection + billing page display logic for common Razorpay shapes.
 * Run: node server/scripts/test-subscription-trial.js
 */
const {
    isSubscriptionInTrial,
    getSubscriptionChargeDate,
    mergeBillingDate,
} = require('../utils/subscriptionTrial');

const now = Math.floor(Date.now() / 1000);
const days = (n) => now + n * 86400;

const scenarios = [
    {
        name: 'Signup authenticated, trial in 30 days (start_at)',
        rzp: {
            status: 'authenticated',
            paid_count: 0,
            start_at: days(30),
            charge_at: null,
            current_end: days(1),
        },
        db: { subscriptionStatus: 'authenticated', planEndDate: new Date(days(30) * 1000) },
    },
    {
        name: 'After ₹1 mandate — active, paid_count 1, start_at future',
        rzp: {
            status: 'active',
            paid_count: 1,
            start_at: days(28),
            charge_at: days(28),
            current_end: days(1),
        },
        db: { subscriptionStatus: 'active', planEndDate: new Date(days(28) * 1000) },
    },
    {
        name: 'Active trial but current_end is tomorrow (bad sync source)',
        rzp: {
            status: 'active',
            paid_count: 1,
            start_at: days(28),
            charge_at: null,
            current_end: days(1),
        },
        db: { subscriptionStatus: 'active', planEndDate: new Date(days(1) * 1000) },
    },
    {
        name: 'Paid monthly cycle',
        rzp: {
            status: 'active',
            paid_count: 2,
            start_at: days(-60),
            current_end: days(25),
            charge_at: days(-5),
        },
        db: { subscriptionStatus: 'active', planEndDate: new Date(days(25) * 1000) },
    },
    {
        name: 'Razorpay fetch failed — active, DB planEndDate future',
        rzp: null,
        db: { subscriptionStatus: 'active', planEndDate: new Date(days(28) * 1000) },
    },
    {
        name: 'Stale session cancelled + API isInTrial true',
        rzp: {
            status: 'active',
            paid_count: 1,
            start_at: days(28),
            charge_at: days(28),
            current_end: days(1),
        },
        db: { subscriptionStatus: 'active', planEndDate: new Date(days(28) * 1000), apiInTrial: true, sessionCancelled: true },
    },
];

function simulatePageDisplay({ rzp, db }) {
    const isInTrial = rzp ? isSubscriptionInTrial(rzp) : false;
    const rzpDate = rzp ? getSubscriptionChargeDate(rzp) : null;
    const merged = mergeBillingDate(db.planEndDate, rzpDate, { preferLater: true });
    const apiInTrial = db.apiInTrial ?? isInTrial;
    const subscriptionIsActive = ['active', 'authenticated'].includes(
        String(db.subscriptionStatus || '').toLowerCase()
    );
    const hasFutureCharge = merged && merged > new Date();
    const inferredInTrial =
        !db.sessionCancelled &&
        (apiInTrial ||
            db.subscriptionStatus === 'authenticated' ||
            db.subscriptionStatus === 'created' ||
            (hasFutureCharge && subscriptionIsActive));
    const needsResubscribeOld =
        !subscriptionIsActive &&
        ['trial_cancellation_pending', 'cancellation_no_refund'].includes(db.subscriptionStatus);
    const showCurrentPlanOld = Boolean(db.plan) !== false && !needsResubscribeOld;
    const needsResubscribeNew =
        !subscriptionIsActive &&
        !inferredInTrial &&
        ['trial_cancellation_pending', 'cancellation_no_refund'].includes(db.subscriptionStatus);
    const showCurrentPlanNew = Boolean(db.plan);
    const showTrialBadge = inferredInTrial && !needsResubscribeNew;
    const renewLabel = inferredInTrial
        ? `First charge ${merged ? merged.toLocaleDateString('en-IN') : '?'}`
        : `Renews ${merged ? merged.toLocaleDateString('en-IN') : '?'}`;

    return {
        isInTrial,
        apiInTrial,
        rzpDate: rzpDate?.toISOString?.() || null,
        merged: merged?.toISOString?.() || null,
        inferredInTrial,
        needsResubscribeOld,
        showCurrentPlanOld,
        needsResubscribeNew,
        showCurrentPlanNew,
        showTrialBadge,
        renewLabel,
    };
}

console.log('=== Subscription trial simulation ===\n');
for (const s of scenarios) {
    const db = { plan: 'PRO', ...s.db };
    const out = simulatePageDisplay({ rzp: s.rzp, db });
    console.log(`--- ${s.name} ---`);
    console.log(JSON.stringify(out, null, 2));
    console.log('');
}
