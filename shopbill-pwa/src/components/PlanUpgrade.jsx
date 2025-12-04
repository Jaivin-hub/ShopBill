import React, { useState, useEffect, useCallback } from 'react';
import {
    ArrowLeft, CheckCircle, Crown, Zap, Building2,
    Loader, CreditCard, AlertCircle, IndianRupee,
    Users, Package, XCircle,
} from 'lucide-react';
import API from '../config/api';

// Hardcoded Plan Data (Simulating the configuration fetch)
const DEMO_PLANS = [
    {
        id: 'basic',
        name: 'BASIC', // Use consistent casing for easier comparison
        price: 499,
        features: ['Basic Inventory Management', 'Up to 5 Users', 'Email Support'],
        maxUsers: 5,
        maxInventory: 1000,
    },
    {
        // Renamed id to 'pro' and name to 'PRO' for clean tier structure
        id: 'pro',
        name: 'PRO',
        price: 799,
        features: ['Advanced Inventory', 'Up to 20 Users', 'Priority Support', 'Advanced Reports'],
        maxUsers: 20,
        maxInventory: 10000,
    },
    {
        // Renamed id to 'premium' and name to 'PREMIUM'
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

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        // Ensure date is a Date object
        const dateObj = date instanceof Date ? date : new Date(date);
        return dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    const fetchPlanData = useCallback(async () => {
        setIsLoading(true);

        try {
            // NOTE: API.currentPlan should ideally fetch the full plan details including RZP status.
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

    const isCurrentPlanNotExpiring = (plan) => {
        // Checks if the plan is current AND NOT in a cancelled/pending state but still having access.
        const isExpiring = planDetails.planEndDate && planDetails.planEndDate > new Date() &&
                           !['active', 'authenticated'].includes(planDetails.subscriptionStatus);

        return currentPlan?.toLowerCase() === plan.id && !isExpiring;
    };

    const isUpgrade = (plan) => {
        const planOrder = { basic: 1, pro: 2, premium: 3 };
        const currentOrder = planOrder[currentPlan?.toLowerCase()] || 0;
        const planOrderValue = planOrder[plan.id] || 0;

        return planOrderValue > currentOrder;
    };

    const isAlreadyCancelledOrPending = () => {
        const finalStatusesWithFutureAccess = ['cancellation_pending', 'trial_cancellation_pending', 'cancellation_no_refund', 'cancelled'];
        // Check if the subscription is in a final state but access is still valid (date > now)
        return finalStatusesWithFutureAccess.includes(planDetails.subscriptionStatus) && planDetails.planEndDate > new Date();
    };

    const isSamePlanAndCancelled = (plan) => {
        return currentPlan?.toLowerCase() === plan.id && isAlreadyCancelledOrPending();
    }

    const handleUpgradeClick = (plan) => {
        if (isCurrentPlanNotExpiring(plan) && plan.id === currentPlan?.toLowerCase()) {
            showToast('This is your current plan.', 'info');
            return;
        }
        setSelectedPlan(plan);
        setShowConfirmModal(true);
    };

    // ---------------------------------------------------------------------
    // --- RAZORPAY & UPGRADE/DOWNGRADE LOGIC ---
    // ---------------------------------------------------------------------

    const handleVerifyPlanChange = async (response, newPlan) => {
        setIsUpgrading(true);
        setShowConfirmModal(false);
        try {
            const verificationResponse = await apiClient.post(API.verifyPlanChange, {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                razorpay_subscription_id: response.razorpay_subscription_id,
                newPlan: newPlan.toUpperCase(),
            });

            if (verificationResponse.data.success) {
                // We assume the server returns the new planEndDate and status.
                
                let newPlanStatus = 'active'; // Assume immediate activation for paid changes/resubscriptions
                let newPlanEndDate = planDetails.planEndDate; // Server should update this on re-fetch.

                if (currentPlan === 'BASIC' || currentPlan === null) {
                    // This assumes first time paid subscription - Grant trial
                    const trialEndDate = new Date();
                    trialEndDate.setDate(trialEndDate.getDate() + 30);
                    newPlanEndDate = trialEndDate;
                    newPlanStatus = 'authenticated'; // New trial mandate authenticated
                }

                setCurrentPlan(newPlan.toUpperCase());
                setPlanDetails({
                    planEndDate: newPlanEndDate,
                    subscriptionStatus: newPlanStatus,
                });
                
                // Dynamic success toast message
                const actionText = isSamePlanAndCancelled(newPlan) ? 'Re-subscription' : isUpgrade(newPlan) ? 'Upgrade' : 'Downgrade';
                const trialText = newPlanStatus === 'authenticated' ? ' You are now on a 30-day trial.' : '';
                
                showToast(`Successfully completed ${actionText} to ${newPlan.toUpperCase()}!${trialText}`, 'success');

            } else {
                showToast(verificationResponse.data.error || 'Plan change verification failed.', 'error');
            }
        } catch (error) {
            console.error("Verification error after plan change:", error);
            showToast('An unexpected error occurred during verification. Please contact support.', 'error');
        } finally {
            setIsUpgrading(false);
            fetchPlanData(); // Re-fetch data to ensure all UI is consistent
        }
    };

    const startUpgradeFlow = async (newPlan) => {
        setIsUpgrading(true);
        setShowConfirmModal(false);

        // 1. Load Razorpay script
        const res = await loadRazorpayScript('https://checkout.razorpay.com/v1/checkout.js');
        if (!res) {
            showToast('Razorpay SDK failed to load. Are you offline?', 'error');
            setIsUpgrading(false);
            return;
        }

        try {
            // 2. Call server to cancel old plan and create new mandate
            const serverResponse = await apiClient.post(API.upgradePlan, {
                newPlan: newPlan.id.toUpperCase(),
            });

            if (!serverResponse.data.success) {
                showToast(serverResponse.data.error || 'Failed to initiate plan change.', 'error');
                setIsUpgrading(false);
                return;
            }

            const { subscriptionId, amount, currency, keyId } = serverResponse.data;

            // 3. Configure and open Razorpay modal for new mandate authentication
            const options = {
                key: keyId,
                amount: amount,
                currency: currency,
                name: "Pocket POS Plan Upgrade",
                description: `Mandate verification for ${newPlan.name} Plan`,
                subscription_id: subscriptionId,
                handler: function (response) {
                    // Success callback: Mandate authenticated
                    handleVerifyPlanChange(response, newPlan.id);
                },
                modal: {
                    ondismiss: function () {
                        // User closed the modal
                        showToast('Plan change canceled by user.', 'info');
                        setIsUpgrading(false);
                    }
                },
                prefill: {
                    name: currentUser?.name || "Customer",
                    email: currentUser?.email || "",
                },
                theme: {
                    color: "#4f46e5" // Indigo color
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

    // ---------------------------------------------------------------------
    // --- CANCELLATION LOGIC ---
    // ---------------------------------------------------------------------

    const isCurrentlyInTrial = () => {
        const isFutureDate = planDetails.planEndDate && planDetails.planEndDate > new Date();
        const isNotFinal = !['cancelled', 'expired'].includes(planDetails.subscriptionStatus);

        const isTrialStatus = planDetails.subscriptionStatus === 'authenticated' || planDetails.subscriptionStatus === 'trial_cancellation_pending';

        return isFutureDate && isNotFinal && isTrialStatus;
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
        // If already in a pending or cancelled state, just close the modal.
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


    const getPlanIcon = (planId) => {
        switch (planId) {
            case 'basic': return Package;
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

    // Check if the plan is already in a terminal/pending-terminal state (like 'cancelled', 'cancellation_no_refund', 'trial_cancellation_pending')
    const alreadyInTerminalState = isAlreadyCancelledOrPending();

    // Determine the action for the confirmation modal
    const getModalActionText = (plan) => {
        if (isSamePlanAndCancelled(plan)) {
            return 're-subscribe';
        }
        return isUpgrade(plan) ? 'upgrade' : 'downgrade';
    };
    
    // Determine if the plan change should include the free trial messaging
    const shouldShowNewTrial = currentPlan === 'BASIC';

    // *** MODIFIED: Generate dynamic warning message for the confirmation modal ***
    const getModalWarningMessage = (selectedPlan) => {
        const action = getModalActionText(selectedPlan);
        const price = formatCurrency(selectedPlan.price);
        const planName = selectedPlan.name;
        
        let detailText = '';
        let warningIcon = 'blue';
        let currentPlanActionText = '';

        if (alreadyInTerminalState) {
            // Case 1: Re-subscribe, or upgrading/downgrading from an already cancelled plan (rare, but handled)
            currentPlanActionText = 'Your previous subscription remains cancelled';
        } else {
            // Case 2: Upgrade/Downgrade from an active/authenticated plan
            currentPlanActionText = 'Your current subscription will be canceled immediately';
        }


        if (shouldShowNewTrial) {
            // First time going from BASIC/Free to a paid plan
            detailText = `${currentPlanActionText}, and you will set up a new mandate for the new plan, which includes a <strong>new 30-day free trial</strong>.`;
        } else if (action === 're-subscribe') {
            // Re-subscription for a user who previously paid/had a trial. No new trial granted.
            detailText = `Your subscription will be renewed immediately upon mandate setup.`;
        } else if (action === 'upgrade') {
            // Upgrading: new plan starts immediately (no trial).
            detailText = `${currentPlanActionText}, and the new plan will start right away.`;
        } else if (action === 'downgrade') {
            // Downgrading: new plan starts immediately (no trial).
             warningIcon = 'yellow';
             detailText = `${currentPlanActionText}, and the new plan will start right away.`;
        }

        return {
            title: `You are about to <strong>${action}</strong> to the <strong>${planName}</strong> plan for <strong>${price}/month</strong>.`,
            detail: `A new payment mandate is required. ${detailText} A ₹1 verification fee applies.`,
            icon: warningIcon
        };
    };

    return (
        <div className="min-h-screen p-4 pb-20 md:p-8 bg-gray-100 dark:bg-gray-950">
            {/* Header */}
            <div className="max-w-6xl mx-auto mb-8">
                <button
                    onClick={onBack}
                    className="flex items-center text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4 transition-colors cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Settings
                </button>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center">
                    <Crown className="w-8 h-8 mr-3 text-indigo-500" />
                    Manage Your Plan
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Choose the perfect plan for your business needs. Upgrade or manage your subscription anytime.
                </p>
            </div>

            {/* Current Plan Badge */}
            {currentPlan && (
                <div className="max-w-6xl mx-auto mb-6">
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <div>
                                <p className="text-sm text-gray-400">Current Plan</p>
                                <p className="text-xl font-bold text-white">{currentPlan}</p>
                            </div>
                        </div>
                        <div className="text-right flex items-center gap-4">
                            <div>
                                <p className="text-sm text-gray-400">
                                    {isPlanExpiring ? 'Access Expires' : 'Billing Cycle'}
                                </p>
                                <p className={`text-lg font-semibold ${isPlanExpiring ? 'text-red-400' : 'text-white'}`}>
                                    {isPlanExpiring ? formatDate(planDetails.planEndDate) : 'Monthly'}
                                </p>
                            </div>
                            {/* Cancel Subscription Button */}
                            <button
                                onClick={handlePrepareCancellation}
                                className={`cursor-pointer px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-1 ${isCancellationPending
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
                </div>
            )}

            {/* Plans Grid */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                {availablePlans.map((plan) => {
                    const IconComponent = getPlanIcon(plan.id);
                    const isCurrent = isCurrentPlanNotExpiring(plan);
                    const isUpgradePlan = isUpgrade(plan);

                    // Determine button text
                    const buttonText = isCurrent
                        ? 'Current Plan'
                        : isSamePlanAndCancelled(plan)
                            ? 'Re-subscribe' // If current plan is cancelled/pending and they are viewing the same plan
                            : isUpgradePlan
                                ? 'Upgrade Now'
                                : 'Downgrade Now';

                    // Show Recommended badge only for PREMIUM
                    const showRecommended = plan.id === 'premium';

                    // Determine if the button should be disabled (only if it's the current, active, non-expiring plan or during operation)
                    // Note: If the current plan is cancelled and they are on the same plan, they should be able to 'Re-subscribe'.
                    const buttonDisabled = (isCurrent && !alreadyInTerminalState) || isUpgrading || isCancelling;


                    return (
                        <div
                            key={plan.id}
                            className={`relative bg-gray-800/50 rounded-xl p-6 border-2 transition-all duration-300 flex flex-col ${isCurrent
                                ? 'border-indigo-500 shadow-lg shadow-indigo-500/20'
                                : 'border-gray-700/50 hover:border-gray-600'
                                }`}
                        >
                            {/* Display 'Current Plan' badge only if truly active/not expiring */}
                            {isCurrent && (
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                    <span className="bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                                        Current Plan
                                    </span>
                                </div>
                            )}

                            {/* Flex-grow wrapper for all content except the button */}
                            <div className="flex-grow">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-3 rounded-lg ${getPlanColor(plan.id)}`}>
                                        <IconComponent className={`w-6 h-6 ${getPlanTextColor(plan.id)}`} />
                                    </div>
                                    {/* Show Recommended badge */}
                                    {showRecommended && (
                                        <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded">
                                            Recommended
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                                <div className="mb-4">
                                    <span className="text-3xl font-extrabold text-white">
                                        {formatCurrency(plan.price)}
                                    </span>
                                    <span className="text-gray-400 ml-2">/month</span>
                                </div>

                                <ul className="space-y-3 mb-6">
                                    {plan.features.map((feature, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                            <span className="text-sm text-gray-300">{feature}</span>
                                        </li>
                                    ))}
                                    <li className="flex items-start gap-2">
                                        <Users className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-gray-300">
                                            {plan.maxUsers === -1 ? 'Unlimited' : `Up to ${plan.maxUsers}`} Users
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Package className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-gray-300">
                                            {plan.maxInventory === -1 ? 'Unlimited' : `${plan.maxInventory.toLocaleString('en-IN')}`} Items
                                        </span>
                                    </li>
                                </ul>
                            </div> {/* End of flex-grow */}

                            {/* Button - pushed to the bottom using mt-auto */}
                            <button
                                onClick={() => handleUpgradeClick(plan)}
                                disabled={buttonDisabled}
                                className={`w-full py-3 rounded-lg font-semibold mt-auto transition-all duration-200 ${buttonDisabled
                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                    : (isUpgradePlan || isSamePlanAndCancelled(plan))
                                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                                        : 'bg-indigo-600 text-white cursor-pointer'
                                    }`}
                            >
                                {buttonText}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Confirmation Modal (Upgrade/Switch/Resubscribe) */}
            {showConfirmModal && selectedPlan && (() => {
                const modalWarning = getModalWarningMessage(selectedPlan);
                const isYellowWarning = modalWarning.icon === 'yellow';

                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md">
                            <div className="p-6 border-b border-gray-700">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Crown className="w-6 h-6 text-indigo-400" />
                                    Confirm Plan Change to {selectedPlan.name}
                                </h2>
                            </div>
                            <div className="p-6">
                                <p className="text-gray-300 mb-4" dangerouslySetInnerHTML={{ __html: modalWarning.title }} />
                                
                                <div className={`rounded-lg p-4 mb-4 flex items-center gap-3 ${
                                    isYellowWarning ? 'bg-yellow-700/30' : 'bg-blue-700/30'
                                }`}>
                                    <IndianRupee className={`w-5 h-5 flex-shrink-0 ${
                                        isYellowWarning ? 'text-yellow-400' : 'text-blue-400'
                                    }`} />
                                    <p className={`text-sm ${
                                        isYellowWarning ? 'text-yellow-300' : 'text-blue-300'
                                    }`} dangerouslySetInnerHTML={{ __html: modalWarning.detail }} />
                                </div>
                            </div>
                            <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    disabled={isUpgrading}
                                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => startUpgradeFlow(selectedPlan)}
                                    disabled={isUpgrading}
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Cancellation Confirmation Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md">
                        <div className="p-6 border-b border-gray-700">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <XCircle className="w-6 h-6 text-red-400" />
                                {alreadyInTerminalState ? 'Subscription Status' : 'Confirm Subscription Cancellation'}
                            </h2>
                        </div>
                        <div className="p-6">
                            {/* Message updated from handlePrepareCancellation is shown here */}
                            <p className="text-gray-300 mb-4" dangerouslySetInnerHTML={{ __html: cancellationMessage }} />

                            <div className="bg-red-700/30 rounded-lg p-4 mb-4 flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                <p
                                    className="text-sm text-red-300 font-semibold"
                                    dangerouslySetInnerHTML={{
                                        __html: isCurrentlyInTrial()
                                            ? `The recurring payment mandate has been <strong>canceled</strong>. Your trial access will end on ${formatDate(planDetails.planEndDate)}, and no charge will occur.`
                                            : `The subscription has been cancelled. Full access will continue until the current billing cycle ends on <strong>${formatDate(planDetails.planEndDate)}</strong>.`
                                    }}
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => setShowCancelModal(false)}
                                disabled={isCancelling}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors cursor-pointer"
                            >
                                {alreadyInTerminalState ? 'Close' : 'Keep Plan'}
                            </button>
                            {!alreadyInTerminalState && ( // Only show confirm button if it's not already cancelled/pending
                                <button
                                    onClick={handleConfirmCancellation}
                                    disabled={isCancelling}
                                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlanUpgrade;