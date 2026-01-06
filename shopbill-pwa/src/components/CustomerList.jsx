import React, { useMemo } from 'react'; 
import { 
    List, IndianRupee, History, Phone, Search, 
    ShieldAlert, CheckCircle2, UserCircle2, BellRing
} from 'lucide-react';

const CustomerList = ({ 
    customersList, 
    searchTerm, 
    sortBy,
    openPaymentModal, 
    isProcessing,
    openHistoryModal,
    setActiveModal
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
        const isOverLimit = customer.creditLimit > 0 && outstandingAmount > customer.creditLimit;
        
        let statusConfig = {
            label: 'CLEARED', color: 'text-teal-400', bg: 'bg-teal-500/10',
            border: 'border-teal-500/20', icon: CheckCircle2, glow: 'group-hover:shadow-teal-900/20'
        };

        if (isOverLimit) {
            statusConfig = {
                label: 'OVER LIMIT', color: 'text-rose-400', bg: 'bg-rose-500/10',
                border: 'border-rose-500/30', icon: ShieldAlert, glow: 'group-hover:shadow-rose-900/30'
            };
        } else if (outstandingAmount > 0) {
            statusConfig = {
                label: 'PENDING', color: 'text-amber-400', bg: 'bg-amber-500/10',
                border: 'border-amber-500/20', icon: List, glow: 'group-hover:shadow-amber-900/20'
            };
        }

        return (
            <div key={customer._id} className={`group bg-gray-900/40 backdrop-blur-sm p-5 rounded-3xl border border-gray-800 transition-all duration-300 hover:border-gray-700 hover:bg-gray-900/60 ${statusConfig.glow}`}>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3 truncate">
                        <div className={`p-2 rounded-xl ${statusConfig.bg} ${statusConfig.border}`}>
                            <UserCircle2 className={`w-5 h-5 ${statusConfig.color}`} />
                        </div>
                        <div className="truncate">
                            <h3 className="text-base font-black text-white truncate group-hover:text-indigo-400 transition-colors">{customer.name}</h3>
                            <div className="flex items-center text-[10px] text-gray-500 font-bold tracking-widest uppercase">
                                <statusConfig.icon className={`w-3 h-3 mr-1 ${statusConfig.color}`} /> {statusConfig.label}
                            </div>
                        </div>
                    </div>
                    {outstandingAmount > 0 && (
                        <button 
                            onClick={() => setActiveModal('remind')}
                            className="p-2 bg-gray-800/50 hover:bg-indigo-600 text-gray-500 hover:text-white rounded-xl transition-all active:scale-90 border border-gray-700/50"
                        >
                            <BellRing className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="bg-gray-950/50 rounded-2xl p-4 border border-gray-800/50 mb-4">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Due Balance</p>
                            <p className={`text-2xl font-black ${statusConfig.color}`}>₹{outstandingAmount.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="text-right">
                             {customer.phone && <p className="text-xs font-bold text-indigo-400/60 flex items-center justify-end"><Phone className="w-3 h-3 mr-1" /> {customer.phone}</p>}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => openHistoryModal(customer)} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                        <History className="w-4 h-4" /> History
                    </button>
                    <button onClick={() => openPaymentModal(customer)} disabled={isProcessing || outstandingAmount <= 0} 
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${outstandingAmount > 0 ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg' : 'bg-gray-900 text-gray-600 border border-gray-800'}`}>
                        <IndianRupee className="w-4 h-4" /> Collect
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-24">
            {processedCustomers.length > 0 ? (
                processedCustomers.map(renderCustomerCard)
            ) : (
                <div className="md:col-span-3 py-20 text-center bg-gray-900/20 rounded-3xl border border-gray-800 border-dashed">
                    <Search className="w-10 h-10 text-gray-800 mx-auto mb-4" />
                    <p className="text-xl font-black text-gray-400">No matches found</p>
                </div>
            )}
        </div>
    );
};

export default CustomerList;