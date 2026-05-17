/** Pages every staff member can use — not configurable in Grant Permissions. */
const STAFF_COMMON_PAGE_KEYS = ['chat', 'notifications', 'profile', 'settings'];

/** Owner-controlled page access for Manager / Cashier roles. */
const GRANTABLE_ROLE_PAGE_PERMISSION_KEYS = [
    'dashboard',
    'billing',
    'khata',
    'salesActivity',
    'inventory',
    'scm',
    'staffPermissions',
    'offers',
];

const ROLE_PAGE_PERMISSION_KEYS = [
    ...GRANTABLE_ROLE_PAGE_PERMISSION_KEYS,
    ...STAFF_COMMON_PAGE_KEYS,
];

const DEFAULT_GRANTABLE_ROLE_PAGE_PERMISSIONS = {
    manager: {
        dashboard: true,
        billing: true,
        khata: true,
        salesActivity: true,
        inventory: true,
        scm: true,
        staffPermissions: true,
        offers: true,
    },
    cashier: {
        dashboard: true,
        billing: true,
        khata: true,
        salesActivity: true,
        inventory: false,
        scm: false,
        staffPermissions: false,
        offers: false,
    },
};

/** @deprecated Use DEFAULT_GRANTABLE_ROLE_PAGE_PERMISSIONS — kept for callers that expect full defaults. */
const DEFAULT_ROLE_PAGE_PERMISSIONS = {
    manager: {
        ...DEFAULT_GRANTABLE_ROLE_PAGE_PERMISSIONS.manager,
        chat: true,
        notifications: true,
        profile: true,
        settings: true,
    },
    cashier: {
        ...DEFAULT_GRANTABLE_ROLE_PAGE_PERMISSIONS.cashier,
        chat: true,
        notifications: true,
        profile: true,
        settings: true,
    },
};

const applyStaffCommonPages = (pages) => {
    const out = { ...pages };
    for (const key of STAFF_COMMON_PAGE_KEYS) {
        out[key] = true;
    }
    return out;
};

/** Read only grantable keys from stored role config (ignore legacy chat/settings fields). */
const getPersistedGrantableForRole = (storeRolePermissions = {}, role = '') => {
    const normalizedRole = String(role || '').toLowerCase();
    const src = storeRolePermissions?.[normalizedRole];
    if (!src || typeof src !== 'object') return {};
    const out = {};
    for (const key of GRANTABLE_ROLE_PAGE_PERMISSION_KEYS) {
        if (typeof src[key] === 'boolean') out[key] = src[key];
    }
    return out;
};

/** Owner saved a full grant matrix for this role (every grantable key is explicit). */
const hasFullGrantableConfig = (persistedGrantable = {}) =>
    GRANTABLE_ROLE_PAGE_PERMISSION_KEYS.every((key) => typeof persistedGrantable[key] === 'boolean');

/** Normalize owner-saved grantable permissions — every grantable key is an explicit boolean. */
const normalizeRolePermissionPayload = (payload = {}) => {
    const managerPayload = getPersistedGrantableForRole(payload, 'manager');
    const cashierPayload = getPersistedGrantableForRole(payload, 'cashier');
    const normalized = { manager: {}, cashier: {} };
    for (const key of GRANTABLE_ROLE_PAGE_PERMISSION_KEYS) {
        normalized.manager[key] = typeof managerPayload[key] === 'boolean'
            ? managerPayload[key]
            : DEFAULT_GRANTABLE_ROLE_PAGE_PERMISSIONS.manager[key];
        normalized.cashier[key] = typeof cashierPayload[key] === 'boolean'
            ? cashierPayload[key]
            : DEFAULT_GRANTABLE_ROLE_PAGE_PERMISSIONS.cashier[key];
    }
    return normalized;
};

/**
 * Effective page access for staff from store settings.
 * Each grantable key uses the stored boolean when present; otherwise role defaults.
 * Common pages (messages, notifications, profile, settings) are always allowed.
 */
const resolveRolePagePermissions = (storeRolePermissions = {}, role = '') => {
    const normalizedRole = String(role || '').toLowerCase();
    if (normalizedRole !== 'manager' && normalizedRole !== 'cashier') {
        return ROLE_PAGE_PERMISSION_KEYS.reduce((acc, key) => {
            acc[key] = true;
            return acc;
        }, {});
    }

    const persisted = getPersistedGrantableForRole(storeRolePermissions, normalizedRole);
    const defaults = DEFAULT_GRANTABLE_ROLE_PAGE_PERMISSIONS[normalizedRole];

    const out = {};
    for (const key of GRANTABLE_ROLE_PAGE_PERMISSION_KEYS) {
        out[key] = typeof persisted[key] === 'boolean'
            ? persisted[key] === true
            : defaults[key];
    }
    return applyStaffCommonPages(out);
};

/** Grantable pages denied; common staff pages still allowed. */
const denyAllStaffPages = () => {
    const out = GRANTABLE_ROLE_PAGE_PERMISSION_KEYS.reduce((acc, key) => {
        acc[key] = false;
        return acc;
    }, {});
    return applyStaffCommonPages(out);
};

const staffCanAccessGrantablePage = (storeRolePermissions, role, pageKey) => {
    const pages = resolveRolePagePermissions(storeRolePermissions, role);
    return pages[pageKey] === true;
};

module.exports = {
    STAFF_COMMON_PAGE_KEYS,
    GRANTABLE_ROLE_PAGE_PERMISSION_KEYS,
    ROLE_PAGE_PERMISSION_KEYS,
    DEFAULT_GRANTABLE_ROLE_PAGE_PERMISSIONS,
    DEFAULT_ROLE_PAGE_PERMISSIONS,
    getPersistedGrantableForRole,
    hasFullGrantableConfig,
    normalizeRolePermissionPayload,
    resolveRolePagePermissions,
    denyAllStaffPages,
    staffCanAccessGrantablePage,
    applyStaffCommonPages,
};
