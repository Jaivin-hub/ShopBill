import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
    List, MessageSquare, CheckCircle, XCircle, ArrowRight, UserPlus, 
    CreditCard, X, TrendingUp, DollarSign, Phone, AlertTriangle, Loader 
} from 'lucide-react';

// Initial state for the new customer form
const initialNewCustomerState = {
    name: '',
    phone: '',
    creditLimit: '',
};

// CRITICAL: Updated props to use API client and constants
const Ledger = ({ apiClient, API, showToast }) => {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalInOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [newCustomerData, setNewCustomerData] = useState(initialNewCustomerState);
  
  // UPDATED STATE: 'loading' is now specifically for the initial fetch
  const [loading, setLoading] = useState(true); 
  // NEW STATE: 'isProcessing' handles transactional loading (payment, add customer)
  const [isProcessing, setIsProcessing] = useState(false); 

  const [validationErrors, setValidationErrors] = useState({}); 
  const [customers, setCustomers] = useState([]);

  // --- Data Fetching ---

  const fetchCustomers = useCallback(async () => {
    // Only set loading true if we are doing the initial fetch, not just a refresh
    if (customers.length === 0) {
        setLoading(true);
    }
    
    try {
      const response = await apiClient.get(API.customers);
      setCustomers(response.data);
    } catch (error) {
      console.error("Failed to load customer data:", error);
      showToast('Error loading Khata data. Check server connection.', 'error');
    } finally {
      setLoading(false);
    }
  }, [apiClient, API.customers, showToast, customers.length]); // Added customers.length to dependency

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  // --- List & Calculation Setup ---
  
  const sortedCustomers = useMemo(() => 
    customers
      .sort((a, b) => b.outstandingCredit - a.outstandingCredit),
    [customers]
  );
  
  const outstandingCustomersForReminders = useMemo(() => 
      customers.filter(c => c.outstandingCredit > 0), 
      [customers]
  );

  const totalOutstanding = useMemo(() => 
    customers.reduce((sum, cust) => sum + cust.outstandingCredit, 0),
    [customers]
  );
  
  const getCustomerId = (cust) => cust._id || cust.id;

  // --- Modal Logic & Handlers (Unchanged) ---

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
    setValidationErrors({});
    setIsAddCustomerModalInOpen(true);
  };

  const closeAddCustomerModal = () => {
    setIsAddCustomerModalInOpen(false);
    setNewCustomerData(initialNewCustomerState);
    setValidationErrors({});
  };

  const handleNewCustomerInputChange = (e) => {
    const { name, value } = e.target;
    
    setNewCustomerData(prev => ({
        ...prev,
        [name]: value
    }));
    
    const updatedData = { ...newCustomerData, [name]: value };
    const allErrors = validateCustomerForm(updatedData);

    setValidationErrors(prev => ({ ...prev, [name]: allErrors[name] }));
  };

  // --- Action Handlers ---
  
  // UPDATED: Record Payment now uses isProcessing
  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || isNaN(amount) || !selectedCustomer) {
      showToast('Please enter a valid payment amount.', 'error');
      return;
    }
    
    const customerId = getCustomerId(selectedCustomer);

    // This is the amount paid that reduces the credit (negative change)
    const amountChange = -Math.min(amount, selectedCustomer.outstandingCredit); 
    
    if (amountChange === 0) {
        showToast('Outstanding credit is already zero.', 'info');
        closePaymentModal();
        return;
    }

    setIsProcessing(true); // Use processing state for transaction
    try {
        // Send a PUT request to update the customer's credit
        await apiClient.put(`${API.customers}/${customerId}/credit`, {
            amountChange: amountChange,
            type: 'payment_received', // Context for the server
            paymentAmount: amount,
        });

        showToast(`Payment of ₹${amount.toFixed(0)} recorded for ${selectedCustomer.name}`, 'success');
        
        // Refresh customer list to show updated outstanding balance
        await fetchCustomers();

        closePaymentModal();

    } catch (error) {
        console.error('Record Payment Error:', error.response?.data || error.message);
        showToast(`Error recording payment: ${error.response?.data?.error || 'Failed to connect to server.'}`, 'error');
    } finally {
        setIsProcessing(false);
    }
  };
  
  // --- Validation Function (Unchanged) ---
  const validateCustomerForm = (data) => {
    const errors = {};
    
    if (!data.name.trim()) {
      errors.name = 'Customer name is required.';
    }

    const phone = String(data.phone).trim();
    if (phone) {
        const cleanedPhone = phone.replace(/[^0-9]/g, ''); 
        
        if (!/^\d{10}$/.test(cleanedPhone)) {
            errors.phone = 'Must be 10 digits and numbers only.';
        }
    }

    const creditLimitValue = String(data.creditLimit).trim();
    const creditLimit = parseFloat(creditLimitValue);
    
    if (creditLimitValue !== '' && (isNaN(creditLimit) || creditLimit < 0)) {
        errors.creditLimit = 'Credit Limit must be a non-negative number.';
    }

    return errors;
  };

  // UPDATED: Handle Add New Customer now uses isProcessing
  const handleAddNewCustomer = async (e) => {
    e.preventDefault();

    const errors = validateCustomerForm(newCustomerData);
    setValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsProcessing(true); // Use processing state for transaction
    try {
        const dataToSend = {
            name: newCustomerData.name.trim(),
            phone: newCustomerData.phone ? String(newCustomerData.phone).trim().replace(/[^0-9]/g, '') : null,
            creditLimit: parseFloat(newCustomerData.creditLimit) || 0,
            outstandingCredit: 0
        };

        // Post the new customer data
        await apiClient.post(API.customers, dataToSend); 

        // Success path: Refresh customer list (This is the logic you wanted to confirm)
        await fetchCustomers();
        
        showToast(`New Khata Customer added: ${newCustomerData.name.trim()}`, 'success');
        closeAddCustomerModal();

    } catch (error) {
        console.error('Add Customer Error:', error.response?.data || error.message);
        
        const serverResponse = error.response?.data;
        
        // Check for the specific phone number conflict error from the server
        if (serverResponse && serverResponse.field === 'phone' && serverResponse.error) {
            setValidationErrors(prev => ({
                ...prev,
                phone: serverResponse.error 
            }));
        } else {
            // Handle other general API/server errors
            const serverError = serverResponse?.error || error.message;
            showToast(`Error adding customer: ${serverError || 'Failed to connect to server.'}`, 'error');
        }
        
    } finally {
        setIsProcessing(false);
    }
};
  
  // Revised Reminder Handler (remains the same)
  const handleSendReminders = () => {
      if (outstandingCustomersForReminders.length === 0) {
          showToast('No customers with outstanding Khata due to remind.', 'info');
          return;
      }
          
      const selectedNames = outstandingCustomersForReminders.map(cust => cust.name);
          
      showToast(`Mock: Sending WhatsApp reminder to ${outstandingCustomersForReminders.length} customer(s): ${selectedNames.slice(0, 3).join(', ')}${outstandingCustomersForReminders.length > 3 ? ' and others' : ''}.`, 'info');
  }

  // Determine if the form is valid 
  const isFormValid = useMemo(() => {
    const errors = validateCustomerForm(newCustomerData);
    return Object.keys(errors).length === 0;
  }, [newCustomerData]);


  // --- Utility Render (Unchanged) ---
  const CustomerCard = ({ cust, onCardClick }) => {
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
  
  // --- Primary Render ---

  if (loading && customers.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-full min-h-screen p-8 text-gray-400 bg-gray-950 transition-colors duration-300">
              <Loader className="w-10 h-10 animate-spin text-teal-400" />
              <p className='mt-3'>Loading customer ledger...</p>
          </div>
      );
  }

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-gray-950 transition-colors duration-300">
      <h1 className="text-3xl font-extrabold text-white mb-2 flex items-center">
        Khata Manager
      </h1>
      <p className="text-gray-400 mb-6">Track customer dues and easily record payments.</p>
      
      {/* 🌟 ACTION BAR SECTION */}
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
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-4">
            <h3 className="text-xl font-bold flex items-center text-white">
                <List className="w-5 h-5 mr-2 text-indigo-400" /> Customer List ({sortedCustomers.length})
            </h3>
        </div>
        
        {/* Customer List */}
        <div className="space-y-3">
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
      
      {/* --- MODALS (Payment Modal) --- */}
      {isPaymentModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 w-full md:w-96 rounded-xl shadow-2xl border border-indigo-700 transform transition-transform duration-300">
            <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-indigo-900/40 rounded-t-xl">
              <h2 className="text-xl font-bold text-indigo-300">Record Payment</h2>
              <button onClick={closePaymentModal} className="text-gray-400 hover:text-white p-1" disabled={isProcessing}>
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
                  className="w-full p-4 border-2 border-teal-600 rounded-xl text-3xl font-extrabold text-right focus:ring-teal-500 focus:border-teal-500 transition-colors bg-gray-700 text-teal-400 shadow-xl"
                  autoFocus
                  disabled={isProcessing}
                />
              </div>

              <button 
                className="w-full py-3 bg-teal-600 text-white rounded-xl font-extrabold text-lg shadow-2xl shadow-teal-900/50 hover:bg-teal-700 transition flex items-center justify-center active:scale-[0.99] disabled:bg-gray-700 disabled:text-gray-400"
                onClick={handleRecordPayment}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || isProcessing}
              >
                {isProcessing ? <Loader className="w-5 h-5 animate-spin mr-2" /> : <CreditCard className="w-5 h-5 mr-2" />} 
                {isProcessing ? 'Processing...' : 'Confirm Payment Received'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* --- MODALS (Add Customer Modal) --- */}
      {isAddCustomerModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-85 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <form onSubmit={handleAddNewCustomer} className="bg-gray-800 w-full md:w-96 rounded-xl shadow-2xl border border-indigo-700 transform transition-transform duration-300">
            <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-indigo-900/40 rounded-t-xl">
              <h2 className="text-xl font-bold text-indigo-300 flex items-center">
                <UserPlus className="w-5 h-5 mr-2" /> New Khata Customer
              </h2>
              <button type="button" onClick={closeAddCustomerModal} className="text-gray-400 hover:text-white p-1" disabled={isProcessing}>
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
                    error={validationErrors.name}
                    disabled={isProcessing}
                />
                <InputField 
                    label="Phone Number (Optional)" 
                    name="phone" 
                    type="tel" 
                    value={newCustomerData.phone} 
                    onChange={handleNewCustomerInputChange} 
                    placeholder="e.g., 9876543210" 
                    dark={true}
                    error={validationErrors.phone}
                    disabled={isProcessing}
                />
                <InputField 
                    label="Credit Limit (₹, Optional)" 
                    name="creditLimit" 
                    type="number" 
                    value={newCustomerData.creditLimit} 
                    onChange={handleNewCustomerInputChange} 
                    min="0"
                    dark={true}
                    error={validationErrors.creditLimit}
                    disabled={isProcessing}
                />
            </div>

            <div className="p-5 border-t border-gray-700">
              <button 
                type="submit"
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-extrabold text-lg shadow-2xl shadow-indigo-900/50 hover:bg-indigo-700 transition flex items-center justify-center disabled:opacity-50"
                disabled={isProcessing || !isFormValid}
              >
                {isProcessing ? <Loader className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                {isProcessing ? 'Adding...' : 'Confirm & Add Customer'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Transactional Loading Overlay - Only needed if you want a global indicator for processing, 
          but the modal buttons now handle it. I'll keep the button indicators instead of this large overlay. 
      */}
      {/* {isProcessing && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-30 flex items-center justify-center z-40">
            <div className="bg-gray-800 p-4 rounded-lg shadow-xl text-gray-200 border border-gray-700 flex items-center">
                <Loader className="w-5 h-5 animate-spin mr-2 text-teal-400" />
                Processing request...
            </div>
        </div>
      )} */}

    </div>
  );
};

// Helper component for form inputs (Updated to include disabled prop)
const InputField = ({ label, name, type, value, onChange, dark, error, disabled, ...props }) => (
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
            disabled={disabled} // Added disabled prop here
            className={`w-full p-3 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-700 text-gray-200 ${
                error ? 'border-2 border-red-500' : 'border border-gray-600'
            } ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
            {...props}
        />
        {error && (
            <p className="mt-1 text-xs text-red-400 flex items-center">
                <XCircle className="w-3 h-3 mr-1 flex-shrink-0" />{error}
            </p>
        )}
    </div>
);


export default Ledger;