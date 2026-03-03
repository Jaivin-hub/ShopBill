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

    const titleColor = darkMode ? 'text-white' : 'text-slate-900';
    const priceColor = darkMode ? 'text-white' : 'text-slate-900';
    const descColor = darkMode ? 'text-slate-300' : 'text-slate-700';
    const subColor = darkMode ? 'text-slate-400' : 'text-slate-500';

    const cardBg = isCurrent
        ? (darkMode ? 'bg-slate-900 border-slate-700 ring-1 ring-indigo-500/30' : 'bg-white border-indigo-200 ring-1 ring-indigo-500/20')
        : (darkMode ? 'bg-slate-900/50 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm');

    return (
        <article
            className={`relative rounded-xl sm:rounded-2xl p-4 sm:p-6 border transition-all flex flex-col ${cardBg} overflow-visible`}
            itemScope
            itemType="https://schema.org/Offer"
        >
            {/* Current plan badge */}
            {isCurrent && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
                    <span className="bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                        Current
                    </span>
                </div>
            )}

            {/* Recommended for Premium */}
            {showRecommended && !isCurrent && (
                <div className="absolute top-3 right-3 z-10">
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded ${darkMode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                        Best value
                    </span>
                </div>
            )}

            <div className="flex-grow relative">
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2.5 sm:p-3 rounded-xl border ${getPlanColor(plan.id)}`}>
                        <IconComponent className={`w-6 h-6 sm:w-7 sm:h-7 ${getPlanTextColor(plan.id)}`} />
                    </div>
                    <h3 className={`text-lg sm:text-xl font-black uppercase tracking-tight ${titleColor}`} itemProp="name">
                        {plan.name}
                    </h3>
                </div>

                <div className="mb-4">
                    <div className="flex items-baseline gap-1.5">
                        <span className={`text-2xl sm:text-3xl font-black tabular-nums tracking-tight ${priceColor}`}>
                            {formatCurrency(plan.price)}
                        </span>
                        <span className={`text-xs font-bold uppercase ${subColor}`}>/mo</span>
                    </div>
                    {plan.id === 'premium' && (
                        <p className={`text-[10px] font-bold mt-1 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                            Most popular
                        </p>
                    )}
                </div>

                <ul className="space-y-2.5 sm:space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2.5">
                            <CheckCircle className={`w-4 h-4 shrink-0 mt-0.5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} strokeWidth={2.5} />
                            <span className={`text-xs sm:text-sm font-bold leading-snug ${descColor}`}>{feature}</span>
                        </li>
                    ))}
                    <div className={`border-t my-3 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`} />
                    <li className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg ${darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                        <Users className={`w-4 h-4 shrink-0 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                        <span className={`text-xs font-bold ${titleColor}`}>
                            {plan.maxUsers === -1 ? 'Unlimited' : `Up to ${plan.maxUsers}`} users
                        </span>
                    </li>
                    <li className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg ${darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                        <Package className={`w-4 h-4 shrink-0 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                        <span className={`text-xs font-bold ${titleColor}`}>
                            {plan.maxInventory === -1 ? 'Unlimited' : plan.maxInventory.toLocaleString('en-IN')} items
                        </span>
                    </li>
                </ul>
            </div>

            <button
                onClick={() => handleUpgradeClick(plan)}
                disabled={buttonDisabled}
                className={`w-full py-3 sm:py-3.5 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest mt-auto transition-all active:scale-[0.98] ${
                    buttonDisabled
                        ? (darkMode ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200')
                        : (darkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/50' : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500')
                }`}
                aria-label={`${buttonText} for ${plan.name} plan`}
            >
                {buttonText}
            </button>
        </article>
    );
};

export default PlanCard;