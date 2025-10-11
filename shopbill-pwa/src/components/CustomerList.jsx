// CustomerList.jsx (Confirmed with the robust scrolling logic)
import React from 'react';
import { 
    List, MessageSquare, ArrowRight, UserPlus, 
    TrendingUp, Phone, AlertTriangle 
} from 'lucide-react';

// Utility Function (Helper for card)
const getCustomerId = (cust) => cust._id || cust.id;


// --- Utility Render (Customer Card) ---
const CustomerCard = ({ cust, onCardClick }) => {
    // ... (CustomerCard implementation remains unchanged)
    const customerId = getCustomerId(cust);
    const isNearLimit = cust.creditLimit > 0 && cust.outstandingCredit >= cust.creditLimit * 0.95;
    const isOverdue = cust.outstandingCredit > 5000; 

    let bgColor = 'bg-gray-800';
    let borderColor = 'border-gray-700';
    let dueColor = 'text-indigo-400';
    
    if (cust.outstandingCredit > 0) {
        if (isNearLimit || isOverdue) {
            bgColor = 'bg-red-900/20'; 
            borderColor = 'border-red-700';
            dueColor = 'text-red-400';
        } else {
            bgColor = 'bg-indigo-900/20';
            borderColor = 'border-indigo-700';
        }
    }

    return (
      <div 
        key={customerId}
        className={`w-full p-4 rounded-xl shadow-xl shadow-indigo-900/10 transition duration-200 border ${borderColor} ${bgColor} 
                    flex items-center space-x-3 cursor-pointer hover:border-teal-500`}
        onClick={onCardClick}
      >
        
        <div className="flex flex-grow justify-between items-center text-left space-x-3">
            
            <div className="flex flex-col flex-grow truncate">
                <p className={`font-bold text-base text-white flex items-center truncate`}>
                    {cust.name}
                    {(isNearLimit || isOverdue) && (
                        <AlertTriangle className="w-4 h-4 ml-2 text-red-400 flex-shrink-0" title="High Risk" />
                    )}
                </p>
                
                <div className="flex items-center text-xs mt-1 space-x-3">
                    {cust.phone && (
                        <span className="text-gray-500 flex items-center">
                            <Phone className="w-3 h-3 mr-1" />{cust.phone}
                        </span>
                    )}
                    {cust.creditLimit > 0 && (
                        <span className="text-teal-400 font-medium hidden sm:block">
                            Limit: ₹{cust.creditLimit.toFixed(0)}
                        </span>
                    )}
                </div>
            </div>
            
            <div className="flex items-center space-x-3 flex-shrink-0">
                <div className="text-right">
                    <span className={`text-2xl font-extrabold block ${cust.outstandingCredit > 0 ? dueColor : 'text-green-400'}`}>
                        ₹{cust.outstandingCredit.toFixed(0)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">{cust.outstandingCredit > 0 ? 'DUE' : 'CLEAR'}</span>
                </div>
                <ArrowRight className="w-5 h-5 text-teal-400 flex-shrink-0" />
            </div>
        </div>
      </div>
    );
};


const CustomerList = ({ 
    sortedCustomers, 
    totalOutstanding, 
    outstandingCustomersForReminders,
    openPaymentModal,
    openAddCustomerModal,
    handleSendReminders,
    isProcessing
}) => {
  return (
    <>
      <h1 className="text-3xl font-extrabold text-white mb-2 flex items-center">
        Khata Manager
      </h1>
      <p className="text-gray-400 mb-6">Track customer dues and easily record payments.</p>
      
      {/* 🌟 ACTION BAR SECTION (UNCHANGED) */}
      <div className="p-4 mb-6 bg-gray-900 rounded-xl shadow-2xl shadow-indigo-900/20 border border-indigo-700 transition-colors duration-300">
        <div className="max-w-xl mx-auto space-y-3">
            
            {/* 1. Total Outstanding Due */}
            <div className="flex items-center justify-between px-2 py-2 bg-gray-800 rounded-lg border border-gray-700">
                <div className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-indigo-400" />
                    <span className="text-lg font-bold text-gray-400">TOTAL KHATA DUE:</span>
                </div>
                <span className="text-3xl font-extrabold block text-teal-400">
                    ₹{totalOutstanding.toFixed(0)}
                </span>
            </div>

            {/* 2. Action Buttons (New Customer & Remind All) */}
            <div className="grid grid-cols-2 gap-3 pt-2">
                
                {/* Primary Action: New Customer (Teal) */}
                <button 
                    className="py-3 bg-teal-600 text-white rounded-xl font-extrabold text-sm shadow-xl shadow-teal-900/50 hover:bg-teal-700 transition flex items-center justify-center active:scale-[0.99] disabled:opacity-50"
                    onClick={openAddCustomerModal}
                    disabled={isProcessing}
                >
                    <UserPlus className="w-4 h-4 mr-2" /> 
                    New Customer
                </button>
                
                {/* Secondary Action: Remind All (Red/Accent) */}
                <button 
                    className={`py-3 rounded-xl font-bold text-sm shadow-xl transition flex items-center justify-center active:scale-[0.99] ${
                        outstandingCustomersForReminders.length === 0 
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-red-600 text-white hover:bg-red-700 shadow-red-900/50'
                    }`}
                    onClick={handleSendReminders}
                    disabled={outstandingCustomersForReminders.length === 0 || isProcessing}
                >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Remind All
                </button>
            </div>
        </div>
      </div>
      {/* --- END ACTION BAR --- */}


      {/* 1. Main Ledger Card with List */}
      <div className="bg-gray-900 p-4 rounded-xl shadow-2xl shadow-indigo-900/20 border border-gray-800 transition-colors duration-300">
        
        {/* Header (Customer List Caption) */}
        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-4">
            <h3 className="text-xl font-bold flex items-center text-white">
                <List className="w-5 h-5 mr-2 text-indigo-400" /> Customer List ({sortedCustomers.length})
            </h3>
        </div>
        
        {/* 🔥 SCROLLABLE AREA WRAPPER - This is the crucial area */}
        <div className="space-y-3 **max-h-[60vh] overflow-y-auto pb-2 pr-2**">
            {sortedCustomers.length > 0 ? (
                sortedCustomers.map(cust => (
                    <CustomerCard 
                        key={getCustomerId(cust)} 
                        cust={cust}
                        // Only allow clicking if there's outstanding credit
                        onCardClick={cust.outstandingCredit > 0 ? () => openPaymentModal(cust) : null}
                    />
                ))
            ) : (
                <div className="text-center py-10 text-gray-400 text-lg bg-indigo-900/30 rounded-xl border border-indigo-700">
                    <AlertTriangle className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
                    <p>No customers found yet. Click 'New Customer' to begin.</p>
                </div>
            )}
        </div>
      </div>
    </>
  );
};

export default CustomerList;