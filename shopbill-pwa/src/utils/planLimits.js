/** Must match server/utils/planLimits.js — Premium multi-outlet cap */
export const PREMIUM_MAX_OUTLETS = 5;

export function canCreateMoreOutlets(activeCount, maxOutlets = PREMIUM_MAX_OUTLETS) {
    return Number(activeCount) < Number(maxOutlets);
}
