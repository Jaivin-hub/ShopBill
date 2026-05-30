const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendPushNotification } = require('./firebaseAdmin');
const { collectPushTokens } = require('../utils/pushTokens');
const { formatDateInEnIn } = require('../utils/billingDates');
const { FAILURE_CODES, getFailureOwnerMessage } = require('../utils/razorpayPaymentFailure');

const emitToUser = (io, userId, payload) => {
    if (io && userId) io.to(`user_${String(userId)}`).emit('new_notification', payload);
};

const pushToUsers = async (users, title, body, data = {}) => {
    const tokens = collectPushTokens(users);
    if (tokens.length === 0) return;
    await sendPushNotification(tokens, {
        title,
        body: body.slice(0, 180),
        soundCategory: 'alert',
        data: { type: 'notification', link: '/notifications', ...data },
    }).catch((err) => console.error('[Push] subscription billing:', err?.message || err));
};

const formatShopLabel = (owner) => {
    const shopName = owner?.shopName || 'Unknown shop';
    const email = owner?.email || '';
    return email ? `"${shopName}" (${email})` : `"${shopName}"`;
};

/**
 * Persist + realtime alert for all superadmins (subscription lifecycle).
 */
const notifySuperadminsShopSubscriptionEvent = async (
    io,
    owner,
    { type, title, message, category = 'Info', metadata = {}, dedupeKey = null }
) => {
    if (!owner?._id || !type || !message) return;

    try {
        const superadmins = await User.find({ role: 'superadmin' })
            .select('_id deviceTokens pushNotificationsEnabled')
            .lean();
        if (!superadmins.length) return;

        if (dedupeKey) {
            const existing = await Notification.findOne({
                forSuperAdmin: true,
                type,
                'metadata.dedupeKey': dedupeKey,
            })
                .select('_id')
                .lean();
            if (existing) return;
        }

        const shopName = owner.shopName || 'Unknown shop';
        const email = owner.email || '';
        const doc = await Notification.create({
            storeId: owner._id,
            ownerId: owner._id,
            forSuperAdmin: true,
            type,
            category,
            title,
            message,
            metadata: {
                shopName,
                email,
                ownerId: owner._id,
                plan: owner.plan || null,
                ...metadata,
                ...(dedupeKey ? { dedupeKey } : {}),
            },
            readBy: [],
        });

        const payload = { ...doc.toObject(), isRead: false, storeName: shopName };
        superadmins.forEach((sa) => emitToUser(io, sa._id, payload));
        await pushToUsers(superadmins, title, message, { notificationType: type });
    } catch (err) {
        console.error('[Notify] superadmin subscription event:', err?.message || err);
    }
};

/**
 * Upcoming Razorpay charge reminder (5 / 3 / 1 days before planEndDate).
 */
const notifyOwnerUpcomingPayment = async (io, owner, daysUntilDue, dueDate) => {
    const ownerId = owner._id;
    const storeId = owner._id;
    const dueLabel = formatDateInEnIn(dueDate);
    const shopName = owner.shopName || 'your shop';
    const title =
        daysUntilDue === 1
            ? 'Subscription due tomorrow'
            : `Subscription due in ${daysUntilDue} days`;
    const message = `Hi ${shopName}, your Pocket POS subscription payment is scheduled on ${dueLabel}. Please keep sufficient balance in your account for auto-debit.`;

    const reminderKey = `upcoming_${formatDateInEnIn(dueDate)}_${daysUntilDue}`;
    const existing = await Notification.findOne({
        ownerId,
        type: 'subscription_payment_reminder',
        recipientUserId: ownerId,
        'metadata.reminderKey': reminderKey,
    }).select('_id').lean();
    if (existing) return;

    const doc = await Notification.create({
        storeId,
        ownerId,
        actorId: null,
        recipientUserId: ownerId,
        type: 'subscription_payment_reminder',
        category: daysUntilDue <= 1 ? 'Urgent' : 'Info',
        title,
        message,
        metadata: { reminderKey, daysUntilDue, dueDate: dueDate.toISOString(), shopName },
        readBy: [],
    });

    const payload = { ...doc.toObject(), isRead: false };
    emitToUser(io, ownerId, payload);
    await pushToUsers([owner], title, message, { notificationType: 'subscription_payment_reminder' });
};

/**
 * Auto-debit failed — access continues until planEndDate (inclusive last day).
 */
const notifyOwnerPaymentFailedGrace = async (
    io,
    owner,
    daysUntilAccessEnd,
    planEndDate,
    failureCode = null
) => {
    const ownerId = owner._id;
    const storeId = owner._id;
    const shopName = owner.shopName || 'your shop';
    const copy = getFailureOwnerMessage(failureCode || FAILURE_CODES.PAYMENT_FAILED, {
        shopName,
        daysUntilDeactivation: daysUntilAccessEnd,
        planEndDate,
    });
    const title = copy.title;
    const message = copy.message;

    const reminderKey = `failed_access_${failureCode || 'generic'}_${formatDateInEnIn(planEndDate)}`;
    const existing = await Notification.findOne({
        ownerId,
        type: 'subscription_payment_failed',
        recipientUserId: ownerId,
        'metadata.reminderKey': reminderKey,
    }).select('_id').lean();
    if (existing) return;

    const doc = await Notification.create({
        storeId,
        ownerId,
        actorId: null,
        recipientUserId: ownerId,
        type: 'subscription_payment_failed',
        category: 'Urgent',
        title,
        message,
        metadata: {
            reminderKey,
            daysUntilAccessEnd: daysUntilAccessEnd,
            planEndDate: planEndDate ? new Date(planEndDate).toISOString() : null,
            shopName,
            failureCode: failureCode || FAILURE_CODES.PAYMENT_FAILED,
        },
        readBy: [],
    });

    const payload = { ...doc.toObject(), isRead: false };
    emitToUser(io, ownerId, payload);
    await pushToUsers([owner], title, message, { notificationType: 'subscription_payment_failed' });
};

/**
 * Customer cancelled mandate from bank / UPI (subscription.cancelled webhook).
 */
const notifyOwnerMandateCancelled = async (io, owner) => {
    const ownerId = owner._id;
    const storeId = owner._id;
    const copy = getFailureOwnerMessage(FAILURE_CODES.MANDATE_CANCELLED, {
        shopName: owner.shopName || 'your shop',
        planEndDate: owner.planEndDate,
    });

    const reminderKey = `mandate_cancelled_${ownerId}`;
    const existing = await Notification.findOne({
        ownerId,
        type: 'subscription_mandate_cancelled',
        recipientUserId: ownerId,
        'metadata.reminderKey': reminderKey,
    })
        .select('_id')
        .lean();
    if (existing) return;

    const doc = await Notification.create({
        storeId,
        ownerId,
        actorId: null,
        recipientUserId: ownerId,
        type: 'subscription_mandate_cancelled',
        category: 'Urgent',
        title: copy.title,
        message: copy.message,
        metadata: {
            reminderKey,
            failureCode: FAILURE_CODES.MANDATE_CANCELLED,
            planEndDate: owner.planEndDate ? new Date(owner.planEndDate).toISOString() : null,
        },
        readBy: [],
    });

    const payload = { ...doc.toObject(), isRead: false };
    emitToUser(io, ownerId, payload);
    await pushToUsers([owner], copy.title, copy.message, {
        notificationType: 'subscription_mandate_cancelled',
    });
};

const notifySuperadminsGraceExpired = async (io, owner) => {
    const superadmins = await User.find({ role: 'superadmin' })
        .select('_id deviceTokens pushNotificationsEnabled')
        .lean();
    if (!superadmins.length) return;

    const shopName = owner.shopName || 'Unknown shop';
    const email = owner.email || '';
    const title = 'Shop access ended';
    const message = `"${shopName}" (${email}) subscription access period ended (plan end date passed). The account was deactivated. You can reactivate from Manage Shops.`;

    const existing = await Notification.findOne({
        forSuperAdmin: true,
        type: 'shop_subscription_lapsed',
        'metadata.ownerId': owner._id,
    }).select('_id').lean();
    if (existing) return;

    const doc = await Notification.create({
        storeId: owner._id,
        ownerId: owner._id,
        forSuperAdmin: true,
        type: 'shop_subscription_lapsed',
        category: 'Urgent',
        title,
        message,
        metadata: { shopName, email, ownerId: owner._id },
        readBy: [],
    });

    const payload = { ...doc.toObject(), isRead: false, storeName: shopName };
    superadmins.forEach((sa) => emitToUser(io, sa._id, payload));
    await pushToUsers(superadmins, title, message, { notificationType: 'shop_subscription_lapsed' });
};

const notifySuperadminsSubscriptionCancelled = async (io, owner, details = {}) => {
    const shop = formatShopLabel(owner);
    const plan = String(owner.plan || details.plan || 'BASIC').toUpperCase();
    const status = String(details.subscriptionStatus || '').toLowerCase();
    const inTrial = status === 'trial_cancellation_pending';
    const title = inTrial ? 'Trial subscription cancelled' : 'Shop cancelled subscription';
    const accessNote = details.accessEndLabel ? ` Access until ${details.accessEndLabel}.` : '';
    const message = inTrial
        ? `${shop} cancelled their free trial on ${plan}.${accessNote}`
        : `${shop} cancelled their ${plan} subscription.${accessNote}`;

    await notifySuperadminsShopSubscriptionEvent(io, owner, {
        type: 'shop_subscription_cancelled',
        title,
        message,
        category: 'Info',
        metadata: {
            subscriptionStatus: details.subscriptionStatus,
            cancellationAction: details.cancellationAction,
            plan,
        },
        dedupeKey: details.dedupeKey || `cancel_${owner._id}_${details.subscriptionId || 'local'}`,
    });
};

const notifySuperadminsBillingActivated = async (io, owner, details = {}) => {
    const shop = formatShopLabel(owner);
    const plan = String(owner.plan || details.plan || 'BASIC').toUpperCase();
    const amount = details.amount != null ? `₹${details.amount}` : 'plan payment';
    const nextLabel = details.planEndDate ? formatDateInEnIn(new Date(details.planEndDate)) : null;
    const message = nextLabel
        ? `${shop} billing cycle activated — ${amount} collected for ${plan}. Next billing: ${nextLabel}.`
        : `${shop} billing cycle activated — ${amount} collected for ${plan}.`;

    await notifySuperadminsShopSubscriptionEvent(io, owner, {
        type: 'shop_subscription_billing_activated',
        title: 'Subscription payment received',
        message,
        category: 'Success',
        metadata: {
            plan,
            amount: details.amount,
            paymentId: details.paymentId,
            subscriptionId: details.subscriptionId,
            planEndDate: details.planEndDate ? new Date(details.planEndDate).toISOString() : null,
        },
        dedupeKey: details.dedupeKey || (details.paymentId ? `charged_${details.paymentId}` : null),
    });
};

const notifySuperadminsMandateActivated = async (io, owner, details = {}) => {
    const shop = formatShopLabel(owner);
    const plan = String(owner.plan || details.plan || 'BASIC').toUpperCase();
    await notifySuperadminsShopSubscriptionEvent(io, owner, {
        type: 'shop_subscription_mandate_activated',
        title: 'Payment mandate activated',
        message: `${shop} completed mandate setup for ${plan}. Billing cycle will start per plan schedule.`,
        category: 'Success',
        metadata: { plan, subscriptionId: details.subscriptionId },
        dedupeKey: details.dedupeKey || `activated_${details.subscriptionId || owner._id}`,
    });
};

const notifySuperadminsPlanUpgraded = async (io, owner, details = {}) => {
    const shop = formatShopLabel(owner);
    const fromPlan = String(details.fromPlan || owner.plan || 'BASIC').toUpperCase();
    const toPlan = String(details.toPlan || 'BASIC').toUpperCase();
    await notifySuperadminsShopSubscriptionEvent(io, owner, {
        type: 'shop_subscription_upgraded',
        title: 'Shop upgraded plan',
        message: `${shop} upgraded from ${fromPlan} to ${toPlan}.`,
        category: 'Success',
        metadata: { fromPlan, toPlan, subscriptionId: details.subscriptionId },
        dedupeKey: details.dedupeKey || `upgrade_${details.subscriptionId || owner._id}`,
    });
};

const notifySuperadminsResubscribed = async (io, owner, details = {}) => {
    const shop = formatShopLabel(owner);
    const plan = String(details.plan || owner.plan || 'BASIC').toUpperCase();
    const source = details.source || 'billing';
    const sourceLabel =
        source === 'renew_checkout'
            ? 'via renewal payment link'
            : source === 'mandate_restore'
              ? 'after mandate restore'
              : source === 'renew'
                ? 'via subscription restart'
                : 'from billing page';
    await notifySuperadminsShopSubscriptionEvent(io, owner, {
        type: 'shop_subscription_resubscribed',
        title: 'Shop re-subscribed',
        message: `${shop} re-subscribed to ${plan} ${sourceLabel}.`,
        category: 'Success',
        metadata: { plan, source, subscriptionId: details.subscriptionId },
        dedupeKey: details.dedupeKey || `resubscribe_${details.subscriptionId || owner._id}`,
    });
};

const notifySuperadminsMandateRevoked = async (io, owner, details = {}) => {
    const shop = formatShopLabel(owner);
    await notifySuperadminsShopSubscriptionEvent(io, owner, {
        type: 'shop_subscription_mandate_revoked',
        title: 'Payment mandate revoked',
        message: `${shop} payment mandate was cancelled from bank/UPI (not via app).`,
        category: 'Urgent',
        metadata: { subscriptionId: details.subscriptionId },
        dedupeKey: details.dedupeKey || `mandate_revoked_${details.subscriptionId || owner._id}`,
    });
};

const notifySuperadminsSubscriptionHalted = async (io, owner, details = {}) => {
    const shop = formatShopLabel(owner);
    await notifySuperadminsShopSubscriptionEvent(io, owner, {
        type: 'shop_subscription_halted',
        title: 'Subscription halted',
        message: `${shop} subscription was halted after failed payment retries.`,
        category: 'Urgent',
        metadata: {
            subscriptionId: details.subscriptionId,
            failureCode: details.failureCode,
        },
        dedupeKey: details.dedupeKey || `halted_${details.subscriptionId || owner._id}`,
    });
};

module.exports = {
    notifyOwnerUpcomingPayment,
    notifyOwnerPaymentFailedGrace,
    notifyOwnerMandateCancelled,
    notifySuperadminsGraceExpired,
    notifySuperadminsShopSubscriptionEvent,
    notifySuperadminsSubscriptionCancelled,
    notifySuperadminsBillingActivated,
    notifySuperadminsMandateActivated,
    notifySuperadminsPlanUpgraded,
    notifySuperadminsResubscribed,
    notifySuperadminsMandateRevoked,
    notifySuperadminsSubscriptionHalted,
};
