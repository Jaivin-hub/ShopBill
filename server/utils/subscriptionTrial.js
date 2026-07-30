/**
 * Trial = mandate set up but no full plan charge yet.
 * Razorpay may show status `active` and paid_count 1 after ₹1 mandate verification —
 * still treat as trial when start_at / charge_at (first full plan charge) is in the future.
 * Do NOT use current_end for trial — it reflects the mandate verification window, not the plan charge.
 */
function getFirstFullChargeTimestamp(subscription) {
    if (!subscription) return null;
    return subscription.charge_at || subscription.start_at || null;
}

function getRenewalTimestamp(subscription) {
    if (!subscription) return null;
    return subscription.current_end || null;
}

function timestampToDate(ts) {
    if (!ts) return null;
    const d = new Date(Number(ts) * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
}

function isSubscriptionInTrial(subscription) {
    if (!subscription) return false;
    const status = String(subscription.status || '').toLowerCase();
    if (['cancelled', 'completed', 'expired', 'halted'].includes(status)) return false;
    if (!['active', 'authenticated', 'created', 'pending'].includes(status)) return false;

    const paidCount = Number(subscription.paid_count) || 0;

    // Mandate (₹1) + at least one full plan charge — trial is over
    if (paidCount >= 2) {
        return false;
    }

    // Active subscription with a captured charge and first billing date passed
    if (status === 'active' && paidCount >= 1) {
        const firstCharge = timestampToDate(getFirstFullChargeTimestamp(subscription));
        if (firstCharge && firstCharge <= new Date()) {
            return false;
        }
    }

    const firstCharge = timestampToDate(getFirstFullChargeTimestamp(subscription));
    if (firstCharge && firstCharge > new Date()) {
        return true;
    }

    if (paidCount <= 1) {
        const startAt = timestampToDate(subscription.start_at);
        if (startAt && startAt > new Date()) return true;
    }

    return paidCount === 0;
}

const PLAN_MIN_AMOUNT = { BASIC: 499, PRO: 999, PREMIUM: 2999 };

function minAmountForPlan(plan) {
    return PLAN_MIN_AMOUNT[String(plan || 'BASIC').toUpperCase()] || 499;
}

/** DB proof of at least one full plan charge (not ₹1 mandate). */
async function ownerHasFullPlanPayment(Payment, shopId, plan) {
    if (!Payment || !shopId) return false;
    const minAmount = minAmountForPlan(plan);
    const count = await Payment.countDocuments({
        shopId,
        status: 'paid',
        amount: { $gte: minAmount },
    });
    return count > 0;
}

/** Any paid plan-tier charge (BASIC+) — used after tier upgrades when DB plan may lag. */
async function ownerHasAnyFullPlanPayment(Payment, shopId) {
    if (!Payment || !shopId) return false;
    const count = await Payment.countDocuments({
        shopId,
        status: 'paid',
        amount: { $gte: minAmountForPlan('BASIC') },
    });
    return count > 0;
}

/**
 * Next full plan charge (trial) or renewal date (paid cycle) from Razorpay.
 */
function getSubscriptionChargeDate(subscription) {
    if (!subscription) return null;
    if (isSubscriptionInTrial(subscription)) {
        return timestampToDate(getFirstFullChargeTimestamp(subscription));
    }
    return (
        timestampToDate(getRenewalTimestamp(subscription)) ||
        timestampToDate(getFirstFullChargeTimestamp(subscription))
    );
}

/** Pick the best next-charge date — never prefer a Razorpay date that is earlier than DB. */
function mergeBillingDate(dbDate, rzpDate, { preferLater = true } = {}) {
    const db = dbDate ? new Date(dbDate) : null;
    const rzp = rzpDate instanceof Date ? rzpDate : rzpDate ? new Date(rzpDate) : null;
    const dbOk = db && !Number.isNaN(db.getTime());
    const rzpOk = rzp && !Number.isNaN(rzp.getTime());
    if (!dbOk && !rzpOk) return null;
    if (!dbOk) return rzp;
    if (!rzpOk) return db;
    if (preferLater) return rzp >= db ? rzp : db;
    return rzp;
}

module.exports = {
    isSubscriptionInTrial,
    getSubscriptionChargeDate,
    getFirstFullChargeTimestamp,
    mergeBillingDate,
    minAmountForPlan,
    ownerHasFullPlanPayment,
    ownerHasAnyFullPlanPayment,
};
