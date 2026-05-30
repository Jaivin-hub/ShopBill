const User = require('../models/User');

/** Reuse unpaid mandates within this window (avoids duplicate `created` subs). */
const MAX_REUSE_AGE_MS = 48 * 60 * 60 * 1000;

const CANCEL_BEFORE_CREATE_STATUSES = new Set([
    'active',
    'authenticated',
    'pending',
    'created',
]);

const VERIFICATION_ADDON = {
    item: {
        name: 'Verification Charge',
        amount: 100,
        currency: 'INR',
    },
};

async function fetchSubscriptionSafe(razorpay, subscriptionId) {
    if (!subscriptionId) return null;
    try {
        return await razorpay.subscriptions.fetch(subscriptionId);
    } catch {
        return null;
    }
}

async function cancelSubscriptionIfNeeded(razorpay, subscriptionId) {
    if (!subscriptionId) return;
    const sub = await fetchSubscriptionSafe(razorpay, subscriptionId);
    if (!sub || !CANCEL_BEFORE_CREATE_STATUSES.has(sub.status)) return;
    try {
        await razorpay.subscriptions.cancel(subscriptionId);
    } catch (err) {
        const desc = String(err?.error?.description || err.message || '');
        if (!/already cancelled|not cancellable/i.test(desc)) {
            console.warn(`[rzp] Cancel ${subscriptionId}:`, desc);
        }
    }
}

/**
 * Ensure a Razorpay Customer exists for email (shows email on subscription in dashboard).
 * Persists razorpayCustomerId on the owner when provided.
 */
async function ensureRazorpayCustomer(razorpay, { email, name, contact, owner }) {
    const normEmail = String(email || '')
        .trim()
        .toLowerCase();
    if (!normEmail) {
        const err = new Error('Customer email is required for subscription billing.');
        err.statusCode = 400;
        throw err;
    }

    const displayName = String(name || normEmail).trim().slice(0, 255) || normEmail;
    const phone = contact ? String(contact).replace(/\D/g, '').slice(-10) : undefined;

    if (owner?.razorpayCustomerId) {
        try {
            const existing = await razorpay.customers.fetch(owner.razorpayCustomerId);
            if (String(existing.email || '').toLowerCase() === normEmail) {
                if (phone || displayName) {
                    await razorpay.customers
                        .edit(owner.razorpayCustomerId, {
                            name: displayName,
                            ...(phone ? { contact: phone } : {}),
                        })
                        .catch(() => {});
                }
                return owner.razorpayCustomerId;
            }
        } catch {
            /* fall through — lookup by email */
        }
    }

    let customerId = null;
    try {
        const listed = await razorpay.customers.all({ email: normEmail, count: 10 });
        customerId = listed?.items?.[0]?.id || null;
    } catch (listErr) {
        console.warn('[rzp] customers.all:', listErr.message);
    }

    if (!customerId) {
        const created = await razorpay.customers.create({
            email: normEmail,
            name: displayName,
            ...(phone ? { contact: phone } : {}),
        });
        customerId = created.id;
    } else if (phone || displayName) {
        await razorpay.customers
            .edit(customerId, {
                name: displayName,
                ...(phone ? { contact: phone } : {}),
            })
            .catch(() => {});
    }

    if (owner?._id && owner.razorpayCustomerId !== customerId) {
        await User.updateOne({ _id: owner._id }, { $set: { razorpayCustomerId: customerId } });
        owner.razorpayCustomerId = customerId;
    }

    return customerId;
}

async function findReusableSubscriptionForCustomer(razorpay, customerId, { planId } = {}) {
    if (!customerId) return null;
    let items = [];
    try {
        const resp = await razorpay.subscriptions.all({ customer_id: customerId, count: 25 });
        items = resp?.items || [];
    } catch (err) {
        console.warn('[rzp] subscriptions.all by customer_id:', err.message);
        return null;
    }

    const now = Date.now();
    for (const sub of items) {
        if (sub.status !== 'created') continue;
        if (planId && sub.plan_id !== planId) continue;
        const createdAt = (sub.created_at || 0) * 1000;
        if (now - createdAt > MAX_REUSE_AGE_MS) continue;
        return sub;
    }
    return null;
}

async function tryReuseOwnerPendingSubscription(razorpay, owner, planId) {
    const pendingId = owner.pendingRazorpaySubscriptionId;
    if (!pendingId) return null;
    const pending = await fetchSubscriptionSafe(razorpay, pendingId);
    if (pending?.status === 'created' && (!planId || pending.plan_id === planId)) {
        return pending;
    }
    return null;
}

async function cancelOwnerOpenSubscriptions(razorpay, owner, { exceptSubscriptionId } = {}) {
    const ids = new Set();
    if (owner.transactionId && owner.transactionId !== exceptSubscriptionId) {
        ids.add(owner.transactionId);
    }
    if (
        owner.pendingRazorpaySubscriptionId &&
        owner.pendingRazorpaySubscriptionId !== exceptSubscriptionId
    ) {
        ids.add(owner.pendingRazorpaySubscriptionId);
    }
    for (const id of ids) {
        await cancelSubscriptionIfNeeded(razorpay, id);
    }
}

function buildSubscriptionNotes(owner, extraNotes = {}) {
    const email = owner?.email ? String(owner.email).toLowerCase() : '';
    return {
        ...extraNotes,
        ...(email ? { owner_email: email } : {}),
        ...(owner?._id ? { userId: owner._id.toString() } : {}),
    };
}

/**
 * Create or reuse a Razorpay subscription for an existing owner.
 * Links customer_id (email visible in Razorpay dashboard) and avoids duplicate `created` subs.
 */
async function createOwnerSubscription(razorpay, {
    owner,
    planId,
    startAtTimestamp,
    addons = [VERIFICATION_ADDON],
    notes = {},
    cancelBeforeCreate = true,
}) {
    const ownerDoc =
        owner?.email && owner?._id
            ? owner
            : await User.findById(owner._id || owner).select(
                  '_id email shopName phone plan razorpayCustomerId pendingRazorpaySubscriptionId transactionId'
              );
    if (!ownerDoc) {
        const err = new Error('Owner account not found.');
        err.statusCode = 404;
        throw err;
    }

    const customerId = await ensureRazorpayCustomer(razorpay, {
        email: ownerDoc.email,
        name: ownerDoc.shopName || ownerDoc.email,
        contact: ownerDoc.phone,
        owner: ownerDoc,
    });

    let reused = await tryReuseOwnerPendingSubscription(razorpay, ownerDoc, planId);
    if (!reused) {
        reused = await findReusableSubscriptionForCustomer(razorpay, customerId, { planId });
    }
    if (reused) {
        if (ownerDoc.pendingRazorpaySubscriptionId !== reused.id) {
            await User.updateOne(
                { _id: ownerDoc._id },
                { $set: { pendingRazorpaySubscriptionId: reused.id } }
            );
        }
        return reused;
    }

    if (cancelBeforeCreate) {
        await cancelOwnerOpenSubscriptions(razorpay, ownerDoc);
    }

    const subscription = await razorpay.subscriptions.create({
        plan_id: planId,
        customer_id: customerId,
        customer_notify: 1,
        total_count: 1200,
        start_at: startAtTimestamp,
        addons,
        notes: buildSubscriptionNotes(ownerDoc, notes),
    });

    await User.updateOne(
        { _id: ownerDoc._id },
        { $set: { pendingRazorpaySubscriptionId: subscription.id } }
    );

    return subscription;
}

/**
 * Signup checkout — no User yet; still attach Razorpay customer email and reuse open mandate.
 */
async function createSignupSubscription(razorpay, {
    email,
    name,
    phone,
    planId,
    planKey,
    description,
    startAtTimestamp,
    addons = [VERIFICATION_ADDON],
}) {
    const normEmail = String(email || '')
        .trim()
        .toLowerCase();
    if (!normEmail) {
        const err = new Error('Email is required before starting payment.');
        err.statusCode = 400;
        throw err;
    }

    const existingOwner = await User.findOne({ role: 'owner', email: normEmail }).select(
        '_id email shopName phone plan razorpayCustomerId pendingRazorpaySubscriptionId transactionId'
    );
    if (existingOwner) {
        return createOwnerSubscription(razorpay, {
            owner: existingOwner,
            planId,
            startAtTimestamp,
            addons,
            notes: {
                plan_name: planKey,
                description,
                signup_retry: 'true',
            },
        });
    }

    const customerId = await ensureRazorpayCustomer(razorpay, {
        email: normEmail,
        name: name || normEmail,
        contact: phone,
    });

    const reused = await findReusableSubscriptionForCustomer(razorpay, customerId, { planId });
    if (reused) return reused;

    return razorpay.subscriptions.create({
        plan_id: planId,
        customer_id: customerId,
        customer_notify: 1,
        total_count: 1200,
        start_at: startAtTimestamp,
        addons,
        notes: {
            plan_name: planKey,
            description,
            owner_email: normEmail,
            signup: 'true',
        },
    });
}

async function tryReuseMandateRequestSubscription(razorpay, request) {
    if (!request?.razorpaySubscriptionId) return null;
    const sub = await fetchSubscriptionSafe(razorpay, request.razorpaySubscriptionId);
    if (sub?.status === 'created') return sub;
    return null;
}

function ownerSubscriptionUpdateAfterVerify(extraSet = {}) {
    return {
        $set: extraSet,
        $unset: { pendingRazorpaySubscriptionId: '' },
    };
}

module.exports = {
    MAX_REUSE_AGE_MS,
    VERIFICATION_ADDON,
    fetchSubscriptionSafe,
    ensureRazorpayCustomer,
    findReusableSubscriptionForCustomer,
    tryReuseOwnerPendingSubscription,
    cancelOwnerOpenSubscriptions,
    createOwnerSubscription,
    createSignupSubscription,
    tryReuseMandateRequestSubscription,
    ownerSubscriptionUpdateAfterVerify,
    buildSubscriptionNotes,
};
