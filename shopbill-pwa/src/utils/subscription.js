/** Normalize plan strings from API (may be mixed case). */
export function normalizePlan(plan) {
    return String(plan ?? '').trim().toUpperCase();
}

export function isPremiumPlan(user) {
    return normalizePlan(user?.plan) === 'PREMIUM';
}

export function isProOrPremium(user) {
    const p = normalizePlan(user?.plan);
    return p === 'PRO' || p === 'PREMIUM';
}
