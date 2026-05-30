const { hasBillingAccess } = require('./ownerPaymentBucket');
const { daysBetweenCalendar, formatDateInEnIn, DEFAULT_BILLING_TIMEZONE } = require('./billingDates');
const { canOwnerRenewSubscription } = require('./subscriptionRenew');

function ownerBillingTimezone(ownerAccount) {
    return ownerAccount?.timezone || DEFAULT_BILLING_TIMEZONE;
}

/** Owner cancelled via app — retain access until planEndDate */
const USER_CANCELLED_ACCESS_STATUSES = new Set([
    'cancellation_pending',
    'trial_cancellation_pending',
    'cancellation_no_refund',
]);

/**
 * Inclusive calendar-day access: valid through planEndDate (shop timezone), blocked from the next day.
 */
function hasAppSubscriptionAccess(ownerAccount, now = new Date()) {
    if (!ownerAccount) return false;
    const isOwner = String(ownerAccount.role || '').toLowerCase() === 'owner';
    // Staff blocked when owner marks them inactive; owner may be isActive:false after plan ended
    if (!isOwner && ownerAccount.isActive === false) return false;
    if (requiresMandateRestoreGate(ownerAccount)) return false;
    return hasBillingAccess(
        ownerAccount.planEndDate,
        now,
        ownerBillingTimezone(ownerAccount)
    );
}

/**
 * Razorpay halted = retries exhausted; block app access immediately (international dunning model).
 */
function isSubscriptionHalted(ownerAccount) {
    return String(ownerAccount?.subscriptionStatus || '').toLowerCase() === 'halted';
}

/**
 * Halted owners stay signed in but only mandate-restore APIs + gate UI (see mandateRestorePaths).
 */
function requiresMandateRestoreGate(ownerAccount) {
    return isSubscriptionHalted(ownerAccount);
}

/** Full POS access (billing, inventory, etc.) */
function hasFullAppAccess(ownerAccount, now = new Date()) {
    if (!ownerAccount) return false;
    if (requiresMandateRestoreGate(ownerAccount)) return false;
    return hasAppSubscriptionAccess(ownerAccount, now);
}

/**
 * Block login only when paid period ended / expired — not when halted (gate instead).
 */
function isSubscriptionAccessBlocked(ownerAccount, now = new Date()) {
    if (!ownerAccount) return true;
    if (requiresMandateRestoreGate(ownerAccount)) return false;
    return !hasAppSubscriptionAccess(ownerAccount, now);
}

function getSubscriptionAccessMessage(ownerAccount) {
    if (!ownerAccount) {
        return 'Account not found.';
    }
    const status = String(ownerAccount.subscriptionStatus || '').toLowerCase();
    const isOwner = String(ownerAccount.role || '').toLowerCase() === 'owner';

    if (status === 'halted') {
        return 'Your subscription payment failed after all retry attempts. Complete a new payment mandate below to restore your store. Other features are temporarily locked.';
    }
    const tz = ownerBillingTimezone(ownerAccount);
    const endLabel = ownerAccount.planEndDate
        ? formatDateInEnIn(ownerAccount.planEndDate, tz)
        : null;

    if (!hasBillingAccess(ownerAccount.planEndDate, new Date(), tz)) {
        if (USER_CANCELLED_ACCESS_STATUSES.has(status) || ['cancelled', 'expired', 'cancellation_no_refund'].includes(status)) {
            return endLabel
                ? `Your subscription was cancelled. You had access through ${endLabel} (last day of your paid period). Restart your subscription from the login page to use your existing store again.`
                : 'Your subscription has ended. Restart your subscription from the login page to access your store again.';
        }
        return endLabel
            ? `Your access period ended on ${endLabel}. Restart your subscription from the login page to continue.`
            : 'Your subscription has expired. Restart your subscription from the login page to continue.';
    }

    if (ownerAccount.isActive === false && !isOwner) {
        return 'Your account has been deactivated. Please contact your shop owner.';
    }
    if (ownerAccount.isActive === false && isOwner) {
        return 'Your store account is inactive. Please contact Pocket POS support or restart your subscription from the login page.';
    }

    return null;
}

function getAccessDaysRemaining(ownerAccount, now = new Date()) {
    if (!ownerAccount?.planEndDate) return 0;
    const tz = ownerBillingTimezone(ownerAccount);
    return Math.max(0, daysBetweenCalendar(now, new Date(ownerAccount.planEndDate), tz));
}

function getSubscriptionAccessBlockCode(ownerAccount, now = new Date()) {
    if (isSubscriptionHalted(ownerAccount)) return 'SUBSCRIPTION_HALTED';
    if (canOwnerRenewSubscription(ownerAccount, now)) return 'SUBSCRIPTION_RENEW_REQUIRED';
    return 'SUBSCRIPTION_ACCESS_ENDED';
}

module.exports = {
    hasAppSubscriptionAccess,
    hasFullAppAccess,
    isSubscriptionHalted,
    requiresMandateRestoreGate,
    isSubscriptionAccessBlocked,
    getSubscriptionAccessMessage,
    getSubscriptionAccessBlockCode,
    getAccessDaysRemaining,
    USER_CANCELLED_ACCESS_STATUSES,
};
