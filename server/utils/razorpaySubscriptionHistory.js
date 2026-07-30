/**
 * Build subscription transaction history for superadmin by merging local Payment
 * records with Razorpay invoices and payment attempts.
 */

const PLAN_PRICES = { BASIC: 499, PRO: 999, PREMIUM: 2999 };

function planAmount(plan) {
    return PLAN_PRICES[String(plan || 'BASIC').toUpperCase()] || 499;
}

function toRupees(paise, fallback) {
    if (paise == null || Number.isNaN(Number(paise))) return fallback;
    return Number(paise) / 100 || fallback;
}

function mapRazorpayPaymentStatus(rzpStatus) {
    const s = String(rzpStatus || '').toLowerCase();
    if (s === 'captured') return 'paid';
    if (s === 'failed') return 'failed';
    return 'pending';
}

function mapInvoiceStatus(invoiceStatus) {
    const s = String(invoiceStatus || '').toLowerCase();
    if (s === 'paid') return 'paid';
    if (s === 'expired' || s === 'cancelled') return 'failed';
    return 'pending';
}

/**
 * @param {import('razorpay')} rzp
 * @param {string} subscriptionId
 * @param {string} [plan]
 * @param {{ includePaymentScan?: boolean, maxInvoicePaymentFetches?: number }} [options]
 */
async function fetchRazorpaySubscriptionTransactions(
    rzp,
    subscriptionId,
    plan = 'BASIC',
    options = {}
) {
    if (!rzp || !subscriptionId) return [];

    const { includePaymentScan = false, maxInvoicePaymentFetches = 0 } = options;
    const fallbackAmount = planAmount(plan);
    const rows = [];
    const seenPaymentIds = new Set();

    const pushPaymentRow = (pay, eventType = null) => {
        if (!pay?.id || seenPaymentIds.has(pay.id)) return;
        seenPaymentIds.add(pay.id);
        const status = mapRazorpayPaymentStatus(pay.status);
        rows.push({
            id: `rzp_pay_${pay.id}`,
            date: pay.created_at ? new Date(pay.created_at * 1000) : new Date(),
            amount: toRupees(pay.amount, fallbackAmount),
            status,
            transactionId: pay.id,
            method: 'Razorpay Auto-Debit',
            eventType: eventType || (status === 'failed' ? 'payment.failed' : 'subscription.charged'),
            failureReason: status === 'failed' ? pay.error_reason || 'payment_failed' : null,
            failureDetail:
                status === 'failed'
                    ? pay.error_description || pay.error_reason || null
                    : null,
            source: 'razorpay_payment',
        });
    };

    let invoicePaymentFetches = 0;

    try {
        const invResp = await rzp.invoices.all({ subscription_id: subscriptionId, count: 100 });
        for (const inv of invResp.items || []) {
            const amount = toRupees(
                inv.amount ?? inv.gross_amount ?? inv.taxable_amount,
                fallbackAmount
            );
            const issuedAt = inv.issued_at ? new Date(inv.issued_at * 1000) : null;
            const paidAt = inv.paid_at ? new Date(inv.paid_at * 1000) : null;
            const status = mapInvoiceStatus(inv.status);

            rows.push({
                id: `rzp_inv_${inv.id}`,
                date: paidAt || issuedAt || new Date(),
                amount,
                status,
                transactionId: inv.payment_id || inv.id,
                method: 'Razorpay Auto-Debit',
                eventType: 'subscription.invoice',
                failureReason: status === 'failed' ? 'invoice_failed' : null,
                failureDetail:
                    status === 'pending' && inv.status === 'issued'
                        ? 'Invoice issued — charge pending or retry scheduled'
                        : status === 'failed'
                          ? `Invoice ${inv.status}`
                          : null,
                source: 'razorpay_invoice',
                invoiceStatus: inv.status,
            });

            if (
                inv.payment_id &&
                maxInvoicePaymentFetches > 0 &&
                invoicePaymentFetches < maxInvoicePaymentFetches
            ) {
                invoicePaymentFetches += 1;
                try {
                    const pay = await rzp.payments.fetch(inv.payment_id);
                    pushPaymentRow(pay);
                } catch (_) {
                    /* ignore single payment fetch errors */
                }
            }
        }
    } catch (err) {
        console.warn('[razorpaySubscriptionHistory] invoices:', err.message || err);
    }

    // Optional slow path — off by default for superadmin (local DB + invoices are enough).
    if (includePaymentScan) {
        try {
            const fromTs = Math.floor(Date.now() / 1000) - 365 * 86400;
            let skip = 0;
            for (let page = 0; page < 2; page++) {
                const payResp = await rzp.payments.all({ count: 100, skip, from: fromTs });
                const items = payResp.items || [];
                for (const pay of items) {
                    if (pay.subscription_id === subscriptionId) {
                        pushPaymentRow(pay);
                    }
                }
                if (items.length < 100) break;
                skip += 100;
            }
        } catch (err) {
            console.warn('[razorpaySubscriptionHistory] payments scan:', err.message || err);
        }
    }

    return rows;
}

function historyRowKey(row) {
    const tx = String(row.transactionId || row.id || '').trim();
    if (tx) return tx;
    const d = row.date ? new Date(row.date).toISOString().slice(0, 10) : '';
    return `${d}:${row.amount}:${row.status}:${row.eventType || ''}`;
}

/** Guess plan tier from charge amount (rupees). */
function inferPlanFromAmount(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 100) return null;
    if (n >= PLAN_PRICES.PREMIUM - 100) return 'PREMIUM';
    if (n >= PLAN_PRICES.PRO - 100) return 'PRO';
    if (n >= PLAN_PRICES.BASIC - 50) return 'BASIC';
    return null;
}

function assignPaymentToPlanSegment(payment, segments) {
    const payDate = payment.date ? new Date(payment.date) : null;
    if (payDate && !Number.isNaN(payDate.getTime()) && segments.length) {
        for (const seg of segments) {
            const start = seg.startedAt ? new Date(seg.startedAt) : null;
            const end = seg.endedAt ? new Date(seg.endedAt) : null;
            if (start && !Number.isNaN(start.getTime()) && payDate >= start) {
                if (!end || Number.isNaN(end.getTime()) || payDate <= end) {
                    return seg.plan;
                }
            }
        }
    }
    return inferPlanFromAmount(payment.amount);
}

/**
 * Group merged payment rows by plan period for superadmin transaction history.
 * @returns {{ plan: string, isCurrent: boolean, label: string, payments: object[] }[]}
 */
function groupPaymentHistoryByPlanPeriod(payments = [], planHistoryDisplay = null) {
    const rows = Array.isArray(payments) ? payments : [];
    if (!rows.length) return [];

    const segments = Array.isArray(planHistoryDisplay?.segments)
        ? [...planHistoryDisplay.segments].sort(
              (a, b) => new Date(a.startedAt) - new Date(b.startedAt)
          )
        : [];
    const currentPlan = String(planHistoryDisplay?.currentPlan || 'BASIC').toUpperCase();

    if (segments.length <= 1) {
        const inferredFromAmount = new Set(
            rows.map((r) => inferPlanFromAmount(r.amount)).filter(Boolean)
        );
        if (inferredFromAmount.size > 1) {
            const planOrder = ['BASIC', 'PRO', 'PREMIUM'];
            const orderedPlans = planOrder.filter((p) => inferredFromAmount.has(p));
            const buckets = orderedPlans.map((p) => ({
                plan: p,
                isCurrent: p === currentPlan,
                label: p === currentPlan ? `${p} · current` : `${p} plan`,
                payments: [],
            }));
            const fallback = buckets.find((b) => b.isCurrent) || buckets[buckets.length - 1];
            for (const payment of rows) {
                const plan = inferPlanFromAmount(payment.amount) || fallback.plan;
                const bucket = buckets.find((b) => b.plan === plan) || fallback;
                bucket.payments.push({ ...payment, planPeriod: plan });
            }
            return buckets
                .filter((b) => b.payments.length > 0)
                .reverse();
        }

        const onlyPlan = segments[0]?.plan || currentPlan;
        return [
            {
                plan: onlyPlan,
                isCurrent: true,
                label: `${onlyPlan} plan`,
                payments: rows.map((p) => ({
                    ...p,
                    planPeriod: onlyPlan,
                })),
            },
        ];
    }

    const bucketMap = new Map();
    for (const seg of segments) {
        bucketMap.set(seg.plan, {
            plan: seg.plan,
            isCurrent: Boolean(seg.isCurrent),
            label: seg.isCurrent ? `${seg.plan} · current` : `${seg.plan} plan`,
            payments: [],
        });
    }

    const fallbackPlan = segments.find((s) => s.isCurrent)?.plan || currentPlan;
    const otherBucket = { plan: 'OTHER', isCurrent: false, label: 'Other', payments: [] };

    for (const payment of rows) {
        const plan =
            assignPaymentToPlanSegment(payment, segments) ||
            inferPlanFromAmount(payment.amount) ||
            fallbackPlan;
        const bucket = bucketMap.get(plan) || otherBucket;
        bucket.payments.push({ ...payment, planPeriod: plan });
    }

    const ordered = segments
        .slice()
        .reverse()
        .map((seg) => bucketMap.get(seg.plan))
        .filter((g) => g && g.payments.length > 0);

    if (otherBucket.payments.length > 0) {
        ordered.push(otherBucket);
    }

    return ordered.length
        ? ordered
        : [
              {
                  plan: currentPlan,
                  isCurrent: true,
                  label: `${currentPlan} plan`,
                  payments: rows.map((p) => ({ ...p, planPeriod: currentPlan })),
              },
          ];
}

/**
 * Merge local DB rows with Razorpay rows; prefer local failure metadata when duplicate.
 */
function mergePaymentHistory(localRows = [], razorpayRows = []) {
    const map = new Map();

    for (const row of razorpayRows) {
        map.set(historyRowKey(row), row);
    }

    for (const row of localRows) {
        const key = historyRowKey(row);
        const existing = map.get(key);
        if (!existing) {
            map.set(key, row);
            continue;
        }
        map.set(key, {
            ...existing,
            ...row,
            failureReason: row.failureReason || existing.failureReason,
            failureDetail: row.failureDetail || existing.failureDetail,
            eventType: row.eventType || existing.eventType,
            source: row.source || existing.source,
        });
    }

    return Array.from(map.values()).sort((a, b) => {
        const ta = a.date ? new Date(a.date).getTime() : 0;
        const tb = b.date ? new Date(b.date).getTime() : 0;
        return tb - ta;
    });
}

module.exports = {
    fetchRazorpaySubscriptionTransactions,
    mergePaymentHistory,
    groupPaymentHistoryByPlanPeriod,
    inferPlanFromAmount,
    planAmount,
};
