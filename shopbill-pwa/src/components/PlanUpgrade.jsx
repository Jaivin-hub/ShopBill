import React, { useState, useEffect, useCallback } from 'react';
import { 
    ArrowLeft, CheckCircle, Crown, Zap, Building2, 
    Loader, CreditCard, AlertCircle, IndianRupee, 
    TrendingUp, Users, Package, Shield, Clock
} from 'lucide-react';
import API from '../config/api';

const PlanUpgrade = ({ apiClient, showToast, currentUser, onBack }) => {
    const [currentPlan, setCurrentPlan] = useState(null);
    const [availablePlans, setAvailablePlans] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpgrading, setIsUpgrading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Fetch current plan and available plans
    const fetchPlanData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Get current user's plan from localStorage or API
            if (currentUser && currentUser.plan) {
                setCurrentPlan(currentUser.plan);
            } else {
                // Try to get from API
                try {
                    const planResponse = await apiClient.get(API.updatePlan);
                    if (planResponse.data.success) {
                        setCurrentPlan(planResponse.data.data.plan);
                    }
                } catch (err) {
                    // Fallback to Basic if API fails
                    setCurrentPlan('Basic');
                }
            }

            // Get available plans from system config
            const configResponse = await apiClient.get(API.superadminConfig);
            if (configResponse.data.success && configResponse.data.data.plans) {
                const plans = configResponse.data.data.plans;
                setAvailablePlans([
                    { id: 'basic', ...plans.basic },
                    { id: 'pro', ...plans.pro },
                    { id: 'enterprise', ...plans.enterprise }
                ]);
            }
        } catch (error) {
            console.error('Failed to load plan data:', error);
            showToast('Failed to load plan information.', 'error');
            // Set default plans if API fails
            setAvailablePlans([
                {
                    id: 'basic',
                    name: 'Basic',
                    price: 499,
                    features: ['Basic Inventory Management', 'Up to 5 Users', 'Email Support'],
                    maxUsers: 5,
                    maxInventory: 1000,
                },
                {
                    id: 'pro',
                    name: 'Pro',
                    price: 799,
                    features: ['Advanced Inventory', 'Up to 20 Users', 'Priority Support', 'Advanced Reports'],
                    maxUsers: 20,
                    maxInventory: 10000,
                },
                {
                    id: 'enterprise',
                    name: 'Enterprise',
                    price: 999,
                    features: ['Unlimited Everything', 'Custom Integrations', '24/7 Support', 'Dedicated Manager'],
                    maxUsers: -1,
                    maxInventory: -1,
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    }, [apiClient, API, showToast]);

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

    const handleConfirmUpgrade = async () => {
        if (!selectedPlan) return;

        setIsUpgrading(true);
        try {
            const response = await apiClient.put(API.updatePlan || '/api/user/plan', {
                plan: selectedPlan.name
            });

            if (response.data.success) {
                setCurrentPlan(selectedPlan.name);
                showToast(`Successfully upgraded to ${selectedPlan.name} plan!`, 'success');
                setShowConfirmModal(false);
                setSelectedPlan(null);
                // Refresh user data
                fetchPlanData();
            } else {
                throw new Error(response.data.message || 'Failed to upgrade plan');
            }
        } catch (error) {
            console.error('Plan upgrade error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to upgrade plan.';
            showToast(errorMessage, 'error');
        } finally {
            setIsUpgrading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', { 
            style: 'currency', 
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const getPlanIcon = (planId) => {
        switch (planId) {
            case 'basic': return Package;
            case 'pro': return Zap;
            case 'enterprise': return Crown;
            default: return Building2;
        }
    };

    const getPlanColor = (planId) => {
        switch (planId) {
            case 'basic': return 'border-gray-500 bg-gray-500/10';
            case 'pro': return 'border-indigo-500 bg-indigo-500/10';
            case 'enterprise': return 'border-purple-500 bg-purple-500/10';
            default: return 'border-gray-500 bg-gray-500/10';
        }
    };

    const getPlanTextColor = (planId) => {
        switch (planId) {
            case 'basic': return 'text-gray-400';
            case 'pro': return 'text-indigo-400';
            case 'enterprise': return 'text-purple-400';
            default: return 'text-gray-400';
        }
    };

    const isCurrentPlan = (plan) => {
        return currentPlan?.toLowerCase() === plan.id;
    };

    const isUpgrade = (plan) => {
        const planOrder = { basic: 1, pro: 2, enterprise: 3 };
        const currentOrder = planOrder[currentPlan?.toLowerCase()] || 0;
        const planOrderValue = planOrder[plan.id] || 0;
        return planOrderValue > currentOrder;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen p-4 pb-20 md:p-8 bg-gray-100 dark:bg-gray-950">
                <div className="flex flex-col items-center justify-center h-64">
                    <Loader className="w-10 h-10 animate-spin text-indigo-400" />
                    <p className="mt-4 text-gray-400">Loading plans...</p>
                </div>
            </div>
        );
    }

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
                    Upgrade Your Plan
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Choose the perfect plan for your business needs. Upgrade or downgrade anytime.
                </p>
            </div>

            {/* Current Plan Badge */}
            {currentPlan && (
                <div className="max-w-6xl mx-auto mb-6">
                    <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-indigo-400" />
                            <div>
                                <p className="text-sm text-gray-400">Current Plan</p>
                                <p className="text-lg font-semibold text-white">{currentPlan}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-400">Billing Cycle</p>
                            <p className="text-lg font-semibold text-white">Monthly</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Plans Grid */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                {availablePlans.map((plan) => {
                    const IconComponent = getPlanIcon(plan.id);
                    const isCurrent = isCurrentPlan(plan);
                    const isUpgradePlan = isUpgrade(plan);

                    return (
                        <div
                            key={plan.id}
                            className={`relative bg-gray-800/50 rounded-xl p-6 border-2 transition-all duration-300 ${
                                isCurrent
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
                                disabled={isCurrent || isUpgrading}
                                className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 ${
                                    isCurrent
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

            {/* Confirmation Modal */}
            {showConfirmModal && selectedPlan && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md">
                        <div className="p-6 border-b border-gray-700">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <AlertCircle className="w-6 h-6 text-yellow-400" />
                                Confirm Plan Change
                            </h2>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-300 mb-4">
                                Are you sure you want to {isUpgrade(selectedPlan) ? 'upgrade' : 'downgrade'} to the{' '}
                                <span className="font-semibold text-white">{selectedPlan.name}</span> plan?
                            </p>
                            <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-400">New Plan:</span>
                                    <span className="font-semibold text-white">{selectedPlan.name}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Monthly Price:</span>
                                    <span className="font-semibold text-white">
                                        {formatCurrency(selectedPlan.price)}
                                    </span>
                                </div>
                            </div>
                            <p className="text-sm text-gray-400">
                                Your plan will be updated immediately. Billing will be prorated.
                            </p>
                        </div>
                        <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowConfirmModal(false);
                                    setSelectedPlan(null);
                                }}
                                disabled={isUpgrading}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmUpgrade}
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
                                        Confirm
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

