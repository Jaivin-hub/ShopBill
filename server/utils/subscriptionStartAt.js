/**
 * Razorpay subscription `start_at` — when the first full plan charge is scheduled.
 *
 * - New signup only: 30-day free trial (first charge in 30 days).
 * - Re-subscribe / upgrade / renew after trial used: no second trial.
 *   Charge at remaining planEndDate if access continues, else within a few days.
 */

const {
    DEFAULT_BILLING_TIMEZONE,
    hasBillingAccessInTimezone,
    formatDateInEnIn,
} = require('./billingDates');

const SIGNUP_TRIAL_DAYS = 30;
const PAID_START_DEFERRAL_DAYS = 3;
/** Razorpay requires start_at in the near future */
const MIN_START_BUFFER_SEC = 15 * 60;

function unixNow() {
    return Math.floor(Date.now() / 1000);
}

function dateToUnixSec(value) {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return Math.floor(d.getTime() / 1000);
}

function minFutureStartAtUnix() {
    return unixNow() + MIN_START_BUFFER_SEC;
}

function signupTrialStartAtUnix() {
    return unixNow() + SIGNUP_TRIAL_DAYS * 24 * 60 * 60;
}

function deferPaidStartAtUnix(days = PAID_START_DEFERRAL_DAYS) {
    return unixNow() + days * 24 * 60 * 60;
}

function ownerTimezone(owner) {
    return owner?.timezone || DEFAULT_BILLING_TIMEZONE;
}

function ownerHasRemainingAccess(owner, now = new Date()) {
    if (!owner?.planEndDate) return false;
    return hasBillingAccessInTimezone(owner.planEndDate, now, ownerTimezone(owner));
}

/**
 * @param {object|null} owner
 * @param {'signup'|'resubscribe'|'renew'|'recovery'} context
 */
function resolveSubscriptionStartAtUnix(owner, context = 'resubscribe') {
    if (context === 'signup') {
        return signupTrialStartAtUnix();
    }

    const now = new Date();
    if (owner?.planEndDate && ownerHasRemainingAccess(owner, now)) {
        const endUnix = dateToUnixSec(owner.planEndDate);
        if (endUnix != null) {
            return Math.max(endUnix, minFutureStartAtUnix());
        }
    }

    if (context === 'recovery') {
        return deferPaidStartAtUnix(PAID_START_DEFERRAL_DAYS);
    }

    return deferPaidStartAtUnix(PAID_START_DEFERRAL_DAYS);
}

function describeFirstChargeForOwner(owner, startAtUnix, context = 'resubscribe') {
    if (context === 'signup') {
        return `Your first full plan charge is in ${SIGNUP_TRIAL_DAYS} days (free trial).`;
    }

    const tz = ownerTimezone(owner);
    const chargeDate = new Date(startAtUnix * 1000);
    const label = formatDateInEnIn(chargeDate, tz);

    if (owner?.planEndDate && ownerHasRemainingAccess(owner)) {
        return `No new free trial. Your first full plan charge is scheduled for ${label} (when your current access period ends).`;
    }

    return `No new free trial. Your first full plan charge is scheduled around ${label}.`;
}

module.exports = {
    SIGNUP_TRIAL_DAYS,
    PAID_START_DEFERRAL_DAYS,
    signupTrialStartAtUnix,
    resolveSubscriptionStartAtUnix,
    ownerHasRemainingAccess,
    describeFirstChargeForOwner,
};
