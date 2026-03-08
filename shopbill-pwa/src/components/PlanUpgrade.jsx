import React, { useState, useEffect, useCallback } from 'react';
import {
    ArrowLeft, CheckCircle, Crown, Zap, Building2,
    Loader, CreditCard, AlertCircle, IndianRupee, XCircle, ChevronRight, Info, ShieldCheck
} from 'lucide-react';
import API from '../config/api';
import PlanCard from './PlanCard'; 

const DEMO_PLANS = [
    {
        id: 'basic',
        name: 'BASIC',
        price: 999,
        features: ['3 Users (Owner + 2 Staff)', 'Full Inventory Management', 'Digital Khata', 'Basic Reports', 'Email Support'],
        maxUsers: 3,
        maxInventory: 1000,
    },
    {
        id: 'pro',
        name: 'PRO',
        price: 2199,
        features: ['Unlimited Staff', 'Advanced Inventory', 'Bulk Tools', 'SMS Reminders', 'Priority Support', 'Advanced Reports'],
        maxUsers: -1,
        maxInventory: 10000,
    },
    {
        id: 'premium',
        name: 'PREMIUM',
        price: 4999,
        features: ['Unlimited Users', 'Supply Chain Management', 'Multi-Store (Up to 10)', 'Advanced Reports', '24/7 Priority Support', 'Dedicated Manager'],
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

const CancellationModal = ({ isCancelling, planDetails, setShowCancelModal, alreadyInTerminalState, isCurrentlyInTrial, handleConfirmCancellation, cancellationMessage, formatDate, darkMode }) => {
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
                    <p className={`text-sm font-bold leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700'}`} dangerouslySetInnerHTML={{ __html: cancellationMessage }} />
                    <div className={`rounded-xl p-3 sm:p-4 flex items-start gap-3 border ${darkMode ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <p className={`text-[11px] font-bold leading-relaxed ${darkMode ? 'text-red-300' : 'text-red-700'}`}
                            dangerouslySetInnerHTML={{
                                __html: isCurrentlyInTrial()
                                    ? `Mandate <strong>cancelled</strong>. Trial ends ${formatDate(planDetails.planEndDate)}.`
                                    : `Active until <strong>${formatDate(planDetails.planEndDate)}</strong>. No further charges.`
                            }}
                        />
                    </div>
                </div>
                <div className={`p-3 sm:p-4 border-t flex flex-col gap-2 ${darkMode ? 'border-slate-800' : 'border-slate-200'} flex-shrink-0`}>
                    {!alreadyInTerminalState && (
                        <button
                            onClick={handleConfirmCancellation}
                            disabled={isCancelling}
                            className="w-full py-3 sm:py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-xs tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {isCancelling ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm cancellation'}
                        </button>
                    )}
                    <button
                        onClick={() => setShowCancelModal(false)}
                        className={`w-full py-2.5 text-xs font-bold rounded-xl transition ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        {alreadyInTerminalState ? 'Dismiss' : 'Keep plan'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const PlanUpgrade = ({ apiClient, showToast, currentUser, onBack, darkMode }) => {
    const [currentPlan, setCurrentPlan] = useState(null);
    const [availablePlans, setAvailablePlans] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpgrading, setIsUpgrading] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [planDetails, setPlanDetails] = useState({
        planEndDate: null,
        subscriptionStatus: null,
    });
    const [cancellationMessage, setCancellationMessage] = useState('');

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        const dateObj = date instanceof Date ? date : new Date(date);
        return dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const isCurrentPlanNotExpiring = useCallback((plan) => {
        const isExpiring = planDetails.planEndDate && planDetails.planEndDate > new Date() &&
            !['active', 'authenticated'].includes(planDetails.subscriptionStatus);
        return currentPlan?.toLowerCase() === plan.id && !isExpiring;
    }, [currentPlan, planDetails.planEndDate, planDetails.subscriptionStatus]);

    const isUpgrade = useCallback((plan) => {
        const planOrder = { basic: 1, pro: 2, premium: 3 };
        const currentOrder = planOrder[currentPlan?.toLowerCase()] || 0;
        const planOrderValue = planOrder[plan.id] || 0;
        return planOrderValue > currentOrder;
    }, [currentPlan]);

    const isAlreadyCancelledOrPending = useCallback(() => {
        const finalStatusesWithFutureAccess = ['cancellation_pending', 'trial_cancellation_pending', 'cancellation_no_refund', 'cancelled'];
        return finalStatusesWithFutureAccess.includes(planDetails.subscriptionStatus) && planDetails.planEndDate > new Date();
    }, [planDetails.planEndDate, planDetails.subscriptionStatus]);

    const isSamePlanAndCancelled = useCallback((plan) => {
        return currentPlan?.toLowerCase() === plan.id && isAlreadyCancelledOrPending();
    }, [currentPlan, isAlreadyCancelledOrPending]);

    const isCurrentlyInTrial = useCallback(() => {
        const isFutureDate = planDetails.planEndDate && planDetails.planEndDate > new Date();
        const isNotFinal = !['cancelled', 'expired'].includes(planDetails.subscriptionStatus);
        const isTrialStatus = planDetails.subscriptionStatus === 'authenticated' || planDetails.subscriptionStatus === 'trial_cancellation_pending';
        return isFutureDate && isNotFinal && isTrialStatus;
    }, [planDetails.planEndDate, planDetails.subscriptionStatus]);

    const fetchPlanData = useCallback(async () => {
        setIsLoading(true);
        try {
            const planResponse = await apiClient.get(API.currentPlan);
            const fetchedPlanName = planResponse?.data?.plan?.toUpperCase() || 'BASIC';
            const fetchedPlanEndDate = planResponse?.data?.planEndDate ? new Date(planResponse.data.planEndDate) : null;
            const fetchedSubscriptionStatus = planResponse?.data?.subscriptionStatus || null;
            setCurrentPlan(fetchedPlanName);
            setPlanDetails({
                planEndDate: fetchedPlanEndDate,
                subscriptionStatus: fetchedSubscriptionStatus,
            });
            setAvailablePlans(DEMO_PLANS);
        } catch (error) {
            console.error("Error fetching plan data:", error);
            setCurrentPlan('BASIC');
            setAvailablePlans(DEMO_PLANS);
            showToast('Failed to sync billing data.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [apiClient, showToast]);

    useEffect(() => {
        fetchPlanData();
    }, [fetchPlanData]);

    const handleUpgradeClick = (plan) => {
        if (isCurrentPlanNotExpiring(plan) && plan.id === currentPlan?.toLowerCase()) {
            showToast('Already active on this plan.', 'info');
            return;
        }
        setSelectedPlan(plan);
        setShowConfirmModal(true);
    };

    const handleVerifyPlanChange = async (response, newPlanId) => {
        setIsUpgrading(true);
        setShowConfirmModal(false);
        try {
            const verificationResponse = await apiClient.post(API.verifyPlanChange, {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                razorpay_subscription_id: response.razorpay_subscription_id,
                newPlan: newPlanId.toUpperCase(),
            });
            if (verificationResponse.data.success) {
                showToast(`Provisioning ${newPlanId.toUpperCase()} Tier...`, 'success');
            } else {
                showToast(verificationResponse.data.error || 'Verification failed.', 'error');
            }
        } catch (error) {
            showToast('Sync error. Contact support.', 'error');
        } finally {
            setIsUpgrading(false);
            fetchPlanData();
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
        const planName = currentPlan;
        const endDateString = planDetails.planEndDate ? formatDate(planDetails.planEndDate) : 'cycle end';
        let msg = '';
        if (isAlreadyCancelledOrPending()) {
            msg = `Your subscription is already scheduled for termination. Access remains valid until <strong>${endDateString}</strong>.`;
        } else if (isCurrentlyInTrial()) {
            msg = `Cancel <strong>${planName}</strong> trial? Future mandate will be voided. Access continues until <strong>${endDateString}</strong>.`;
        } else {
            msg = `Terminate <strong>${planName}</strong>? Future billing stops immediately. Premium access persists until <strong>${endDateString}</strong>.`;
        }
        setCancellationMessage(msg);
        setShowCancelModal(true);
    };

    const handleConfirmCancellation = async () => {
        setIsCancelling(true);
        try {
            const response = await apiClient.post(API.cancelSubscription);
            if (response.data.success) {
                showToast('Cancellation Logged.', 'success');
                fetchPlanData();
            }
        } catch (error) {
            showToast('Cancellation failed.', 'error');
        } finally {
            setShowCancelModal(false);
            setIsCancelling(false);
        }
    };

    const getPlanIcon = (pId) => pId === 'premium' ? Crown : pId === 'pro' ? Zap : Building2;
    const getPlanColor = (_pId) => darkMode ? 'border-slate-700 bg-indigo-500/10' : 'border-slate-200 bg-indigo-500/10';
    const getPlanTextColor = (_pId) => darkMode ? 'text-indigo-400' : 'text-indigo-600';

    if (isLoading) {
        return (
            <div className={`min-h-screen flex flex-col items-center justify-center ${darkMode ? 'bg-gray-950' : 'bg-slate-50'}`}>
                <Loader className="w-10 h-10 animate-spin text-indigo-500" />
                <p className={`text-[10px] font-black tracking-widest mt-4 ${darkMode ? 'text-gray-500' : 'text-slate-600'}`}>Validating Billing...</p>
            </div>
        );
    }

    const isPlanExpiring = planDetails.planEndDate && planDetails.planEndDate > new Date() &&
        !['active', 'authenticated'].includes(planDetails.subscriptionStatus);
    const alreadyInTerminalState = isAlreadyCancelledOrPending();

    const getModalWarningMessage = (plan) => {
        const action = isSamePlanAndCancelled(plan) ? 're-subscribe' : isUpgrade(plan) ? 'upgrade' : 'downgrade';
        return {
            title: `Confirm <strong>${action}</strong> to <strong>${plan.name}</strong> for <strong>${formatCurrency(plan.price)}/mo</strong>.`,
            detail: `Requires new payment mandate. Current tier features will be updated immediately. Verification fee of ₹1 applies.`,
            icon: action === 'downgrade' ? 'yellow' : 'blue'
        };
    };

    // Match other app pages (Settings, Profile)
    const headerBase = darkMode ? 'bg-gray-950/95 border-slate-800' : 'bg-white/95 border-slate-200 shadow-sm';
    const mainBg = darkMode ? 'bg-gray-950' : 'bg-slate-50';

    return (
        <div className={`h-full flex flex-col min-h-0 transition-colors duration-300 ${mainBg} selection:bg-indigo-500/30`}>
            <header className={`sticky top-0 z-[100] shrink-0 ${headerBase} backdrop-blur-md border-b px-4 md:px-6 py-4 ${darkMode ? 'bg-gray-950/95' : 'bg-white/95'}`}>
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onBack} 
                            className={`p-2 rounded-xl transition-all active:scale-95 ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="p-1.5 sm:p-2 bg-indigo-500/10 rounded-lg text-indigo-500 shrink-0">
                                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div>
                                <h1 className={`text-xl sm:text-2xl font-black tracking-tight leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                    Subscription <span className="text-indigo-500">Management</span>
                                </h1>
                                <p className={`text-[9px] font-bold tracking-widest uppercase mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Manage your plan
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-10 pb-20 space-y-8 md:space-y-10">
                {/* Current subscription card - matches app card style */}
                {currentPlan && (
                    <section className={`rounded-xl sm:rounded-2xl border p-4 sm:p-6 ${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 ${darkMode ? 'bg-indigo-500/10 border border-slate-700' : 'bg-indigo-50 border border-indigo-100'}`}>
                                    <Zap className={`w-6 h-6 sm:w-7 sm:h-7 text-indigo-500`} />
                                    {!isPlanExpiring && (
                                        <span className="sr-only">Active</span>
                                    )}
                                </div>
                                <div>
                                    <p className={`text-[10px] font-bold tracking-widest uppercase mb-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Current plan</p>
                                    <h2 className={`text-lg sm:text-xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{currentPlan}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`w-1.5 h-1.5 rounded-full ${isPlanExpiring ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                                        <span className={`text-xs font-bold ${isPlanExpiring ? 'text-red-500' : darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                            {isPlanExpiring ? `Expires ${formatDate(planDetails.planEndDate)}` : `Renews ${formatDate(planDetails.planEndDate)}`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handlePrepareCancellation}
                                disabled={isCancelling}
                                className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-black text-[10px] sm:text-xs tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 shrink-0 ${darkMode ? 'bg-slate-800 border border-slate-700 text-red-400 hover:bg-red-500/10 hover:border-red-500/30' : 'bg-slate-100 border border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200'}`}
                            >
                                {isCancelling ? 'Processing...' : (isPlanExpiring ? 'Manage cancellation' : 'Cancel subscription')}
                            </button>
                        </div>
                    </section>
                )}

                {/* Plan grid */}
                <div className="space-y-4">
                    <div>
                        <h2 className={`text-lg sm:text-xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            Choose your plan
                        </h2>
                        <p className={`text-xs font-bold mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Upgrade or change your subscription
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                        {availablePlans.map((plan) => (
                            <PlanCard
                                key={plan.id}
                                plan={plan}
                                currentPlanName={currentPlan}
                                isCurrentPlanNotExpiring={isCurrentPlanNotExpiring}
                                isSamePlanAndCancelled={isSamePlanAndCancelled}
                                isUpgrade={isUpgrade}
                                isUpgrading={isUpgrading}
                                isCancelling={isCancelling}
                                alreadyInTerminalState={alreadyInTerminalState}
                                formatCurrency={formatCurrency}
                                getPlanIcon={getPlanIcon}
                                getPlanColor={getPlanColor}
                                getPlanTextColor={getPlanTextColor}
                                handleUpgradeClick={handleUpgradeClick}
                                darkMode={darkMode}
                            />
                        ))}
                    </div>
                </div>
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
                    setShowCancelModal={setShowCancelModal}
                    alreadyInTerminalState={alreadyInTerminalState}
                    isCurrentlyInTrial={isCurrentlyInTrial}
                    handleConfirmCancellation={handleConfirmCancellation}
                    cancellationMessage={cancellationMessage}
                    formatDate={formatDate}
                    darkMode={darkMode}
                />
            )}
            </div>
        </div>
    );
};

export default PlanUpgrade;