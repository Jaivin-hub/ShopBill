// PlanUpgrade.jsx (Full file with necessary updates for BASIC plan cancellation)

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

const PlanUpgrade = ({ apiClient, showToast, currentUser, onBack }) => {
    const [currentPlan, setCurrentPlan] = useState(null);
    const [availablePlans, setAvailablePlans] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpgrading, setIsUpgrading] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);

    // 🔥 NEW STATE: Store current plan details for dynamic messaging
    const [planDetails, setPlanDetails] = useState({
        planEndDate: null,
        subscriptionStatus: null,
    });
    const [cancellationMessage, setCancellationMessage] = useState(''); // Stores the message shown inside the modal
    // -------------------------------------------------------------

    // 1. INTEGRATED DATA FETCHING
    const fetchPlanData = useCallback(async () => {
        setIsLoading(true);

        // 1A. Fetch Current Plan and Subscription Details from API
        try {
            const planResponse = await apiClient.get(API.currentPlan);

            // Default to 'BASIC' if plan is null, but if it's not null, use its value.
            const fetchedPlanName = planResponse?.data?.plan?.toUpperCase() || 'BASIC';
            const fetchedPlanEndDate = planResponse?.data?.planEndDate ? new Date(planResponse.data.planEndDate) : null;
            const fetchedSubscriptionStatus = planResponse?.data?.subscriptionStatus || null;

            setCurrentPlan(fetchedPlanName);
            setPlanDetails({
                planEndDate: fetchedPlanEndDate,
                subscriptionStatus: fetchedSubscriptionStatus,
            });

            // 1B. Set Available Plans (Simulated from hardcoded data)
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

    const handleUpgradeClick = (plan) => {
        if (plan.id === currentPlan?.toLowerCase()) {
            showToast('This is your current plan.', 'info');
            return;
        }
        setSelectedPlan(plan);
        setShowConfirmModal(true);
    };

    // Helper to check if the user is currently in the trial period
    const isCurrentlyInTrial = () => {
        // If planEndDate is set and in the future, AND it's NOT already cancelled/pending
        const isNotCancelled = planDetails.subscriptionStatus !== 'cancellation_pending' && planDetails.subscriptionStatus !== 'trial_cancellation_pending';

        // We assume it's a trial if the end date is future, and no paid cycles have run (handled by backend's current_count=0 logic)
        // The key is confirming the period is still active and has a future end date.
        return planDetails.planEndDate && planDetails.planEndDate > new Date() && isNotCancelled;
    };

    const handlePrepareCancellation = () => {

        // 🛑 REMOVED: if (currentPlan === 'BASIC') { ... } 
        // BASIC plan can now be cancelled.

        const planName = currentPlan;
        // 🛑 USE formatDate helper here for consistency
        const endDateString = planDetails.planEndDate ? formatDate(planDetails.planEndDate) : 'the end of the current billing cycle';

        let msg = '';
        let isTrial = isCurrentlyInTrial();

        // Determine the message based on the current subscription state
        if (isTrial) {
            // Trial Cancellation Message (Access stops at the end of trial)
            msg = `Your current <strong>${planName}</strong> plan is in the <strong>Free Trial</strong> period. By confirming cancellation, we will immediately cancel the future payment mandate (no charge). Your access will remain active until the trial ends on <strong>${endDateString}</strong>.`;
        } else if (planDetails.subscriptionStatus === 'cancellation_pending' || planDetails.subscriptionStatus === 'trial_cancellation_pending') {
            // Already Cancelled Message
            msg = `Your subscription is already scheduled for cancellation. Your access will end on <strong>${endDateString}</strong>. You don't need to take any further action.`;
        } else {
            // Paid Cycle Cancellation Message (Applies to BASIC, PRO, PREMIUM if they are past the trial)
            // 🛑 MODIFIED MESSAGE to be generic since BASIC is paid
            msg = `Your <strong>${planName}</strong> subscription is currently in a paid cycle. By confirming cancellation, your subscription will be scheduled to cancel at the end of the current billing cycle. You will retain full access until <strong>${endDateString}</strong>.`;
        }

        setCancellationMessage(msg);
        setShowCancelModal(true);
    };

    // 3. CANCELLATION LOGIC (Implemented with API call)
    const handleConfirmCancellation = async () => {
        // 🛑 Keep this check simple: prevent action if already pending.
        if (planDetails.subscriptionStatus === 'cancellation_pending' || planDetails.subscriptionStatus === 'trial_cancellation_pending') {
            setShowCancelModal(false);
            return;
        }

        setIsCancelling(true);

        try {
            const response = await apiClient.post(API.cancelSubscription);

            const { action, message, planEndDate } = response.data;

            if (response.data.success) {

                showToast(message, 'success');

                if (action === 'immediate_mandate_end_access') {
                    // Trial Cancellation - Set status to reflect local cancellation
                    setPlanDetails(prev => ({
                        ...prev,
                        // 🛑 Using the status sent by the backend logic
                        subscriptionStatus: 'trial_cancellation_pending',
                    }));

                } else if (action === 'end_of_cycle') {
                    // Paid Cancellation
                    setPlanDetails(prev => ({
                        ...prev,
                        // 🛑 Using the status sent by the backend logic
                        subscriptionStatus: 'cancellation_pending',
                    }));
                }
                // If action is 'no_action_needed', we don't change the status since the backend confirmed no change was necessary.

                // Close modal and reset message
                setCancellationMessage('');

            } else {
                showToast(response.error || 'Failed to cancel subscription due to an unknown error.', 'error');
            }
        } catch (error) {
            console.error("Subscription Cancellation Error:", error);
            const errorMessage = error.response?.data?.razorpayApiError || error.message || 'Failed to connect to the server or Razorpay.';
            showToast(`Cancellation failed: ${errorMessage}`, 'error');
        } finally {
            setShowCancelModal(false);
            setIsCancelling(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    // ... (rest of helper functions: getPlanIcon, getPlanColor, etc.) ...

    // 4. FIX: Use standard plan IDs for icon lookup
    const getPlanIcon = (planId) => {
        switch (planId) {
            case 'basic': return Package;
            case 'pro': return Zap; // PRO plan
            case 'premium': return Crown; // PREMIUM plan
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

    const isCurrentPlan = (plan) => {
        // Compares currentPlan (e.g., 'PREMIUM') with plan.id (e.g., 'premium')
        return currentPlan?.toLowerCase() === plan.id;
    };

    const isUpgrade = (plan) => {
        // FIX: Ensure planOrder keys match plan.id (lowercase)
        const planOrder = { basic: 1, pro: 2, premium: 3 };
        const currentOrder = planOrder[currentPlan?.toLowerCase()] || 0;
        const planOrderValue = planOrder[plan.id] || 0;
        return planOrderValue > currentOrder;
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

    const isCancellationPending = planDetails.subscriptionStatus === 'cancellation_pending' || planDetails.subscriptionStatus === 'trial_cancellation_pending';
    const isPlanExpiring = isCancellationPending && planDetails.planEndDate && planDetails.planEndDate > new Date();

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
                            {/* 🛑 MODIFIED: Removed the check for currentPlan !== 'BASIC' */}
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

            {/* Plans Grid (Unchanged) */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* ... (Plan card map remains the same) ... */}
                {availablePlans.map((plan) => {
                    const IconComponent = getPlanIcon(plan.id);
                    const isCurrent = isCurrentPlan(plan);
                    const isUpgradePlan = isUpgrade(plan);

                    return (
                        <div
                            key={plan.id}
                            className={`relative bg-gray-800/50 rounded-xl p-6 border-2 transition-all duration-300 ${isCurrent
                                ? 'border-indigo-500 shadow-lg shadow-indigo-500/20'
                                : 'border-gray-700/50 hover:border-gray-600'
                                }`}
                        >
                            {isCurrent && (
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                    <span className="bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                                        Current Plan
                                    </span>
                                </div>
                            )}

                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 rounded-lg ${getPlanColor(plan.id)}`}>
                                    <IconComponent className={`w-6 h-6 ${getPlanTextColor(plan.id)}`} />
                                </div>
                                {isUpgradePlan && (
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

                            <button
                                onClick={() => handleUpgradeClick(plan)}
                                disabled={isCurrent || isUpgrading || isCancelling}
                                className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 ${isCurrent
                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                    : isUpgradePlan
                                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                                        : 'bg-gray-700 hover:bg-gray-600 text-white cursor-pointer'
                                    }`}
                            >
                                {isCurrent ? 'Current Plan' : isUpgradePlan ? 'Upgrade Now' : 'Switch Plan'}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Confirmation Modal (Upgrade/Switch - Unchanged) */}
            {showConfirmModal && selectedPlan && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    {/* ... (Modal content for Upgrade/Switch) ... */}
                </div>
            )}

            {/* Cancellation Confirmation Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md">
                        <div className="p-6 border-b border-gray-700">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <XCircle className="w-6 h-6 text-red-400" />
                                Confirm Subscription Cancellation
                            </h2>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-300 mb-4" dangerouslySetInnerHTML={{ __html: cancellationMessage }} />

                            <div className="bg-red-700/30 rounded-lg p-4 mb-4 flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                <p
                                    className="text-sm text-red-300 font-semibold"
                                    dangerouslySetInnerHTML={{
                                        __html: isCurrentlyInTrial()
                                            ? `The recurring payment mandate has been <strong>canceled</strong>. No further charge will occur.`
                                            : `You will <strong>not</strong> be billed for the next cycle. Access will stop on ${formatDate(planDetails.planEndDate)}.`
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
                                Keep Plan
                            </button>
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
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlanUpgrade;