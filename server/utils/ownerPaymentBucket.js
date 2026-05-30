/**
 * Classify owner subscription billing for superadmin dashboard / shop filters.
 * "Paid" = real subscription charge succeeded (active), not ₹1 mandate / free trial.
 */
const { hasBillingAccessInTimezone, DEFAULT_BILLING_TIMEZONE } = require('./billingDates');

const CANCELLED_STATUSES = new Set([
    'cancelled',
    'expired',
    'cancellation_pending',
    'trial_cancellation_pending',
    'cancellation_no_refund',
    'cancelled_replaced',
]);

const hasBillingAccess = (planEndDate, now = new Date(), timeZone = DEFAULT_BILLING_TIMEZONE) => {
    return hasBillingAccessInTimezone(planEndDate, now, timeZone);
};

/**
 * @param {{ subscriptionStatus?: string, planEndDate?: Date|string, paymentFailedAt?: Date|string|null }} owner
 * @param {Date} [now]
 * @returns {'paid'|'pending'|'failed'|'overdue'}
 */
function classifyOwnerPaymentBucket(owner, now = new Date()) {
    const status = String(owner.subscriptionStatus || '').toLowerCase().trim();
    const tz = owner?.timezone || DEFAULT_BILLING_TIMEZONE;
    const hasAccess = hasBillingAccess(owner.planEndDate, now, tz);

    if (status === 'halted') return 'failed';

    if (owner.paymentFailedAt && hasAccess) return 'failed';
    if (owner.paymentFailedAt && !hasAccess) return 'overdue';

    // Real subscription payment (post-trial charge), not mandate-only trial
    if (status === 'active' && hasAccess) return 'paid';

    // Free trial / mandate verified (₹1) — first charge still scheduled
    if (status === 'authenticated' && hasAccess) return 'pending';
    if (status === 'created' || status === 'pending') return 'pending';

    if (CANCELLED_STATUSES.has(status)) {
        if (hasAccess) return 'paid';
        return 'pending';
    }

    if (status === 'past_due') return 'overdue';
    if (!hasAccess && owner.planEndDate) return 'overdue';

    return 'pending';
}

module.exports = {
    classifyOwnerPaymentBucket,
    hasBillingAccess,
    CANCELLED_STATUSES,
};
