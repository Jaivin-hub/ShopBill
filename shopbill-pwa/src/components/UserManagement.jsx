import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Store, Plus, Trash2, Loader, MapPin, Building, Shield, Users, User, X, IndianRupee, TrendingUp, TrendingDown, Minus, ArrowUpDown, Phone, Calendar, Clock, CreditCard, CheckCircle, XCircle, AlertCircle, Mail, RotateCw, Search, Power, PowerOff, Filter, Eye } from 'lucide-react';
import { SuperAdminShopsInitialSkeleton, PaymentHistoryModalSkeleton } from './skeletons/PageSkeletons';
import ConfirmationModal from './ConfirmationModal';
import AppModalOverlay from './AppModalOverlay';
import MandateRestoreRequests from './MandateRestoreRequests';

const STAFF_ROLES = {
    OWNER: 'owner',
    MANAGER: 'manager',
    CASHIER: 'cashier',
};

const SHOP_PLANS = {
    BASIC: 'BASIC',
    PRO: 'PRO',
    PREMIUM: 'PREMIUM',
};

const CANCELLED_STATUSES = new Set([
    'cancelled',
    'expired',
    'cancellation_pending',
    'trial_cancellation_pending',
    'cancellation_no_refund',
    'cancelled_replaced',
]);

const EMPTY_BILLING_FILTERS = { paymentStatus: [], upcoming: null, access: null };

/** Superadmin shops list — trial (mandate / no full charge yet) vs paid billing cycle */
const SHOP_LIFECYCLE_TABS = [
    { id: 'all', label: 'All shops' },
    { id: 'trial', label: 'Trial period' },
    { id: 'billing', label: 'Billing cycle' },
];

const SUPERADMIN_PAGE_TABS = [
    { id: 'shops', label: 'Shops list' },
    { id: 'mandates', label: 'Payment mandates' },
];

const TRIAL_PHASE_STATUSES = new Set(['authenticated', 'created', 'trial_cancellation_pending']);

const getShopBillingPhase = (subscriptionStatus) => {
    const status = String(subscriptionStatus || '').toLowerCase().trim();
    return TRIAL_PHASE_STATUSES.has(status) ? 'trial' : 'billing';
};

const shopMatchesLifecycleTab = (shop, lifecycleTab) => {
    if (!lifecycleTab || lifecycleTab === 'all') return true;
    return shop.billingPhase === lifecycleTab;
};

const daysBetweenCalendarUtc = (fromDate, toDate) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const todayVal = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
    const expiryVal = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
    return Math.round((expiryVal - todayVal) / (1000 * 60 * 60 * 24));
};

const addCalendarDaysUtc = (startDate, days) => {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + days);
    return d;
};

/** Aligns with server classifyOwnerPaymentBucket — trial/mandate ≠ paid */
const getBillingPaymentStatus = ({ subscriptionStatus, planEndDate, paymentFailedAt }) => {
    const status = String(subscriptionStatus || '').toLowerCase().trim();
    const hasAccess = planEndDate && daysBetweenCalendarUtc(new Date(), new Date(planEndDate)) >= 0;

    if (status === 'halted') return 'failed';
    if (paymentFailedAt && hasAccess) return 'failed';
    if (paymentFailedAt && !hasAccess) return 'overdue';
    if (status === 'active' && hasAccess) return 'paid';
    if (status === 'authenticated' && hasAccess) return 'pending';
    if (status === 'created' || status === 'pending') return 'pending';
    if (CANCELLED_STATUSES.has(status)) return hasAccess ? 'paid' : 'pending';
    if (status === 'past_due') return 'overdue';
    if (!hasAccess && planEndDate) return 'overdue';
    return 'pending';
};

/** Razorpay retry / failed payment while planEndDate still allows access */
const getBillingAccessFlag = ({ planEndDate, paymentFailedAt, subscriptionStatus }) => {
    const status = String(subscriptionStatus || '').toLowerCase();
    if (status === 'halted') return 'access_ended';
    const hasAccess = planEndDate && daysBetweenCalendarUtc(new Date(), new Date(planEndDate)) >= 0;
    if (!hasAccess && planEndDate) return 'access_ended';
    if (paymentFailedAt && hasAccess) return 'payment_retry';
    return null;
};

const shopMatchesBillingFilters = (shop, filters) => {
    const hasPayment = filters.paymentStatus.length > 0;
    const hasUpcoming = filters.upcoming != null;
    const hasAccess = filters.access != null;
    if (!hasPayment && !hasUpcoming && !hasAccess) return true;

    if (hasPayment && !filters.paymentStatus.includes(shop.billingPaymentStatus)) return false;

    if (hasUpcoming) {
        if (shop.billingAccessFlag === 'payment_retry') return false;
        const d = shop.billingDaysUntilPayment;
        if (d == null || d < 0) return false;
        if (filters.upcoming === 'any') {
            if (d > 5) return false;
        } else if (d !== Number(filters.upcoming)) {
            return false;
        }
    }

    if (hasAccess && shop.billingAccessFlag !== filters.access) return false;

    return true;
};

const countActiveBillingFilters = (filters) =>
    filters.paymentStatus.length + (filters.upcoming ? 1 : 0) + (filters.access ? 1 : 0);

// --- GLOBAL UTILITY: COMPARES CALENDAR DATES ONLY (YYYY-MM-DD) ---
const calculateDueStatus = (endDateString) => {
    if (!endDateString) return { text: 'N/A', isUrgent: false };

    try {
        const endDate = new Date(endDateString);
        const now = new Date();

        const todayVal = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        const expiryVal = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());

        const diffDays = Math.round((expiryVal - todayVal) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return { text: 'Due Today', isUrgent: true };
        } else if (diffDays < 0) {
            return { text: 'Overdue', isUrgent: true };
        } else if (diffDays === 1) {
            return { text: 'Due Tomorrow', isUrgent: true };
        } else {
            return { text: `Due in ${diffDays} Days`, isUrgent: diffDays <= 3 };
        }
    } catch (e) {
        return { text: 'Invalid Date', isUrgent: false };
    }
};

const formatDateUTC = (isoString) => {
    if (!isoString || isoString === 'N/A') return 'N/A';
    try {
        const d = new Date(isoString);
        const day = d.getUTCDate();
        const year = d.getUTCFullYear();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = monthNames[d.getUTCMonth()];

        return `${month} ${day}, ${year}`;
    } catch (e) {
        return 'Invalid Date';
    }
};

const getPlanStyles = (plan, darkMode = true) => {
    const planType = String(plan || '').toUpperCase();
    if (darkMode) {
        switch (planType) {
            case 'PREMIUM':
                return 'bg-purple-800/50 text-purple-300 border-purple-700';
            case 'PRO':
                return 'bg-indigo-800/50 text-indigo-300 border-indigo-700';
            case 'BASIC':
            default:
                return 'bg-gray-700/50 text-gray-300 border-gray-600';
        }
    }
    switch (planType) {
        case 'PREMIUM':
            return 'bg-purple-50 text-purple-800 border-purple-200';
        case 'PRO':
            return 'bg-indigo-50 text-indigo-800 border-indigo-200';
        case 'BASIC':
        default:
            return 'bg-slate-100 text-slate-700 border-slate-200';
    }
};

const MOBILE_SORT_OPTIONS = [
    { key: 'dateJoined', label: 'Newest joined' },
    { key: 'name', label: 'Shop name (A–Z)' },
    { key: 'plan', label: 'Plan tier' },
    { key: 'performance', label: 'Performance score' },
];

/** Current plan badge + prior tier timeline for superadmin shops list */
const PlanHistoryHint = ({ plan, planHistoryDisplay, darkMode = true, compact = false }) => {
    const display = planHistoryDisplay || {};
    const current = String(display.currentPlan || plan || 'BASIC').toUpperCase();
    const summary = display.summaryLine;
    const segments = Array.isArray(display.segments) ? display.segments : [];
    const muted = darkMode ? 'text-gray-500' : 'text-slate-500';

    return (
        <div
            className={`flex flex-col gap-0.5 ${compact ? 'items-start' : 'items-center min-w-[120px]'}`}
        >
            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-tighter border ${getPlanStyles(current, darkMode)}`}>
                {current}
            </span>
            {summary ? (
                <span
                    className={`text-[10px] font-medium leading-tight max-w-[200px] ${compact ? 'text-left' : 'text-center'} ${muted}`}
                    title={segments.map((s) => s.label).join('\n')}
                >
                    {summary}
                </span>
            ) : segments.length > 1 ? (
                <span
                    className={`text-[10px] ${muted} ${compact ? 'text-left' : 'text-center'}`}
                    title={segments.map((s) => s.label).join('\n')}
                >
                    {segments.length} plan periods
                </span>
            ) : null}
        </div>
    );
};

const StaffPill = ({ count }) => {
    const manager = count?.manager ?? 0;
    const cashier = count?.cashier ?? 0;
    return (
        <div className="flex items-center justify-center gap-2 w-full">
            <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-lg text-xs font-medium" title="Managers">
                    <Users className="w-3.5 h-3.5" />
                    <span>{manager}</span>
                </span>
                <span className="flex items-center gap-1.5 text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-lg text-xs font-medium" title="Cashiers">
                    <User className="w-3.5 h-3.5" />
                    <span>{cashier}</span>
                </span>
            </div>
        </div>
    );
};

const MobileStaffBadge = ({ count, onClick, darkMode }) => {
    const total = (count?.manager ?? 0) + (count?.cashier ?? 0);
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors shrink-0 ${
                darkMode
                    ? 'text-indigo-300 bg-indigo-500/10 border-indigo-500/25 hover:bg-indigo-500/20'
                    : 'text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
            }`}
            title="View staff"
        >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>{total}</span>
        </button>
    );
};

/** Mobile-first shop card — full width, labeled actions, clear hierarchy */
const ShopDetailsModal = ({ isOpen, onClose, shop, darkMode, onViewStaff }) => {
    const modalBg = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200';
    const headerBg = darkMode ? 'border-gray-800 bg-gray-950' : 'border-slate-200 bg-slate-50';
    const textPrimary = darkMode ? 'text-white' : 'text-slate-900';
    const textSecondary = darkMode ? 'text-gray-400' : 'text-slate-600';
    const textMuted = darkMode ? 'text-gray-500' : 'text-slate-500';
    const innerBg = darkMode ? 'bg-gray-950/60 border-gray-800' : 'bg-slate-50 border-slate-100';

    if (!isOpen || !shop) return null;

    const perf = shop.performance || {};
    const totalStaff = (shop.staffCount?.manager ?? 0) + (shop.staffCount?.cashier ?? 0);

    return (
        <AppModalOverlay onClose={onClose} ariaLabelledby="shop-details-modal-title" panelClassName="max-w-md">
            <section className={`${modalBg} border rounded-2xl shadow-2xl flex flex-col max-h-[min(90vh,640px)] overflow-hidden`}>
                <header className={`p-4 border-b flex justify-between items-start gap-3 shrink-0 ${headerBg}`}>
                    <div className="min-w-0">
                        <h2 id="shop-details-modal-title" className={`text-base font-bold truncate ${textPrimary}`}>
                            {shop.name}
                        </h2>
                        <p className={`text-xs mt-0.5 ${textMuted}`}>Contact, performance &amp; team</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`p-2 rounded-lg shrink-0 ${darkMode ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-slate-100 text-slate-400'}`}
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </header>

                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    <div>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${textMuted}`}>Contact</p>
                        <div className="space-y-2">
                            <a
                                href={`mailto:${shop.email}`}
                                className={`flex items-center gap-3 p-3 rounded-xl border ${innerBg} ${textSecondary} hover:text-indigo-500 transition-colors`}
                            >
                                <Mail className="w-4 h-4 text-indigo-500 shrink-0" />
                                <span className="text-sm font-medium break-all">{shop.email}</span>
                            </a>
                            <a
                                href={`tel:${shop.phone}`}
                                className={`flex items-center gap-3 p-3 rounded-xl border ${innerBg} ${textSecondary} hover:text-indigo-500 transition-colors`}
                            >
                                <Phone className="w-4 h-4 text-indigo-500 shrink-0" />
                                <span className="text-sm font-medium">{shop.phone}</span>
                            </a>
                        </div>
                    </div>

                    <div>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${textMuted}`}>Performance</p>
                        <MobileShopPerformance
                            performanceTrend={shop.performanceTrend}
                            performance={shop.performance}
                            darkMode={darkMode}
                            innerCardBg={innerBg}
                            textMuted={textMuted}
                        />
                        <div className={`mt-2 grid grid-cols-2 gap-2 text-xs ${textSecondary}`}>
                            <div className={`rounded-lg border p-2.5 ${innerBg}`}>
                                <span className={`block text-[10px] font-bold uppercase ${textMuted}`}>Sales (30d)</span>
                                <span className={`font-bold ${textPrimary}`}>{perf.salesCountLast30 ?? 0}</span>
                            </div>
                            <div className={`rounded-lg border p-2.5 ${innerBg}`}>
                                <span className={`block text-[10px] font-bold uppercase ${textMuted}`}>Growth</span>
                                <span className={`font-bold ${textPrimary}`}>{perf.growthPct != null ? `${perf.growthPct}%` : '—'}</span>
                            </div>
                            <div className={`rounded-lg border p-2.5 ${innerBg}`}>
                                <span className={`block text-[10px] font-bold uppercase ${textMuted}`}>Stores</span>
                                <span className={`font-bold ${textPrimary}`}>{perf.storeCount ?? 0}</span>
                            </div>
                            <div className={`rounded-lg border p-2.5 ${innerBg}`}>
                                <span className={`block text-[10px] font-bold uppercase ${textMuted}`}>Customers</span>
                                <span className={`font-bold ${textPrimary}`}>{perf.customerCount ?? 0}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${textMuted}`}>Team</p>
                        <div className={`rounded-xl border p-3 space-y-3 ${innerBg}`}>
                            <StaffPill count={shop.staffCount} />
                            <p className={`text-xs ${textMuted}`}>
                                {totalStaff === 0
                                    ? 'No staff members linked to this shop yet.'
                                    : `${totalStaff} team member${totalStaff === 1 ? '' : 's'} (${shop.staffCount?.manager ?? 0} managers, ${shop.staffCount?.cashier ?? 0} cashiers)`}
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onViewStaff(shop);
                                }}
                                className="w-full py-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-500 text-xs font-bold hover:bg-indigo-500/20 transition-colors"
                            >
                                View full team list
                            </button>
                        </div>
                    </div>
                </div>

                <div className={`p-4 border-t shrink-0 ${headerBg}`}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors"
                    >
                        Close
                    </button>
                </div>
            </section>
        </AppModalOverlay>
    );
};

const MobileShopCard = ({
    shop,
    darkMode,
    isLoading,
    onToggleStatus,
    onPayments,
    onStaff,
    onDetails,
    onDelete,
}) => {
    const cardBg = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200 shadow-sm';
    const innerBg = darkMode ? 'bg-gray-950/60 border-gray-800' : 'bg-slate-50 border-slate-100';
    const textPrimary = darkMode ? 'text-white' : 'text-slate-900';
    const textMuted = darkMode ? 'text-gray-500' : 'text-slate-500';
    const textSecondary = darkMode ? 'text-gray-400' : 'text-slate-600';
    const divider = darkMode ? 'border-gray-800' : 'border-slate-100';

    const actionBtn =
        'flex flex-col items-center justify-center gap-1 min-h-[48px] rounded-xl text-[10px] font-bold transition-colors active:scale-[0.98] disabled:opacity-50';

    return (
        <article className={`${cardBg} border rounded-2xl overflow-hidden`}>
            <div className="p-4 space-y-3">
                <div className="flex gap-3 items-start">
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
                        <Store className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className={`text-base font-bold leading-snug truncate ${textPrimary}`}>{shop.name}</h3>
                        <p className={`text-xs mt-0.5 ${textMuted}`}>Joined {shop.dateJoined}</p>
                    </div>
                    {!shop.isActive && (
                        <span className="shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/25">
                            Off
                        </span>
                    )}
                </div>

                <div className="[&>span]:w-full [&>span]:justify-center">
                    <SubscriptionStatusBadge status={shop.subscriptionStatus} />
                </div>

                <div className={`grid grid-cols-2 gap-2 p-3 rounded-xl border ${innerBg}`}>
                    <div className="min-w-0">
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${textMuted}`}>Plan</p>
                        <PlanHistoryHint
                            plan={shop.plan}
                            planHistoryDisplay={shop.planHistoryDisplay}
                            darkMode={darkMode}
                            compact
                        />
                    </div>
                    <div className="min-w-0 border-l pl-2 border-inherit">
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${textMuted}`}>Billing</p>
                        <p
                            className={`text-sm font-bold leading-tight ${
                                shop.dueStatus.isUrgent ? 'text-red-500' : textPrimary
                            }`}
                        >
                            {shop.dueStatus.text}
                        </p>
                    </div>
                </div>
            </div>

            <div className={`grid grid-cols-5 gap-1 p-2 border-t ${divider} ${darkMode ? 'bg-gray-950/40' : 'bg-slate-50/80'}`}>
                <button
                    type="button"
                    onClick={onDetails}
                    className={`${actionBtn} ${darkMode ? 'text-sky-400 hover:bg-sky-500/10' : 'text-sky-600 hover:bg-sky-50'}`}
                    title="View details"
                >
                    <Eye className="w-5 h-5" />
                    Info
                </button>
                <button
                    type="button"
                    onClick={onPayments}
                    className={`${actionBtn} text-indigo-500 ${darkMode ? 'hover:bg-indigo-500/10' : 'hover:bg-indigo-50'}`}
                >
                    <CreditCard className="w-5 h-5" />
                    Pay
                </button>
                <button
                    type="button"
                    onClick={onStaff}
                    className={`${actionBtn} ${darkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                    <Users className="w-5 h-5" />
                    Staff
                </button>
                <button
                    type="button"
                    onClick={onToggleStatus}
                    disabled={isLoading}
                    className={`${actionBtn} ${
                        shop.isActive
                            ? 'text-amber-500 hover:bg-amber-500/10'
                            : 'text-emerald-500 hover:bg-emerald-500/10'
                    }`}
                >
                    {shop.isActive ? <PowerOff className="w-5 h-5" /> : <Power className="w-5 h-5" />}
                    {shop.isActive ? 'Off' : 'On'}
                </button>
                <button
                    type="button"
                    onClick={onDelete}
                    className={`${actionBtn} text-red-500 hover:bg-red-500/10`}
                >
                    <Trash2 className="w-5 h-5" />
                    Del
                </button>
            </div>
        </article>
    );
};

const HeaderIconButton = ({ active, onClick, disabled, label, children, badge }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={active}
        className={`relative p-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
            active
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 dark:text-gray-400'
        }`}
    >
        {children}
        {badge != null && badge > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                {badge}
            </span>
        )}
    </button>
);

const SuperAdminPageTabBar = ({ activeTab, onChange, darkMode, borderColor }) => {
    const trackBg = darkMode ? 'bg-gray-900/80 border-gray-800' : 'bg-slate-100 border-slate-200';
    const idle = darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white';
    const active = 'bg-indigo-600 text-white shadow-sm';

    return (
        <div className={`flex gap-1 p-1 rounded-xl border ${trackBg} ${borderColor}`}>
            {SUPERADMIN_PAGE_TABS.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    onClick={() => onChange(tab.id)}
                    className={`flex-1 min-w-0 px-2.5 py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${
                        activeTab === tab.id ? active : idle
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};

const ShopLifecycleTabBar = ({ activeTab, onChange, counts, darkMode, borderColor }) => {
    const trackBg = darkMode ? 'bg-gray-900/80 border-gray-800' : 'bg-slate-100 border-slate-200';
    const idle = darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800/80' : 'text-slate-600 hover:text-slate-900 hover:bg-white';
    const active = 'bg-indigo-600 text-white shadow-sm';

    return (
        <div className={`flex gap-1 p-1 rounded-xl border overflow-x-auto ${trackBg} ${borderColor}`}>
            {SHOP_LIFECYCLE_TABS.map((tab) => {
                const count = counts[tab.id] ?? 0;
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onChange(tab.id)}
                        className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 px-2.5 py-2 sm:px-3 rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${
                            isActive ? active : idle
                        }`}
                    >
                        <span>{tab.label}</span>
                        <span
                            className={`tabular-nums px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                                isActive
                                    ? 'bg-white/20 text-white'
                                    : darkMode
                                      ? 'bg-gray-800 text-gray-400'
                                      : 'bg-white text-slate-500'
                            }`}
                        >
                            {count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

const MobileShopPerformance = ({ performanceTrend, performance, darkMode, innerCardBg, textMuted }) => {
    const { metric, trend, score, label } = performanceTrend || {};
    const safeScore = score != null ? score : 50;
    const revenue = performance?.revenueLast30 ?? 0;

    let TrendIcon = Minus;
    let trendColor = darkMode ? 'text-gray-400' : 'text-slate-500';
    let trendBg = darkMode ? 'bg-gray-500/10 border-gray-500/20' : 'bg-slate-100 border-slate-200';
    if (trend === 'up') {
        TrendIcon = TrendingUp;
        trendColor = 'text-emerald-500';
        trendBg = darkMode ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200';
    } else if (trend === 'down') {
        TrendIcon = TrendingDown;
        trendColor = 'text-red-500';
        trendBg = darkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200';
    }

    const scoreColor =
        safeScore >= 70 ? 'text-emerald-500' : safeScore >= 40 ? 'text-amber-500' : 'text-red-500';

    return (
        <div className={`rounded-xl border p-3 ${innerCardBg}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>Performance</span>
                <PerformanceLabelBadge label={label} />
            </div>
            <div className="flex items-stretch justify-between gap-3">
                <div className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border flex-1 min-w-0 ${trendBg}`}>
                    <TrendIcon className={`w-4 h-4 shrink-0 ${trendColor}`} />
                    <span className={`text-sm font-bold truncate ${trendColor}`}>{metric ?? '0.0%'}</span>
                </div>
                <div className="flex flex-col items-center justify-center px-2 shrink-0">
                    <span className={`text-xl font-black leading-none ${scoreColor}`}>{safeScore}</span>
                    <span className={`text-[9px] font-bold uppercase mt-0.5 ${textMuted}`}>Score</span>
                </div>
            </div>
            <p className={`text-[11px] mt-2 font-medium ${textMuted}`}>
                ₹{revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} revenue · 30 days
            </p>
        </div>
    );
};

const ShopStaffModal = ({
    isOpen,
    onClose,
    shopName,
    managers,
    cashiers,
    loading,
    activeTab,
    onTabChange,
    darkMode,
}) => {
    const modalBg = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200';
    const headerBg = darkMode ? 'border-gray-800 bg-gray-950' : 'border-slate-200 bg-slate-50';
    const textPrimary = darkMode ? 'text-white' : 'text-slate-900';
    const textSecondary = darkMode ? 'text-gray-400' : 'text-slate-600';
    const textMuted = darkMode ? 'text-gray-500' : 'text-slate-500';
    const tabActive = darkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white';
    const tabIdle = darkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-slate-600 hover:bg-slate-100';
    const listItemBg = darkMode ? 'bg-gray-950/60 border-gray-800' : 'bg-slate-50 border-slate-200';

    const members = activeTab === 'managers' ? managers : cashiers;
    const emptyLabel = activeTab === 'managers' ? 'No managers yet.' : 'No cashiers yet.';

    if (!isOpen) return null;

    return (
        <AppModalOverlay onClose={onClose} ariaLabelledby="shop-staff-modal-title" panelClassName="max-w-md">
            <section className={`${modalBg} border rounded-2xl shadow-2xl flex flex-col max-h-[min(85vh,520px)] overflow-hidden`}>
                <header className={`p-4 border-b flex justify-between items-start gap-3 shrink-0 ${headerBg}`}>
                    <div className="min-w-0">
                        <h2 id="shop-staff-modal-title" className={`text-base font-bold truncate ${textPrimary}`}>
                            Staff — {shopName}
                        </h2>
                        <p className={`text-xs mt-0.5 ${textMuted}`}>
                            {(managers?.length ?? 0) + (cashiers?.length ?? 0)} member
                            {(managers?.length ?? 0) + (cashiers?.length ?? 0) === 1 ? '' : 's'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`p-2 rounded-lg shrink-0 ${darkMode ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-slate-100 text-slate-400'}`}
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </header>

                <div className={`px-4 pt-3 flex gap-2 shrink-0 ${darkMode ? 'border-gray-800' : ''}`}>
                    <button
                        type="button"
                        onClick={() => onTabChange('managers')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                            activeTab === 'managers' ? tabActive : tabIdle
                        }`}
                    >
                        Managers ({managers?.length ?? 0})
                    </button>
                    <button
                        type="button"
                        onClick={() => onTabChange('cashiers')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                            activeTab === 'cashiers' ? tabActive : tabIdle
                        }`}
                    >
                        Cashiers ({cashiers?.length ?? 0})
                    </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
                    {loading ? (
                        <div className={`flex flex-col items-center justify-center py-12 gap-2 ${textSecondary}`}>
                            <Loader className="w-6 h-6 animate-spin text-indigo-500" />
                            <span className="text-xs font-medium">Loading staff…</span>
                        </div>
                    ) : members.length === 0 ? (
                        <p className={`text-center py-10 text-sm ${textMuted}`}>{emptyLabel}</p>
                    ) : (
                        <ul className="space-y-2">
                            {members.map((member) => (
                                <li
                                    key={member.email}
                                    className={`border rounded-xl p-3 ${listItemBg}`}
                                >
                                    <p className={`text-sm font-semibold truncate ${textPrimary}`}>{member.name}</p>
                                    <a
                                        href={`mailto:${member.email}`}
                                        className={`text-xs flex items-center gap-1.5 mt-1 truncate hover:text-indigo-500 ${textSecondary}`}
                                    >
                                        <Mail className="w-3.5 h-3.5 shrink-0" />
                                        {member.email}
                                    </a>
                                    {member.active === false && (
                                        <span className="inline-block mt-2 text-[10px] font-bold text-amber-500">Inactive</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className={`p-4 border-t shrink-0 ${headerBg}`}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors"
                    >
                        Close
                    </button>
                </div>
            </section>
        </AppModalOverlay>
    );
};

const ShopBillingFiltersPanel = ({ filters, onChange, onClear, darkMode, borderColor, textMuted, textSecondary }) => {
    const panelBg = darkMode ? 'bg-gray-900/95 border-gray-800' : 'bg-white border-slate-200';
    const chipOn = darkMode ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-indigo-600 text-white border-indigo-600';
    const chipOff = darkMode
        ? 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-600'
        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300';

    const togglePaymentStatus = (key) => {
        onChange({
            ...filters,
            paymentStatus: filters.paymentStatus.includes(key)
                ? filters.paymentStatus.filter((k) => k !== key)
                : [...filters.paymentStatus, key],
        });
    };

    const setUpcoming = (value) => {
        onChange({ ...filters, upcoming: filters.upcoming === value ? null : value });
    };

    const setAccess = (value) => {
        onChange({ ...filters, access: filters.access === value ? null : value });
    };

    const paymentOptions = [
        { key: 'paid', label: 'Paid' },
        { key: 'pending', label: 'Pending' },
        { key: 'failed', label: 'Failed' },
        { key: 'overdue', label: 'Overdue' },
    ];

    const upcomingOptions = [
        { key: 'any', label: 'Any upcoming (≤5 days)' },
        { key: '5', label: 'Due in 5 days' },
        { key: '3', label: 'Due in 3 days' },
        { key: '1', label: 'Due in 1 day' },
        { key: '0', label: 'Due today' },
    ];

    return (
        <div className={`border-b ${borderColor} ${panelBg} px-4 py-4 md:px-6 shrink-0`}>
            <div className="flex items-center justify-between gap-2 mb-3">
                <p className={`text-xs font-black uppercase tracking-wider ${textMuted}`}>Filters</p>
                {countActiveBillingFilters(filters) > 0 && (
                    <button
                        type="button"
                        onClick={onClear}
                        className={`text-xs font-bold ${darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
                    >
                        Clear all
                    </button>
                )}
            </div>

            <div className="space-y-4">
                <div>
                    <p className={`text-[11px] font-bold mb-2 ${textSecondary}`}>Payment status</p>
                    <div className="flex flex-wrap gap-2">
                        {paymentOptions.map(({ key, label }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => togglePaymentStatus(key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                    filters.paymentStatus.includes(key) ? chipOn : chipOff
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <p className={`text-[11px] font-bold mb-2 ${textSecondary}`}>Upcoming payment</p>
                    <div className="flex flex-wrap gap-2">
                        {upcomingOptions.map(({ key, label }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setUpcoming(key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                    filters.upcoming === key ? chipOn : chipOff
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <p className={`text-[11px] font-bold mb-2 ${textSecondary}`}>Access</p>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setAccess('payment_retry')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                filters.access === 'payment_retry' ? chipOn : chipOff
                            }`}
                        >
                            Payment retrying
                        </button>
                        <button
                            type="button"
                            onClick={() => setAccess('access_ended')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                filters.access === 'access_ended' ? chipOn : chipOff
                            }`}
                        >
                            Access ended
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PerformanceLabelBadge = ({ label }) => {
    const l = (label || 'Low').toLowerCase();
    const styles = {
        high: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        low: 'bg-slate-500/15 text-slate-400 border-slate-500/30'
    };
    const cls = styles[l] || styles.low;
    return (
        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border ${cls}`}>
            {l === 'high' ? 'High' : l === 'medium' ? 'Medium' : 'Low'}
        </span>
    );
};

const PerformanceTrendIndicator = ({ performance, showScore = true, showLabel = true, showRevenue = false, darkMode = true, compact = false }) => {
    const { metric, trend, score, label } = performance || {};
    const safeScore = score != null ? score : 50;
    let icon = Minus;
    let color = 'text-gray-400';
    let bgColor = 'bg-gray-500/10';
    let borderColor = 'border-gray-500/20';

    if (trend === 'up') {
        icon = TrendingUp;
        color = 'text-green-400';
        bgColor = 'bg-green-500/10';
        borderColor = 'border-green-500/30';
    } else if (trend === 'down') {
        icon = TrendingDown;
        color = 'text-red-400';
        bgColor = 'bg-red-500/10';
        borderColor = 'border-red-500/30';
    }

    const IconComponent = icon;
    const scoreColor = safeScore >= 70 ? 'text-green-400' : safeScore >= 40 ? 'text-amber-400' : 'text-red-400';

    if (compact) {
        return (
            <div className="flex flex-col items-center justify-center gap-1 min-w-0 w-full">
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {showLabel && <PerformanceLabelBadge label={label} />}
                    <div className={`flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md ${bgColor} border ${borderColor}`}>
                        <IconComponent className={`w-3 h-3 shrink-0 ${color}`} />
                        <span className={color}>{metric ?? '0.0%'}</span>
                    </div>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0">
                    {showScore && (
                        <span className={`text-[9px] font-bold whitespace-nowrap ${darkMode ? scoreColor : scoreColor.replace('400', '600')}`}>Score {safeScore}</span>
                    )}
                    {showRevenue && performance?.revenueLast30 != null && (
                        <span className="text-[9px] text-gray-500 font-medium whitespace-nowrap truncate max-w-[72px] sm:max-w-none" title={`₹${(performance.revenueLast30 || 0).toLocaleString('en-IN')}`}>
                            ₹{(performance.revenueLast30 || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} 30d
                        </span>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-1.5">
            {showLabel && <PerformanceLabelBadge label={label} />}
            <div className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg ${bgColor} border ${borderColor}`}>
                <IconComponent className={`w-3.5 h-3.5 ${color}`} />
                <span className={color}>{metric ?? '0.0%'}</span>
            </div>
            {showScore && (
                <span className={`text-[10px] font-bold ${darkMode ? scoreColor : scoreColor.replace('400', '600')}`}>Score {safeScore}</span>
            )}
            {showRevenue && performance?.revenueLast30 != null && (
                <span className="text-[10px] text-gray-500 font-medium">₹{(performance.revenueLast30 || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} (30d)</span>
            )}
        </div>
    );
};

const SubscriptionStatusBadge = ({ status, compact = false }) => {
    let icon, color, bgColor, borderColor, text;
    const normalizedStatus = status ? status.toLowerCase() : 'unknown';

    switch (normalizedStatus) {
        case 'active':
            icon = CheckCircle;
            color = 'text-green-400';
            bgColor = 'bg-green-500/10';
            borderColor = 'border-green-500/30';
            text = 'Active';
            break;
        case 'authenticated':
            icon = Shield;
            color = 'text-blue-400';
            bgColor = 'bg-blue-500/10';
            borderColor = 'border-blue-500/30';
            text = 'Trial/Auth';
            break;
        case 'created':
            icon = Plus;
            color = 'text-cyan-400';
            bgColor = 'bg-cyan-500/10';
            borderColor = 'border-cyan-500/30';
            text = 'Created';
            break;
        case 'cancellation_pending':
            icon = Clock;
            color = 'text-yellow-400';
            bgColor = 'bg-yellow-500/10';
            borderColor = 'border-yellow-500/30';
            text = 'Cancelling';
            break;
        case 'trial_cancellation_pending':
            icon = XCircle;
            color = 'text-amber-400';
            bgColor = 'bg-amber-500/10';
            borderColor = 'border-amber-500/30';
            text = 'Trial cancelled';
            break;
        case 'cancellation_no_refund':
            icon = XCircle;
            color = 'text-red-400';
            bgColor = 'bg-red-500/10';
            borderColor = 'border-red-500/30';
            text = 'Cancelled';
            break;
        case 'cancelled':
            icon = XCircle;
            color = 'text-red-400';
            bgColor = 'bg-red-500/10';
            borderColor = 'border-red-500/30';
            text = 'Cancelled';
            break;
        case 'halted':
            icon = AlertCircle;
            color = 'text-orange-400';
            bgColor = 'bg-orange-500/10';
            borderColor = 'border-orange-500/30';
            text = 'Halted';
            break;
        default:
            icon = Clock;
            color = 'text-gray-400';
            bgColor = 'bg-gray-500/10';
            borderColor = 'border-gray-500/30';
            text = status;
    }

    const IconComponent = icon;
    return (
        <span
            className={`inline-flex items-center justify-center gap-1 rounded-lg font-semibold ${bgColor} ${color} border ${borderColor} ${
                compact ? 'px-2 py-1 text-[10px] max-w-[120px]' : 'gap-1.5 px-3 py-1.5 text-xs min-w-[110px]'
            }`}
        >
            <IconComponent className={compact ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5'} />
            <span className="truncate">{text}</span>
        </span>
    );
};

const PAYMENT_FAILURE_LABELS = {
    card_expired: 'Card expired',
    card_blocked: 'Card blocked by bank',
    insufficient_funds: 'Insufficient balance',
    mandate_cancelled: 'Mandate cancelled',
    recurring_halted: 'Recurring payments halted',
    payment_failed: 'Payment failed',
    unknown: 'Unknown failure',
};

const formatPaymentFailureLabel = (code) => {
    if (!code) return null;
    const key = String(code).toLowerCase().trim();
    return PAYMENT_FAILURE_LABELS[key] || key.replace(/_/g, ' ');
};

const PaymentModal = ({ isOpen, onClose, shopName, shopPlan, shopId, apiClient, API, showToast, darkMode = true }) => {
    const [paymentData, setPaymentData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState(null);

    const modalBg = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200';
    const headerBg = darkMode ? 'border-gray-800 bg-gradient-to-r from-gray-800/50 to-gray-800/30' : 'border-slate-200 bg-gradient-to-r from-slate-50 to-white';
    const textPrimary = darkMode ? 'text-white' : 'text-slate-900';
    const textSecondary = darkMode ? 'text-gray-400' : 'text-slate-600';
    const textMuted = darkMode ? 'text-gray-500' : 'text-slate-500';
    const cardInner = darkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-slate-50 border-slate-200';
    const historyCard = darkMode ? 'bg-gray-800/30 border-gray-700/30 hover:border-gray-600/50' : 'bg-slate-50 border-slate-200 hover:border-slate-300';
    const footerBg = darkMode ? 'border-gray-800 bg-gray-800/30' : 'border-slate-200 bg-slate-50';

    useEffect(() => {
        if (!isOpen || !shopId) {
            setPaymentData(null);
            setIsLoading(false);
            setLoadError(null);
            return undefined;
        }

        let cancelled = false;
        setPaymentData(null);
        setLoadError(null);
        setIsLoading(true);

        (async () => {
            try {
                const response = await apiClient.get(API.superadminShopPayments(shopId));
                if (cancelled) return;
                if (response.data.success) {
                    setPaymentData(response.data.data);
                } else {
                    throw new Error(response.data.message || 'Failed to load payment data');
                }
            } catch (error) {
                if (cancelled) return;
                console.error('Failed to load payment data:', error);
                setLoadError('Failed to load payment records.');
                showToast('Failed to fetch payment records.', 'error');
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isOpen, shopId, apiClient, API, showToast]);

    const getStatusBadge = (status) => {
        const s = status?.toLowerCase();
        if (s === 'paid') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30"><CheckCircle className="w-3.5 h-3.5" />Paid</span>;
        if (s === 'failed') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30"><XCircle className="w-3.5 h-3.5" />Failed</span>;
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"><AlertCircle className="w-3.5 h-3.5" />Pending</span>;
    };

    const nextPaymentStatus = paymentData
        ? calculateDueStatus(paymentData.upcomingPayment?.date)
        : { text: '', isUrgent: false };

    return (
        <AppModalOverlay
            open={isOpen}
            onClose={onClose}
            busy={isLoading}
            ariaLabelledby="payment-history-modal-title"
            panelClassName="max-w-4xl"
        >
            <div className={`rounded-2xl shadow-2xl border w-full max-h-[min(90vh,100%)] overflow-hidden flex flex-col min-h-0 ${modalBg}`}>
                <header className={`flex shrink-0 items-center justify-between p-4 md:p-6 border-b ${headerBg}`}>
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                            <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-indigo-500" />
                        </div>
                        <div className="min-w-0">
                            <h2 id="payment-history-modal-title" className={`text-lg md:text-xl font-bold truncate ${textPrimary}`}>Payment History</h2>
                            <p className={`text-xs md:text-sm truncate ${textSecondary}`}>{shopName}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className={`p-2 rounded-lg transition-all shrink-0 ${darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50'}`}
                        aria-label="Close payment history"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </header>

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                        <PaymentHistoryModalSkeleton darkMode={darkMode} />
                    ) : loadError ? (
                        <div className={`text-center py-12 px-4 ${textMuted}`}>
                            <AlertCircle className={`w-8 h-8 mx-auto mb-3 ${darkMode ? 'text-rose-400' : 'text-rose-500'}`} />
                            <p className="text-sm">{loadError}</p>
                        </div>
                    ) : paymentData ? (
                        <div className="p-4 md:p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                <div className={`rounded-xl p-3 md:p-5 border ${cardInner}`}>
                                    <div className="flex items-center gap-2 mb-2 md:mb-3">
                                        <IndianRupee className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" />
                                        <h3 className={`text-[10px] md:text-sm font-semibold tracking-wider ${textSecondary}`}>Plan</h3>
                                    </div>
                                    <p className={`text-lg md:text-2xl font-bold mb-1 ${textPrimary}`}>{paymentData.currentPlan || shopPlan}</p>
                                    <p className={`text-[10px] md:text-sm ${textSecondary}`}>Monthly</p>
                                </div>

                                <div className={`bg-gradient-to-br rounded-xl p-3 md:p-5 border transition-all duration-300 ${nextPaymentStatus.isUrgent ? 'from-red-500/10 to-orange-500/10 border-red-500/40' : darkMode ? 'from-indigo-500/10 to-purple-500/10 border-indigo-500/30' : 'from-indigo-50 to-purple-50 border-indigo-200'}`}>
                                    <div className="flex items-center gap-2 mb-2 md:mb-3">
                                        <Calendar className={`w-4 h-4 md:w-5 md:h-5 ${nextPaymentStatus.isUrgent ? 'text-red-500' : 'text-indigo-500'}`} />
                                        <h3 className={`text-[10px] md:text-sm font-semibold tracking-wider ${textSecondary}`}>Next Due</h3>
                                    </div>
                                    <p className={`text-lg md:text-2xl font-bold mb-1 ${textPrimary}`}>
                                        ₹{Number(paymentData.upcomingPayment?.amount ?? 0).toFixed(0)}
                                    </p>
                                    <p className={`text-[10px] md:text-sm font-bold tracking-tight ${nextPaymentStatus.isUrgent ? 'text-red-500' : 'text-indigo-500'}`}>
                                        {nextPaymentStatus.text}
                                    </p>
                                    <p className={`text-[10px] mt-1 truncate ${textMuted}`}>
                                        {formatDateUTC(paymentData.upcomingPayment?.date)}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <h3 className={`text-base md:text-lg font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}>
                                    <Clock className="w-5 h-5 text-indigo-500 shrink-0" />
                                    Transaction history
                                </h3>
                                <div className="space-y-3">
                                    {paymentData.paymentHistory?.length > 0 ? (
                                        paymentData.paymentHistory.map((payment, index) => {
                                            const amount = Number(payment.amount);
                                            const failureLabel = formatPaymentFailureLabel(payment.failureReason);
                                            const isFailed = payment.status?.toLowerCase() === 'failed';
                                            const rowKey = payment.id || `${payment.transactionId}-${index}`;

                                            return (
                                                <article key={rowKey} className={`rounded-lg p-3 md:p-4 border transition-all ${historyCard}`}>
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                                <span className={`text-sm font-semibold ${textPrimary}`}>
                                                                    ₹{Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}
                                                                </span>
                                                                {getStatusBadge(payment.status)}
                                                                {payment.eventType && (
                                                                    <span className={`text-[10px] px-2 py-0.5 rounded-md ${darkMode ? 'bg-gray-700/60 text-gray-300' : 'bg-slate-200 text-slate-600'}`}>
                                                                        {payment.eventType.replace(/_/g, ' ')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] md:text-xs ${textSecondary}`}>
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                                                                    {payment.date ? formatDateUTC(payment.date) : '—'}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <CreditCard className="w-3.5 h-3.5 shrink-0" />
                                                                    {payment.method || 'Online'}
                                                                </span>
                                                                {payment.transactionId && (
                                                                    <span className={`truncate max-w-full sm:max-w-[200px] ${textMuted}`}>
                                                                        ID: {payment.transactionId}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {isFailed && (failureLabel || payment.failureDetail) && (
                                                                <div className={`mt-2 rounded-lg px-2.5 py-2 text-[10px] md:text-xs border ${darkMode ? 'bg-rose-950/40 border-rose-500/30 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                                                                    {failureLabel && (
                                                                        <p className="font-semibold flex items-center gap-1">
                                                                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                                                                            {failureLabel}
                                                                        </p>
                                                                    )}
                                                                    {payment.failureDetail && (
                                                                        <p className={`mt-0.5 ${darkMode ? 'text-rose-300/90' : 'text-rose-800'}`}>
                                                                            {payment.failureDetail}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </article>
                                            );
                                        })
                                    ) : (
                                        <p className={`text-center py-8 border border-dashed rounded-lg text-sm ${textMuted} ${darkMode ? 'border-gray-800' : 'border-slate-300'}`}>
                                            No previous transaction records.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={`text-center py-12 px-4 ${textMuted}`}>No payment data found.</div>
                    )}
                </div>

                <div className={`shrink-0 p-4 md:p-6 border-t flex justify-end ${footerBg}`}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-all text-sm md:text-base"
                    >
                        Close
                    </button>
                </div>
            </div>
        </AppModalOverlay>
    );
};

const UserManagement = ({ apiClient, API, showToast, currentUser, darkMode = true }) => {
    const [shops, setShops] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const hasLoadedOnceRef = useRef(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [showSort, setShowSort] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [pageTab, setPageTab] = useState('shops');
    const [billingFilters, setBillingFilters] = useState(EMPTY_BILLING_FILTERS);
    const [lifecycleTab, setLifecycleTab] = useState('all');
    const searchInputRef = useRef(null);
    const [sortBy, setSortBy] = useState({ key: 'dateJoined', direction: 'descending' });
    const [paymentModal, setPaymentModal] = useState({ isOpen: false, shopName: null, shopPlan: null, shopId: null });
    /** @type {null | { type: 'delete', shopId: string, shopName: string } | { type: 'toggle', shop: object }} */
    const [confirmAction, setConfirmAction] = useState(null);
    const [staffModal, setStaffModal] = useState({
        isOpen: false,
        shopId: null,
        shopName: '',
        loading: false,
        managers: [],
        cashiers: [],
        tab: 'managers',
    });
    const [detailsModal, setDetailsModal] = useState({ isOpen: false, shop: null });

    const mapUserToShop = (user) => {
        const dueStatus = calculateDueStatus(user.planEndDate);
        const perf = user.performanceTrend || { metric: '0.0%', trend: 'flat', score: 50, label: 'Low' };
        const perfFull = user.performance || { revenueLast30: 0, salesCountLast30: 0, growthPct: 0, score: perf.score ?? 50, label: perf.label || 'Low', storeCount: 0, customerCount: 0, inventoryCount: 0 };
        return {
            id: user._id,
            dateSortValue: user.createdAt,
            dateJoined: formatDateUTC(user.createdAt),
            name: user.shopName || user.email?.split('@')[0],
            email: user.email || 'N/A',
            phone: user.phone || 'N/A',
            isActive: user.isActive !== false,
            status: user.isActive !== false ? 'Active' : 'Inactive',
            paymentFailedAt: user.paymentFailedAt || null,
            billingPaymentStatus: getBillingPaymentStatus({
                subscriptionStatus: user.subscriptionStatus,
                planEndDate: user.planEndDate,
                paymentFailedAt: user.paymentFailedAt,
            }),
            billingAccessFlag: getBillingAccessFlag({
                planEndDate: user.planEndDate,
                paymentFailedAt: user.paymentFailedAt,
                subscriptionStatus: user.subscriptionStatus,
            }),
            billingDaysUntilPayment: user.planEndDate
                ? daysBetweenCalendarUtc(new Date(), new Date(user.planEndDate))
                : null,
            plan: String(user.plan || 'BASIC').toUpperCase(),
            planHistoryDisplay: user.planHistoryDisplay || null,
            staffCount: { manager: user.managerCount || 0, cashier: user.cashierCount || 0 },
            performanceTrend: { metric: perf.metric, trend: perf.trend, score: perf.score, label: perf.label || perfFull.label },
            performance: { ...perfFull, revenueLast30: perfFull.revenueLast30 ?? 0 },
            subscriptionStatus: user.subscriptionStatus || 'created',
            billingPhase: getShopBillingPhase(user.subscriptionStatus),
            planEndDate: user.planEndDate,
            dueStatus: dueStatus
        };
    };

    const fetchShops = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get(API.superadminShops);
            if (response.data.success) {
                const mappedShops = response.data.data.map(mapUserToShop);
                setShops(mappedShops);
            }
        } catch (error) {
            showToast('Could not load shop list.', 'error');
        } finally {
            hasLoadedOnceRef.current = true;
            setIsLoading(false);
        }
    }, [apiClient, API, showToast]);

    useEffect(() => {
        if (currentUser?.role === 'superadmin') fetchShops();
    }, [fetchShops, currentUser]);

    const handleRefresh = () => fetchShops();

    const handleSort = (key) => {
        setSortBy(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending',
        }));
    };

    const handleMobileSortChange = (key) => {
        setSortBy((prev) => ({
            key,
            direction: prev.key === key ? prev.direction : 'descending',
        }));
    };

    const activeFilterCount = countActiveBillingFilters(billingFilters);

    useEffect(() => {
        if (showSearch && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [showSearch]);

    const lifecycleCounts = useMemo(() => {
        const counts = { all: shops.length, trial: 0, billing: 0 };
        shops.forEach((shop) => {
            if (shop.billingPhase === 'trial') counts.trial += 1;
            else counts.billing += 1;
        });
        return counts;
    }, [shops]);

    const filteredAndSortedShops = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        let filtered = shops.filter((shop) => {
            const matchesSearch =
                !term ||
                shop.name.toLowerCase().includes(term) ||
                shop.email.toLowerCase().includes(term) ||
                shop.phone.toLowerCase().includes(term);
            return (
                matchesSearch &&
                shopMatchesBillingFilters(shop, billingFilters) &&
                shopMatchesLifecycleTab(shop, lifecycleTab)
            );
        });

        return filtered.sort((a, b) => {
            let aValue = a[sortBy.key];
            let bValue = b[sortBy.key];

            if (sortBy.key === 'dateJoined') {
                return sortBy.direction === 'ascending'
                    ? new Date(a.dateSortValue) - new Date(b.dateSortValue)
                    : new Date(b.dateSortValue) - new Date(a.dateSortValue);
            }

            if (sortBy.key === 'plan') {
                // Plan order: BASIC < PRO < PREMIUM
                const planOrder = { 'BASIC': 1, 'PRO': 2, 'PREMIUM': 3 };
                const aOrder = planOrder[aValue] || 0;
                const bOrder = planOrder[bValue] || 0;
                const result = aOrder - bOrder;
                return sortBy.direction === 'ascending' ? result : -result;
            }

            if (sortBy.key === 'performance') {
                const aScore = a.performance?.score ?? 0;
                const bScore = b.performance?.score ?? 0;
                const result = aScore - bScore;
                return sortBy.direction === 'ascending' ? result : -result;
            }

            const result = String(aValue).toLowerCase().localeCompare(String(bValue).toLowerCase());
            return sortBy.direction === 'ascending' ? result : -result;
        });
    }, [shops, searchTerm, sortBy, billingFilters, lifecycleTab]);

    const requestDeleteShop = (shopId, shopName) => {
        setConfirmAction({ type: 'delete', shopId, shopName });
    };

    const executeDeleteShop = async () => {
        const action = confirmAction;
        if (!action || action.type !== 'delete') return;
        setConfirmAction(null);
        setIsLoading(true);
        try {
            const response = await apiClient.delete(API.superadminShopDetails(action.shopId));
            if (response.data.success) {
                setShops((prev) => prev.filter((s) => s.id !== action.shopId));
                showToast('Shop deleted.', 'success');
            }
        } catch (error) {
            showToast('Delete failed.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenPaymentModal = (shopId, shopName, shopPlan) => {
        setPaymentModal({ isOpen: true, shopId, shopName, shopPlan });
    };

    const handleClosePaymentModal = () => {
        setPaymentModal({ isOpen: false, shopId: null, shopName: null, shopPlan: null });
    };

    const openDetailsModal = (shop) => {
        setDetailsModal({ isOpen: true, shop });
    };

    const closeDetailsModal = () => {
        setDetailsModal({ isOpen: false, shop: null });
    };

    const openStaffModal = async (shop) => {
        setStaffModal({
            isOpen: true,
            shopId: shop.id,
            shopName: shop.name,
            loading: true,
            managers: [],
            cashiers: [],
            tab: 'managers',
        });
        try {
            const response = await apiClient.get(API.superadminShopStaff(shop.id));
            if (response.data?.success) {
                setStaffModal((prev) => ({
                    ...prev,
                    loading: false,
                    managers: response.data.data?.managers ?? [],
                    cashiers: response.data.data?.cashiers ?? [],
                }));
            } else {
                throw new Error(response.data?.message || 'Failed to load staff');
            }
        } catch (error) {
            showToast('Could not load staff list.', 'error');
            setStaffModal((prev) => ({ ...prev, loading: false }));
        }
    };

    const closeStaffModal = () => {
        setStaffModal({
            isOpen: false,
            shopId: null,
            shopName: '',
            loading: false,
            managers: [],
            cashiers: [],
            tab: 'managers',
        });
    };

    const requestToggleAccountStatus = (shop) => {
        setConfirmAction({ type: 'toggle', shop });
    };

    const executeToggleAccountStatus = async () => {
        const action = confirmAction;
        if (!action || action.type !== 'toggle') return;
        const shop = action.shop;
        const activating = !shop.isActive;
        setConfirmAction(null);
        setIsLoading(true);
        try {
            const response = await apiClient.patch(API.superadminShopAccountStatus(shop.id), {
                isActive: activating,
            });
            if (response.data?.success) {
                setShops((prev) =>
                    prev.map((s) =>
                        s.id === shop.id
                            ? { ...s, isActive: activating, status: activating ? 'Active' : 'Inactive' }
                            : s
                    )
                );
                showToast(response.data.message || (activating ? 'Shop activated.' : 'Shop deactivated.'), 'success');
            }
        } catch (error) {
            showToast(error.response?.data?.error || error.response?.data?.message || 'Could not update account status.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const SortIcon = ({ columnKey }) => {
        const iconColor = darkMode ? 'text-gray-600' : 'text-slate-500';
        const activeColor = 'text-indigo-400';
        if (sortBy.key !== columnKey) return <ArrowUpDown className={`w-3 h-3 ml-1 ${iconColor}`} />;
        return <ArrowUpDown className={`w-3 h-3 ml-1 ${sortBy.direction === 'ascending' ? 'rotate-180 ' : ''}${activeColor}`} />;
    };

    // Theme variables
    const mainBg = darkMode ? 'bg-gray-950' : 'bg-slate-50';
    const headerBg = darkMode ? 'bg-gray-950' : 'bg-white';
    const borderColor = darkMode ? 'border-gray-800' : 'border-slate-200';
    const textPrimary = darkMode ? 'text-white' : 'text-slate-900';
    const textSecondary = darkMode ? 'text-gray-400' : 'text-slate-600';
    const textMuted = darkMode ? 'text-gray-500' : 'text-slate-500';
    const cardBg = darkMode ? 'bg-gray-900' : 'bg-white';
    const inputBg = darkMode ? 'bg-gray-900' : 'bg-slate-100';
    const inputBorder = darkMode ? 'border-gray-800' : 'border-slate-300';
    const buttonBg = darkMode ? 'bg-gray-900 hover:bg-gray-800' : 'bg-slate-100 hover:bg-slate-200';

    if (isLoading && !hasLoadedOnceRef.current) {
        return <SuperAdminShopsInitialSkeleton darkMode={darkMode} />;
    }

    const confirmModalMessage = confirmAction?.type === 'delete'
        ? `Delete "${confirmAction.shopName}" permanently? All shop data will be removed. This cannot be undone.`
        : confirmAction?.type === 'toggle'
            ? (confirmAction.shop.isActive
                ? `Deactivate "${confirmAction.shop.name}"? The owner and staff will be blocked from logging in until you reactivate the account.`
                : `Activate "${confirmAction.shop.name}"? The owner and staff can log in again.`)
            : '';

    const confirmModalButtonText = confirmAction?.type === 'delete'
        ? 'Delete'
        : confirmAction?.type === 'toggle'
            ? (confirmAction.shop.isActive ? 'Deactivate' : 'Activate')
            : 'Confirm';

    const handleConfirmModal = () => {
        if (confirmAction?.type === 'delete') executeDeleteShop();
        else if (confirmAction?.type === 'toggle') executeToggleAccountStatus();
    };

    return (
        <main className={`flex flex-col min-h-0 flex-1 ${mainBg} transition-colors duration-300 overflow-hidden`}>
            {confirmAction && (
                <ConfirmationModal
                    message={confirmModalMessage}
                    onConfirm={handleConfirmModal}
                    onCancel={() => setConfirmAction(null)}
                    darkMode={darkMode}
                    confirmText={confirmModalButtonText}
                />
            )}

            {/* Sticky header — mobile-first */}
            <div className={`sticky top-0 z-20 shrink-0 border-b ${borderColor} ${headerBg}`}>
                <header className="px-3 py-2.5 sm:px-4 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <h1 className={`text-base sm:text-lg font-bold ${textPrimary} flex items-center gap-1.5`}>
                            <Building className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span className="truncate">
                                {pageTab === 'mandates' ? 'Payment mandates' : 'Shops'}
                            </span>
                        </h1>
                        <p className={`text-[10px] mt-0.5 ${textMuted}`}>
                            {pageTab === 'mandates'
                                ? 'Generate payment links for owners'
                                : (
                                    <>
                                        {filteredAndSortedShops.length} of{' '}
                                        {lifecycleTab === 'all' ? shops.length : lifecycleCounts[lifecycleTab]} shown
                                        {lifecycleTab !== 'all' && (
                                            <span className="hidden sm:inline">
                                                {' '}
                                                · {lifecycleTab === 'trial' ? 'Trial period' : 'Billing cycle'}
                                            </span>
                                        )}
                                    </>
                                )}
                        </p>
                    </div>
                    {pageTab === 'shops' && (
                        <div className="flex items-center gap-0.5 shrink-0">
                            <HeaderIconButton
                                label="Refresh shops"
                                onClick={handleRefresh}
                                disabled={isLoading}
                            >
                                <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </HeaderIconButton>
                            <HeaderIconButton
                                label="Search shops"
                                active={showSearch}
                                onClick={() => setShowSearch((v) => !v)}
                            >
                                <Search className="w-4 h-4" />
                            </HeaderIconButton>
                            <HeaderIconButton
                                label="Sort shops"
                                active={showSort}
                                onClick={() => setShowSort((v) => !v)}
                            >
                                <ArrowUpDown className="w-4 h-4" />
                            </HeaderIconButton>
                            <HeaderIconButton
                                label="Filters"
                                active={showFilters || activeFilterCount > 0}
                                badge={activeFilterCount}
                                onClick={() => setShowFilters((v) => !v)}
                            >
                                <Filter className="w-4 h-4" />
                            </HeaderIconButton>
                        </div>
                    )}
                </header>

                <div className="px-3 pb-2 sm:px-4">
                    <SuperAdminPageTabBar
                        activeTab={pageTab}
                        onChange={setPageTab}
                        darkMode={darkMode}
                        borderColor={borderColor}
                    />
                </div>

                {pageTab === 'shops' && showSearch && (
                    <div className={`px-3 pb-2 sm:px-4 border-b ${borderColor}`}>
                        <div className="relative w-full">
                            <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${textMuted}`} />
                            <input
                                ref={searchInputRef}
                                type="search"
                                enterKeyHint="search"
                                placeholder="Search shop, email, phone…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-8 pr-8 py-2 ${inputBg} border ${inputBorder} rounded-lg text-sm ${textPrimary} focus:outline-none focus:ring-2 focus:ring-indigo-500/30`}
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md ${textMuted}`}
                                    aria-label="Clear search"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {pageTab === 'shops' && showSort && (
                    <div className={`px-3 pb-2 sm:px-4 border-b ${borderColor}`}>
                        <label className="flex items-center gap-2">
                            <ArrowUpDown className={`w-3.5 h-3.5 shrink-0 ${textMuted}`} />
                            <select
                                value={sortBy.key}
                                onChange={(e) => handleMobileSortChange(e.target.value)}
                                className={`flex-1 py-2 px-2.5 rounded-lg border text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/30 ${inputBg} ${inputBorder} ${textPrimary}`}
                            >
                                {MOBILE_SORT_OPTIONS.map((opt) => (
                                    <option key={opt.key} value={opt.key}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                )}

                {pageTab === 'shops' && showFilters && (
                    <ShopBillingFiltersPanel
                        filters={billingFilters}
                        onChange={setBillingFilters}
                        onClear={() => setBillingFilters(EMPTY_BILLING_FILTERS)}
                        darkMode={darkMode}
                        borderColor={borderColor}
                        textMuted={textMuted}
                        textSecondary={textSecondary}
                    />
                )}

                {pageTab === 'shops' && (
                    <div className="px-3 pb-2.5 sm:px-4">
                        <ShopLifecycleTabBar
                            activeTab={lifecycleTab}
                            onChange={setLifecycleTab}
                            counts={lifecycleCounts}
                            darkMode={darkMode}
                            borderColor={borderColor}
                        />
                    </div>
                )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
                <div className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto w-full space-y-4 pb-8">
                    {pageTab === 'mandates' ? (
                        <MandateRestoreRequests showToast={showToast} darkMode={darkMode} embedded />
                    ) : (
                        <>
                    {isLoading && shops.length > 0 && (
                        <div className={`flex items-center gap-2 text-xs font-bold ${textSecondary}`}>
                            <Loader className="w-4 h-4 animate-spin text-indigo-500" />
                            Updating…
                        </div>
                    )}

                    {/* Mobile / tablet — single column cards */}
                    <div className="flex flex-col gap-3 lg:hidden">
                        {filteredAndSortedShops.length === 0 ? (
                            <div className={`py-16 text-center rounded-2xl border ${borderColor} ${cardBg}`}>
                                <Store className={`w-10 h-10 mx-auto mb-3 opacity-30 ${textMuted}`} />
                                <p className={`text-sm font-medium ${textMuted}`}>
                                    {lifecycleTab === 'trial'
                                        ? 'No shops on trial period match your search or filters.'
                                        : lifecycleTab === 'billing'
                                          ? 'No shops on billing cycle match your search or filters.'
                                          : 'No shops match your search or filters.'}
                                </p>
                            </div>
                        ) : (
                            filteredAndSortedShops.map((shop) => (
                                <MobileShopCard
                                    key={shop.id}
                                    shop={shop}
                                    darkMode={darkMode}
                                    isLoading={isLoading}
                                    onToggleStatus={() => requestToggleAccountStatus(shop)}
                                    onPayments={() => handleOpenPaymentModal(shop.id, shop.name, shop.plan)}
                                    onStaff={() => openStaffModal(shop)}
                                    onDetails={() => openDetailsModal(shop)}
                                    onDelete={() => requestDeleteShop(shop.id, shop.name)}
                                />
                            ))
                        )}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden lg:block w-full">
                            <div className={`overflow-x-auto rounded-2xl border ${borderColor} ${darkMode ? 'bg-gray-900/40' : 'bg-white/50'} backdrop-blur-sm`}>
                                <table className={`min-w-full table-auto divide-y ${borderColor}`}>
                                    <thead className={`${darkMode ? 'bg-gray-800/80' : 'bg-slate-100/80'} sticky top-0 z-10`}>
                                        <tr>
                                            <th onClick={() => handleSort('name')} className={`px-6 py-4 text-left text-xs font-semibold ${textSecondary} tracking-wider cursor-pointer hover:${textPrimary} transition-colors`}>
                                                <div className="flex items-center">Shop <SortIcon columnKey="name" /></div>
                                            </th>
                                            <th onClick={() => handleSort('dateJoined')} className={`px-6 py-4 text-left text-xs font-semibold ${textSecondary} tracking-wider cursor-pointer hover:${textPrimary} transition-colors`}>
                                                <div className="flex items-center">Joined <SortIcon columnKey="dateJoined" /></div>
                                            </th>
                                            <th onClick={() => handleSort('plan')} className={`px-6 py-4 text-center text-xs font-semibold ${textSecondary} tracking-wider cursor-pointer hover:${textPrimary} transition-colors`}>
                                                <div className="flex items-center justify-center">Plan / history <SortIcon columnKey="plan" /></div>
                                            </th>
                                            <th className={`px-6 py-4 text-center text-xs font-semibold ${textSecondary} tracking-wider`}>Subscription</th>
                                            <th className={`px-6 py-4 text-center text-xs font-semibold ${textSecondary} tracking-wider`}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${borderColor}`}>
                                        {filteredAndSortedShops.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className={`px-6 py-20 text-center ${textMuted}`}>
                                                    {lifecycleTab === 'trial'
                                                        ? 'No shops on trial period match your search or filters.'
                                                        : lifecycleTab === 'billing'
                                                          ? 'No shops on billing cycle match your search or filters.'
                                                          : 'No shops found matching your search or filters.'}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredAndSortedShops.map((shop) => {
                                                const rowHover = darkMode ? 'hover:bg-gray-800/30' : 'hover:bg-slate-50';
                                                return (
                                                <tr key={shop.id} className={`${rowHover} transition-colors group`}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0"><Store className="w-4 h-4 text-indigo-400" /></div>
                                                            <span className={`text-sm font-semibold ${textPrimary} group-hover:text-indigo-400 transition-colors truncate max-w-[150px]`}>{shop.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className={`px-6 py-4 whitespace-nowrap text-xs ${textSecondary} font-medium`}>{shop.dateJoined}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <PlanHistoryHint
                                                                plan={shop.plan}
                                                                planHistoryDisplay={shop.planHistoryDisplay}
                                                                darkMode={darkMode}
                                                            />
                                                            <span className={`text-[10px] flex items-center gap-1 ${shop.dueStatus.isUrgent ? 'text-red-400' : textMuted}`}>
                                                                <Clock className="w-3 h-3" /> {shop.dueStatus.text}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center"><SubscriptionStatusBadge status={shop.subscriptionStatus} /></td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <div className="flex justify-center gap-2">
                                                            <button type="button" title="View contact, performance & team" onClick={() => openDetailsModal(shop)} className={`p-2 rounded-lg transition-all cursor-pointer ${darkMode ? 'text-sky-400 hover:bg-sky-500/10' : 'text-sky-600 hover:bg-sky-50'}`}>
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                            <button type="button" title="View staff" onClick={() => openStaffModal(shop)} className={`p-2 rounded-lg transition-all cursor-pointer ${darkMode ? 'text-teal-400 hover:bg-teal-500/10' : 'text-teal-600 hover:bg-teal-50'}`}>
                                                                <Users className="w-4 h-4" />
                                                            </button>
                                                            <button type="button" title={shop.isActive ? 'Deactivate' : 'Activate'} onClick={() => requestToggleAccountStatus(shop)} disabled={isLoading} className={`p-2 rounded-lg transition-all cursor-pointer disabled:opacity-50 ${shop.isActive ? 'text-amber-500 hover:bg-amber-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`}>
                                                                {shop.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                                            </button>
                                                            <button type="button" title="Payments" onClick={() => handleOpenPaymentModal(shop.id, shop.name, shop.plan)} className="p-2 text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all cursor-pointer"><CreditCard className="w-4 h-4" /></button>
                                                            <button type="button" title="Delete shop" onClick={() => requestDeleteShop(shop.id, shop.name)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                    </div>
                        </>
                    )}
                </div>
            </div>

            <PaymentModal
                isOpen={paymentModal.isOpen}
                onClose={handleClosePaymentModal}
                shopId={paymentModal.shopId}
                shopName={paymentModal.shopName}
                shopPlan={paymentModal.shopPlan}
                apiClient={apiClient}
                API={API}
                showToast={showToast}
                darkMode={darkMode}
            />

            <ShopDetailsModal
                isOpen={detailsModal.isOpen}
                onClose={closeDetailsModal}
                shop={detailsModal.shop}
                darkMode={darkMode}
                onViewStaff={openStaffModal}
            />

            <ShopStaffModal
                isOpen={staffModal.isOpen}
                onClose={closeStaffModal}
                shopName={staffModal.shopName}
                managers={staffModal.managers}
                cashiers={staffModal.cashiers}
                loading={staffModal.loading}
                activeTab={staffModal.tab}
                onTabChange={(tab) => setStaffModal((prev) => ({ ...prev, tab }))}
                darkMode={darkMode}
            />
        </main>
    );
};

export default UserManagement;