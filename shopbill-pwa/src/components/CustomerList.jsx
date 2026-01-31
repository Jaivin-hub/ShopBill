import React, { useMemo, memo } from 'react'; 
import { 
    IndianRupee, History, Phone, Search, 
    ShieldAlert, CheckCircle2, UserCircle2, BellRing,
    AlertCircle, Wallet, ChevronRight
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
        
        // COOLDOWN LOGIC: Prevent re-sending for 120 seconds (2 minutes)
        const lastSentTimestamp = sentReminders[customer._id];
        const isRecentlySent = lastSentTimestamp && (Date.now() - lastSentTimestamp < 120000);
        
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
            <div
                key={customer._id}
                className={`w-full px-5 py-4 flex items-center gap-4 transition-all duration-200 border-l-2 relative group ${
                    darkMode 
                        ? 'border-transparent hover:bg-white/[0.02] hover:border-slate-700'
                        : 'border-transparent hover:bg-slate-100 hover:border-slate-300'
                }`}
            >
                <button
                    onClick={() => openPaymentModal(customer)}
                    className="flex-1 flex items-center gap-4 min-w-0"
                >
                {/* Avatar Section */}
                <div className="relative shrink-0">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-300 ${
                        darkMode
                            ? 'bg-slate-900 border-slate-800 text-slate-500 group-hover:border-slate-600 group-hover:-rotate-3'
                            : 'bg-slate-100 border-slate-200 text-slate-600 group-hover:border-indigo-300 group-hover:-rotate-3'
                    }`}>
                        <UserCircle2 size={18} strokeWidth={isOverLimit ? 2.5 : 2} className={statusConfig.color} />
                    </div>
                    {/* Status Badge Overlay */}
                    {isOverLimit && (
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${darkMode ? 'bg-slate-950' : 'bg-white'} rounded-full flex items-center justify-center border ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                            <ShieldAlert size={10} className="text-rose-500" />
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                        <h3 className={`text-[13px] font-black truncate tracking-wide uppercase transition-colors flex-1 min-w-0 leading-tight ${
                            darkMode 
                                ? 'text-slate-300 group-hover:text-white'
                                : 'text-slate-700 group-hover:text-indigo-600'
                        }`}>
                            {customer.name}
                        </h3>
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                        <p className={`text-[11px] truncate font-medium leading-tight flex-1 min-w-0 ${
                            darkMode 
                                ? 'text-slate-500 group-hover:text-slate-400'
                                : 'text-slate-600 group-hover:text-slate-700'
                        }`}>
                            {customer.phone ? (
                                <>
                                    <span className="font-black text-[8px] mr-1.5 opacity-40 text-indigo-500 uppercase">
                                        PHONE:
                                    </span>
                                    {customer.phone}
                                </>
                            ) : (
                                <span className="text-[9px] uppercase tracking-widest opacity-20 italic">No Contact</span>
                            )}
                        </p>
                    </div>
                </div>
                
                </button>
                
                {/* Action Buttons and Price Badge - Single line alignment */}
                <div className="flex items-center gap-1.5 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity shrink-0">
                    {outstandingAmount > 0 && (
                        <span className={`h-5 w-5 rounded-full ${isOverLimit ? 'bg-rose-500' : 'bg-amber-500'} text-white text-[9px] font-black flex items-center justify-center ${isOverLimit ? 'animate-pulse' : ''}`}>
                            {isOverLimit ? '!' : outstandingAmount > 9999 ? '9+' : (outstandingAmount >= 1000 ? `${Math.floor(outstandingAmount / 1000)}k` : outstandingAmount)}
                        </span>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            openHistoryModal(customer);
                        }}
                        className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-slate-500 hover:text-indigo-400 hover:bg-slate-800' : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100'}`}
                        title="View History"
                        aria-label="View transaction history"
                    >
                        <History size={16} strokeWidth={2} />
                    </button>
                    {outstandingAmount > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                openRemindModal(customer);
                            }}
                            disabled={isRecentlySent}
                            className={`p-2 rounded-lg transition-colors ${
                                isRecentlySent 
                                    ? 'text-emerald-500 cursor-not-allowed' 
                                    : darkMode ? 'text-slate-500 hover:text-amber-400 hover:bg-slate-800' : 'text-slate-600 hover:text-amber-600 hover:bg-slate-100'
                            }`}
                            title={isRecentlySent ? "Reminder sent recently" : "Send Reminder"}
                        >
                            {isRecentlySent ? (
                                <CheckCircle2 size={14} />
                            ) : (
                                <BellRing size={14} />
                            )}
                        </button>
                    )}
                </div>
                
                <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-indigo-500" />
            </div>
        );
    };

    if (processedCustomers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-4 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'} border`}>
                    <Search className={`w-8 h-8 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
                </div>
                <p className={`text-[9px] font-black tracking-[0.3em] uppercase ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>No Accounts Found</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {processedCustomers.map(renderCustomerCard)}
            
            {/* End of List Decorator */}
            {processedCustomers.length > 0 && (
                <div className="p-8 flex flex-col items-center opacity-10">
                    <div className="w-px h-8 bg-gradient-to-b from-indigo-500 to-transparent mb-2" />
                    <span className={`text-[8px] font-black tracking-[0.5em] uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Registry End</span>
                </div>
            )}
        </div>
    );
};

export default memo(CustomerList);