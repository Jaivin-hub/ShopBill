import React from 'react';
import { CheckCircle, Users, Package } from 'lucide-react';

const PlanCard = ({
    plan,
    currentPlanName,
    isCurrentPlanNotExpiring,
    isSamePlanAndCancelled,
    isUpgrade,
    isUpgrading,
    isCancelling,
    alreadyInTerminalState,
    formatCurrency,
    getPlanIcon,
    getPlanColor,
    getPlanTextColor,
    handleUpgradeClick,
}) => {
    const IconComponent = getPlanIcon(plan.id);
    const isCurrent = isCurrentPlanNotExpiring(plan);
    const isUpgradePlan = isUpgrade(plan);

    // Determine button text
    const buttonText = isCurrent
        ? 'Current Plan'
        : isSamePlanAndCancelled(plan)
            ? 'Re-subscribe'
            : isUpgradePlan
                ? 'Upgrade Now'
                : 'Downgrade Now';

    const showRecommended = plan.id === 'premium';
    const buttonDisabled = (isCurrent && !alreadyInTerminalState) || isUpgrading || isCancelling;

    return (
        <div
            className={`relative bg-gray-800/50 rounded-xl p-6 border-2 transition-all duration-300 flex flex-col ${isCurrent
                ? 'border-indigo-500 shadow-xl shadow-indigo-500/20 transform scale-[1.02]'
                : 'border-gray-700/50 hover:border-gray-600 hover:shadow-lg'
                } mobile:p-4`}
        >
            {/* Display 'Current Plan' badge */}
            {isCurrent && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                    <span className="bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md">
                        Current Plan
                    </span>
                </div>
            )}

            {/* Flex-grow wrapper for all content except the button */}
            <div className="flex-grow">
                {/* MODIFIED: Plan Name and Icon are now inline */}
                <div className="flex items-center justify-between mb-4 mt-2">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${getPlanColor(plan.id)}`}>
                            <IconComponent className={`w-6 h-6 ${getPlanTextColor(plan.id)}`} />
                        </div>
                        <h3 className="text-xl font-bold text-white">{plan.name}</h3> {/* Plan Name moved here */}
                    </div>
                    
                    {/* Show Recommended badge */}
                    {showRecommended && (
                        <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded font-medium">
                            Recommended
                        </span>
                    )}
                </div>

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
                    <li className="flex items-start gap-2 border-t border-gray-700/50 pt-3 mt-3">
                        <Users className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-300 font-semibold">
                            {plan.maxUsers === -1 ? 'Unlimited' : `Up to ${plan.maxUsers}`} Users
                        </span>
                    </li>
                    <li className="flex items-start gap-2">
                        <Package className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-300 font-semibold">
                            {plan.maxInventory === -1 ? 'Unlimited' : `${plan.maxInventory.toLocaleString('en-IN')}`} Items
                        </span>
                    </li>
                </ul>
            </div> {/* End of flex-grow */}

            {/* Button - pushed to the bottom using mt-auto */}
            <button
                onClick={() => handleUpgradeClick(plan)}
                disabled={buttonDisabled}
                className={`w-full py-3 rounded-lg font-semibold mt-auto transition-all duration-200 text-sm sm:text-base ${buttonDisabled
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : (isUpgradePlan || isSamePlanAndCancelled(plan))
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/30'
                        : 'bg-indigo-600 text-white'
                    }`}
            >
                {buttonText}
            </button>
        </div>
    );
};

export default PlanCard;