const User = require('../models/User');
const { daysBetweenCalendar, formatDateKeyUtc, UPCOMING_PAYMENT_REMINDER_DAYS } = require('../utils/billingDates');
const {
    notifyOwnerUpcomingPayment,
    notifyOwnerPaymentFailedGrace,
    notifySuperadminsGraceExpired,
} = require('./notifySubscriptionBilling');
const { hasBillingAccess } = require('../utils/ownerPaymentBucket');
const { getAccessDaysRemaining, USER_CANCELLED_ACCESS_STATUSES } = require('../utils/subscriptionAccess');
const { formatDateInEnIn } = require('../utils/billingDates');
const { getFailureOwnerMessage } = require('../utils/razorpayPaymentFailure');

const MANDATE_OK_STATUSES = new Set(['active', 'authenticated', 'pending']);
const CANCELLED_STATUSES = new Set([
    'cancelled',
    'expired',
    'cancellation_pending',
    'trial_cancellation_pending',
    'cancellation_no_refund',
    'cancelled_replaced',
]);

let isRunning = false;

const getBillingRemindersSent = (owner, dueKey) => {
    const map = owner.billingRemindersSent;
    if (!map) return [];
    if (map instanceof Map) return map.get(dueKey) || [];
    if (typeof map === 'object') return map[dueKey] || [];
    return [];
};

const markReminderSent = async (ownerId, dueKey, dayTag) => {
    const owner = await User.findById(ownerId).select('billingRemindersSent');
    if (!owner) return;
    const map = owner.billingRemindersSent instanceof Map
        ? owner.billingRemindersSent
        : new Map(Object.entries(owner.billingRemindersSent || {}));
    const prev = map.get(dueKey) || [];
    if (prev.includes(dayTag)) return;
    map.set(dueKey, [...prev, dayTag]);
    owner.billingRemindersSent = map;
    await owner.save();
};

const processUpcomingPaymentReminders = async (io, now) => {
    const owners = await User.find({
        role: 'owner',
        isActive: { $ne: false },
        planEndDate: { $ne: null },
        subscriptionStatus: { $in: [...MANDATE_OK_STATUSES] },
        paymentFailedAt: null,
    })
        .select('_id shopName email planEndDate subscriptionStatus billingRemindersSent deviceTokens pushNotificationsEnabled')
        .lean();

    for (const owner of owners) {
        const dueDate = new Date(owner.planEndDate);
        const daysUntil = daysBetweenCalendar(now, dueDate);
        if (!UPCOMING_PAYMENT_REMINDER_DAYS.includes(daysUntil)) continue;

        const dueKey = formatDateKeyUtc(dueDate);
        const sent = getBillingRemindersSent(owner, dueKey);
        const tag = String(daysUntil);
        if (sent.includes(tag)) continue;

        await notifyOwnerUpcomingPayment(io, owner, daysUntil, dueDate);
        await markReminderSent(owner._id, dueKey, tag);
    }
};

/** Deactivate owners whose paid access period (planEndDate) has ended — not a separate 10-day grace. */
const processExpiredPlanAccess = async (io, now) => {
    const owners = await User.find({
        role: 'owner',
        isActive: { $ne: false },
        planEndDate: { $ne: null },
    })
        .select('_id shopName email isActive planEndDate subscriptionStatus deviceTokens pushNotificationsEnabled')
        .lean();

    for (const owner of owners) {
        const tz = owner.timezone || 'Asia/Kolkata';
        if (hasBillingAccess(owner.planEndDate, now, tz)) continue;

        await User.updateOne(
            { _id: owner._id },
            {
                $set: {
                    isActive: false,
                    subscriptionStatus: 'expired',
                    lastStatusUpdate: now,
                },
            }
        );

        await notifySuperadminsGraceExpired(io, owner);
        console.log(
            `[Billing] Access ended for ${owner.shopName || owner._id} (planEndDate ${owner.planEndDate}). Account deactivated.`
        );
    }
};

const runSubscriptionBillingAutomation = async (io) => {
    if (isRunning) return;
    isRunning = true;
    const now = new Date();
    try {
        await processUpcomingPaymentReminders(io, now);
        await processExpiredPlanAccess(io, now);
    } catch (err) {
        console.error('[Billing] automation error:', err?.message || err);
    } finally {
        isRunning = false;
    }
};

/** Owner dashboard / current-plan billing alert payload */
const buildBillingAlertForOwner = (owner) => {
    if (!owner || owner.role !== 'owner') return null;
    const now = new Date();

    const tz = owner.timezone || 'Asia/Kolkata';
    if (owner.paymentFailedAt && owner.planEndDate && hasBillingAccess(owner.planEndDate, now, tz)) {
        const daysLeft = getAccessDaysRemaining(owner, now);
        const copy = getFailureOwnerMessage(owner.lastPaymentFailureReason, {
            shopName: owner.shopName || 'your shop',
            daysUntilDeactivation: daysLeft,
            planEndDate: owner.planEndDate,
        });
        return {
            show: true,
            variant: 'payment_failed',
            failureCode: owner.lastPaymentFailureReason || null,
            daysUntilAccessEnd: daysLeft,
            accessEndsAt: new Date(owner.planEndDate).toISOString(),
            message: copy.message,
            title: copy.title || 'Payment failed',
        };
    }

    const status = String(owner.subscriptionStatus || '').toLowerCase();
    if (USER_CANCELLED_ACCESS_STATUSES.has(status) && owner.planEndDate && hasBillingAccess(owner.planEndDate, now, tz)) {
        const endLabel = formatDateInEnIn(owner.planEndDate);
        const daysLeft = getAccessDaysRemaining(owner, now);
        const isTrialCancellation = status === 'trial_cancellation_pending';
        const periodLabel = isTrialCancellation
            ? 'last day of your free trial'
            : 'last day of your paid period';
        const daysPhrase = `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;

        return {
            show: true,
            variant: 'cancelled',
            isTrialCancellation,
            daysUntilAccessEnd: daysLeft,
            accessEndsAt: new Date(owner.planEndDate).toISOString(),
            title: 'Subscription cancelled',
            message:
                daysLeft === 0
                    ? isTrialCancellation
                        ? `Auto-debit is off. Today is the last day of your free trial (${endLabel}). You will be signed out when this period ends.`
                        : `Auto-debit is off. Today is the last day you can use Pocket POS (${endLabel}). You will be signed out when this period ends.`
                    : isTrialCancellation
                      ? `Auto-debit is off. No monthly charge will be made. You can use Pocket POS until ${endLabel} (${periodLabel}, ${daysPhrase}).`
                      : `Auto-debit is off. You can use Pocket POS until ${endLabel} (${periodLabel}, ${daysPhrase}).`,
        };
    }

    if (owner.lastPaymentFailureReason === 'mandate_cancelled' && !owner.paymentFailedAt) {
        const copy = getFailureOwnerMessage('mandate_cancelled', {
            shopName: owner.shopName || 'your shop',
            planEndDate: owner.planEndDate,
        });
        return {
            show: true,
            variant: 'mandate_cancelled',
            failureCode: 'mandate_cancelled',
            message: copy.message,
            title: copy.title,
        };
    }

    if (owner.planEndDate && MANDATE_OK_STATUSES.has(status)) {
        const dueDate = new Date(owner.planEndDate);
        const daysUntil = daysBetweenCalendar(now, dueDate);
        if (daysUntil >= 0 && daysUntil <= 5) {
            return {
                show: true,
                variant: 'upcoming_payment',
                daysUntilPayment: daysUntil,
                paymentDueDate: dueDate.toISOString(),
                message:
                    daysUntil === 0
                        ? 'Your subscription payment is due today. Please ensure sufficient balance for auto-debit.'
                        : `Your subscription payment is due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}. Please keep funds ready for auto-debit.`,
            };
        }
    }

    return null;
};

module.exports = {
    runSubscriptionBillingAutomation,
    buildBillingAlertForOwner,
};
