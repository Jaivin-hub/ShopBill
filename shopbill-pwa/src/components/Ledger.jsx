import React, { useState, useMemo } from 'react';
import { 
    List, MessageSquare, CheckCircle, XCircle, ArrowRight, UserPlus, 
    CreditCard, X, TrendingUp, DollarSign, Phone, AlertTriangle 
} from 'lucide-react';
import axios from 'axios';

// Initial state for the new customer form
const initialNewCustomerState = {
    name: '',
    phone: '',
    creditLimit: 0,
};

const Ledger = ({ customers, updateCustomerCredit, showToast, refreshData, customerApiUrl }) => {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [newCustomerData, setNewCustomerData] = useState(initialNewCustomerState);
  const [loading, setLoading] = useState(false);

  // Filter and sort customers once
  const outstandingCustomers = useMemo(() => 
    customers
      .filter(c => c.outstandingCredit > 0)
      .sort((a, b) => b.outstandingCredit - a.outstandingCredit),
    [customers]
  );
  
  // Calculate total outstanding due
  const totalOutstanding = useMemo(() => 
    outstandingCustomers.reduce((sum, cust) => sum + cust.outstandingCredit, 0),
    [outstandingCustomers]
  );
  
  // Use unique ID for keying (prioritize _id from API, fall back to id)
  const getCustomerId = (cust) => cust._id || cust.id;

  // --- Modal Logic ---

  const openPaymentModal = (cust) => {
    setSelectedCustomer(cust);
    setPaymentAmount('');
    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSelectedCustomer(null);
    setPaymentAmount('');
  };

  const openAddCustomerModal = () => {
    setNewCustomerData(initialNewCustomerState);
    setIsAddCustomerModalOpen(true);
  };

  const closeAddCustomerModal = () => {
    setIsAddCustomerModalOpen(false);
    setNewCustomerData(initialNewCustomerState);
  };

  const handleNewCustomerInputChange = (e) => {
    const { name, value, type } = e.target;
    setNewCustomerData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  // --- Action Handlers ---
  
  const handleRecordPayment = () => {
    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || isNaN(amount)) {
      showToast('Please enter a valid payment amount.', 'error');
      return;
    }
    
    if (!selectedCustomer) return;

    const customerId = getCustomerId(selectedCustomer);

    // Only reduce credit up to the outstanding amount
    const amountChange = -Math.min(amount, selectedCustomer.outstandingCredit); 
    
    updateCustomerCredit(customerId, amountChange);
    showToast(`Payment of ₹${amount.toFixed(0)} recorded for ${selectedCustomer.name}`, 'success');
    
    closePaymentModal();
  };

  const handleAddNewCustomer = async (e) => {
    e.preventDefault();

    if (!newCustomerData.name.trim()) {
        return showToast('Customer name is required.', 'error');
    }

    setLoading(true);
    try {
        const dataToSend = {
            ...newCustomerData,
            creditLimit: parseFloat(newCustomerData.creditLimit) || 0,
            outstandingCredit: 0
        };

        // Mock API POST request
        if (customerApiUrl) {
            await axios.post(customerApiUrl, dataToSend);
        } else {
            // Simulate API call delay if no URL is provided
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        showToast(`New Khata Customer added: ${newCustomerData.name}`, 'success');
        
        if (refreshData) {
             await refreshData();
        }
        
        closeAddCustomerModal();

    } catch (error) {
        console.error('Add Customer Error:', error);
        // Fallback for mock or failed API call
        const errorMessage = error.response?.data?.error || error.message || 'Check console for details.';
        showToast(`Error adding customer: ${customerApiUrl ? errorMessage : 'Simulated network failure.'}`, 'error');
    } finally {
        setLoading(false);
    }
  };
  
  // Revised Reminder Handler: Sends to ALL outstanding customers
  const handleSendReminders = () => {
      if (outstandingCustomers.length === 0) {
          showToast('No customers with outstanding Khata due to remind.', 'info');
          return;
      }
          
      const selectedNames = outstandingCustomers.map(cust => cust.name);
          
      showToast(`Mock: Sending WhatsApp reminder to ${outstandingCustomers.length} customer(s): ${selectedNames.slice(0, 3).join(', ')}${outstandingCustomers.length > 3 ? ' and others' : ''}.`, 'info');
  }


  // --- Utility Render ---

  // REVISED CUSTOMER CARD - Checkbox and selection handler are removed
  const CustomerCard = ({ cust, onCardClick }) => {
    const customerId = getCustomerId(cust);
    const isNearLimit = cust.creditLimit > 0 && cust.outstandingCredit >= cust.creditLimit * 0.95;
    const isOverdue = cust.outstandingCredit > 5000; // Mock rule for high due

    let bgColor = 'bg-white dark:bg-gray-800';
    let borderColor = 'border-gray-200 dark:border-gray-700';
    let textColor = 'text-gray-800 dark:text-gray-100';
    let dueColor = 'text-indigo-600 dark:text-indigo-400';
    
    if (isNearLimit || isOverdue) {
        bgColor = 'bg-red-50 dark:bg-red-900/10';
        borderColor = 'border-red-500 dark:border-red-700';
        dueColor = 'text-red-700 dark:text-red-400';
    }

    return (
      <div 
        key={customerId}
        // Removed selection styles
        className={`w-full p-4 rounded-xl shadow-md transition duration-200 border ${borderColor} ${bgColor} 
                    flex items-center space-x-3 cursor-pointer`}
        onClick={() => onCardClick(cust)}
      >
        
        {/* Card Content */}
        <div className="flex flex-grow justify-between items-center text-left space-x-3">
            
            {/* Customer Info */}
            <div className="flex flex-col flex-grow truncate">
                <p className={`font-bold text-base ${textColor} flex items-center truncate`}>
                    {cust.name}
                    {(isNearLimit || isOverdue) && (
                        <AlertTriangle className="w-4 h-4 ml-2 text-red-600 dark:text-red-400 flex-shrink-0" title="High Risk" />
                    )}
                </p>
                
                <div className="flex items-center text-xs mt-1 space-x-3">
                    {cust.phone && (
                        <span className="text-gray-500 dark:text-gray-400 flex items-center">
                            <Phone className="w-3 h-3 mr-1" />{cust.phone}
                        </span>
                    )}
                    {cust.creditLimit > 0 && (
                        <span className="text-indigo-500 dark:text-indigo-400 font-medium hidden sm:block">
                            Limit: ₹{cust.creditLimit.toFixed(0)}
                        </span>
                    )}
                </div>
            </div>
            
            {/* Outstanding Amount and Action Icon */}
            <div className="flex items-center space-x-3 flex-shrink-0">
                <div className="text-right">
                    <span className={`text-xl font-extrabold block ${dueColor}`}>
                        ₹{cust.outstandingCredit.toFixed(0)}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">DUE</span>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            </div>
        </div>
      </div>
    );
  };

  // --- Component Render ---

  return (
    // pb class adjusted to ensure content is not hidden behind the fixed action bar (which is now lifted)
    <div className="p-4 md:p-8 h-full overflow-y-auto pb-40 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 flex items-center">
        <DollarSign className="w-7 h-7 mr-2 text-indigo-600" /> Khata Manager
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">Track customer dues and easily record payments.</p>
      
      {/* 1. Total Outstanding Summary Card - MODIFIED TO REMOVE RIGHT PADDING/SPACE */}
      <div className="mb-6 p-5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-2xl">
        <div className="text-white"> {/* Removed flex-col and justify-between */}
            
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 opacity-90" />
                    <span className="text-sm font-medium opacity-90">Total Outstanding Due</span>
                </div>
                
                {/* The amount is now a SEPARATE, large span */}
                <span className="text-3xl font-extrabold block ml-4">
                    ₹{totalOutstanding.toFixed(0)}
                </span>
            </div>
            
            {/* Kept the accounts count for completeness */}
            {/* <span className="text-xs opacity-80 mt-1 block">across {outstandingCustomers.length} accounts</span> */}
        </div>
      </div>
      
      {/* 2. Main Ledger Card with List */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 transition-colors duration-300">
        
        {/* Header with Remind Button */}
        <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
            <h3 className="text-xl font-bold flex items-center text-gray-800 dark:text-gray-200">
                <List className="w-5 h-5 mr-2 text-red-500" /> Customer List
            </h3>
            
            {/* Single "Remind All" Button */}
            <button 
                className={`py-2 px-3 rounded-lg font-bold text-sm shadow-md transition flex items-center justify-center active:scale-[0.99] ${
                    outstandingCustomers.length === 0
                        ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                        : 'bg-red-500 text-white hover:bg-red-600'
                }`}
                onClick={handleSendReminders}
                disabled={outstandingCustomers.length === 0 || loading}
            >
                <MessageSquare className="w-4 h-4 mr-1" />
                Remind All ({outstandingCustomers.length})
            </button>
        </div>
        
        {/* Customer List */}
        <div className="space-y-3">
            {outstandingCustomers.length > 0 ? (
                outstandingCustomers.map(cust => (
                    <CustomerCard 
                        key={getCustomerId(cust)} 
                        cust={cust}
                        onCardClick={openPaymentModal}
                    />
                ))
            ) : (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-lg bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                    <p>Congratulations! No Khata dues outstanding.</p>
                </div>
            )}
        </div>
      </div>
      
      {/* Single STICKY ACTION BAR for Add Customer - MODIFIED bottom-0 to bottom-16 */}
      {/* bottom-16 places it 4rem (16 tailwind units) above the very bottom */}
      <div className="fixed bottom-16 left-0 right-0 p-3 bg-white dark:bg-gray-800 z-30 shadow-[0_-6px_20px_rgba(0,0,0,0.1)] transition-colors duration-300">
        <div className="max-w-xl mx-auto">
            
            {/* Add Customer Button (Full Width Primary Action) */}
            <button 
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-extrabold text-sm sm:text-lg shadow-lg hover:bg-indigo-700 transition flex items-center justify-center active:scale-[0.99] disabled:opacity-50"
                onClick={openAddCustomerModal}
                disabled={loading}
            >
                <UserPlus className="w-5 h-5 mr-2" /> 
                New Khata Customer
            </button>
        </div>
      </div>

      {/* --- MODALS (Payment Modal) --- */}
      {isPaymentModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 w-full md:w-96 rounded-xl shadow-2xl transform transition-transform duration-300">
            <div className="p-5 border-b border-indigo-200 dark:border-indigo-700 flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 rounded-t-xl">
              <h2 className="text-xl font-bold text-indigo-800 dark:text-indigo-300">Record Payment</h2>
              <button onClick={closePaymentModal} className="text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 p-1">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-5 space-y-5">
              <p className="text-lg font-extrabold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
                {selectedCustomer.name}
              </p>
              
              <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg flex justify-between shadow-inner">
                <span className="text-base font-semibold text-red-800 dark:text-red-300">Current Due:</span>
                <span className="text-2xl font-extrabold text-red-700 dark:text-red-400">₹{selectedCustomer.outstandingCredit.toFixed(0)}</span>
              </div>
              
              <div>
                <label htmlFor="payment-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Amount Received (₹)
                </label>
                <input
                  id="payment-input"
                  type="number"
                  placeholder="e.g., 500"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-4 border-2 border-green-500 rounded-lg text-3xl font-extrabold text-right focus:ring-green-600 focus:border-green-600 transition-colors bg-white dark:bg-gray-700 dark:text-white shadow-lg"
                  autoFocus
                />
              </div>

              <button 
                className="w-full py-3 bg-green-600 text-white rounded-xl font-extrabold text-lg shadow-lg hover:bg-green-700 transition flex items-center justify-center active:scale-[0.99] disabled:bg-gray-400 disabled:shadow-none"
                onClick={handleRecordPayment}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || loading}
              >
                <CreditCard className="w-5 h-5 mr-2" /> Confirm Payment Received
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* --- MODALS (Add Customer Modal) --- */}
      {isAddCustomerModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity">
          <form onSubmit={handleAddNewCustomer} className="bg-white dark:bg-gray-800 w-full md:w-96 rounded-xl shadow-2xl transform transition-transform duration-300">
            <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 rounded-t-xl">
              <h2 className="text-xl font-bold text-indigo-800 dark:text-indigo-300 flex items-center">
                <UserPlus className="w-5 h-5 mr-2" /> New Khata Customer
              </h2>
              <button type="button" onClick={closeAddCustomerModal} className="text-gray-600 dark:text-gray-400 hover:text-gray-800 p-1">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
                <InputField 
                    label="Full Name (Required)" 
                    name="name" 
                    type="text" 
                    value={newCustomerData.name} 
                    onChange={handleNewCustomerInputChange} 
                    required 
                />
                <InputField 
                    label="Phone Number (Optional)" 
                    name="phone" 
                    type="tel" 
                    value={newCustomerData.phone} 
                    onChange={handleNewCustomerInputChange} 
                    placeholder="e.g., 9876543210" 
                />
                <InputField 
                    label="Credit Limit (₹, Optional)" 
                    name="creditLimit" 
                    type="number" 
                    value={newCustomerData.creditLimit} 
                    onChange={handleNewCustomerInputChange} 
                    min="0"
                />
            </div>

            <div className="p-5 border-t dark:border-gray-700">
              <button 
                type="submit"
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-extrabold text-lg shadow hover:bg-indigo-700 transition flex items-center justify-center disabled:opacity-50"
                disabled={loading || !newCustomerData.name.trim()}
              >
                {loading ? 'Adding...' : 'Confirm & Add Customer'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-30 flex items-center justify-center z-40">
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-xl text-gray-700 dark:text-gray-200">Processing request...</div>
        </div>
      )}

    </div>
  );
};

// Helper component for form inputs
const InputField = ({ label, name, type, value, onChange, ...props }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
        </label>
        <input
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white dark:bg-gray-700 dark:text-gray-200"
            {...props}
        />
    </div>
);


export default Ledger;