import React, { useMemo } from 'react'; 
import { 
    IndianRupee, History, Phone, Search, 
    ShieldAlert, CheckCircle2, UserCircle2, BellRing,
    AlertCircle, Wallet
} from 'lucide-react';

const CustomerList = ({ 
    customersList, 
    searchTerm, 
    sortBy,
    openPaymentModal, 
    isProcessing,
    openHistoryModal,
    darkMode,
    openRemindModal,
    sentReminders // Added this prop to track cooldowns
}) => {
    const processedCustomers = useMemo(() => {
        let result = [...(customersList || [])];
        if (searchTerm) {
            const lowerCaseSearch = searchTerm.toLowerCase();
            result = result.filter(customer => 
                customer.name.toLowerCase().includes(lowerCaseSearch) ||
                (customer.phone && customer.phone.includes(searchTerm))
            );
        }
        result.sort((a, b) => {
            if (sortBy === 'due-high') return (b.outstandingCredit || 0) - (a.outstandingCredit || 0);
            if (sortBy === 'due-low') return (a.outstandingCredit || 0) - (b.outstandingCredit || 0);
            if (sortBy === 'alpha') return a.name.localeCompare(b.name);
            return 0;
        });
        return result;
    }, [customersList, searchTerm, sortBy]);

    const renderCustomerCard = (customer) => {
        const outstandingAmount = customer.outstandingCredit || 0;
        const creditLimit = customer.creditLimit || 0;
        const isOverLimit = creditLimit > 0 && outstandingAmount > creditLimit;
        const limitUsage = creditLimit > 0 ? Math.min((outstandingAmount / creditLimit) * 100, 100) : 0;
        
        // COOLDOWN LOGIC: Prevent re-sending for 120 seconds (2 minutes)
        const lastSentTimestamp = sentReminders[customer._id];
        const isRecentlySent = lastSentTimestamp && (Date.now() - lastSentTimestamp < 120000);

        const cardBg = darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
        const innerBg = darkMode ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-50/80 border-slate-100';
        
        let statusConfig = {
            label: 'Settled', color: 'text-emerald-500', bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20', icon: CheckCircle2
        };

        if (isOverLimit) {
            statusConfig = {
                label: 'Limit Over', color: 'text-rose-500', bg: 'bg-rose-500/10',
                border: 'border-rose-500/30', icon: ShieldAlert
            };
        } else if (outstandingAmount > 0) {
            statusConfig = {
                label: 'Pending', color: 'text-amber-500', bg: 'bg-amber-500/10',
                border: 'border-amber-500/20', icon: AlertCircle
            };
        }

        return (
            <div key={customer._id} className={`${cardBg} border rounded-2xl p-4 flex flex-col transition-all duration-300 hover:ring-2 hover:ring-indigo-500/20 group`}>
                
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 transition-all ${statusConfig.bg} ${statusConfig.border}`}>
                            <UserCircle2 className={`w-6 h-6 ${statusConfig.color}`} />
                        </div>
                        <div className="min-w-0">
                            <h3 className={`text-[13px] font-black tracking-tight truncate leading-none mb-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                {customer.name}
                            </h3>
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black tracking-widest ${statusConfig.bg} ${statusConfig.border} ${statusConfig.color}`}>
                                <statusConfig.icon className="w-2 h-2" /> {statusConfig.label}
                            </div>
                        </div>
                    </div>
                    
                    {/* Updated Reminder Button with Cooldown Logic */}
                    {outstandingAmount > 0 && (
                        <button 
                            onClick={() => !isRecentlySent && openRemindModal(customer)}
                            disabled={isRecentlySent}
                            className={`p-2 rounded-lg border transition-all flex items-center gap-1.5 ${
                                isRecentlySent 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 cursor-not-allowed' 
                                : (darkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-amber-600 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-amber-500 hover:text-white')
                            }`}
                        >
                            {isRecentlySent ? (
                                <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span className="text-[8px] font-black uppercase tracking-tighter">Sent</span>
                                </>
                            ) : (
                                <BellRing className="w-3.5 h-3.5" />
                            )}
                        </button>
                    )}
                </div>

                <div className={`${innerBg} border rounded-xl p-4 mb-4 relative overflow-hidden`}>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[8px] font-black text-slate-500 tracking-widest mb-1 opacity-70">Current Balance</p>
                                <div className="flex items-center gap-1">
                                    <span className={`text-sm font-black ${outstandingAmount > 0 ? 'text-indigo-500' : 'text-slate-400'}`}>₹</span>
                                    <p className={`text-2xl font-black tracking-tighter ${outstandingAmount > 0 ? (darkMode ? 'text-white' : 'text-slate-900') : 'text-slate-400 opacity-40'}`}>
                                        {outstandingAmount.toLocaleString('en-IN')}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                {customer.phone && (
                                    <div className={`flex items-center justify-end gap-1.5 text-[9px] font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                        <Phone className="w-2.5 h-2.5" /> {customer.phone}
                                    </div>
                                )}
                                <div className="mt-2">
                                    <p className="text-[7px] font-black text-slate-400 tracking-tighter">Credit Cap</p>
                                    <p className={`text-[10px] font-black ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        {creditLimit > 0 ? `₹${creditLimit.toLocaleString()}` : 'No Limit'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {creditLimit > 0 && (
                            <div className="mt-4 pt-3 border-t border-slate-500/10">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[7px] font-black text-slate-500 tracking-[0.1em]">Utilization</span>
                                    <span className={`text-[8px] font-black ${isOverLimit ? 'text-rose-500' : 'text-indigo-500'}`}>{Math.round(limitUsage)}%</span>
                                </div>
                                <div className={`h-1.5 w-full rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                                    <div 
                                        className={`h-full transition-all duration-1000 ease-out rounded-full ${isOverLimit ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'bg-indigo-500'}`}
                                        style={{ width: `${limitUsage}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    <Wallet className={`absolute -right-2 -bottom-2 w-12 h-12 opacity-[0.03] ${darkMode ? 'text-white' : 'text-slate-900'}`} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={() => openHistoryModal(customer)} 
                        className={`py-3 rounded-xl text-[9px] font-black tracking-widest flex items-center justify-center gap-2 border transition-all active:scale-95 ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}
                    >
                        <History className="w-3.5 h-3.5 opacity-60" /> History
                    </button>
                    <button 
                        onClick={() => openPaymentModal(customer)} 
                        disabled={isProcessing || outstandingAmount <= 0} 
                        className={`py-3 rounded-xl text-[9px] font-black tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg
                            ${outstandingAmount > 0 
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20' 
                                : `cursor-not-allowed border ${darkMode ? 'bg-slate-900 text-slate-700 border-slate-800 shadow-none' : 'bg-slate-100 text-slate-300 border-slate-200 shadow-none'}`
                            }`}
                    >
                        {outstandingAmount > 0 ? (
                            <>
                                <IndianRupee className="w-3 h-3" /> Collect
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-3 h-3" /> Settled
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-24">
            {processedCustomers.length > 0 ? (
                processedCustomers.map(renderCustomerCard)
            ) : (
                <div className={`col-span-full py-24 text-center rounded-2xl border-2 border-dashed transition-all ${darkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className={`inline-flex p-6 rounded-2xl mb-4 ${darkMode ? 'bg-slate-900' : 'bg-white shadow-sm'}`}>
                        <Search className={`w-12 h-12 ${darkMode ? 'text-slate-800' : 'text-slate-200'}`} />
                    </div>
                    <h4 className={`text-xl font-black tracking-tighter ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        No Accounts Found
                    </h4>
                    <p className="text-[10px] font-bold text-slate-500 mt-2 tracking-[0.3em] opacity-60">Try adjusting your filters</p>
                </div>
            )}
        </div>
    );
};

export default CustomerList;