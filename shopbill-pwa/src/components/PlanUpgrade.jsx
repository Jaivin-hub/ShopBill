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

// --- MODALS ---
const ConfirmationModal = ({ isUpgrading, selectedPlan, setShowConfirmModal, startUpgradeFlow, getModalWarningMessage, darkMode }) => {
    if (!selectedPlan) return null;
    const modalWarning = getModalWarningMessage(selectedPlan);
    const isYellowWarning = modalWarning.icon === 'yellow';
    
    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-3 sm:p-4 md:p-6 overflow-y-auto">
            <div className={`${darkMode ? 'bg-gray-950 border-gray-800' : 'bg-white border-slate-300'} w-full max-w-md rounded-xl sm:rounded-2xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-200 my-auto max-h-[95vh] sm:max-h-[90vh] flex flex-col`}>
                <div className={`p-4 sm:p-6 md:p-8 border-b ${darkMode ? 'border-gray-800 bg-indigo-500/5' : 'border-slate-100 bg-slate-50'} flex-shrink-0`}>
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-3xl flex items-center justify-center mb-6">
                        <Crown className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h2 className={`text-2xl font-black tracking-tighter ${darkMode ? 'text-white' : 'text-black'}`}>
                        Confirm {selectedPlan.name}
                    </h2>
                    <p className={`text-xs font-bold tracking-widest mt-1 ${darkMode ? 'text-gray-500' : 'text-slate-600'}`}>Tier Transition</p>
                </div>
                
                <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 overflow-y-auto flex-1 min-h-0">
                    <p className={`text-sm font-bold leading-relaxed ${darkMode ? 'text-gray-300' : 'text-slate-800'}`} dangerouslySetInnerHTML={{ __html: modalWarning.title }} />

                    <div className={`rounded-2xl p-4 flex items-start gap-4 border ${isYellowWarning ? 'bg-amber-500/5 border-amber-500/20' : 'bg-indigo-500/5 border-indigo-500/20'}`}>
                        <span className="mt-1">
                            <Info className={`w-5 h-5 shrink-0 ${isYellowWarning ? 'text-amber-500' : 'text-indigo-500'}`} />
                        </span>
                        <p className={`text-[11px] font-bold leading-relaxed ${isYellowWarning ? (darkMode ? 'text-amber-200/70' : 'text-amber-900') : (darkMode ? 'text-indigo-200/70' : 'text-indigo-900')}`} dangerouslySetInnerHTML={{ __html: modalWarning.detail }} />
                    </div>
                </div>

                <div className={`p-4 sm:p-5 md:p-6 border-t flex flex-col gap-2 sm:gap-3 ${darkMode ? 'border-gray-800' : 'border-slate-100'} flex-shrink-0`}>
                    <button
                        onClick={() => startUpgradeFlow(selectedPlan)}
                        disabled={isUpgrading}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                        {isUpgrading ? <Loader className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                        {isUpgrading ? 'Processing...' : 'Authorize Mandate'}
                    </button>
                    <button
                        onClick={() => setShowConfirmModal(false)}
                        disabled={isUpgrading}
                        className={`w-full py-3 text-[10px] font-black tracking-widest transition ${darkMode ? 'text-gray-500 hover:text-white' : 'text-slate-500 hover:text-black'}`}
                    >
                        Cancel Transaction
                    </button>
                </div>
            </div>
        </div>
    );
};

const CancellationModal = ({ isCancelling, planDetails, setShowCancelModal, alreadyInTerminalState, isCurrentlyInTrial, handleConfirmCancellation, cancellationMessage, formatDate, darkMode }) => {
    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-3 sm:p-4 md:p-6 overflow-y-auto">
            <div className={`${darkMode ? 'bg-gray-950 border-gray-800' : 'bg-white border-slate-300'} w-full max-w-md rounded-xl sm:rounded-2xl shadow-2xl border overflow-hidden my-auto max-h-[95vh] sm:max-h-[90vh] flex flex-col`}>
                <div className="p-4 sm:p-6 md:p-8 text-center flex-shrink-0">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <XCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className={`text-xl font-black tracking-tighter mb-2 ${darkMode ? 'text-white' : 'text-black'}`}>
                        {alreadyInTerminalState ? 'Subscription Status' : 'Terminate Access'}
                    </h2>
                    <div className={`text-sm font-bold leading-relaxed mb-6 ${darkMode ? 'text-gray-400' : 'text-slate-700'}`} dangerouslySetInnerHTML={{ __html: cancellationMessage }} />

                    <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 flex items-start gap-3 text-left">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                        <p className={`text-[10px] font-black tracking-tight leading-normal ${darkMode ? 'text-red-400' : 'text-red-700'}`}
                            dangerouslySetInnerHTML={{
                                __html: isCurrentlyInTrial()
                                    ? `Mandate <strong>cancelled</strong>. Trial ends ${formatDate(planDetails.planEndDate)}.`
                                    : `Active until <strong>${formatDate(planDetails.planEndDate)}</strong>. No further charges.`
                            }}
                        />
                    </div>
                </div>

                <div className={`p-4 sm:p-5 md:p-6 border-t flex flex-col gap-2 ${darkMode ? 'border-gray-800' : 'border-slate-100'} flex-shrink-0`}>
                    {!alreadyInTerminalState && (
                        <button
                            onClick={handleConfirmCancellation}
                            disabled={isCancelling}
                            className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-xs tracking-widest transition-all active:scale-95"
                        >
                            {isCancelling ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Cancellation'}
                        </button>
                    )}
                    <button
                        onClick={() => setShowCancelModal(false)}
                        className={`w-full py-3 text-[10px] font-black tracking-widest transition ${darkMode ? 'text-gray-500 hover:text-white' : 'text-slate-500 hover:text-black'}`}
                    >
                        {alreadyInTerminalState ? 'Dismiss' : 'Keep Current Plan'}
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
    const getPlanColor = (pId) => pId === 'premium' ? 'border-purple-500 bg-purple-500/5' : pId === 'pro' ? 'border-indigo-500 bg-indigo-500/5' : (darkMode ? 'border-gray-700 bg-gray-800/20' : 'border-slate-300 bg-slate-50');
    const getPlanTextColor = (pId) => pId === 'premium' ? 'text-purple-500' : pId === 'pro' ? 'text-indigo-600' : (darkMode ? 'text-gray-400' : 'text-slate-900');

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

    // --- REDESIGNED HEADER ---
    const headerBase = darkMode ? 'bg-gray-950/95 border-gray-800' : 'bg-white/95 border-slate-200 shadow-sm';
    const mainBg = darkMode ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950' : 'bg-gradient-to-br from-slate-50 via-white to-slate-50';

    return (
        <main className={`min-h-screen transition-colors duration-300 ${mainBg} selection:bg-indigo-500/30`}>
            {/* REDESIGNED STICKY HEADER */}
            <header className={`sticky top-0 z-[100] ${headerBase} backdrop-blur-xl border-b px-4 md:px-6 py-5`}>
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onBack} 
                            className={`p-2.5 rounded-xl transition-all active:scale-95 ${darkMode ? 'bg-gray-900/50 border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className={`text-2xl md:text-3xl font-black tracking-tight leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                Subscription <span className="text-indigo-600">Management</span>
                            </h1>
                            <p className={`text-[9px] font-black tracking-[0.25em] mt-1.5 flex items-center gap-1.5 ${darkMode ? 'text-gray-500' : 'text-slate-600'}`}>
                                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                Secure Payment Gateway
                            </p>
                        </div>
                    </div>

                    <div className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-full border ${darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
                        <ShieldCheck className={`w-3.5 h-3.5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                        <span className={`text-[9px] font-black tracking-widest ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>AES-256 ENCRYPTED</span>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-10 pb-20 space-y-8 md:space-y-10">
                {/* REDESIGNED CURRENT SUBSCRIPTION CARD */}
                {currentPlan && (
                    <section className={`relative overflow-hidden border rounded-2xl md:rounded-3xl p-6 md:p-8 ${darkMode ? 'bg-gradient-to-br from-gray-900/80 to-gray-800/60 border-gray-700/50 shadow-2xl shadow-indigo-500/5' : 'bg-gradient-to-br from-white to-slate-50 border-slate-200 shadow-xl'}`}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                                <div className={`relative w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center border-2 ${darkMode ? 'bg-indigo-500/10 border-indigo-500/30 shadow-lg shadow-indigo-500/20' : 'bg-indigo-50 border-indigo-200 shadow-md'}`}>
                                    <Zap className={`w-8 h-8 md:w-10 md:h-10 text-indigo-600 ${darkMode ? 'drop-shadow-lg' : ''}`} />
                                    {!isPlanExpiring && (
                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                                    )}
                                </div>
                                <div>
                                    <p className={`text-[10px] font-black tracking-[0.2em] uppercase mb-1 ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>Current Plan</p>
                                    <h2 className={`text-2xl md:text-3xl font-black tracking-tighter mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{currentPlan}</h2>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${isPlanExpiring ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                                        <p className={`text-xs font-bold ${isPlanExpiring ? 'text-red-500' : 'text-emerald-600'}`}>
                                            {isPlanExpiring ? `Expires ${formatDate(planDetails.planEndDate)}` : `Renews ${formatDate(planDetails.planEndDate)}`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <button
                                onClick={handlePrepareCancellation}
                                disabled={isCancelling}
                                className={`px-6 md:px-8 py-3 md:py-4 border-2 rounded-xl md:rounded-2xl font-black text-xs tracking-widest transition-all active:scale-95 disabled:opacity-50 ${darkMode ? 'bg-gray-950/50 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50' : 'bg-white border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 shadow-sm'}`}
                            >
                                {isCancelling ? 'Processing...' : (isPlanExpiring ? 'Manage Cancellation' : 'Cancel Subscription')}
                            </button>
                        </div>
                    </section>
                )}

                {/* REDESIGNED PLAN GRID WITH BETTER SPACING */}
                <div className="space-y-6">
                    <div className="text-center mb-8">
                        <h2 className={`text-xl md:text-2xl font-black tracking-tight mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            Choose Your Plan
                        </h2>
                        <p className={`text-sm font-bold ${darkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                            Select the perfect plan for your business needs
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 pt-4">
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
        </main>
    );
};

export default PlanUpgrade;