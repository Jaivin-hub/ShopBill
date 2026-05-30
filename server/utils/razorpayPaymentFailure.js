/**
 * Map Razorpay webhook payloads to owner-facing failure categories.
 * @see https://razorpay.com/docs/errors/reasons/
 */

const FAILURE_CODES = {
    CARD_EXPIRED: 'card_expired',
    CARD_BLOCKED: 'card_blocked',
    INSUFFICIENT_FUNDS: 'insufficient_funds',
    MANDATE_CANCELLED: 'mandate_cancelled',
    RECURRING_HALTED: 'recurring_halted',
    PAYMENT_FAILED: 'payment_failed',
    UNKNOWN: 'unknown',
};

const normalize = (v) => String(v || '').toLowerCase().trim();

/**
 * @param {object} webhookBody - full Razorpay webhook JSON
 * @param {string} event - e.g. payment.failed, subscription.cancelled
 */
function classifyRazorpayFailure(webhookBody, event) {
    const payload = webhookBody?.payload || {};
    const payment = payload.payment?.entity || null;
    const subscription = payload.subscription?.entity || null;

    if (event === 'subscription.cancelled') {
        return {
            code: FAILURE_CODES.MANDATE_CANCELLED,
            razorpayReason: 'subscription.cancelled',
            razorpayDescription: subscription?.status || 'cancelled',
            source: 'subscription',
        };
    }

    if (event === 'subscription.halted') {
        return {
            code: FAILURE_CODES.RECURRING_HALTED,
            razorpayReason: 'subscription.halted',
            razorpayDescription: subscription?.status || 'halted',
            source: 'subscription',
        };
    }

    const errorReason = normalize(payment?.error_reason);
    const errorDescription = normalize(payment?.error_description);
    const errorCode = normalize(payment?.error_code);
    const haystack = `${errorReason} ${errorDescription} ${errorCode}`;

    if (
        errorReason === 'card_expired' ||
        (/\bexpired\b/.test(haystack) && /\bcard\b/.test(haystack))
    ) {
        return {
            code: FAILURE_CODES.CARD_EXPIRED,
            razorpayReason: payment?.error_reason || 'card_expired',
            razorpayDescription: payment?.error_description || null,
            source: 'payment',
        };
    }

    if (
        errorReason === 'insufficient_funds' ||
        /\binsufficient\b/.test(haystack) ||
        /\blow balance\b/.test(haystack) ||
        /\bnot enough\b/.test(haystack)
    ) {
        return {
            code: FAILURE_CODES.INSUFFICIENT_FUNDS,
            razorpayReason: payment?.error_reason || 'insufficient_funds',
            razorpayDescription: payment?.error_description || null,
            source: 'payment',
        };
    }

    if (
        /\bblocked\b/.test(haystack) ||
        /\bblock\b/.test(haystack) ||
        /\brestricted\b/.test(haystack) ||
        /\bfrozen\b/.test(haystack) ||
        /\bnot permitted\b/.test(haystack) ||
        errorReason === 'card_declined'
    ) {
        return {
            code: FAILURE_CODES.CARD_BLOCKED,
            razorpayReason: payment?.error_reason || 'card_declined',
            razorpayDescription: payment?.error_description || null,
            source: 'payment',
        };
    }

    if (event === 'payment.failed') {
        return {
            code: FAILURE_CODES.PAYMENT_FAILED,
            razorpayReason: payment?.error_reason || errorCode || 'payment.failed',
            razorpayDescription: payment?.error_description || null,
            source: 'payment',
        };
    }

    return {
        code: FAILURE_CODES.UNKNOWN,
        razorpayReason: payment?.error_reason || event,
        razorpayDescription: payment?.error_description || null,
        source: payment ? 'payment' : 'event',
    };
}

/**
 * Owner notification / dashboard copy for a failure code.
 * @param {string} code
 * @param {{ shopName?: string, daysUntilDeactivation?: number, graceEndsAt?: Date, planEndDate?: Date }} ctx
 */
function getFailureOwnerMessage(code, ctx = {}) {
    const shop = ctx.shopName || 'your shop';
    const accessLine =
        ctx.planEndDate && ctx.daysUntilDeactivation >= 0
            ? ` You can use Pocket POS through ${formatGraceDate(ctx.planEndDate)} (last day of access). After that you must renew to sign in.`
            : '';

    switch (code) {
        case FAILURE_CODES.CARD_EXPIRED:
            return {
                title: 'Card expired — payment failed',
                message: `Hi ${shop}, your subscription payment could not be collected because the card on file has expired. Please update your payment method in Plan & Billing.${accessLine}`,
                actionHint: 'Update card in Plan & Billing',
            };
        case FAILURE_CODES.CARD_BLOCKED:
            return {
                title: 'Card blocked — payment failed',
                message: `Hi ${shop}, your bank blocked the subscription charge (the card may be frozen or restricted). Please contact your bank or try another payment method in Plan & Billing.${accessLine}`,
                actionHint: 'Use another card or contact your bank',
            };
        case FAILURE_CODES.INSUFFICIENT_FUNDS:
            return {
                title: 'Insufficient balance',
                message: `Hi ${shop}, the subscription payment failed because your account did not have enough balance. Please add funds or update your payment method in Plan & Billing.${accessLine}`,
                actionHint: 'Add funds or change payment method',
            };
        case FAILURE_CODES.MANDATE_CANCELLED: {
            const accessLine = ctx.planEndDate
                ? ` You can keep using Pocket POS until ${formatGraceDate(ctx.planEndDate)}. Set up a new mandate in Plan & Billing to continue after that.`
                : ' Set up a new mandate in Plan & Billing to resume auto-debit.';
            return {
                title: 'Auto-debit mandate cancelled',
                message: `Hi ${shop}, the recurring payment mandate was cancelled from your bank or UPI app. We will not charge again until you authorize a new mandate.${accessLine}`,
                actionHint: 'Re-authorize mandate in Plan & Billing',
            };
        }
        case FAILURE_CODES.RECURRING_HALTED:
            return {
                title: 'Subscription payments stopped',
                message: `Hi ${shop}, recurring charges stopped after repeated failed payments. Fix payment in Plan & Billing to renew after your access period ends.${accessLine}`,
                actionHint: 'Fix payment in Plan & Billing',
            };
        case FAILURE_CODES.PAYMENT_FAILED:
        default:
            return {
                title: 'Subscription payment failed',
                message: `Hi ${shop}, we could not collect your subscription payment. Razorpay may retry your bank automatically. Update payment in Plan & Billing if needed.${accessLine}`,
                actionHint: 'Open Plan & Billing',
            };
    }
}

function formatGraceDate(d) {
    if (!d) return '';
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    });
}

module.exports = {
    FAILURE_CODES,
    classifyRazorpayFailure,
    getFailureOwnerMessage,
};
