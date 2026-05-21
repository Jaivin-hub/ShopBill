import React, { useMemo, memo } from 'react'; 
import { 
    History, Search, ShieldAlert, CheckCircle2, UserCircle2, BellRing,
    AlertCircle, Pencil, Banknote, Trash2
} from 'lucide-react';
import {
  isReminderOnCooldown,
  getReminderCooldownRemainingMs,
  formatReminderCooldownTitle,
} from '../utils/ledgerReminderCooldown';

const CustomerList = ({ 
    customersList, 
    searchTerm, 
    sortBy,
    openPaymentModal, 
    isProcessing,
    openHistoryModal,
    openEditModal,
    openDeleteModal,
    darkMode,
    openRemindModal,
    showRemindOption = true,
    sentReminders
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
        
        // Cooldown: one week after a reminder was sent
        const isOnReminderCooldown = isReminderOnCooldown(customer._id, sentReminders);
        const reminderCooldownTitle = isOnReminderCooldown
            ? formatReminderCooldownTitle(getReminderCooldownRemainingMs(customer._id, sentReminders))
            : 'Send reminder';
        
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
                className={`group rounded-2xl border p-3 sm:p-4 transition-all duration-200 ${
                    darkMode
                        ? 'bg-slate-900/45 border-slate-800 hover:border-slate-700'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
            >
                <div className="flex items-start gap-3">
                    <button
                        onClick={() => openPaymentModal(customer)}
                        className="flex-1 min-w-0 flex items-start gap-3 text-left"
                    >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 transition-all ${
                            darkMode ? 'bg-slate-900 border-slate-800 group-hover:border-slate-700' : 'bg-slate-50 border-slate-200 group-hover:border-indigo-300'
                        }`}>
                            <UserCircle2 size={18} strokeWidth={2} className={statusConfig.color} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className={`text-[13px] sm:text-sm font-black tracking-tight truncate ${
                                    darkMode ? 'text-slate-100' : 'text-slate-900'
                                }`}>
                                    {customer.name}
                                </h3>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-black tracking-widest uppercase ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                                    <statusConfig.icon size={11} />
                                    {statusConfig.label}
                                </span>
                            </div>
                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                                <p className={`text-[11px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    {customer.phone || 'No contact number'}
                                </p>
                                {creditLimit > 0 && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                        Limit: ₹{creditLimit.toLocaleString('en-IN')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </button>
                    <div className="text-right shrink-0 pl-2">
                        <p className={`text-[10px] uppercase tracking-wider font-black ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Outstanding</p>
                        <p className={`text-sm sm:text-base font-black tabular-nums ${outstandingAmount > 0 ? (isOverLimit ? 'text-rose-500' : 'text-amber-600 dark:text-amber-500') : (darkMode ? 'text-emerald-400' : 'text-emerald-600')}`}>
                            ₹{outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                <div className={`mt-3 pt-3 border-t flex items-center justify-end gap-1.5 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    {outstandingAmount > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                openPaymentModal(customer);
                            }}
                            className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800' : 'text-slate-600 hover:text-emerald-600 hover:bg-slate-100'}`}
                            title="Collect payment"
                            aria-label="Collect payment"
                        >
                            <Banknote size={17} strokeWidth={2} />
                        </button>
                    )}
                    {openEditModal && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(customer);
                            }}
                            className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800' : 'text-slate-600 hover:text-amber-600 hover:bg-slate-100'}`}
                            title="Edit customer"
                            aria-label="Edit name, phone, or limit"
                        >
                            <Pencil size={16} strokeWidth={2} />
                        </button>
                    )}
                    {openDeleteModal && outstandingAmount <= 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                openDeleteModal(customer);
                            }}
                            className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800' : 'text-slate-600 hover:text-rose-600 hover:bg-slate-100'}`}
                            title="Delete customer"
                            aria-label="Delete customer"
                        >
                            <Trash2 size={16} strokeWidth={2} />
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            openHistoryModal(customer);
                        }}
                        className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-slate-400 hover:text-indigo-400 hover:bg-slate-800' : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100'}`}
                        title="View history"
                        aria-label="View transaction history"
                    >
                        <History size={16} strokeWidth={2} />
                    </button>
                    {showRemindOption && outstandingAmount > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                openRemindModal(customer);
                            }}
                            disabled={isOnReminderCooldown}
                            className={`p-2 rounded-lg transition-colors ${
                                isOnReminderCooldown
                                    ? 'text-emerald-500 cursor-not-allowed opacity-80'
                                    : darkMode ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800' : 'text-slate-600 hover:text-amber-600 hover:bg-slate-100'
                            }`}
                            title={reminderCooldownTitle}
                        >
                            {isOnReminderCooldown ? (
                                <CheckCircle2 size={16} strokeWidth={2} />
                            ) : (
                                <BellRing size={16} strokeWidth={2} />
                            )}
                        </button>
                    )}
                </div>
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
        <div className="flex flex-col gap-2 p-2 sm:p-3">
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