// Application Constants
export const USER_ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  CASHIER: 'cashier',
  SUPERADMIN: 'superadmin',
};

export const SHOP_PLANS = {
  BASIC: 'Basic',
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
};

export const DATE_FILTERS = [
  { id: '24h', label: '24 Hrs', days: 1 },
  { id: '7d', label: '7 Days', days: 7 },
  { id: '30d', label: '30 Days', days: 30 },
  { id: 'all', label: 'All Time', days: Infinity },
  { id: 'custom', label: 'Custom Range', days: 0 },
];

export const VIEW_TYPES = ['Day', 'Week', 'Month'];

