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
    darkMode
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

    // Theme logic
    const cardBg = darkMode ? 'bg-gray-800/50' : 'bg-white shadow-md hover:shadow-xl';
    const titleColor = darkMode ? 'text-white' : 'text-slate-950';
    const priceColor = darkMode ? 'text-white' : 'text-black';
    const descColor = darkMode ? 'text-gray-300' : 'text-slate-700';
    const subColor = darkMode ? 'text-gray-400' : 'text-slate-500';
    const borderColor = isCurrent 
        ? 'border-indigo-500' 
        : (darkMode ? 'border-gray-700/50' : 'border-slate-200');

    return (
        <article
            className={`relative rounded-xl p-6 border-2 transition-all duration-300 flex flex-col ${cardBg} ${borderColor} ${isCurrent ? 'transform scale-[1.02] z-10' : 'hover:border-indigo-400'} mobile:p-4`}
            itemScope
            itemType="https://schema.org/Offer"
        >
            {/* Display 'Current Plan' badge */}
            {isCurrent && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                    <span className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                        Active Tier
                    </span>
                </div>
            )}

            <div className="flex-grow">
                <div className="flex items-center justify-between mb-4 mt-2">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${getPlanColor(plan.id)}`}>
                            <IconComponent className={`w-6 h-6 ${getPlanTextColor(plan.id)}`} />
                        </div>
                        <h3 className={`text-xl font-black uppercase tracking-tight ${titleColor}`} itemProp="name">
                            {plan.name}
                        </h3>
                    </div>
                    
                    {showRecommended && (
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${darkMode ? 'text-green-400 bg-green-500/10' : 'text-green-700 bg-green-100'}`}>
                            Best Value
                        </span>
                    )}
                </div>

                <div className="mb-4">
                    <span className={`text-3xl font-black tabular-nums tracking-tighter ${priceColor}`}>
                        {formatCurrency(plan.price)}
                    </span>
                    <span className={`text-xs font-bold uppercase ml-2 ${subColor}`}>/month</span>
                </div>

                <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                            <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                            <span className={`text-sm font-medium ${descColor}`}>{feature}</span>
                        </li>
                    ))}
                    
                    <div className={`border-t my-4 ${darkMode ? 'border-gray-700/50' : 'border-slate-100'}`} />
                    
                    <li className="flex items-start gap-2">
                        <Users className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                        <span className={`text-sm font-bold ${titleColor}`}>
                            {plan.maxUsers === -1 ? 'Unlimited' : `Up to ${plan.maxUsers}`} Users
                        </span>
                    </li>
                    <li className="flex items-start gap-2">
                        <Package className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                        <span className={`text-sm font-bold ${titleColor}`}>
                            {plan.maxInventory === -1 ? 'Unlimited' : `${plan.maxInventory.toLocaleString('en-IN')}`} Items
                        </span>
                    </li>
                </ul>
            </div>

            <button
                onClick={() => handleUpgradeClick(plan)}
                disabled={buttonDisabled}
                className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-[0.15em] mt-auto transition-all duration-200 shadow-md active:scale-95 ${
                    buttonDisabled
                        ? (darkMode ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed')
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
                    }`}
                aria-label={`${buttonText} for ${plan.name} plan`}
            >
                {buttonText}
            </button>
        </article>
    );
};

export default PlanCard;