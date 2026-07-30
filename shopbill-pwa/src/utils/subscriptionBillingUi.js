/** Owner subscription states where auto-debit is off but access may continue */
export const CANCELLED_ACCESS_STATUSES = new Set([
    'cancellation_pending',
    'trial_cancellation_pending',
    'cancellation_no_refund',
]);

export const OWNER_BILLING_ALERT_STORAGE_KEY = 'pocketpos_owner_billing_alert';
export const OWNER_SUBSCRIPTION_CANCELLED_STORAGE_KEY = 'pocketpos_owner_subscription_cancelled';
export const CURRENT_PLAN_SNAPSHOT_STORAGE_KEY = 'pocketpos_current_plan_snapshot';

export function parseBillingDate(raw) {
    if (!raw) return null;
    const d = raw instanceof Date ? raw : new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
}

/** Normalize axios / fetch body from GET /auth/current-plan */
export function extractCurrentPlanApiPayload(response) {
    const body = response?.data ?? response ?? {};
    if (body && typeof body === 'object' && body.success !== undefined && body.plan !== undefined) {
        return body;
    }
    if (body?.data && typeof body.data === 'object' && body.data.success !== undefined) {
        return body.data;
    }
    return body && typeof body === 'object' ? body : {};
}

export function readCachedCurrentPlanSnapshot() {
    try {
        const raw = sessionStorage.getItem(CURRENT_PLAN_SNAPSHOT_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

export function writeCachedCurrentPlanSnapshot(payload) {
    if (!payload || typeof payload !== 'object') return;
    try {
        sessionStorage.setItem(
            CURRENT_PLAN_SNAPSHOT_STORAGE_KEY,
            JSON.stringify({ ...payload, cachedAt: Date.now() })
        );
    } catch {
        /* ignore quota */
    }
}

export function clearCachedCurrentPlanSnapshot() {
    try {
        sessionStorage.removeItem(CURRENT_PLAN_SNAPSHOT_STORAGE_KEY);
    } catch {
        /* ignore */
    }
}

export function syncCurrentUserPlanFields(planUpper, fields = {}) {
    try {
        const raw = localStorage.getItem('currentUser');
        if (!raw) return;
        const u = JSON.parse(raw);
        if (planUpper) u.plan = String(planUpper).toUpperCase();
        if (fields.planEndDate !== undefined) u.planEndDate = fields.planEndDate;
        if (fields.nextChargeAt !== undefined) u.nextChargeAt = fields.nextChargeAt;
        if (fields.subscriptionStatus !== undefined) u.subscriptionStatus = fields.subscriptionStatus;
        if (fields.isInTrial !== undefined) u.isInTrial = fields.isInTrial;
        localStorage.setItem('currentUser', JSON.stringify(u));
    } catch {
        /* ignore */
    }
}

/** True when auto-debit is off (trial or paid cancel). */
export function isTerminalCancelledSubscriptionStatus(status) {
    const s = String(status || '').toLowerCase().trim();
    return (
        CANCELLED_ACCESS_STATUSES.has(s) ||
        s === 'cancelled' ||
        s === 'cancellation_no_refund' ||
        s === 'cancelled_replaced'
    );
}

export function readStoredOwnerBillingAlert() {
    try {
        const raw = sessionStorage.getItem(OWNER_BILLING_ALERT_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.show ? parsed : null;
    } catch {
        return null;
    }
}

export function readStoredOwnerSubscriptionCancelled(userId) {
    if (!userId) return false;
    try {
        const raw = sessionStorage.getItem(OWNER_SUBSCRIPTION_CANCELLED_STORAGE_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        return String(parsed?.userId) === String(userId);
    } catch {
        return false;
    }
}

export function writeStoredOwnerSubscriptionCancelled(userId) {
    if (!userId) return;
    sessionStorage.setItem(
        OWNER_SUBSCRIPTION_CANCELLED_STORAGE_KEY,
        JSON.stringify({ userId: String(userId), at: Date.now() })
    );
}

export function clearStoredOwnerSubscriptionCancelled() {
    sessionStorage.removeItem(OWNER_SUBSCRIPTION_CANCELLED_STORAGE_KEY);
}

export function clearStoredOwnerBillingAlert() {
    sessionStorage.removeItem(OWNER_BILLING_ALERT_STORAGE_KEY);
}

/** Clear client-side cancelled-trial flags after re-subscribe or active subscription sync. */
export function clearOwnerSubscriptionCancelledState() {
    clearStoredOwnerSubscriptionCancelled();
    clearStoredOwnerBillingAlert();
}

export function isActiveSubscriptionStatus(status) {
    const s = String(status || '').toLowerCase().trim();
    return s === 'active' || s === 'authenticated';
}

/** Trial + next payment display for Subscription & Billing page */
export function resolveOwnerTrialBillingState({
    subscriptionStatus,
    planEndDate,
    nextChargeAt,
    apiInTrial = false,
    subscriptionCancelled = false,
}) {
    const status = String(subscriptionStatus || '').toLowerCase().trim();
    const paymentDateRaw = nextChargeAt || planEndDate;
    const paymentDate =
        paymentDateRaw instanceof Date
            ? paymentDateRaw
            : paymentDateRaw
              ? new Date(paymentDateRaw)
              : null;
    const paymentDateValid = paymentDate && !Number.isNaN(paymentDate.getTime());
    const hasFutureCharge = paymentDateValid && paymentDate > new Date();
    const paymentLabel = paymentDateValid
        ? paymentDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;

    const explicitlyCancelledTrial = status === 'trial_cancellation_pending';
    const isOnFreeTrial =
        !explicitlyCancelledTrial &&
        !subscriptionCancelled &&
        Boolean(apiInTrial);

    const showTrialBadge = isOnFreeTrial;
    const chargeLabel = isOnFreeTrial
        ? paymentLabel
            ? `First charge ${paymentLabel}`
            : 'First charge at end of free trial'
        : paymentLabel
          ? `Renews ${paymentLabel}`
          : 'Renewal date pending';

    return {
        isOnFreeTrial,
        showTrialBadge,
        chargeLabel,
        paymentDate: paymentDateValid ? paymentDate : null,
        paymentLabel,
        hasFutureCharge,
    };
}

/** After a successful cancel API call, derive local plan state for the billing page. */
export function planDetailsAfterCancelSuccess(prev, result) {
    const status = String(result?.subscriptionStatus || '').toLowerCase();
    const trialSituations = new Set(['trial_cancelled', 'setup_cancelled', 'immediate_mandate_end_access']);
    let subscriptionStatus = prev.subscriptionStatus;
    if (isTerminalCancelledSubscriptionStatus(status)) {
        subscriptionStatus = result.subscriptionStatus;
    } else if (trialSituations.has(result?.situation) || trialSituations.has(result?.action)) {
        subscriptionStatus = 'trial_cancellation_pending';
    }
    return {
        ...prev,
        subscriptionCancelled: true,
        subscriptionStatus,
        isInTrial: false,
    };
}

/**
 * When cancel API used to return success + no_action_needed for Razorpay "pending"
 * (failed charge retry — NOT "cancellation pending"). Detect old/live confusing payloads.
 */
function parseLegacyConfusingCancelResponse(data) {
    const action = data?.action;
    const message = String(data?.message || '');
    const lower = message.toLowerCase();

    const isLegacyNoOp =
        action === 'no_action_needed' ||
        /no action taken/i.test(lower) ||
        (/subscription status is already/i.test(lower) && /\bpending\b/i.test(lower));

    if (!isLegacyNoOp) return null;

    return {
        ok: false,
        toastType: 'warning',
        title: 'Please update the app and try again',
        message:
            'Your latest monthly payment did not complete. Razorpay "pending" means it is retrying that charge — not that cancellation is waiting. This screen received an old server response ("no action taken"). Please update Pocket POS, tap Cancel subscription once more, or contact support. The current version schedules cancellation while Razorpay retries the due payment — you should not need to cancel twice.',
        situation: 'cancel_scheduled_collect_due_payment',
        explainRazorpayPending: true,
    };
}

const formatEndDate = (planEndDate) => {
    if (!planEndDate) return null;
    const d = planEndDate instanceof Date ? planEndDate : new Date(planEndDate);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

const BILLING_TIMEZONE = 'Asia/Kolkata';

/** YYYY-MM-DD in India — matches server hasBillingAccessInTimezone. */
export function calendarDayKeyInTimezone(d, timeZone = BILLING_TIMEZONE) {
    const date = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
}

/** Inclusive last day of paid access (do not use planEndDate > new Date()). */
export function hasInclusiveBillingAccess(planEndDate, timeZone = BILLING_TIMEZONE) {
    if (!planEndDate) return false;
    const endKey = calendarDayKeyInTimezone(planEndDate, timeZone);
    const todayKey = calendarDayKeyInTimezone(new Date(), timeZone);
    if (!endKey || !todayKey) return false;
    return endKey >= todayKey;
}

const hasFutureAccess = (planEndDate) => hasInclusiveBillingAccess(planEndDate);

/**
 * Human-readable billing status for Plan & Billing page and banners.
 */
export function getPlanBillingStatusDisplay({
    subscriptionStatus,
    planEndDate,
    billingAlert,
    isInTrial = false,
    subscriptionCancelled = false,
}) {
    if (billingAlert?.show && billingAlert.message) {
        const variant =
            billingAlert.variant === 'upcoming_payment'
                ? 'info'
                : billingAlert.variant === 'mandate_cancelled'
                  ? 'warning'
                  : 'danger';
        return {
            variant,
            title:
                billingAlert.title ||
                (billingAlert.variant === 'payment_failed'
                    ? 'Payment failed'
                    : billingAlert.variant === 'mandate_cancelled'
                      ? 'Auto-debit stopped'
                      : 'Billing reminder'),
            message: billingAlert.message,
        };
    }

    const status = String(subscriptionStatus || '').toLowerCase().trim();
    const endLabel = formatEndDate(planEndDate);
    const futureAccess = hasFutureAccess(planEndDate);

    if (
        subscriptionCancelled &&
        futureAccess &&
        !CANCELLED_ACCESS_STATUSES.has(status) &&
        status !== 'cancelled'
    ) {
        return {
            variant: 'cancelled',
            title: 'Subscription cancelled',
            message: isInTrial
                ? `Your free trial is cancelled. No monthly plan charge will be made. You can use Pocket POS until ${endLabel} (last day of your free trial).`
                : `Auto-debit is turned off. You can use Pocket POS until ${endLabel} (last day of your paid period).`,
        };
    }

    if (status === 'cancellation_pending' && futureAccess) {
        return {
            variant: 'warning',
            title: 'Cancellation scheduled — due payment may retry',
            message: `Your last monthly payment did not complete. Razorpay will retry collecting it. After that, auto-debit stops and you can use Pocket POS until ${endLabel}. You do not need to cancel again.`,
        };
    }

    if (CANCELLED_ACCESS_STATUSES.has(status) && futureAccess) {
        const trial = status === 'trial_cancellation_pending';
        return {
            variant: 'cancelled',
            title: 'Subscription cancelled',
            message: trial
                ? `Your trial mandate is cancelled. No charge will be made. You can use Pocket POS until ${endLabel} (last day of your free trial).`
                : `Auto-debit is turned off. No further charges will be made. You can use Pocket POS until ${endLabel} (last day of your paid period).`,
        };
    }

    if (status === 'cancelled' && futureAccess) {
        return {
            variant: 'cancelled',
            title: 'Subscription cancelled',
            message: `Your plan is cancelled. You can keep using Pocket POS until ${endLabel}.`,
        };
    }

    if (status === 'pending') {
        return {
            variant: 'warning',
            title: 'Last payment did not complete',
            message: `Your bank did not accept the latest subscription charge. Razorpay is retrying automatically. This is not a cancelled plan.${endLabel ? ` You can use the app until ${endLabel} (last day of your paid access).` : ''} Open Plan & Billing to manage cancellation.`,
        };
    }

    if (status === 'halted') {
        return {
            variant: 'danger',
            title: 'Store paused — payment required',
            message:
                'Your subscription is halted after failed payment retries. Complete a new payment mandate on this screen to unlock your store. Other pages are temporarily unavailable.',
        };
    }

    if (
        (CANCELLED_ACCESS_STATUSES.has(status) || status === 'cancelled' || status === 'expired') &&
        !futureAccess
    ) {
        return {
            variant: 'danger',
            title: 'Access ended',
            message: endLabel
                ? `Your paid period ended on ${endLabel}. Restart your subscription from the login page to access your existing store.`
                : 'Your subscription has ended. Restart your subscription from the login page.',
        };
    }

    if (isInTrial) {
        return {
            variant: 'info',
            title: 'Free trial active',
            message: endLabel
                ? `You are on a free trial. Your first plan charge is on ${endLabel}. Cancel before then if you do not want to be billed.`
                : 'You are on a free trial. Cancel before your first plan charge if you do not want to be billed.',
        };
    }

    if (status === 'authenticated') {
        return {
            variant: 'info',
            title: 'Free trial active',
            message: endLabel
                ? `Mandate is set up. Your first plan charge is on ${endLabel}. Cancel anytime before then to avoid billing.`
                : 'Mandate is set up. Cancel anytime before your first charge.',
        };
    }

    if (status === 'active') {
        return {
            variant: 'success',
            title: 'Subscription active',
            message: endLabel
                ? `Your plan renews automatically. Next payment date: ${endLabel}.`
                : 'Your plan renews automatically each month.',
        };
    }

    if (status === 'created' || status === 'pending') {
        return {
            variant: 'info',
            title: 'Subscription setup',
            message: endLabel
                ? `Complete mandate setup. First plan charge is scheduled for ${endLabel}.`
                : 'Complete mandate setup to start your subscription.',
        };
    }

    if (!futureAccess && ['cancelled', 'expired'].includes(status)) {
        return {
            variant: 'danger',
            title: 'Subscription ended',
            message: 'Your paid period has ended. Upgrade to a plan below to continue using Pocket POS.',
        };
    }

    return null;
}

export const CANCEL_SUCCESS_ACTIONS = new Set([
    'immediate_mandate_end_access',
    'immediate_cancel_extended_access',
    'halted_cancel_extended_access',
    'cancel_at_cycle_end_pending_payment',
    'cancelled_during_payment_retry',
    'created_subscription_cancel',
    'already_cancelled_rzp',
    'already_cancelled_local',
]);

export const CANCEL_INFO_ACTIONS = new Set(['already_cancelled_local']);

/**
 * Interpret POST /payment/cancel-subscription response for UI.
 */
export function interpretCancelSubscriptionResponse(data) {
    const legacy = parseLegacyConfusingCancelResponse(data);
    if (legacy) return legacy;

    if (!data?.success) {
        const err = data?.error || data?.razorpayApiError || '';
        const isPaymentState = /pending|halted|payment/i.test(String(err));
        return {
            ok: false,
            toastType: 'error',
            title: isPaymentState ? 'Payment issue — try again' : 'Cancellation failed',
            message:
                err ||
                'We could not cancel your subscription. Please try again or contact Pocket POS support.',
        };
    }

    const { action, message, cancelled, userTitle, situation } = data;
    const didCancel = cancelled === true || CANCEL_SUCCESS_ACTIONS.has(action);

    if (!didCancel) {
        const lower = String(message || '').toLowerCase();
        if (/\bpending\b/.test(lower) && /no action|already/i.test(lower)) {
            return parseLegacyConfusingCancelResponse({
                success: true,
                action: 'no_action_needed',
                message,
            });
        }
        return {
            ok: false,
            toastType: 'error',
            title: 'Cancellation not completed',
            message:
                message ||
                'Your subscription was not cancelled on our side. Please try once more or contact support with your shop name.',
            situation,
        };
    }

    const isInfo =
        CANCEL_INFO_ACTIONS.has(action) ||
        situation === 'already_cancelled' ||
        situation === 'already_cancelled_provider';

    const titleFromSituation = {
        paid_plan_cancelled: 'Subscription cancelled',
        cancel_scheduled_collect_due_payment: 'Cancellation scheduled',
        paid_plan_cancelled_payment_retry: 'Cancellation scheduled',
        paid_plan_cancelled_after_halt: 'Subscription cancelled',
        trial_cancelled: 'Subscription cancelled',
        already_cancelled: 'Already cancelled',
        already_cancelled_provider: 'Already cancelled',
    };

    return {
        ok: true,
        toastType: isInfo ? 'info' : 'success',
        title: userTitle || titleFromSituation[situation] || (isInfo ? 'Already cancelled' : 'Cancellation confirmed'),
        message:
            message ||
            (isInfo
                ? 'Auto-debit is already off. You can keep using the app until the access date shown above.'
                : 'Auto-debit is off. No further monthly charges. You can keep using Pocket POS until your access end date above.'),
        subscriptionStatus: data.subscriptionStatus,
        planEndDate: data.planEndDate,
        situation,
    };
}

/**
 * Reference: cancel flows for support / docs (not shown in UI).
 */
export const CANCEL_FLOW_SCENARIOS = [
    {
        id: 'paid_active',
        when: 'Paying customer, plan active, last charge succeeded',
        razorpay: 'active',
        result: 'Cancels on Razorpay; status cancellation_no_refund; access until planEndDate',
    },
    {
        id: 'paid_pending_retry',
        when: 'Paying customer but latest monthly charge FAILED (Razorpay retrying)',
        razorpay: 'pending',
        oldBug: 'Used to say "status is already pending. No action taken" — confused users',
        result: 'Cancel at cycle end: Razorpay retries due payment, then subscription ends; status cancellation_pending',
    },
    {
        id: 'paid_halted',
        when: 'Multiple failed payments; subscription halted',
        razorpay: 'halted',
        result: 'Cancels; cancellation_no_refund if access remains',
    },
    {
        id: 'trial',
        when: 'Still on trial / mandate only (₹1 verified)',
        razorpay: 'authenticated or created',
        result: 'trial_cancellation_pending; no future charge',
    },
    {
        id: 'already_cancelled',
        when: 'User taps cancel again after already cancelling',
        local: 'cancellation_no_refund / trial_cancellation_pending',
        result: 'Info: already cancelled, access until planEndDate',
    },
];
