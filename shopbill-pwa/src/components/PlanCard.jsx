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

    // Enhanced theme logic with gradients
    const isPremium = plan.id === 'premium';
    const isPro = plan.id === 'pro';
    
    const cardBg = isCurrent
        ? (darkMode ? 'bg-gradient-to-br from-indigo-900/30 to-indigo-800/20 border-indigo-500/50 shadow-2xl shadow-indigo-500/10' : 'bg-gradient-to-br from-indigo-50 to-white border-indigo-400 shadow-xl')
        : (darkMode ? 'bg-gradient-to-br from-gray-800/60 to-gray-900/40 border-gray-700/50 hover:border-indigo-400/50' : 'bg-white border-slate-200 hover:border-indigo-300 shadow-lg hover:shadow-xl');
    
    const titleColor = darkMode ? 'text-white' : 'text-slate-900';
    const priceColor = darkMode ? 'text-white' : 'text-slate-900';
    const descColor = darkMode ? 'text-gray-300' : 'text-slate-700';
    const subColor = darkMode ? 'text-gray-400' : 'text-slate-500';
    const borderColor = isCurrent 
        ? 'border-indigo-500' 
        : (darkMode ? 'border-gray-700/50' : 'border-slate-200');

    return (
        <article
            className={`relative rounded-2xl md:rounded-3xl p-6 md:p-8 border-2 transition-all duration-300 flex flex-col ${cardBg} ${borderColor} ${isCurrent ? 'transform scale-[1.02] z-10 ring-2 ring-indigo-500/20' : 'hover:scale-[1.01]'} overflow-visible`}
            itemScope
            itemType="https://schema.org/Offer"
        >
            {/* Background gradient effect */}
            {isPremium && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            )}
            {isPro && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            )}

            {/* Display 'Current Plan' badge */}
            {isCurrent && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
                    <span className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-5 py-2 rounded-full shadow-lg border-2 border-white/20">
                        Active Plan
                    </span>
                </div>
            )}

            {/* Recommended badge for Premium */}
            {showRecommended && !isCurrent && (
                <div className="absolute -top-3 right-4 z-10">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg ${darkMode ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30' : 'text-emerald-700 bg-emerald-100 border border-emerald-200'}`}>
                        Best Value
                    </span>
                </div>
            )}

            <div className="flex-grow relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className={`p-3.5 md:p-4 rounded-xl md:rounded-2xl border-2 ${getPlanColor(plan.id)} shadow-lg`}>
                            <IconComponent className={`w-7 h-7 md:w-8 md:h-8 ${getPlanTextColor(plan.id)}`} />
                        </div>
                        <h3 className={`text-xl md:text-2xl font-black uppercase tracking-tight ${titleColor}`} itemProp="name">
                            {plan.name}
                        </h3>
                    </div>
                </div>

                <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                        <span className={`text-4xl md:text-5xl font-black tabular-nums tracking-tighter ${priceColor}`}>
                            {formatCurrency(plan.price)}
                        </span>
                        <span className={`text-sm font-bold uppercase ${subColor}`}>/month</span>
                    </div>
                    {plan.id === 'premium' && (
                        <p className={`text-xs font-bold mt-2 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                            Most Popular Choice
                        </p>
                    )}
                </div>

                <ul className="space-y-3.5 mb-8">
                    {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                            <div className={`mt-0.5 flex-shrink-0 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                <CheckCircle className="w-5 h-5" strokeWidth={2.5} />
                            </div>
                            <span className={`text-sm font-bold leading-relaxed ${descColor}`}>{feature}</span>
                        </li>
                    ))}
                    
                    <div className={`border-t my-5 ${darkMode ? 'border-gray-700/50' : 'border-slate-200'}`} />
                    
                    <li className="flex items-center gap-3 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                        <Users className={`w-5 h-5 flex-shrink-0 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                        <span className={`text-sm font-black ${titleColor}`}>
                            {plan.maxUsers === -1 ? 'Unlimited' : `Up to ${plan.maxUsers}`} Users
                        </span>
                    </li>
                    <li className="flex items-center gap-3 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                        <Package className={`w-5 h-5 flex-shrink-0 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                        <span className={`text-sm font-black ${titleColor}`}>
                            {plan.maxInventory === -1 ? 'Unlimited' : `${plan.maxInventory.toLocaleString('en-IN')}`} Items
                        </span>
                    </li>
                </ul>
            </div>

            <button
                onClick={() => handleUpgradeClick(plan)}
                disabled={buttonDisabled}
                className={`w-full py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-xs md:text-sm uppercase tracking-[0.15em] mt-auto transition-all duration-200 shadow-lg active:scale-95 ${
                    buttonDisabled
                        ? (darkMode ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700/50' : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200')
                        : isCurrent
                            ? (darkMode ? 'bg-indigo-600/80 text-white shadow-indigo-500/30 border-2 border-indigo-500/50' : 'bg-indigo-600 text-white shadow-indigo-500/30 border-2 border-indigo-500')
                            : (darkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/30 hover:shadow-indigo-500/50 border-2 border-indigo-500/50' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/30 hover:shadow-indigo-500/50 border-2 border-indigo-500')
                }`}
                aria-label={`${buttonText} for ${plan.name} plan`}
            >
                {buttonText}
            </button>
        </article>
    );
};

export default PlanCard;