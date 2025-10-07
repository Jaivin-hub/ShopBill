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
  const [isAddCustomerModalOpen, setIsAddCustomerModalInOpen] = useState(false);
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
    setIsAddCustomerModalInOpen(true);
  };

  const closeAddCustomerModal = () => {
    setIsAddCustomerModalInOpen(false);
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

  // REVISED CUSTOMER CARD - Updated for Dark Theme
  const CustomerCard = ({ cust, onCardClick }) => {
    const customerId = getCustomerId(cust);
    const isNearLimit = cust.creditLimit > 0 && cust.outstandingCredit >= cust.creditLimit * 0.95;
    const isOverdue = cust.outstandingCredit > 5000; // Mock rule for high due

    let bgColor = 'bg-gray-800';
    let borderColor = 'border-gray-700';
    let textColor = 'text-white';
    let dueColor = 'text-indigo-400';
    
    if (isNearLimit || isOverdue) {
        bgColor = 'bg-red-900/20'; // Use a transparent red for contrast
        borderColor = 'border-red-700';
        dueColor = 'text-red-400';
    }

    return (
      <div 
        key={customerId}
        className={`w-full p-4 rounded-xl shadow-xl shadow-indigo-900/10 transition duration-200 border ${borderColor} ${bgColor} 
                    flex items-center space-x-3 cursor-pointer hover:border-teal-500`}
        onClick={() => onCardClick(cust)}
      >
        
        {/* Card Content */}
        <div className="flex flex-grow justify-between items-center text-left space-x-3">
            
            {/* Customer Info */}
            <div className="flex flex-col flex-grow truncate">
                <p className={`font-bold text-base ${textColor} flex items-center truncate`}>
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
                        // Teal accent for the limit
                        <span className="text-teal-400 font-medium hidden sm:block">
                            Limit: ₹{cust.creditLimit.toFixed(0)}
                        </span>
                    )}
                </div>
            </div>
            
            {/* Outstanding Amount and Action Icon */}
            <div className="flex items-center space-x-3 flex-shrink-0">
                <div className="text-right">
                    <span className={`text-2xl font-extrabold block ${dueColor}`}>
                        ₹{cust.outstandingCredit.toFixed(0)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">DUE</span>
                </div>
                {/* Teal arrow for action */}
                <ArrowRight className="w-5 h-5 text-teal-400 flex-shrink-0" />
            </div>
        </div>
      </div>
    );
  };

  // --- Component Render ---

  return (
    // Updated background to bg-gray-950 and pb-40 ensures scroll space above the action bar
    <div className="p-4 md:p-8 h-full overflow-y-auto pb-40 bg-gray-950 transition-colors duration-300">
      <h1 className="text-3xl font-extrabold text-white mb-2 flex items-center">
        <DollarSign className="w-7 h-7 mr-2 text-teal-400" /> Khata Manager
      </h1>
      <p className="text-gray-400 mb-6">Track customer dues and easily record payments.</p>
      
      {/* 1. Total Outstanding Summary Card - Updated for Dark Theme */}
      <div className="mb-6 p-5 bg-gray-900 rounded-xl shadow-2xl shadow-indigo-900/20 border border-gray-800">
        <div className="text-white"> 
            
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-indigo-400" />
                    <span className="text-sm font-medium text-gray-400">Total Outstanding Due</span>
                </div>
                
                {/* Teal accent for the main number */}
                <span className="text-4xl font-extrabold block ml-4 text-teal-400">
                    ₹{totalOutstanding.toFixed(0)}
                </span>
            </div>
        </div>
      </div>
      
      {/* 2. Main Ledger Card with List - Updated for Dark Theme */}
      <div className="bg-gray-900 p-4 rounded-xl shadow-2xl shadow-indigo-900/20 border border-gray-800 transition-colors duration-300">
        
        {/* Header with Remind Button */}
        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-4">
            <h3 className="text-xl font-bold flex items-center text-white">
                <List className="w-5 h-5 mr-2 text-indigo-400" /> Customer List ({outstandingCustomers.length})
            </h3>
            
            {/* Single "Remind All" Button - Red/Accent color for action */}
            <button 
                className={`py-2 px-3 rounded-xl font-bold text-sm shadow-lg transition flex items-center justify-center active:scale-[0.99] ${
                    outstandingCustomers.length === 0
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700 shadow-red-900/50'
                }`}
                onClick={handleSendReminders}
                disabled={outstandingCustomers.length === 0 || loading}
            >
                <MessageSquare className="w-4 h-4 mr-1" />
                Remind All
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
                // Updated empty state style
                <div className="text-center py-10 text-gray-400 text-lg bg-green-900/30 rounded-xl border border-green-700">
                    <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
                    <p>Congratulations! No Khata dues outstanding.</p>
                </div>
            )}
        </div>
      </div>
      
      {/* 💥 FIX APPLIED HERE: Changed bottom-0 to bottom-16 to lift the button above the footer menu. */}
      <div className="fixed **bottom-16** left-0 right-0 p-4 bg-gray-900 z-30 shadow-[0_-6px_20px_rgba(0,0,0,0.5)] border-t border-gray-800 transition-colors duration-300">
        <div className="max-w-xl mx-auto">
            
            {/* Add Customer Button (Full Width Primary Action - Teal for New/Add) */}
            <button 
                className="w-full py-3 bg-teal-600 text-white rounded-xl font-extrabold text-lg shadow-2xl shadow-teal-900/50 hover:bg-teal-700 transition flex items-center justify-center active:scale-[0.99] disabled:opacity-50"
                onClick={openAddCustomerModal}
                disabled={loading}
            >
                <UserPlus className="w-5 h-5 mr-2" /> 
                New Khata Customer
            </button>
        </div>
      </div>

      {/* --- MODALS (Payment Modal) - Updated for Dark Theme --- */}
      {isPaymentModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 w-full md:w-96 rounded-xl shadow-2xl border border-indigo-700 transform transition-transform duration-300">
            <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-indigo-900/40 rounded-t-xl">
              <h2 className="text-xl font-bold text-indigo-300">Record Payment</h2>
              <button onClick={closePaymentModal} className="text-gray-400 hover:text-white p-1">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-5 space-y-5">
              <p className="text-lg font-extrabold text-white border-b border-gray-700 pb-2">
                {selectedCustomer.name}
              </p>
              
              <div className="bg-red-900/30 p-4 rounded-lg flex justify-between shadow-inner border border-red-700">
                <span className="text-base font-semibold text-red-300">Current Due:</span>
                <span className="text-2xl font-extrabold text-red-400">₹{selectedCustomer.outstandingCredit.toFixed(0)}</span>
              </div>
              
              <div>
                <label htmlFor="payment-input" className="block text-sm font-medium text-gray-300 mb-2">
                  Payment Amount Received (₹)
                </label>
                <input
                  id="payment-input"
                  type="number"
                  placeholder="e.g., 500"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  // Input field updated for dark theme and green accent
                  className="w-full p-4 border-2 border-teal-600 rounded-xl text-3xl font-extrabold text-right focus:ring-teal-500 focus:border-teal-500 transition-colors bg-gray-700 text-teal-400 shadow-xl"
                  autoFocus
                />
              </div>

              {/* Confirm button uses the success color (green/teal) */}
              <button 
                className="w-full py-3 bg-teal-600 text-white rounded-xl font-extrabold text-lg shadow-2xl shadow-teal-900/50 hover:bg-teal-700 transition flex items-center justify-center active:scale-[0.99] disabled:bg-gray-700 disabled:text-gray-400"
                onClick={handleRecordPayment}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || loading}
              >
                <CreditCard className="w-5 h-5 mr-2" /> Confirm Payment Received
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* --- MODALS (Add Customer Modal) - Updated for Dark Theme --- */}
      {isAddCustomerModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-85 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <form onSubmit={handleAddNewCustomer} className="bg-gray-800 w-full md:w-96 rounded-xl shadow-2xl border border-indigo-700 transform transition-transform duration-300">
            <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-indigo-900/40 rounded-t-xl">
              <h2 className="text-xl font-bold text-indigo-300 flex items-center">
                <UserPlus className="w-5 h-5 mr-2" /> New Khata Customer
              </h2>
              <button type="button" onClick={closeAddCustomerModal} className="text-gray-400 hover:text-white p-1">
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
                    dark={true}
                />
                <InputField 
                    label="Phone Number (Optional)" 
                    name="phone" 
                    type="tel" 
                    value={newCustomerData.phone} 
                    onChange={handleNewCustomerInputChange} 
                    placeholder="e.g., 9876543210" 
                    dark={true}
                />
                <InputField 
                    label="Credit Limit (₹, Optional)" 
                    name="creditLimit" 
                    type="number" 
                    value={newCustomerData.creditLimit} 
                    onChange={handleNewCustomerInputChange} 
                    min="0"
                    dark={true}
                />
            </div>

            <div className="p-5 border-t border-gray-700">
              <button 
                type="submit"
                // Confirm button uses the primary indigo color
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-extrabold text-lg shadow-2xl shadow-indigo-900/50 hover:bg-indigo-700 transition flex items-center justify-center disabled:opacity-50"
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
            <div className="bg-gray-800 p-4 rounded-lg shadow-xl text-gray-200 border border-gray-700">Processing request...</div>
        </div>
      )}

    </div>
  );
};

// Helper component for form inputs - Updated for Dark Theme
const InputField = ({ label, name, type, value, onChange, dark, ...props }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">
            {label}
        </label>
        <input
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            className="w-full p-3 border border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-700 text-gray-200"
            {...props}
        />
    </div>
);


export default Ledger;