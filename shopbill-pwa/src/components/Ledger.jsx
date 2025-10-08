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

const getAuthHeaders = (showToast) => {
    // FIX: Removed the duplicate 'localStorage'
    const token = localStorage.getItem('userToken'); 
    
    if (!token) {
        // NOTE: We keep this toast for system-level errors like missing auth token
        showToast('Authentication token missing. Please log in.', 'error');
        return null;
    }
    return {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
};

const Ledger = ({ customers, updateCustomerCredit, showToast, refreshData, customerApiUrl }) => {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalInOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [newCustomerData, setNewCustomerData] = useState(initialNewCustomerState);
  const [loading, setLoading] = useState(false);
  // NEW STATE: To hold validation errors for the add customer form
  const [validationErrors, setValidationErrors] = useState({}); 

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
    setValidationErrors({}); // Clear errors when opening
    setIsAddCustomerModalInOpen(true);
  };

  const closeAddCustomerModal = () => {
    setIsAddCustomerModalInOpen(false);
    setNewCustomerData(initialNewCustomerState);
    setValidationErrors({}); // Clear errors when closing
  };

  const handleNewCustomerInputChange = (e) => {
    const { name, value, type } = e.target;
    
    // Update the data state
    setNewCustomerData(prev => ({
        ...prev,
        [name]: value
    }));
    
    // Perform instant validation check for the current field
    const updatedData = { ...newCustomerData, [name]: value };
    const allErrors = validateCustomerForm(updatedData);

    // Update errors, clearing the current field's error if now valid, 
    // OR if the user is typing in a field that previously had a server error.
    setValidationErrors(prev => ({ ...prev, [name]: allErrors[name] }));
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

    const amountChange = -Math.min(amount, selectedCustomer.outstandingCredit); 
    
    updateCustomerCredit(customerId, amountChange);
    showToast(`Payment of ₹${amount.toFixed(0)} recorded for ${selectedCustomer.name}`, 'success');
    
    closePaymentModal();
  };
  
  // --- UPDATED VALIDATION FUNCTION ---
  const validateCustomerForm = (data) => {
    const errors = {};
    
    // 1. Name validation (required, must not be only spaces)
    if (!data.name.trim()) {
      errors.name = 'Customer name is required.';
    }

    // 2. Phone number validation (optional, but if provided, must be valid)
    const phone = String(data.phone).trim();
    if (phone) {
        // Regex for 7 to 15 digits, allowing only digits.
        const cleanedPhone = phone.replace(/[^0-9]/g, ''); 
        
        if (!/^\d{7,15}$/.test(cleanedPhone)) {
            errors.phone = 'Phone number must be 7-15 digits long and contain only numbers.';
        }
    }

    // 3. Credit Limit validation (must be a non-negative number)
    const creditLimitValue = String(data.creditLimit).trim();
    const creditLimit = parseFloat(creditLimitValue);
    
    if (creditLimitValue !== '' && (isNaN(creditLimit) || creditLimit < 0)) {
        errors.creditLimit = 'Credit Limit must be a non-negative number.';
    }

    return errors;
  };

  // --- CRITICAL UPDATE: Handle Server-Side Validation Errors Locally ---
  const handleAddNewCustomer = async (e) => {
    e.preventDefault();

    // 1. Client-side re-validation
    const errors = validateCustomerForm(newCustomerData);
    setValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }

    const config = getAuthHeaders(showToast);
    if (!config) return;

    setLoading(true);
    try {
        const dataToSend = {
            name: newCustomerData.name.trim(),
            phone: newCustomerData.phone ? String(newCustomerData.phone).trim().replace(/[^0-9]/g, '') : null,
            creditLimit: parseFloat(newCustomerData.creditLimit) || 0,
            outstandingCredit: 0
        };

        await axios.post(customerApiUrl, dataToSend, config); 

        // 2. Success path
        if (refreshData) {
             await refreshData();
        }
        
        showToast(`New Khata Customer added: ${newCustomerData.name.trim()}`, 'success');
        closeAddCustomerModal();

    } catch (error) {
        console.error('Add Customer Error:', error.response?.data || error.message);
        
        const serverResponse = error.response?.data;
        
        // 3. Check for the specific phone number conflict error from the server
        if (serverResponse && serverResponse.field === 'phone' && serverResponse.existingCustomerName) {
            
            // Set the server error message directly to the validationErrors state
            setValidationErrors(prev => ({
                ...prev,
                phone: serverResponse.error // The server error message: "Phone number is already associated with customer: [Name]"
            }));
            
            // NOTE: Do not show toast for this error.
            
        } else {
            // 4. Handle other general API/server errors using toast (e.g., database connection fail)
            const serverError = serverResponse?.error || error.message;
            showToast(`Error adding customer: ${serverError || 'Failed to connect to server.'}`, 'error');
        }
        
    } finally {
        setLoading(false);
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

  // Determine if the form is valid (for submit button disabling)
  // Check if there are any client-side validation errors AND ensure phone error is checked
  const isFormValid = useMemo(() => {
    // Only check client-side validation errors for disabling the button
    const errors = validateCustomerForm(newCustomerData);
    
    // The server-side phone error will prevent submission via the catch block, 
    // but the button should still be disabled if *client-side* rules (like required name) are broken.
    return Object.keys(errors).length === 0;
  }, [newCustomerData]);


  // --- Utility Render (remains the same) ---

  const CustomerCard = ({ cust, onCardClick }) => {
    const customerId = getCustomerId(cust);
    const isNearLimit = cust.creditLimit > 0 && cust.outstandingCredit >= cust.creditLimit * 0.95;
    const isOverdue = cust.outstandingCredit > 5000; 

    let bgColor = 'bg-gray-800';
    let borderColor = 'border-gray-700';
    let textColor = 'text-white';
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
                        <span className="text-teal-400 font-medium hidden sm:block">
                            Limit: ₹{cust.creditLimit.toFixed(0)}
                        </span>
                    )}
                </div>
            </div>
            
            {/* Outstanding Amount and Action Icon */}
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

  // --- Component Render (remains the same) ---

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
                    disabled={loading}
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
                    disabled={outstandingCustomersForReminders.length === 0 || loading}
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
                  className="w-full p-4 border-2 border-teal-600 rounded-xl text-3xl font-extrabold text-right focus:ring-teal-500 focus:border-teal-500 transition-colors bg-gray-700 text-teal-400 shadow-xl"
                  autoFocus
                />
              </div>

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
      
      {/* --- MODALS (Add Customer Modal) --- */}
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
                    error={validationErrors.name} // Pass error state
                />
                <InputField 
                    label="Phone Number (Optional)" 
                    name="phone" 
                    type="tel" 
                    value={newCustomerData.phone} 
                    onChange={handleNewCustomerInputChange} 
                    placeholder="e.g., 9876543210" 
                    dark={true}
                    error={validationErrors.phone} // Pass error state
                />
                <InputField 
                    label="Credit Limit (₹, Optional)" 
                    name="creditLimit" 
                    type="number" 
                    value={newCustomerData.creditLimit} 
                    onChange={handleNewCustomerInputChange} 
                    min="0"
                    dark={true}
                    error={validationErrors.creditLimit} // Pass error state
                />
            </div>

            <div className="p-5 border-t border-gray-700">
              <button 
                type="submit"
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-extrabold text-lg shadow-2xl shadow-indigo-900/50 hover:bg-indigo-700 transition flex items-center justify-center disabled:opacity-50"
                // CRITICAL FIX: Ensure the button is disabled if loading OR if the form is NOT valid
                disabled={loading || !isFormValid}
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

// Helper component for form inputs - UPDATED to receive and display error messages
const InputField = ({ label, name, type, value, onChange, dark, error, ...props }) => (
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
            // Dynamic border color based on error state
            className={`w-full p-3 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-700 text-gray-200 ${
                error ? 'border-2 border-red-500' : 'border border-gray-600'
            }`}
            {...props}
        />
        {/* Display the error message */}
        {error && (
            <p className="mt-1 text-xs text-red-400 flex items-center">
                <XCircle className="w-3 h-3 mr-1" />{error}
            </p>
        )}
    </div>
);


export default Ledger;