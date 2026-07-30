import React, { useState, useEffect, useCallback } from 'react';
import {
    ArrowLeft, CheckCircle, Crown, Zap, Building2,
    Loader, CreditCard, AlertCircle, IndianRupee, XCircle, ChevronRight, Info, ShieldCheck
} from 'lucide-react';
import API from '../config/api';
import PlanCard from './PlanCard';
import BillingNoticeBanner from './BillingNoticeBanner';
import { PlanUpgradeInitialSkeleton } from './skeletons/PageSkeletons';
import {
    getPlanBillingStatusDisplay,
    interpretCancelSubscriptionResponse,
    CANCELLED_ACCESS_STATUSES,
    hasInclusiveBillingAccess,
    isTerminalCancelledSubscriptionStatus,
    readStoredOwnerBillingAlert,
    readStoredOwnerSubscriptionCancelled,
    writeStoredOwnerSubscriptionCancelled,
    clearOwnerSubscriptionCancelledState,
    isActiveSubscriptionStatus,
    planDetailsAfterCancelSuccess,
    resolveOwnerTrialBillingState,
    extractCurrentPlanApiPayload,
    parseBillingDate,
    readCachedCurrentPlanSnapshot,
    writeCachedCurrentPlanSnapshot,
    clearCachedCurrentPlanSnapshot,
    syncCurrentUserPlanFields,
} from '../utils/subscriptionBillingUi'; 

const PLAN_TIER = { basic: 1, pro: 2, premium: 3 };

const plansAtOrAboveCurrent = (plans, currentPlanName) => {
    const currentTier = PLAN_TIER[String(currentPlanName || 'basic').toLowerCase()] || 0;
    return plans.filter((plan) => (PLAN_TIER[plan.id] || 0) >= currentTier);
};

const DEMO_PLANS = [
    {
        id: 'basic',
        name: 'BASIC',
        price: 499,
        features: ['3 Users (Owner + 2 Staff)', 'Full Inventory Management', 'Digital Khata', 'Basic Reports', 'Email Support'],
        maxUsers: 3,
        maxInventory: 1000,
    },
    {
        id: 'pro',
        name: 'PRO',
        price: 999,
        features: ['Unlimited Staff', 'Advanced Inventory', 'Bulk Tools', 'SMS Reminders', 'Priority Support', 'Advanced Reports'],
        maxUsers: -1,
        maxInventory: 10000,
    },
    {
        id: 'premium',
        name: 'PREMIUM',
        price: 2999,
        features: ['Unlimited Users', 'Supply Chain Management', 'Multi-Store (Up to 5)', 'Advanced Reports', '24/7 Priority Support', 'Dedicated Manager'],
        maxUsers: -1,
        maxInventory: -1,
    }
];

const loadRazorpayScript = (src) => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

// --- MODALS (match app modal design) ---
const ConfirmationModal = ({ isUpgrading, selectedPlan, setShowConfirmModal, startUpgradeFlow, getModalWarningMessage, darkMode }) => {
    if (!selectedPlan) return null;
    const modalWarning = getModalWarningMessage(selectedPlan);
    const isYellowWarning = modalWarning.icon === 'yellow';
    
    return (
        <div className={`fixed inset-0 flex items-center justify-center z-[200] p-3 sm:p-4 md:p-6 overflow-y-auto backdrop-blur-md ${darkMode ? 'bg-gray-950/80' : 'bg-black/50'}`} role="dialog" aria-modal="true">
            <div className={`w-full max-w-md rounded-xl sm:rounded-2xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-200 my-auto max-h-[95vh] flex flex-col ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className={`p-3 sm:p-4 border-b flex justify-between items-center flex-shrink-0 ${darkMode ? 'border-slate-800 bg-gray-950' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-indigo-500/10 rounded-lg text-indigo-500 shrink-0">
                            <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                            <h2 className={`text-sm sm:text-base font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                Confirm {selectedPlan.name}
                            </h2>
                            <p className={`text-[9px] font-bold tracking-widest uppercase mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Tier change</p>
                        </div>
                    </div>
                </div>
                
                <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
                    <p className={`text-sm font-bold leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700'}`} dangerouslySetInnerHTML={{ __html: modalWarning.title }} />
                    <div className={`rounded-xl p-3 sm:p-4 flex items-start gap-3 border ${isYellowWarning ? 'bg-amber-500/10 border-amber-500/20' : 'bg-indigo-500/10 border-indigo-500/20'}`}>
                        <Info className={`w-5 h-5 shrink-0 mt-0.5 ${isYellowWarning ? 'text-amber-500' : 'text-indigo-500'}`} />
                        <p className={`text-[11px] font-bold leading-relaxed ${isYellowWarning ? (darkMode ? 'text-amber-200/90' : 'text-amber-900') : (darkMode ? 'text-indigo-200/90' : 'text-indigo-900')}`} dangerouslySetInnerHTML={{ __html: modalWarning.detail }} />
                    </div>
                </div>

                <div className={`p-3 sm:p-4 border-t flex flex-col gap-2 ${darkMode ? 'border-slate-800' : 'border-slate-200'} flex-shrink-0`}>
                    <button
                        onClick={() => startUpgradeFlow(selectedPlan)}
                        disabled={isUpgrading}
                        className="w-full py-3 sm:py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs tracking-widest transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                    >
                        {isUpgrading ? <Loader className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                        {isUpgrading ? 'Processing...' : 'Authorize payment'}
                    </button>
                    <button
                        onClick={() => setShowConfirmModal(false)}
                        disabled={isUpgrading}
                        className={`w-full py-2.5 text-xs font-bold rounded-xl transition ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

const CancellationModal = ({
    isCancelling,
    planDetails,
    setShowCancelModal,
    alreadyInTerminalState,
    isCurrentlyInTrial,
    handleConfirmCancellation,
    cancellationMessage,
    cancelResult,
    getAccessEndLabel,
    darkMode,
}) => {
    return (
        <div className={`fixed inset-0 flex items-center justify-center z-[200] p-3 sm:p-4 md:p-6 overflow-y-auto backdrop-blur-md ${darkMode ? 'bg-gray-950/80' : 'bg-black/50'}`} role="dialog" aria-modal="true">
            <div className={`w-full max-w-md rounded-xl sm:rounded-2xl shadow-2xl border overflow-hidden my-auto max-h-[95vh] flex flex-col ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className={`p-3 sm:p-4 border-b flex justify-between items-center flex-shrink-0 ${darkMode ? 'border-slate-800 bg-gray-950' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-red-500/10 rounded-lg text-red-500 shrink-0">
                            <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                            <h2 className={`text-sm sm:text-base font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                {alreadyInTerminalState ? 'Subscription status' : 'Cancel subscription'}
                            </h2>
                            <p className={`text-[9px] font-bold tracking-widest uppercase mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Warning</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
                    {cancelResult ? (
                        <BillingNoticeBanner
                            variant={cancelResult.ok ? (cancelResult.toastType === 'info' ? 'info' : 'success') : 'danger'}
                            title={cancelResult.title}
                            message={cancelResult.message}
                            darkMode={darkMode}
                        />
                    ) : (
                        <>
                            <p
                                className={`text-sm font-bold leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}
                                dangerouslySetInnerHTML={{ __html: cancellationMessage }}
                            />
                            <div
                                className={`rounded-xl p-3 sm:p-4 flex items-start gap-3 border ${darkMode ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'}`}
                            >
                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <p
                                    className={`text-[11px] font-bold leading-relaxed ${darkMode ? 'text-red-300' : 'text-red-700'}`}
                                    dangerouslySetInnerHTML={{
                                        __html: alreadyInTerminalState
                                            ? `You still have access until <strong>${getAccessEndLabel()}</strong>. No further charges will be made.`
                                            : isCurrentlyInTrial()
                                              ? `After you confirm: your trial mandate ends and you will <strong>not</strong> be charged for a monthly plan. Access until <strong>${getAccessEndLabel()}</strong>.`
                                              : `After you confirm: future monthly billing stops. Access until <strong>${getAccessEndLabel()}</strong>.`,
                                    }}
                                />
                            </div>
                        </>
                    )}
                </div>
                <div className={`p-3 sm:p-4 border-t flex flex-col gap-2 ${darkMode ? 'border-slate-800' : 'border-slate-200'} flex-shrink-0`}>
                    {!alreadyInTerminalState && !cancelResult && (
                        <button
                            type="button"
                            onClick={handleConfirmCancellation}
                            disabled={isCancelling}
                            className="w-full py-3 sm:py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-xs tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {isCancelling ? (
                                <Loader className="w-4 h-4 animate-spin mx-auto" />
                            ) : (
                                'Confirm cancellation'
                            )}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setShowCancelModal(false)}
                        className={`w-full py-2.5 text-xs font-bold rounded-xl border transition active:scale-[0.98] ${
                            darkMode
                                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                        }`}
                    >
                        {cancelResult || alreadyInTerminalState ? 'Close' : 'Keep plan'}
                    </button>
                </div>
            </div>
        </div>
    );
};

/** Optional plan patch for cached user, then hard-reload so UI (menus, premium, outlets) matches the server. */
const reloadAppAfterSubscriptionChange = (planUpper = null) => {
    clearOwnerSubscriptionCancelledState();
    clearCachedCurrentPlanSnapshot();
    const plan = planUpper ? String(planUpper).toUpperCase() : null;
    if (plan) {
        try {
            const raw = localStorage.getItem('currentUser');
            if (raw) {
                const u = JSON.parse(raw);
                u.plan = plan;
                u.subscriptionStatus = 'active';
                u.isInTrial = false;
                localStorage.setItem('currentUser', JSON.stringify(u));
            }
        } catch (_) { /* ignore */ }
    }
    window.dispatchEvent(new Event('pocketpos:refresh-billing-alert'));
    window.setTimeout(() => {
        window.location.reload();
    }, 450);
};

const applyActiveSubscriptionLocalState = (planUpper, setCurrentPlan, setPlanDetails, setBillingAlert, setOwnerMarkedCancelled, setPlanApiSnapshot) => {
    clearOwnerSubscriptionCancelledState();
    clearCachedCurrentPlanSnapshot();
    setOwnerMarkedCancelled(false);
    setBillingAlert(null);
    const plan = String(planUpper || '').toUpperCase();
    if (plan) setCurrentPlan(plan);
    setPlanDetails((prev) => ({
        ...prev,
        subscriptionCancelled: false,
        subscriptionStatus: 'active',
        isInTrial: false,
    }));
    setPlanApiSnapshot?.((prev) => ({
        ...(prev && typeof prev === 'object' ? prev : {}),
        plan,
        subscriptionStatus: 'active',
        isInTrial: false,
    }));
    try {
        const raw = localStorage.getItem('currentUser');
        if (raw) {
            const u = JSON.parse(raw);
            if (plan) u.plan = plan;
            u.subscriptionStatus = 'active';
            u.isInTrial = false;
            localStorage.setItem('currentUser', JSON.stringify(u));
        }
    } catch (_) { /* ignore */ }
    window.dispatchEvent(new Event('pocketpos:refresh-billing-alert'));
};

const PlanUpgrade = ({ apiClient, showToast, currentUser, onBack, darkMode, onSubscriptionAccessEnded }) => {
    const [currentPlan, setCurrentPlan] = useState(() => {
        const cached = readCachedCurrentPlanSnapshot();
        const fromCache = cached?.plan ? String(cached.plan).toUpperCase() : '';
        const fromUser = String(currentUser?.plan || '').toUpperCase();
        return fromCache || fromUser || null;
    });
    const [availablePlans, setAvailablePlans] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpgrading, setIsUpgrading] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [planApiSnapshot, setPlanApiSnapshot] = useState(() => readCachedCurrentPlanSnapshot());
    const [planDetails, setPlanDetails] = useState(() => {
        const cached = readCachedCurrentPlanSnapshot();
        const end =
            parseBillingDate(cached?.nextChargeAt) ||
            parseBillingDate(cached?.planEndDate) ||
            parseBillingDate(currentUser?.planEndDate);
        const status = cached?.subscriptionStatus || currentUser?.subscriptionStatus || null;
        const statusLower = String(status || '').toLowerCase();
        const inTrial =
            Boolean(cached?.isInTrial) ||
            statusLower === 'authenticated' ||
            statusLower === 'created';
        return {
            planEndDate: end,
            nextChargeAt: end,
            subscriptionStatus: status,
            isInTrial: inTrial,
            subscriptionCancelled: Boolean(cached?.subscriptionCancelled),
        };
    });
    const [cancellationMessage, setCancellationMessage] = useState('');
    const [billingAlert, setBillingAlert] = useState(() => readStoredOwnerBillingAlert());
    const ownerUserId = currentUser?._id || currentUser?.id;
    const [ownerMarkedCancelled, setOwnerMarkedCancelled] = useState(() =>
        readStoredOwnerSubscriptionCancelled(ownerUserId)
    );
    const [cancelModalResult, setCancelModalResult] = useState(null);
    const [pageNotice, setPageNotice] = useState(null);
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (date) => {
        if (!date) return null;
        const dateObj = date instanceof Date ? date : new Date(date);
        if (Number.isNaN(dateObj.getTime())) return null;
        return dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const getNextPaymentDate = useCallback(() => {
        const fromApi =
            parseBillingDate(planApiSnapshot?.nextChargeAt) ||
            parseBillingDate(planApiSnapshot?.planEndDate);
        if (fromApi) return fromApi;
        const d = planDetails.nextChargeAt || planDetails.planEndDate;
        return d instanceof Date && !Number.isNaN(d.getTime()) ? d : parseBillingDate(d);
    }, [planApiSnapshot, planDetails.nextChargeAt, planDetails.planEndDate]);

    const getAccessEndLabel = useCallback(() => {
        const formatted = formatDate(getNextPaymentDate());
        if (formatted) return formatted;
        return planDetails.isInTrial ? 'the end of your free trial' : 'the end of your access period';
    }, [getNextPaymentDate, planDetails.isInTrial]);

    const hasCancelledSubscriptionStatus = useCallback(() => {
        return (
            isTerminalCancelledSubscriptionStatus(planDetails.subscriptionStatus) ||
            isTerminalCancelledSubscriptionStatus(currentUser?.subscriptionStatus)
        );
    }, [planDetails.subscriptionStatus, currentUser?.subscriptionStatus]);

    const isCurrentPlanNotExpiring = useCallback((plan) => {
        if (
            hasCancelledSubscriptionStatus() ||
            planDetails.subscriptionCancelled ||
            ownerMarkedCancelled ||
            readStoredOwnerSubscriptionCancelled(ownerUserId)
        ) {
            return false;
        }
        const hasAccess = hasInclusiveBillingAccess(planDetails.planEndDate);
        const isExpiring =
            hasAccess &&
            !['active', 'authenticated'].includes(planDetails.subscriptionStatus);
        return currentPlan?.toLowerCase() === plan.id && !isExpiring;
    }, [
        currentPlan,
        planDetails.planEndDate,
        planDetails.subscriptionStatus,
        planDetails.subscriptionCancelled,
        hasCancelledSubscriptionStatus,
        ownerMarkedCancelled,
        ownerUserId,
    ]);

    const isUpgrade = useCallback((plan) => {
        const currentOrder = PLAN_TIER[currentPlan?.toLowerCase()] || 0;
        const planOrderValue = PLAN_TIER[plan.id] || 0;
        return planOrderValue > currentOrder;
    }, [currentPlan]);

    const isDowngrade = useCallback((plan) => {
        const currentOrder = PLAN_TIER[currentPlan?.toLowerCase()] || 0;
        const planOrderValue = PLAN_TIER[plan.id] || 0;
        return planOrderValue < currentOrder;
    }, [currentPlan]);

    const isAlreadyCancelledOrPending = useCallback(() => {
        return (
            hasCancelledSubscriptionStatus() &&
            hasInclusiveBillingAccess(planDetails.planEndDate)
        );
    }, [hasCancelledSubscriptionStatus, planDetails.planEndDate]);

    const isSamePlanAndCancelled = useCallback((plan) => {
        return (
            currentPlan?.toLowerCase() === plan.id &&
            (hasCancelledSubscriptionStatus() ||
                planDetails.subscriptionCancelled ||
                ownerMarkedCancelled ||
                readStoredOwnerSubscriptionCancelled(ownerUserId))
        );
    }, [
        currentPlan,
        hasCancelledSubscriptionStatus,
        planDetails.subscriptionCancelled,
        ownerMarkedCancelled,
        ownerUserId,
    ]);

    const isCurrentlyInTrial = useCallback(() => {
        if (planApiSnapshot?.isInTrial === false) return false;
        if (planDetails.isInTrial === false && planApiSnapshot?.isInTrial !== true) return false;
        if (planDetails.isInTrial || planApiSnapshot?.isInTrial === true) return true;
        const status = String(
            planDetails.subscriptionStatus ||
                planApiSnapshot?.subscriptionStatus ||
                ''
        ).toLowerCase();
        if (status === 'trial_cancellation_pending') return false;
        if (status === 'active') return false;
        if (status === 'authenticated' || status === 'created') return true;
        return false;
    }, [
        planDetails.isInTrial,
        planDetails.subscriptionStatus,
        planApiSnapshot,
    ]);

    const fetchPlanData = useCallback(async () => {
        setIsLoading(true);
        const localFallbackPlan = String(currentUser?.plan || 'BASIC').toUpperCase();
        try {
            const planResponse = await apiClient.get(API.currentPlan);
            const payload = extractCurrentPlanApiPayload(planResponse);
            writeCachedCurrentPlanSnapshot(payload);
            setPlanApiSnapshot(payload);

            const fetchedPlanName = payload?.plan?.toUpperCase() || localFallbackPlan;
            let fetchedPlanEndDate =
                parseBillingDate(payload?.nextChargeAt) ||
                parseBillingDate(payload?.planEndDate);
            let fetchedNextCharge =
                parseBillingDate(payload?.nextChargeAt) || fetchedPlanEndDate;
            if (!fetchedPlanEndDate) {
                fetchedPlanEndDate = parseBillingDate(currentUser?.planEndDate);
                fetchedNextCharge = fetchedPlanEndDate;
            }
            const fetchedSubscriptionStatus = payload?.subscriptionStatus || null;
            const statusLower = String(fetchedSubscriptionStatus || '').toLowerCase();
            const fromApiCancelled = Boolean(payload?.subscriptionCancelled);
            const fromStatusCancelled = isTerminalCancelledSubscriptionStatus(fetchedSubscriptionStatus);
            const apiInTrial =
                payload?.isInTrial === true ||
                payload?.isInTrial === 1 ||
                String(payload?.isInTrial || '').toLowerCase() === 'true';
            const paymentDate = fetchedNextCharge || fetchedPlanEndDate;
            const hasFutureCharge = paymentDate && paymentDate > new Date();
            const statusIsLive =
                isActiveSubscriptionStatus(fetchedSubscriptionStatus) ||
                statusLower === 'created';

            let subscriptionCancelled;
            if (apiInTrial && statusLower !== 'trial_cancellation_pending') {
                clearOwnerSubscriptionCancelledState();
                setOwnerMarkedCancelled(false);
                subscriptionCancelled = false;
            } else if (
                isActiveSubscriptionStatus(fetchedSubscriptionStatus) &&
                !fromApiCancelled &&
                !fromStatusCancelled
            ) {
                clearOwnerSubscriptionCancelledState();
                setOwnerMarkedCancelled(false);
                subscriptionCancelled = false;
            } else {
                const fromStorageCancelled = readStoredOwnerSubscriptionCancelled(ownerUserId);
                subscriptionCancelled =
                    fromApiCancelled || fromStatusCancelled || fromStorageCancelled;
                if (subscriptionCancelled) {
                    setOwnerMarkedCancelled(true);
                }
            }

            const apiSaysActive =
                !subscriptionCancelled &&
                ((isActiveSubscriptionStatus(fetchedSubscriptionStatus) && !fromApiCancelled) ||
                    apiInTrial);

            setCurrentPlan(fetchedPlanName);
            const inferredInTrial = subscriptionCancelled
                ? false
                : apiInTrial
                  ? true
                  : payload?.isInTrial === false
                    ? false
                    : statusLower === 'authenticated' || statusLower === 'created';
            setPlanDetails({
                planEndDate: fetchedPlanEndDate,
                nextChargeAt: fetchedNextCharge,
                subscriptionStatus: fetchedSubscriptionStatus,
                isInTrial: subscriptionCancelled ? false : inferredInTrial,
                subscriptionCancelled,
            });
            syncCurrentUserPlanFields(fetchedPlanName, {
                planEndDate: fetchedPlanEndDate?.toISOString?.() || payload?.planEndDate || null,
                nextChargeAt: fetchedNextCharge?.toISOString?.() || payload?.nextChargeAt || null,
                subscriptionStatus: fetchedSubscriptionStatus,
                isInTrial: subscriptionCancelled ? false : inferredInTrial,
            });
            const alertFromApi = payload?.billingAlert;
            if (apiSaysActive) {
                setBillingAlert(null);
            } else if (alertFromApi?.show) {
                setBillingAlert(alertFromApi);
            } else if (subscriptionCancelled) {
                setBillingAlert(readStoredOwnerBillingAlert());
            } else {
                setBillingAlert(null);
            }
            setAvailablePlans(plansAtOrAboveCurrent(DEMO_PLANS, fetchedPlanName));

            if (
                payload?.success &&
                payload.accessAllowed === false &&
                !payload.mandateRestoreRequired
            ) {
                onSubscriptionAccessEnded?.();
            }
        } catch (error) {
            console.error("Error fetching plan data:", error);
            const cached = readCachedCurrentPlanSnapshot();
            if (cached?.plan) {
                setPlanApiSnapshot(cached);
                const end =
                    parseBillingDate(cached.nextChargeAt) ||
                    parseBillingDate(cached.planEndDate);
                const status = cached.subscriptionStatus || null;
                const statusLower = String(status || '').toLowerCase();
                setCurrentPlan(String(cached.plan).toUpperCase());
                setPlanDetails({
                    planEndDate: end,
                    nextChargeAt: end,
                    subscriptionStatus: status,
                    isInTrial:
                        Boolean(cached.isInTrial) ||
                        statusLower === 'authenticated' ||
                        statusLower === 'created',
                    subscriptionCancelled: Boolean(cached.subscriptionCancelled),
                });
            } else {
                setCurrentPlan(localFallbackPlan);
            }
            setAvailablePlans(plansAtOrAboveCurrent(DEMO_PLANS, localFallbackPlan));
            showToast('Failed to sync billing data.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [apiClient, currentUser?.plan, currentUser?.planEndDate, ownerUserId, showToast, onSubscriptionAccessEnded]);

    useEffect(() => {
        fetchPlanData();
    }, [fetchPlanData]);

    useEffect(() => {
        const onRefresh = () => fetchPlanData();
        window.addEventListener('pocketpos:refresh-billing-alert', onRefresh);
        return () => window.removeEventListener('pocketpos:refresh-billing-alert', onRefresh);
    }, [fetchPlanData]);

    const handleUpgradeClick = (plan) => {
        if (isCurrentPlanNotExpiring(plan) && plan.id === currentPlan?.toLowerCase()) {
            showToast('Already active on this plan.', 'info');
            return;
        }
        if (isDowngrade(plan)) {
            showToast('Downgrading is not allowed. Upgrade to a higher plan or cancel your subscription.', 'info');
            return;
        }
        if (!isUpgrade(plan) && !isSamePlanAndCancelled(plan)) {
            showToast('Plan changes are limited to upgrades only.', 'info');
            return;
        }
        setSelectedPlan(plan);
        setShowConfirmModal(true);
    };

    const handleVerifyPlanChange = async (response, newPlanId) => {
        setIsUpgrading(true);
        setShowConfirmModal(false);
        let reloadAfter = false;
        let verifiedPlanUpper = null;
        try {
            const verificationResponse = await apiClient.post(API.verifyPlanChange, {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                razorpay_subscription_id: response.razorpay_subscription_id,
                newPlan: newPlanId.toUpperCase(),
            });
            if (verificationResponse.data.success) {
                verifiedPlanUpper = newPlanId.toUpperCase();
                applyActiveSubscriptionLocalState(
                    verifiedPlanUpper,
                    setCurrentPlan,
                    setPlanDetails,
                    setBillingAlert,
                    setOwnerMarkedCancelled,
                    setPlanApiSnapshot
                );
                showToast(`Plan updated to ${verifiedPlanUpper}. Refreshing…`, 'success');
                reloadAfter = true;
            } else {
                showToast(verificationResponse.data.error || 'Verification failed.', 'error');
            }
        } catch (error) {
            showToast('Sync error. Contact support.', 'error');
        } finally {
            setIsUpgrading(false);
            if (!reloadAfter) fetchPlanData();
        }
        if (reloadAfter) {
            reloadAppAfterSubscriptionChange(verifiedPlanUpper);
        }
    };

    const startUpgradeFlow = async (newPlan) => {
        setIsUpgrading(true);
        setShowConfirmModal(false);
        const res = await loadRazorpayScript('https://checkout.razorpay.com/v1/checkout.js');
        if (!res) {
            showToast('Gateway offline.', 'error');
            setIsUpgrading(false);
            return;
        }
        try {
            const serverResponse = await apiClient.post(API.upgradePlan, {
                newPlan: newPlan.id.toUpperCase(),
            });
            const { subscriptionId, amount, currency, keyId } = serverResponse.data;
            const options = {
                key: keyId, amount, currency,
                name: "Pocket POS",
                description: `${newPlan.name} Mandate`,
                subscription_id: subscriptionId,
                handler: (r) => handleVerifyPlanChange(r, newPlan.id),
                prefill: { name: currentUser?.name || "Merchant", email: currentUser?.email || "" },
                theme: { color: "#6366f1" }
            };
            const rzp1 = new window.Razorpay(options);
            rzp1.open();
        } catch (error) {
            showToast('Gateway Error.', 'error');
            setIsUpgrading(false);
        }
    };

    const handlePrepareCancellation = () => {
        setCancelModalResult(null);
        const planName = currentPlan;
        const endDateString = getAccessEndLabel();
        let msg = '';
        if (isAlreadyCancelledOrPending()) {
            msg = `Your subscription is <strong>already cancelled</strong>. Auto-debit is off. You can use Pocket POS until <strong>${endDateString}</strong>.`;
        } else if (planDetails.subscriptionStatus === 'pending') {
            msg = `Your last payment failed. Schedule cancellation for <strong>${planName}</strong>? Razorpay will retry collecting the due amount, then auto-debit stops. Access until <strong>${endDateString}</strong> where applicable. One tap — no need to cancel again.`;
        } else if (planDetails.subscriptionStatus === 'cancellation_pending') {
            msg = `Cancellation is already scheduled. Razorpay may retry your due payment, then billing stops. Access until <strong>${endDateString}</strong>.`;
        } else if (isCurrentlyInTrial()) {
            msg = `End your <strong>${planName}</strong> free trial? Your payment mandate will be removed and you will <strong>not</strong> be charged for a monthly plan. You can keep using Pocket POS until <strong>${endDateString}</strong>.`;
        } else {
            msg = `Cancel <strong>${planName}</strong>? Future monthly billing stops. You keep full access until <strong>${endDateString}</strong>.`;
        }
        setCancellationMessage(msg);
        setShowCancelModal(true);
    };

    const handleConfirmCancellation = async () => {
        setIsCancelling(true);
        setCancelModalResult(null);
        try {
            const response = await apiClient.post(API.cancelSubscription);
            const result = interpretCancelSubscriptionResponse(response.data);

            setCancelModalResult(result);

            if (result.ok) {
                writeStoredOwnerSubscriptionCancelled(ownerUserId);
                setOwnerMarkedCancelled(true);
                const nextEnd = result.planEndDate
                    ? new Date(result.planEndDate)
                    : planDetails.planEndDate;
                setPlanDetails((prev) => ({
                    ...planDetailsAfterCancelSuccess(prev, result),
                    planEndDate: nextEnd || prev.planEndDate,
                }));
                window.dispatchEvent(new Event('pocketpos:refresh-billing-alert'));
            }

            setPageNotice({
                variant:
                    result.ok
                        ? result.toastType === 'info'
                            ? 'info'
                            : 'success'
                        : result.explainRazorpayPending
                          ? 'warning'
                          : 'danger',
                title: result.title,
                message: result.message,
            });

            showToast(result.message, result.toastType);

            if (result.ok) {
                await fetchPlanData();
            }
        } catch (error) {
            const result = interpretCancelSubscriptionResponse({
                success: false,
                error:
                    error.response?.data?.razorpayApiError ||
                    error.response?.data?.error ||
                    'Cancellation failed. Please try again or contact support.',
            });
            setCancelModalResult(result);
            setPageNotice({
                variant: 'danger',
                title: result.title,
                message: result.message,
            });
            showToast(result.message, 'error');
        } finally {
            setIsCancelling(false);
        }
    };

    const effectiveSubscriptionStatus =
        planDetails.subscriptionStatus ||
        planApiSnapshot?.subscriptionStatus ||
        currentUser?.subscriptionStatus ||
        null;
    const effectiveIsInTrial =
        planApiSnapshot?.isInTrial === false
            ? false
            : Boolean(planDetails.isInTrial || planApiSnapshot?.isInTrial === true);
    const subscriptionIsActive = isActiveSubscriptionStatus(effectiveSubscriptionStatus);
    const trialBillingUi = resolveOwnerTrialBillingState({
        subscriptionStatus: effectiveSubscriptionStatus,
        planEndDate: planDetails.planEndDate,
        nextChargeAt: getNextPaymentDate(),
        apiInTrial: effectiveIsInTrial,
        subscriptionCancelled: planDetails.subscriptionCancelled,
    });
    const onActiveFreeTrial =
        trialBillingUi.isOnFreeTrial ||
        (isCurrentlyInTrial() && planApiSnapshot?.isInTrial !== false);

    const ownerCancelledHint =
        !onActiveFreeTrial &&
        !subscriptionIsActive &&
        (planDetails.subscriptionCancelled ||
            ownerMarkedCancelled ||
            readStoredOwnerSubscriptionCancelled(ownerUserId) ||
            hasCancelledSubscriptionStatus());

    const billingStatusDisplay = getPlanBillingStatusDisplay({
        subscriptionStatus: effectiveSubscriptionStatus,
        planEndDate: getNextPaymentDate(),
        billingAlert,
        isInTrial: onActiveFreeTrial,
        subscriptionCancelled: ownerCancelledHint,
    });

    const getPlanIcon = (pId) => pId === 'premium' ? Crown : pId === 'pro' ? Zap : Building2;
    const getPlanColor = (_pId) => darkMode ? 'border-slate-700 bg-indigo-500/10' : 'border-slate-200 bg-indigo-500/10';
    const getPlanTextColor = (_pId) => darkMode ? 'text-indigo-400' : 'text-indigo-600';

    if (isLoading) {
        return <PlanUpgradeInitialSkeleton darkMode={darkMode} />;
    }

    const statusLower = String(effectiveSubscriptionStatus || '').toLowerCase();
    const cancelledByStatus = hasCancelledSubscriptionStatus();
    const isPlanExpiring = isAlreadyCancelledOrPending();
    const alreadyInTerminalState = isAlreadyCancelledOrPending();
    const needsResubscribe =
        !onActiveFreeTrial &&
        !subscriptionIsActive &&
        (ownerCancelledHint ||
            cancelledByStatus ||
            billingAlert?.variant === 'cancelled' ||
            billingAlert?.title === 'Subscription cancelled' ||
            billingStatusDisplay?.variant === 'cancelled' ||
            billingStatusDisplay?.title === 'Subscription cancelled');
    const isTrialCancelled =
        statusLower === 'trial_cancellation_pending' ||
        (needsResubscribe && effectiveIsInTrial);
    const effectiveAccessEnd = getNextPaymentDate();
    const stillHasAccess =
        hasInclusiveBillingAccess(effectiveAccessEnd) ||
        onActiveFreeTrial ||
        subscriptionIsActive;

    const isCancelledLike =
        cancelledByStatus ||
        needsResubscribe ||
        CANCELLED_ACCESS_STATUSES.has(statusLower) ||
        ['cancelled', 'cancellation_no_refund', 'trial_cancellation_pending'].includes(statusLower);
    const showTrialBadge =
        !isTrialCancelled &&
        (trialBillingUi.showTrialBadge ||
            onActiveFreeTrial ||
            billingStatusDisplay?.title === 'Free trial active');

    const renewLabel =
        onActiveFreeTrial
            ? trialBillingUi.chargeLabel
            : !stillHasAccess
              ? 'Access period ended'
              : isCancelledLike || billingStatusDisplay?.variant === 'cancelled' || isPlanExpiring
                ? `Access until ${getAccessEndLabel()}`
                : statusLower === 'pending'
                  ? 'Payment retry — see notice below'
                  : trialBillingUi.paymentLabel
                    ? `Renews ${trialBillingUi.paymentLabel}`
                    : 'Renewal date pending';

    const getModalWarningMessage = (plan) => {
        const action = isSamePlanAndCancelled(plan) ? 're-subscribe' : 'upgrade';
        const chargeNote = needsResubscribe
            ? stillHasAccess
                ? `No new free trial. Your first monthly charge is scheduled for ${getAccessEndLabel()} (end of your current access).`
                : 'No new free trial. Your first monthly charge will be within a few days after mandate setup.'
            : 'First full plan charge follows your trial or billing schedule.';
        return {
            title: `Confirm <strong>${action}</strong> to <strong>${plan.name}</strong> for <strong>${formatCurrency(plan.price)}/mo</strong>.`,
            detail: `Requires new payment mandate. ${chargeNote} Verification fee of ₹1 applies.`,
            icon: 'blue',
        };
    };

    const planGridCols =
        availablePlans.length <= 1
            ? 'md:grid-cols-1 md:max-w-md md:mx-auto'
            : availablePlans.length === 2
              ? 'md:grid-cols-2'
              : 'md:grid-cols-3';

    // Match other app pages (Settings, Profile)
    const headerBase = darkMode ? 'bg-gray-950/95 border-slate-800' : 'bg-white/95 border-slate-200 shadow-sm';
    const mainBg = darkMode ? 'bg-gray-950' : 'bg-slate-50';

    return (
        <div className={`h-full flex flex-col min-h-0 transition-colors duration-300 ${mainBg} selection:bg-indigo-500/30`}>
            <header className={`sticky top-0 z-[100] shrink-0 ${headerBase} backdrop-blur-md border-b px-3 py-3 sm:px-6 sm:py-4 ${darkMode ? 'bg-gray-950/95' : 'bg-white/95'}`}>
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                        <button 
                            onClick={onBack} 
                            type="button"
                            className={`shrink-0 touch-manipulation rounded-xl p-2 transition-all active:scale-95 ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                            <div className="shrink-0 rounded-lg bg-indigo-500/10 p-1.5 text-indigo-500 sm:p-2">
                                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                            </div>
                            <div className="min-w-0">
                                <h1 className={`truncate text-lg font-black tracking-tight sm:text-2xl ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                    Subscription <span className="text-indigo-500">&amp; Billing</span>
                                </h1>
                                <p className={`mt-0.5 truncate text-[9px] font-bold tracking-wide sm:text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                    Subscription &amp; renewals
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div className="mx-auto max-w-7xl space-y-5 px-3 pb-28 pt-3 sm:space-y-8 sm:px-4 sm:pb-24 sm:pt-4 md:p-8 md:pb-20 lg:p-10">
                {pageNotice && (
                    <BillingNoticeBanner
                        variant={pageNotice.variant}
                        title={pageNotice.title}
                        message={pageNotice.message}
                        darkMode={darkMode}
                        onDismiss={() => setPageNotice(null)}
                    />
                )}

                {billingStatusDisplay && (
                    <BillingNoticeBanner
                        variant={billingStatusDisplay.variant}
                        title={billingStatusDisplay.title}
                        message={billingStatusDisplay.message}
                        darkMode={darkMode}
                    />
                )}

                {currentPlan && (
                    <section
                        className={`overflow-hidden rounded-2xl border shadow-sm ${darkMode ? 'border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950' : 'border-slate-200 bg-gradient-to-b from-white to-slate-50'}`}
                    >
                        <div className="p-4 sm:p-6">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 items-start gap-3">
                                    <div
                                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border sm:h-14 sm:w-14 ${darkMode ? 'border-indigo-500/25 bg-indigo-500/10' : 'border-indigo-100 bg-indigo-50'}`}
                                    >
                                        <Zap className="h-6 w-6 text-indigo-500 sm:h-7 sm:w-7" />
                                        {!isPlanExpiring && <span className="sr-only">Active</span>}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className={`mb-0.5 text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                            Current plan
                                        </p>
                                        <h2 className={`text-xl font-black tracking-tight sm:text-2xl ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {currentPlan}
                                        </h2>
                                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                            {showTrialBadge && (
                                                <span
                                                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                                        darkMode
                                                            ? 'bg-sky-500/15 text-sky-300 border border-sky-500/25'
                                                            : 'bg-sky-50 text-sky-700 border border-sky-200'
                                                    }`}
                                                >
                                                    Free trial
                                                </span>
                                            )}
                                            <span
                                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                                    needsResubscribe || isPlanExpiring
                                                        ? 'animate-pulse bg-orange-500'
                                                        : planDetails.subscriptionStatus === 'pending'
                                                          ? 'animate-pulse bg-amber-500'
                                                          : 'bg-emerald-500'
                                                }`}
                                            />
                                            <span
                                                className={`text-xs font-bold ${
                                                    needsResubscribe || isPlanExpiring
                                                        ? 'text-orange-500'
                                                        : planDetails.subscriptionStatus === 'pending'
                                                          ? 'text-amber-600'
                                                          : darkMode
                                                            ? 'text-slate-400'
                                                            : 'text-slate-600'
                                                }`}
                                            >
                                                {renewLabel}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                        type="button"
                                        onClick={handlePrepareCancellation}
                                        disabled={isCancelling || planDetails.subscriptionStatus === 'cancellation_pending'}
                                        className={`touch-manipulation w-full shrink-0 rounded-xl border px-4 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 sm:w-auto sm:py-3 ${darkMode ? 'border-slate-700 bg-slate-800/80 text-red-400 hover:border-red-500/40 hover:bg-red-500/10' : 'border-slate-200 bg-white text-red-600 hover:border-red-200 hover:bg-red-50'}`}
                                    >
                                        {isCancelling
                                            ? 'Processing…'
                                            : planDetails.subscriptionStatus === 'pending'
                                              ? 'Schedule cancellation'
                                              : planDetails.subscriptionStatus === 'cancellation_pending'
                                                ? 'Cancellation scheduled'
                                                : 'Cancel subscription'}
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                <section id="compare-plans" className="scroll-mt-24 space-y-3 sm:space-y-4">
                    <div className="px-0.5">
                        <h2 className={`text-lg font-black tracking-tight sm:text-xl ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {needsResubscribe ? 'Re-subscribe' : 'Compare plans'}
                        </h2>
                        <p className={`mt-0.5 text-xs font-bold leading-snug sm:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            {needsResubscribe
                                ? isTrialCancelled
                                    ? stillHasAccess
                                        ? `Your free trial is cancelled. You can use Pocket POS until ${getAccessEndLabel()}. Pick a plan below to re-subscribe.`
                                        : 'Your free trial has ended. Pick a plan below to re-subscribe and continue.'
                                    : stillHasAccess
                                      ? `Your subscription is cancelled. You can use Pocket POS until ${getAccessEndLabel()}. Pick a plan below to re-subscribe or upgrade.`
                                      : 'Your subscription has ended. Pick a plan below to re-subscribe and continue.'
                                : 'Tap a plan below to upgrade, or manage cancellation above.'}
                        </p>
                    </div>
                    <div className={`flex w-full flex-col gap-4 sm:gap-5 md:grid md:max-w-none md:gap-6 ${planGridCols}`}>
                        {availablePlans.map((plan) => (
                            <div
                                key={plan.id}
                                className="flex w-full min-w-0"
                            >
                                <PlanCard
                                    plan={plan}
                                    currentPlanName={currentPlan}
                                    isCurrentPlanNotExpiring={isCurrentPlanNotExpiring}
                                    isSamePlanAndCancelled={isSamePlanAndCancelled}
                                    isUpgrading={isUpgrading}
                                    isCancelling={isCancelling}
                                    alreadyInTerminalState={needsResubscribe}
                                    formatCurrency={formatCurrency}
                                    getPlanIcon={getPlanIcon}
                                    getPlanColor={getPlanColor}
                                    getPlanTextColor={getPlanTextColor}
                                    handleUpgradeClick={handleUpgradeClick}
                                    darkMode={darkMode}
                                />
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* MODALS */}
            {showConfirmModal && selectedPlan && (
                <ConfirmationModal
                    isUpgrading={isUpgrading}
                    selectedPlan={selectedPlan}
                    setShowConfirmModal={setShowConfirmModal}
                    startUpgradeFlow={startUpgradeFlow}
                    getModalWarningMessage={getModalWarningMessage}
                    darkMode={darkMode}
                />
            )}
            {showCancelModal && (
                <CancellationModal
                    isCancelling={isCancelling}
                    planDetails={planDetails}
                    setShowCancelModal={() => {
                        setShowCancelModal(false);
                        setCancelModalResult(null);
                    }}
                    alreadyInTerminalState={alreadyInTerminalState}
                    isCurrentlyInTrial={isCurrentlyInTrial}
                    handleConfirmCancellation={handleConfirmCancellation}
                    cancellationMessage={cancellationMessage}
                    cancelResult={cancelModalResult}
                    getAccessEndLabel={getAccessEndLabel}
                    darkMode={darkMode}
                />
            )}
            </div>
        </div>
    );
};

export default PlanUpgrade;