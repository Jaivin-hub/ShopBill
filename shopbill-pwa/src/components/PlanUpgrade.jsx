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
        price: 499,
        features: ['Basic Inventory Management', 'Up to 5 Users', 'Email Support'],
        maxUsers: 5,
        maxInventory: 1000,
    },
    {
        id: 'pro',
        name: 'PRO',
        price: 799,
        features: ['Advanced Inventory', 'Up to 20 Users', 'Priority Support', 'Advanced Reports'],
        maxUsers: 20,
        maxInventory: 10000,
    },
    {
        id: 'premium',
        name: 'PREMIUM',
        price: 999,
        features: ['Unlimited Everything', 'Custom Integrations', '24/7 Support', 'Dedicated Manager'],
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

    // --- UPDATED DESIGN: MATCHING SETTINGS HEADER ---
    const headerBase = darkMode ? 'bg-gray-950/90 border-gray-800' : 'bg-white/95 border-slate-300 shadow-sm';

    return (
        <main className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-950 text-gray-200' : 'bg-slate-100 text-black'} selection:bg-indigo-500/30`}>
            {/* UPDATED STICKY HEADER PARTNER */}
            <header className={`sticky top-0 z-[100] ${headerBase} backdrop-blur-md border-b px-6 py-6`}>
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className={`p-2 border rounded-xl transition-all active:scale-95 ${darkMode ? 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className={`text-2xl font-black tracking-tight leading-none ${darkMode ? 'text-white' : 'text-black'}`}>
                                Billing <span className="text-indigo-600">Engine</span>
                            </h1>
                            <p className={`text-[9px] font-bold tracking-[0.25em] mt-1.5 flex items-center gap-1.5 ${darkMode ? 'text-gray-500' : 'text-slate-800'}`}>
                                Secure Gateway Active
                            </p>
                        </div>
                    </div>

                    <div className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-full border ${darkMode ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                        <ShieldCheck className={`w-3 h-3 ${darkMode ? 'text-indigo-500' : 'text-emerald-600'}`} />
                        <span className={`text-[9px] font-black tracking-widest ${darkMode ? 'text-indigo-500' : 'text-emerald-600'}`}>PROTECTED BY AES-256</span>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-6 md:p-10 pb-32 space-y-8">
                {/* CURRENT SUBSCRIPTION CARD */}
                {currentPlan && (
                    <section className={`border rounded-[1.25rem] p-6 md:p-8 ${darkMode ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-slate-300 shadow-md'}`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center border ${darkMode ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                                    <Zap className="w-8 h-8 text-indigo-600" />
                                </div>
                                <div>
                                    <p className={`text-[10px] font-black tracking-[0.2em] ${darkMode ? 'text-gray-500' : 'text-slate-600'}`}>Active Tier</p>
                                    <h2 className={`text-2xl font-black tracking-tighter ${darkMode ? 'text-white' : 'text-black'}`}>{currentPlan}</h2>
                                    <p className={`text-[10px] font-bold mt-1 ${isPlanExpiring ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {isPlanExpiring ? `Terminating on ${formatDate(planDetails.planEndDate)}` : `Next Billing: ${formatDate(planDetails.planEndDate)}`}
                                    </p>
                                </div>
                            </div>
                            
                            <button
                                onClick={handlePrepareCancellation}
                                disabled={isCancelling}
                                className={`px-8 py-4 border rounded-2xl font-black text-xs tracking-widest transition-all active:scale-95 ${darkMode ? 'bg-gray-950 border-gray-800 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-slate-50 border-slate-300 text-red-600 hover:bg-red-600 hover:text-white'}`}
                            >
                                {isPlanExpiring ? 'Manage Cancellation' : 'Cancel Subscription'}
                            </button>
                        </div>
                    </section>
                )}

                {/* PLAN GRID */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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