const User = require('../models/User');

const VALID_PLANS = new Set(['BASIC', 'PRO', 'PREMIUM']);

function normalizePlan(plan) {
    const key = String(plan || 'BASIC').trim().toUpperCase();
    return VALID_PLANS.has(key) ? key : 'BASIC';
}

function formatPlanDate(date) {
    if (!date) return null;
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    });
}

/**
 * Build superadmin-friendly plan timeline (current plan + prior tiers).
 */
function buildPlanHistoryDisplay(planHistory, currentPlan, createdAt) {
    const current = normalizePlan(currentPlan);
    let segments = Array.isArray(planHistory) ? planHistory.filter((s) => s && s.plan) : [];

    if (segments.length === 0 && current) {
        segments = [
            {
                plan: current,
                startedAt: createdAt || new Date(),
                endedAt: null,
                source: 'legacy',
            },
        ];
    }

    segments = segments
        .map((s) => ({
            plan: normalizePlan(s.plan),
            startedAt: s.startedAt,
            endedAt: s.endedAt || null,
            source: s.source || null,
        }))
        .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));

    const closed = segments.filter((s) => s.endedAt);
    const previous = closed.length ? closed[closed.length - 1] : null;
    const open = segments.find((s) => !s.endedAt) || null;

    const planChain = segments
        .map((s) => s.plan)
        .filter((plan, i, arr) => i === 0 || plan !== arr[i - 1]);
    const timelineShort = planChain.length > 1 ? planChain.join(' → ') : null;

    let summaryLine = null;
    if (timelineShort) {
        summaryLine = timelineShort;
    } else if (previous && previous.plan !== current) {
        summaryLine = `${previous.plan} → ${current}`;
    } else if (segments.length > 1) {
        summaryLine = segments
            .map((s) => {
                if (!s.endedAt) return `${s.plan} (current)`;
                return `${s.plan} until ${formatPlanDate(s.endedAt)}`;
            })
            .join(' → ');
    }

    return {
        currentPlan: current,
        previousPlan: previous && previous.plan !== current ? previous.plan : null,
        previousPlanUntil: previous?.endedAt || null,
        currentSince: open?.startedAt || null,
        timelineShort,
        summaryLine,
        segments: segments.map((s) => ({
            plan: s.plan,
            startedAt: s.startedAt,
            endedAt: s.endedAt,
            isCurrent: !s.endedAt,
            source: s.source,
            label: !s.endedAt
                ? `${s.plan} · current since ${formatPlanDate(s.startedAt)}`
                : `${s.plan} · ${formatPlanDate(s.startedAt)} – ${formatPlanDate(s.endedAt)}`,
        })),
    };
}

/**
 * Close the open plan segment and start a new one when the owner changes tier.
 */
async function recordPlanChange(ownerId, newPlan, { source = 'system', at = new Date() } = {}) {
    const normalized = normalizePlan(newPlan);
    const user = await User.findById(ownerId).select('plan planHistory createdAt');
    if (!user) return null;

    const history = Array.isArray(user.planHistory) ? [...user.planHistory] : [];
    const openIdx = history.findIndex((e) => e && !e.endedAt);

    if (openIdx >= 0 && normalizePlan(history[openIdx].plan) === normalized) {
        return buildPlanHistoryDisplay(history, normalized, user.createdAt);
    }

    if (openIdx >= 0) {
        history[openIdx] = {
            ...history[openIdx].toObject?.() || history[openIdx],
            endedAt: at,
        };
    } else if (user.plan && normalizePlan(user.plan) !== normalized) {
        history.push({
            plan: normalizePlan(user.plan),
            startedAt: user.createdAt || at,
            endedAt: at,
            source: 'inferred',
        });
    }

    history.push({
        plan: normalized,
        startedAt: at,
        endedAt: null,
        source,
    });

    await User.updateOne({ _id: ownerId }, { $set: { plan: normalized, planHistory: history } });

    return buildPlanHistoryDisplay(history, normalized, user.createdAt);
}

module.exports = {
    normalizePlan,
    buildPlanHistoryDisplay,
    recordPlanChange,
};
