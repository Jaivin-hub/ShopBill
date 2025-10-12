import React, { useState, useMemo } from 'react'; 
import { 
    List, CreditCard, IndianRupee, DollarSign, History, AlertTriangle, Phone, Search, Loader 
} from 'lucide-react';

/**
 * CustomerList Component: Renders the actual list of Khata customers.
 */
const CustomerList = ({ 
    sortedCustomers, 
    openPaymentModal, 
    isProcessing,
    openHistoryModal
}) => {
    // 1. Search State
    const [searchTerm, setSearchTerm] = useState('');

    // Use a safe reference for the customer list array
    const customersList = sortedCustomers || [];

    // 2. Filtered List Logic
    const filteredCustomers = useMemo(() => {
        if (!searchTerm) {
            return customersList;
        }
        const lowerCaseSearch = searchTerm.toLowerCase();
        return customersList.filter(customer => 
            customer.name.toLowerCase().includes(lowerCaseSearch) ||
            (customer.phone && customer.phone.includes(searchTerm))
        );
    }, [customersList, searchTerm]);


    const renderCustomerCard = (customer) => {
        // Ensure outstandingCredit is safely accessed and defaulted to 0 for rendering
        const outstandingAmount = customer.outstandingCredit || 0;
        
        // Determine status classes and message
        const isOverLimit = customer.creditLimit > 0 && 
                            outstandingAmount > customer.creditLimit;
        
        const cardBorderClass = isOverLimit 
            ? 'border-red-600 ring-red-500/30' // Overdue & Overlimit
            : outstandingAmount > 0 
                ? 'border-yellow-600 ring-yellow-500/30' // Just Due
                : 'border-gray-700 ring-indigo-500/30'; // Cleared or No Due

        const statusText = isOverLimit 
            ? 'OVER LIMIT'
            : outstandingAmount > 0
                ? 'DUE'
                : 'CLEARED';
        
        const statusClass = isOverLimit 
            ? 'bg-red-700 text-red-100' 
            : outstandingAmount > 0
                ? 'bg-yellow-600 text-gray-900' 
                : 'bg-teal-700 text-teal-100';

        return (
            <div 
                key={customer._id} 
                className={`bg-gray-800 p-4 rounded-xl shadow-lg transition-all duration-300 transform 
                            border ${cardBorderClass} ring-1 hover:shadow-xl hover:-translate-y-0.5`}
            >
                {/* 1. HEADER & AMOUNT (Condensed) */}
                <div className="flex flex-col mb-3">
                    <div className="flex justify-between items-start mb-2">
                        {/* Name & Status */}
                        <h3 className="text-lg sm:text-xl font-black text-white truncate max-w-[65%]">
                            {customer.name}
                        </h3>
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full flex-shrink-0 mt-0.5 ${statusClass}`}>
                            {statusText}
                        </span>
                    </div>

                    {/* MAIN AMOUNT & INFO (New Condensed Row) */}
                    <div className="flex justify-between items-end border-t border-gray-700 pt-2">
                        
                        {/* Outstanding Khata */}
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-gray-500 block">Outstanding:</span>
                            <span className={`text-2xl sm:text-3xl font-black ${isOverLimit ? 'text-red-400' : outstandingAmount > 0 ? 'text-yellow-400' : 'text-teal-400'}`}>
                                ₹{outstandingAmount.toFixed(0)}
                            </span>
                        </div>

                        {/* Limit & Phone (COMPACTED) */}
                        <div className="flex flex-col items-end space-y-0.5 text-xs text-gray-400">
                            {customer.phone && (
                                <div className="flex items-center">
                                    <Phone className="w-3 h-3 mr-1" />
                                    <span>{customer.phone}</span>
                                </div>
                            )}
                            {customer.creditLimit > 0 && (
                                <div className="flex items-center">
                                    <CreditCard className="w-3 h-3 mr-1" />
                                    <span>Limit: ₹{customer.creditLimit.toFixed(0)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. ACTIONS (Mobile Focus: Taller, clearer buttons) */}
                <div className="flex gap-2 pt-2 border-t border-gray-700">
                    
                    {/* View History Button */}
                    <button 
                        onClick={() => openHistoryModal(customer)} 
                        className="flex-1 py-2 text-xs sm:text-sm font-semibold text-indigo-300 bg-indigo-900/40 rounded-lg hover:bg-indigo-900/60 transition disabled:opacity-50 flex items-center justify-center"
                        disabled={isProcessing}
                        title="View Transaction History"
                    >
                        <History className="w-4 h-4 mr-1 sm:mr-2" /> History
                    </button>
                    
                    {/* Record Payment Button (FIXED DESIGN - Corrected icon usage and alignment) */}
                    <button 
                        onClick={() => openPaymentModal(customer)} 
                        className="flex-1 py-2 text-xs sm:text-sm font-bold text-white bg-teal-600 rounded-lg shadow-md shadow-teal-900/50 hover:bg-teal-500 transition disabled:opacity-50 disabled:bg-gray-700 disabled:text-gray-400 flex items-center justify-center" // Ensure flex classes are here
                        disabled={isProcessing || outstandingAmount <= 0}
                        title="Record Payment Received"
                    >
                        <IndianRupee className="w-4 h-4 mr-1 sm:mr-2" /> Pay Now
                    </button>
                </div>
            </div>
        );
    };

    const displayCount = filteredCustomers.length;

    return (
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
            
            {/* --- 1. Search Bar --- */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full py-3 pl-10 pr-4 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    disabled={isProcessing}
                />
            </div>
            
            {/* --- 2. Customer List Header --- */}
            <div className="flex justify-between items-center text-gray-400 font-semibold pb-2 mt-2 border-b border-gray-700">
                <h2 className="text-lg sm:text-xl font-bold text-gray-300 flex items-center">
                    <List className="w-5 h-5 mr-2 text-indigo-400" />
                    {displayCount} Result{displayCount !== 1 ? 's' : ''} ({customersList.length} total)
                </h2>
                <span className="text-xs sm:text-sm hidden sm:block text-gray-500">Sorted by Highest Due</span>
            </div>
            
            {/* --- 3. Customer List (Grid Layout) --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {filteredCustomers.length > 0 ? (
                    filteredCustomers.map(renderCustomerCard)
                ) : (
                    <div className="sm:col-span-2 p-10 text-center bg-gray-800 rounded-xl border border-gray-700 text-gray-400">
                        <Search className="w-8 h-8 mx-auto mb-3" />
                        <p className="font-semibold">
                            {searchTerm ? `No results found for "${searchTerm}".` : 'No customers found in the Khata ledger.'}
                        </p>
                        <p className="text-sm mt-1">Check your search term or add a new customer.</p>
                    </div>
                )}
            </div>
            
            {/* Loader overlay for processing actions */}
            {isProcessing && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-[60]">
                    <div className="p-4 bg-gray-800 rounded-lg shadow-xl flex items-center text-white">
                        <Loader className="w-6 h-6 animate-spin text-teal-400 mr-3" />
                        <span className="font-semibold">Processing action...</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerList;