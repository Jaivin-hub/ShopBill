import React, { useState, useEffect, useCallback } from 'react';
import {
    ArrowLeft, CheckCircle, Crown, Zap, Building2,
    Loader, CreditCard, AlertCircle, IndianRupee, XCircle,
} from 'lucide-react';
import API from '../config/api';
import PlanCard from './PlanCard'; // <--- New Child Component Import

// --- Hardcoded Plan Data (Mock) ---
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

// Helper to dynamically load the Razorpay script
const loadRazorpayScript = (src) => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

// --- Modal Components (Rendered inline but defined separately for clarity) ---

const ConfirmationModal = ({ isUpgrading, selectedPlan, setShowConfirmModal, startUpgradeFlow, getModalWarningMessage }) => {
    if (!selectedPlan) return null;

    const modalWarning = getModalWarningMessage(selectedPlan);
    const isYellowWarning = modalWarning.icon === 'yellow';

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-sm sm:max-w-md animate-in fade-in zoom-in-50 duration-300">
                <div className="p-5 sm:p-6 border-b border-gray-700">
                    <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                        <Crown className="w-5 h-5 text-indigo-400" />
                        Confirm Plan Change to {selectedPlan.name}
                    </h2>
                </div>
                <div className="p-5 sm:p-6">
                    <p className="text-gray-300 mb-4 text-sm sm:text-base" dangerouslySetInnerHTML={{ __html: modalWarning.title }} />

                    <div className={`rounded-lg p-3 sm:p-4 mb-4 flex items-start gap-3 ${isYellowWarning ? 'bg-yellow-700/30' : 'bg-blue-700/30'
                        }`}>
                        <IndianRupee className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-1 ${isYellowWarning ? 'text-yellow-400' : 'text-blue-400'
                            }`} />
                        <p className={`text-xs sm:text-sm ${isYellowWarning ? 'text-yellow-300' : 'text-blue-300'
                            }`} dangerouslySetInnerHTML={{ __html: modalWarning.detail }} />
                    </div>
                </div>
                <div className="p-5 sm:p-6 border-t border-gray-700 flex flex-col sm:flex-row-reverse justify-start sm:justify-between gap-3">
                    <button
                        onClick={() => startUpgradeFlow(selectedPlan)}
                        disabled={isUpgrading}
                        className="w-full sm:w-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm font-semibold"
                    >
                        {isUpgrading ? (
                            <>
                                <Loader className="w-4 h-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <CreditCard className="w-4 h-4" />
                                Proceed to Mandate Setup
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => setShowConfirmModal(false)}
                        disabled={isUpgrading}
                        className="w-full sm:w-auto px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors cursor-pointer text-sm font-semibold"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

const CancellationModal = ({ isCancelling, planDetails, showCancelModal, setShowCancelModal, alreadyInTerminalState, isCurrentlyInTrial, handleConfirmCancellation, cancellationMessage, formatDate }) => {
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-sm sm:max-w-md animate-in fade-in zoom-in-50 duration-300">
                <div className="p-5 sm:p-6 border-b border-gray-700">
                    <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-red-400" />
                        {alreadyInTerminalState ? 'Subscription Status' : 'Confirm Cancellation'}
                    </h2>
                </div>
                <div className="p-5 sm:p-6">
                    <p className="text-gray-300 mb-4 text-sm sm:text-base" dangerouslySetInnerHTML={{ __html: cancellationMessage }} />

                    <div className="bg-red-700/30 rounded-lg p-3 sm:p-4 mb-4 flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0 mt-1" />
                        <p
                            className="text-xs sm:text-sm text-red-300 font-semibold"
                            dangerouslySetInnerHTML={{
                                __html: isCurrentlyInTrial()
                                    ? `The recurring payment mandate has been <strong>canceled</strong>. Your trial access will end on ${formatDate(planDetails.planEndDate)}, and no charge will occur.`
                                    : `The subscription has been cancelled. Full access will continue until the current billing cycle ends on <strong>${formatDate(planDetails.planEndDate)}</strong>.`
                            }}
                        />
                    </div>
                </div>
                <div className="p-5 sm:p-6 border-t border-gray-700 flex flex-col sm:flex-row-reverse justify-start sm:justify-between gap-3">
                    {!alreadyInTerminalState && (
                        <button
                            onClick={handleConfirmCancellation}
                            disabled={isCancelling}
                            className="w-full sm:w-auto px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm font-semibold"
                        >
                            {isCancelling ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Cancelling...
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-4 h-4" />
                                    Confirm Cancellation
                                </>
                            )}
                        </button>
                    )}
                    <button
                        onClick={() => setShowCancelModal(false)}
                        disabled={isCancelling}
                        className="w-full sm:w-auto px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors cursor-pointer text-sm font-semibold"
                    >
                        {alreadyInTerminalState ? 'Close' : 'Keep Plan'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Main Parent Component ---
const PlanUpgrade = ({ apiClient, showToast, currentUser, onBack }) => {
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

    // --- Utility Functions ---
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
    }

    // --- Plan Status Helpers ---
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
        // Check if the subscription is in a final state but access is still valid (date > now)
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

    // --- Data Fetching ---
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
            showToast('Failed to fetch current plan. Defaulting to Basic.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [apiClient, showToast]);

    useEffect(() => {
        fetchPlanData();
    }, [fetchPlanData]);

    // --- Handlers ---
    const handleUpgradeClick = (plan) => {
        if (isCurrentPlanNotExpiring(plan) && plan.id === currentPlan?.toLowerCase()) {
            showToast('This is your current plan.', 'info');
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
                let newPlanStatus = 'active';
                let newPlanEndDate = planDetails.planEndDate;

                if (currentPlan === 'BASIC' || currentPlan === null) {
                    const trialEndDate = new Date();
                    trialEndDate.setDate(trialEndDate.getDate() + 30);
                    newPlanEndDate = trialEndDate;
                    newPlanStatus = 'authenticated';
                }

                setCurrentPlan(newPlanId.toUpperCase());
                setPlanDetails({
                    planEndDate: newPlanEndDate,
                    subscriptionStatus: newPlanStatus,
                });

                const selectedPlanObj = availablePlans.find(p => p.id === newPlanId);
                const actionText = isSamePlanAndCancelled(selectedPlanObj) ? 'Re-subscription' : isUpgrade(selectedPlanObj) ? 'Upgrade' : 'Downgrade';
                const trialText = newPlanStatus === 'authenticated' ? ' You are now on a 30-day trial.' : '';

                showToast(`Successfully completed ${actionText} to ${newPlanId.toUpperCase()}!${trialText}`, 'success');

            } else {
                showToast(verificationResponse.data.error || 'Plan change verification failed.', 'error');
            }
        } catch (error) {
            console.error("Verification error after plan change:", error);
            showToast('An unexpected error occurred during verification. Please contact support.', 'error');
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
            showToast('Razorpay SDK failed to load. Are you offline?', 'error');
            setIsUpgrading(false);
            return;
        }

        try {
            const serverResponse = await apiClient.post(API.upgradePlan, {
                newPlan: newPlan.id.toUpperCase(),
            });

            if (!serverResponse.data.success) {
                showToast(serverResponse.data.error || 'Failed to initiate plan change.', 'error');
                setIsUpgrading(false);
                return;
            }

            const { subscriptionId, amount, currency, keyId } = serverResponse.data;

            const options = {
                key: keyId,
                amount: amount,
                currency: currency,
                name: "Pocket POS Plan Upgrade",
                description: `Mandate verification for ${newPlan.name} Plan`,
                subscription_id: subscriptionId,
                handler: function (response) {
                    handleVerifyPlanChange(response, newPlan.id);
                },
                modal: {
                    ondismiss: function () {
                        showToast('Plan change canceled by user.', 'info');
                        setIsUpgrading(false);
                    }
                },
                prefill: {
                    name: currentUser?.name || "Customer",
                    email: currentUser?.email || "",
                },
                theme: {
                    color: "#4f46e5"
                }
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.open();

        } catch (error) {
            console.error("Upgrade/Downgrade initiation error:", error);
            showToast('An unexpected error occurred during plan change initiation.', 'error');
            setIsUpgrading(false);
        }
    };

    const handlePrepareCancellation = () => {
        const planName = currentPlan;
        const endDateString = planDetails.planEndDate ? formatDate(planDetails.planEndDate) : 'the end of the current billing cycle';

        let msg = '';
        const isTrial = isCurrentlyInTrial();
        const isAlreadyPending = isAlreadyCancelledOrPending();

        if (isAlreadyPending) {
            const statusText = ['cancelled', 'cancellation_no_refund'].includes(planDetails.subscriptionStatus)
                ? 'immediately cancelled'
                : 'scheduled for cancellation';

            msg = `Your subscription is already <strong>${statusText}</strong> (no future charges). Your access remains active until <strong>${endDateString}</strong>. You don't need to take any further action.`;

        } else if (isTrial) {
            msg = `Your current <strong>${planName}</strong> plan is in the <strong>Free Trial</strong> period (Mandate Authenticated). By confirming cancellation, we will immediately cancel the future payment mandate (no charge). Your access will remain active until the trial ends on <strong>${endDateString}</strong>.`;
        } else {
            msg = `Your <strong>${planName}</strong> subscription is currently in a <strong>paid cycle</strong>. By confirming cancellation, we will cancel the subscription immediately to stop future billing, but you will retain full access until <strong>${endDateString}</strong> as this month's payment was already processed.`;
        }

        setCancellationMessage(msg);
        setShowCancelModal(true);
    };

    const handleConfirmCancellation = async () => {
        if (isAlreadyCancelledOrPending()) {
            setShowCancelModal(false);
            return;
        }

        setIsCancelling(true);

        try {
            const response = await apiClient.post(API.cancelSubscription);

            const { action, message } = response.data;

            if (response.data.success) {

                showToast(message, 'success');

                let newStatus = planDetails.subscriptionStatus;

                if (action === 'immediate_mandate_end_access') {
                    newStatus = 'trial_cancellation_pending';

                } else if (action === 'immediate_cancel_extended_access') {
                    newStatus = 'cancellation_no_refund';

                } else if (action === 'end_of_cycle') {
                    newStatus = 'cancellation_pending';
                }

                if (response.data.subscriptionStatus) {
                    newStatus = response.data.subscriptionStatus;
                }

                setPlanDetails(prev => ({
                    ...prev,
                    subscriptionStatus: newStatus,
                }));

                setCancellationMessage('');

            } else {
                showToast(response.error || 'Failed to cancel subscription due to an unknown error.', 'error');
            }
        } catch (error) {
            console.error("Cancellation error:", error);
            showToast('An unexpected error occurred during cancellation.', 'error');
        } finally {
            setShowCancelModal(false);
            setIsCancelling(false);
        }
    };

    // --- Status and Icon Helpers for Props ---
    const getPlanIcon = (planId) => {
        switch (planId) {
            case 'basic': return Building2;
            case 'pro': return Zap;
            case 'premium': return Crown;
            default: return Building2;
        }
    };

    const getPlanColor = (planId) => {
        switch (planId) {
            case 'basic': return 'border-gray-500 bg-gray-500/10';
            case 'pro': return 'border-indigo-500 bg-indigo-500/10';
            case 'premium': return 'border-purple-500 bg-purple-500/10';
            default: return 'border-gray-500 bg-gray-500/10';
        }
    };

    const getPlanTextColor = (planId) => {
        switch (planId) {
            case 'basic': return 'text-gray-400';
            case 'pro': return 'text-indigo-400';
            case 'premium': return 'text-purple-400';
            default: return 'text-gray-400';
        }
    };

    // --- Dynamic Modal Content Generator ---
    const getModalActionText = (plan) => {
        if (isSamePlanAndCancelled(plan)) {
            return 're-subscribe';
        }
        return isUpgrade(plan) ? 'upgrade' : 'downgrade';
    };

    const shouldShowNewTrial = currentPlan === 'BASIC';

    const getModalWarningMessage = (selectedPlan) => {
        const action = getModalActionText(selectedPlan);
        const price = formatCurrency(selectedPlan.price);
        const planName = selectedPlan.name;

        let detailText = '';
        let warningIcon = 'blue';
        let currentPlanActionText = '';

        if (isAlreadyCancelledOrPending()) {
            currentPlanActionText = 'Your previous subscription remains cancelled';
        } else {
            currentPlanActionText = 'Your current subscription will be canceled immediately';
        }

        if (shouldShowNewTrial) {
            detailText = `${currentPlanActionText}, and you will set up a new mandate for the new plan, which includes a <strong>new 30-day free trial</strong>.`;
        } else if (action === 're-subscribe') {
            detailText = `Your subscription will be renewed immediately upon mandate setup.`;
        } else if (action === 'upgrade') {
            detailText = `${currentPlanActionText}, and the new plan will start right away.`;
        } else if (action === 'downgrade') {
            warningIcon = 'yellow';
            detailText = `${currentPlanActionText}, and the new plan will start right away, which may result in loss of features.`;
        }

        return {
            title: `You are about to <strong>${action}</strong> to the <strong>${planName}</strong> plan for <strong>${price}/month</strong>.`,
            detail: `A new payment mandate is required. ${detailText} A ₹1 verification fee applies.`,
            icon: warningIcon
        };
    };

    // --- Main Render ---

    if (isLoading || currentPlan === null) {
        return (
            <div className="min-h-screen p-4 pb-20 md:p-8 bg-gray-100 dark:bg-gray-950">
                <div className="flex flex-col items-center justify-center h-64">
                    <Loader className="w-10 h-10 animate-spin text-indigo-400" />
                    <p className="mt-4 text-gray-400">Loading current plan and available options...</p>
                </div>
            </div>
        );
    }

    const isPlanExpiring = planDetails.planEndDate && planDetails.planEndDate > new Date() &&
        !['active', 'authenticated', 'cancelled_replaced'].includes(planDetails.subscriptionStatus);

    const isCancellationPending = isPlanExpiring;
    const alreadyInTerminalState = isAlreadyCancelledOrPending();


    return (
        <div className="min-h-screen p-4 pb-12 sm:p-6 md:p-8 bg-gray-100 dark:bg-gray-950">
            {/* Header */}
            <div className="max-w-6xl mx-auto mb-8">
                <button
                    onClick={onBack}
                    className="flex items-center text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4 transition-colors text-sm"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Settings
                </button>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white flex items-center">
                    <Crown className="w-6 h-6 sm:w-8 sm:h-8 mr-3 text-indigo-500" />
                    Manage Your Plan
                </h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2">
                    Choose the perfect plan for your business needs. Upgrade or manage your subscription anytime.
                </p>
            </div>

            {/* Current Plan Badge */}
            {currentPlan && (
                <div className="max-w-6xl mx-auto mb-8">
                    {/* Removed sm:flex-row and justify-between from the main wrapper to allow the button to wrap */}
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 sm:p-6 flex flex-col gap-4">

                        {/* TOP ROW: Plan and Billing (Must be far apart on the same row) */}
                        {/* We use flex items-center justify-between to push the two sections to the far ends */}
                        <div className="flex items-center justify-between w-full">

                            {/* 1. Current Plan Block (Far Left) */}
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                                <div>
                                    <p className="text-xs sm:text-sm text-gray-400">Current Plan</p>
                                    <p className="text-lg sm:text-xl font-bold text-white">{currentPlan}</p>
                                </div>
                            </div>

                            {/* 2. Billing Cycle Block (Far Right) */}
                            <div className="">
                                <p className="text-xs sm:text-sm text-gray-400">
                                    {isPlanExpiring ? 'Access Expires' : 'Billing Cycle'}
                                </p>
                                <p className={`text-lg sm:text-xl font-bold ${isPlanExpiring ? 'text-red-400' : 'text-white'}`}>
                                    {/* Changed font-weight to bold for consistency with Current Plan */}
                                    {isPlanExpiring ? formatDate(planDetails.planEndDate) : 'Monthly'}
                                </p>
                            </div>

                        </div>
                        {/* END TOP ROW */}

                        {/* BOTTOM ROW: Cancel Subscription Button (Full Width) */}
                        <button
                            onClick={handlePrepareCancellation}
                            // Ensure w-full is used here to make it span the entire width below the top row
                            className={`w-full cursor-pointer px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${isCancellationPending
                                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                                }`}
                            disabled={isCancelling}
                        >
                            <XCircle className="w-4 h-4" />
                            {isCancellationPending ? 'Manage Cancellation' : 'Cancel Subscription'}
                        </button>

                    </div>
                </div>
            )}

            {/* Plans Grid */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    />
                ))}
            </div>

            {/* Modals */}
            {showConfirmModal && selectedPlan && (
                <ConfirmationModal
                    isUpgrading={isUpgrading}
                    selectedPlan={selectedPlan}
                    setShowConfirmModal={setShowConfirmModal}
                    startUpgradeFlow={startUpgradeFlow}
                    getModalWarningMessage={getModalWarningMessage}
                />
            )}

            {showCancelModal && (
                <CancellationModal
                    isCancelling={isCancelling}
                    planDetails={planDetails}
                    showCancelModal={showCancelModal}
                    setShowCancelModal={setShowCancelModal}
                    alreadyInTerminalState={alreadyInTerminalState}
                    isCurrentlyInTrial={isCurrentlyInTrial}
                    handleConfirmCancellation={handleConfirmCancellation}
                    cancellationMessage={cancellationMessage}
                    formatDate={formatDate}
                />
            )}
        </div>
    );
};

export default PlanUpgrade;