import React, { useMemo } from 'react'; 
import { 
    List, IndianRupee, History, Phone, Search, 
    ShieldAlert, CheckCircle2, UserCircle2, BellRing,
    ChevronRight, ArrowUpRight, Scale, AlertCircle
} from 'lucide-react';

const CustomerList = ({ 
    customersList, 
    searchTerm, 
    sortBy,
    openPaymentModal, 
    isProcessing,
    openHistoryModal,
    setActiveModal,
    darkMode
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
        
        // Theme-aware styles
        const cardBg = darkMode ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-slate-200 shadow-sm';
        const innerBg = darkMode ? 'bg-gray-950/50 border-gray-800/50' : 'bg-slate-50 border-slate-100';
        
        let statusConfig = {
            label: 'Settled', color: 'text-emerald-500', bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20', icon: CheckCircle2
        };

        if (isOverLimit) {
            statusConfig = {
                label: 'Limit Exceeded', color: 'text-red-500', bg: 'bg-red-500/10',
                border: 'border-red-500/30', icon: ShieldAlert
            };
        } else if (outstandingAmount > 0) {
            statusConfig = {
                label: 'Outstanding', color: 'text-amber-500', bg: 'bg-amber-500/10',
                border: 'border-amber-500/20', icon: AlertCircle
            };
        }

        return (
            <div key={customer._id} className={`${cardBg} border rounded-xl p-5 group transition-all duration-300 hover:border-indigo-500/50 flex flex-col justify-between`}>
                <div>
                    {/* HEADER SECTION */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-all ${statusConfig.bg} ${statusConfig.border}`}>
                                <UserCircle2 className={`w-5 h-5 ${statusConfig.color}`} />
                            </div>
                            <div className="flex flex-col">
                                <h3 className={`text-sm font-black uppercase tracking-tight truncate max-w-[140px] ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {customer.name}
                                </h3>
                                <span className={`text-[9px] font-bold uppercase tracking-widest ${statusConfig.color} flex items-center gap-1`}>
                                    <statusConfig.icon className="w-2.5 h-2.5" /> {statusConfig.label}
                                </span>
                            </div>
                        </div>
                        {outstandingAmount > 0 && (
                            <button 
                                onClick={() => setActiveModal('remind')}
                                className={`p-2 rounded-lg border transition-all ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-amber-600 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-amber-500 hover:text-white'}`}
                            >
                                <BellRing className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* BALANCE DATA */}
                    <div className={`${innerBg} border rounded-lg p-4 mb-4`}>
                        <div className="flex justify-between items-end">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.15em]">Due Balance</p>
                                <p className={`text-2xl font-black italic tracking-tighter ${outstandingAmount > 0 ? statusConfig.color : 'text-gray-400 opacity-40'}`}>
                                    ₹{outstandingAmount.toLocaleString('en-IN')}
                                </p>
                            </div>
                            <div className="text-right">
                                {customer.phone && (
                                    <div className={`flex items-center justify-end gap-1 text-[9px] font-mono font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                        <Phone className="w-2.5 h-2.5" /> {customer.phone}
                                    </div>
                                )}
                                {creditLimit > 0 && (
                                    <div className="text-[8px] font-black text-gray-500 uppercase mt-1">Limit: ₹{creditLimit.toLocaleString()}</div>
                                )}
                            </div>
                        </div>

                        {/* PROGRESS BAR */}
                        {creditLimit > 0 && (
                            <div className="mt-4 space-y-1">
                                <div className="flex justify-between text-[7px] font-black uppercase text-gray-500 tracking-widest">
                                    <span>Credit Usage</span>
                                    <span className={isOverLimit ? 'text-red-500' : ''}>{Math.round(limitUsage)}%</span>
                                </div>
                                <div className={`h-1 w-full rounded-full overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-slate-200'}`}>
                                    <div 
                                        className={`h-full transition-all duration-700 ${isOverLimit ? 'bg-red-500' : 'bg-indigo-500'}`}
                                        style={{ width: `${limitUsage}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex gap-2 pt-2">
                    <button 
                        onClick={() => openHistoryModal(customer)} 
                        className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border transition-all active:scale-95 ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}
                    >
                        <History className="w-3.5 h-3.5" /> History
                    </button>
                    <button 
                        onClick={() => openPaymentModal(customer)} 
                        disabled={isProcessing || outstandingAmount <= 0} 
                        className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm
                            ${outstandingAmount > 0 
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20' 
                                : `cursor-not-allowed border ${darkMode ? 'bg-gray-900 text-gray-700 border-gray-800' : 'bg-slate-50 text-slate-300 border-slate-200'}`
                            }`}
                    >
                        {outstandingAmount > 0 ? (
                            <>
                                <IndianRupee className="w-3.5 h-3.5" /> Collect
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
            {processedCustomers.length > 0 ? (
                processedCustomers.map(renderCustomerCard)
            ) : (
                <div className={`col-span-full py-20 text-center rounded-2xl border-2 border-dashed transition-all ${darkMode ? 'bg-gray-950/50 border-gray-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className={`inline-flex p-5 rounded-xl mb-4 ${darkMode ? 'bg-gray-900' : 'bg-white shadow-sm'}`}>
                        <Search className={`w-10 h-10 ${darkMode ? 'text-gray-800' : 'text-slate-200'}`} />
                    </div>
                    <p className={`text-lg font-black uppercase tracking-tighter ${darkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                        No Accounts Found
                    </p>
                    <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-[0.2em]">Refine search filters</p>
                </div>
            )}
        </div>
    );
};

export default CustomerList;