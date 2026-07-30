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

export function isBasicPlan(user) {
    return !isProOrPremium(user);
}

/** Pages/features available only on Pro and Premium (not Basic). */
export const PRO_OR_PREMIUM_ONLY_PAGE_IDS = ['scm', 'offers'];

export function isPageAllowedForPlan(user, pageId) {
    if (PRO_OR_PREMIUM_ONLY_PAGE_IDS.includes(pageId)) {
        return isProOrPremium(user);
    }
    return true;
}

/** Team salary reports, work profile, and shift setup — Pro/Premium only. */
export function hasProTeamFeatures(user) {
    return isProOrPremium(user);
}

/** Ledger payment reminders (send + history tab) — Pro/Premium only. */
export function hasLedgerReminderFeatures(user) {
    return isProOrPremium(user);
}
