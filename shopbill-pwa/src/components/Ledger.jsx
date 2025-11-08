import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  List, MessageSquare, CheckCircle, XCircle, ArrowRight, UserPlus,
  CreditCard, X, TrendingUp, DollarSign, Phone, AlertTriangle, Loader, History,
  RefreshCcw, ArrowUp, ArrowDown, Repeat, IndianRupee, Search, Info // <--- ADDED Info ICON
} from 'lucide-react';
import CustomerList from './CustomerList'; // Import the new child component

// CRUCIAL UPDATE: Added initialDue to state
const initialNewCustomerState = {
  name: '',
  phone: '',
  creditLimit: '',
  initialDue: '', // New field for existing outstanding balance
};

// Helper component for form inputs
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
      disabled={disabled}
      className={`w-full p-3 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-700 text-gray-200 ${error ? 'border-2 border-red-500' : 'border border-gray-600'
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

// Utility function to format date
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    } catch (e) {
        return 'Invalid Date';
    }
};

// Map transaction types to display styles
const getTypeStyles = (type) => {
    switch (type) {
        case 'initial_due':
            return { icon: <DollarSign className="w-4 h-4 text-yellow-400" />, color: 'bg-yellow-900/40 border-yellow-700/50', label: 'Initial Due' };
        case 'credit_sale':
            return { icon: <ArrowUp className="w-4 h-4 text-red-400" />, color: 'bg-red-900/40 border-red-700/50', label: 'Credit Sale' };
        case 'payment_received':
            return { icon: <ArrowDown className="w-4 h-4 text-teal-400" />, color: 'bg-teal-900/40 border-teal-700/50', label: 'Payment Received' };
        default:
            return { icon: <Repeat className="w-4 h-4 text-gray-400" />, color: 'bg-gray-700/40 border-gray-600/50', label: 'Other' };
    }
};

// Replaced HistoryModalPlaceholder with the functional component
const HistoryModal = ({ customer, onClose, fetchCustomerHistory }) => {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadHistory = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await fetchCustomerHistory(customer._id);
                setHistory(data);
            } catch (err) {
                console.error("Error fetching history:", err);
                setError('Could not load transaction history.');
            } finally {
                setIsLoading(false);
            }
        };

        if (customer?._id) {
            loadHistory();
        }
    }, [customer, fetchCustomerHistory]);


    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-85 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-gray-800 w-full max-w-lg rounded-xl shadow-2xl border border-indigo-700 transform transition-all duration-300 my-8">
                
                {/* Header */}
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-indigo-900/40 rounded-t-xl">
                    <h2 className="text-xl font-bold text-indigo-300 flex items-center">
                        <History className="w-5 h-5 mr-2" /> Khata Ledger
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                {/* Body Content */}
                <div className="p-4 space-y-4">
                    
                    {/* Customer Name and Current Due */}
                    <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                        <p className="text-lg font-bold text-white truncate">
                            {customer.name}
                        </p>
                        <span className="text-red-400 text-2xl font-extrabold flex items-center">
                            ₹{customer.outstandingCredit?.toFixed(0) || '0'}
                            <span className="text-sm text-gray-400 ml-1">Due</span>
                        </span>
                    </div>

                    {/* Transaction List Area */}
                    <div className="h-96 overflow-y-auto p-2 bg-gray-900 rounded-lg border border-gray-700">
                        {isLoading && (
                            <div className="flex justify-center items-center h-full min-h-[inherit]">
                                <Loader className="w-6 h-6 animate-spin text-indigo-400" />
                            </div>
                        )}
                        
                        {error && (
                            <div className="text-red-400 p-4 bg-red-900/20 rounded-lg text-center flex items-center justify-center">
                                <XCircle className="w-5 h-5 mr-2"/> {error}
                            </div>
                        )}

                        {!isLoading && history.length === 0 && !error && (
                            <div className="text-gray-400 p-4 text-center italic">
                                <History className='w-8 h-8 mx-auto mb-3'/>
                                <p>No transactions recorded yet.</p>
                            </div>
                        )}

                        {/* Transaction List */}
                        {!isLoading && history.length > 0 && (
                            <div className='space-y-3'>
                                {history.map(t => {
                                    const styles = getTypeStyles(t.type);
                                    const isCredit = t.type === 'credit_sale' || t.type === 'initial_due'; 
                                    
                                    return (
                                        <div key={t._id} className={`flex items-center p-3 rounded-lg border shadow-sm ${styles.color}`}>
                                            <div className={`p-2 rounded-full mr-3 ${styles.color.replace('border-', 'bg-').replace('/40', '')}`}>
                                                {styles.icon}
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <p className="font-medium text-white text-sm truncate">{styles.label}</p>
                                                <p className="text-xs text-gray-400">{formatDate(t.timestamp)}</p>
                                                {t.details && t.details !== 'N/A' && (
                                                    <p className="text-xs text-gray-300 mt-1 italic truncate">{t.details}</p>
                                                )}
                                            </div>
                                            <div className={`text-right font-bold text-lg flex flex-col items-end flex-shrink-0 ml-4 ${isCredit ? 'text-red-300' : 'text-teal-300'}`}>
                                                <span className='whitespace-nowrap'>
                                                    {isCredit ? '+' : '-'} ₹{t.amount?.toFixed(0) || '0'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700">
                    <button 
                        onClick={onClose} 
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-extrabold text-lg shadow-xl hover:bg-indigo-700 transition"
                    >
                        Close Ledger
                    </button>
                </div>
            </div>
        </div>
    );
};
// --- END History Modal Component ---

// --- NEW Remind Info Modal Component ---
const RemindInfoModal = ({ onClose }) => (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-85 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-gray-800 w-full max-w-sm rounded-xl shadow-2xl border border-teal-700/50 transform transition-all duration-300 my-8">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-teal-900/40 rounded-t-xl">
                <h2 className="text-lg font-semibold text-teal-300 flex items-center">
                    <Info className="w-5 h-5 mr-2" /> Remind Feature Info
                </h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition">
                    <X className="w-5 h-5" />
                </button>
            </div>
            <div className="p-4 space-y-3">
                <p className='text-white font-medium'>
                    The <strong>Remind</strong> feature will eventually be used for:
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-2">
                    <li>Sending automated <strong>WhatsApp/SMS reminders</strong> to customers with outstanding Khata balances.</li>
                    <li>Generating a summary of the due amount and a link for easy payment.</li>
                </ul>
                <div className='p-3 bg-teal-900/30 rounded-lg border border-teal-700/50 text-teal-300 flex items-center'>
                    <AlertTriangle className='w-5 h-5 mr-2 flex-shrink-0' />
                    <p className='text-sm font-semibold'>
                        <strong>Status:</strong> This functionality is currently <strong>Coming Soon</strong> and is displayed as a mock action.
                    </p>
                </div>
            </div>
            <div className="p-4 border-t border-gray-700">
                <button 
                    onClick={onClose} 
                    className="w-full py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition"
                >
                    Got It
                </button>
            </div>
        </div>
    </div>
);
// --- END Remind Info Modal Component ---


const Ledger = ({ apiClient, API, showToast }) => {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalInOpen] = useState(false);
  
  // NEW History Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState(null);

  // NEW Remind Info Modal State
  const [isRemindInfoModalOpen, setIsRemindInfoModalOpen] = useState(false); 

  // NEW Search Toggle State
  const [isSearchVisible, setIsSearchVisible] = useState(false); 

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [newCustomerData, setNewCustomerData] = useState(initialNewCustomerState);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [validationErrors, setValidationErrors] = useState({});
  const [customers, setCustomers] = useState([]);

  // --- Utility Functions ---
  const getCustomerId = (cust) => cust._id || cust.id;

  // --- Data Fetching ---

  const fetchCustomers = useCallback(async () => {
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
  }, [apiClient, API.customers, showToast, customers.length]);
  
  // NEW: Function to fetch history for a single customer
  const fetchCustomerHistory = useCallback(async (customerId) => {
      try {
          const response = await apiClient.get(`${API.customers}/${customerId}/history`);
          return response.data; // Return the array of transactions
      } catch (error) {
          console.error(`Failed to fetch history for customer ${customerId}:`, error);
          // Throw an error to be caught by the modal component's useEffect
          throw new Error('Failed to fetch transaction history from server.'); 
      }
  }, [apiClient, API.customers]);


  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // --- Modal Logic & Handlers ---

  // NEW Handler to toggle search visibility
  const toggleSearch = useCallback(() => {
    setIsSearchVisible(prev => !prev);
  }, []);

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

  // NEW History Modal Handlers
  const openHistoryModal = (customer) => {
    setSelectedCustomerForHistory(customer);
    setIsHistoryModalOpen(true);
  };

  const closeHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setSelectedCustomerForHistory(null);
  };
  
  // NEW Remind Info Modal Handlers
  const openRemindInfoModal = () => {
    setIsRemindInfoModalOpen(true);
  };

  const closeRemindInfoModal = () => {
    setIsRemindInfoModalOpen(false);
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

  // --- Validation Function (UNCHANGED) ---
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

    // NEW: Validation for initialDue
    const initialDueValue = String(data.initialDue).trim();
    const initialDue = parseFloat(initialDueValue);

    if (initialDueValue !== '' && (isNaN(initialDue) || initialDue < 0)) {
      errors.initialDue = 'Due amount must be a non-negative number.';
    }
    // Note: It's optional, so we don't require it to be present.

    return errors;
  };

  // Determine if the form is valid
  const isFormValid = useMemo(() => {
    const errors = validateCustomerForm(newCustomerData);
    return Object.keys(errors).length === 0;
  }, [newCustomerData]);


  // --- Action Handlers ---
  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || isNaN(amount) || !selectedCustomer) {
      showToast('Please enter a valid payment amount.', 'error');
      return;
    }
    const customerId = getCustomerId(selectedCustomer);

    const effectiveReduction = Math.min(amount, selectedCustomer.outstandingCredit);
    const amountChange = -effectiveReduction;
    
    if (amountChange === 0) {
      showToast('Outstanding credit is already zero or payment is zero.', 'info');
      closePaymentModal();
      return;
    }

    setIsProcessing(true);
    try {
      await apiClient.put(`${API.customers}/${customerId}/credit`, {
        amountChange: amountChange,
        type: 'payment_received',
        paymentAmount: amount, // Send the full payment amount for better logging
      });

      showToast(`Payment of ₹${effectiveReduction.toFixed(0)} recorded for ${selectedCustomer.name}`, 'success');
      await fetchCustomers();

      closePaymentModal();

    } catch (error) {
      console.error('Record Payment Error:', error.response?.data || error.message);
      showToast(`Error recording payment: ${error.response?.data?.error || 'Failed to connect to server.'}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleAddNewCustomer = async (e) => {
    e.preventDefault();

    const errors = validateCustomerForm(newCustomerData);
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsProcessing(true);
    try {
      const parsedInitialDue = parseFloat(newCustomerData.initialDue) || 0;

      const dataToSend = {
        name: newCustomerData.name.trim(),
        phone: newCustomerData.phone ? String(newCustomerData.phone).trim().replace(/[^0-9]/g, '') : null,
        creditLimit: parseFloat(newCustomerData.creditLimit) || 0,
        initialDue: parsedInitialDue
      };

      await apiClient.post(API.customers, dataToSend);

      await fetchCustomers();
      showToast(`New Khata Customer added: ${newCustomerData.name.trim()}${parsedInitialDue > 0 ? ` with initial due of ₹${parsedInitialDue.toFixed(0)}` : ''}`, 'success');
      closeAddCustomerModal();

    } catch (error) {
      console.error('Add Customer Error:', error.response?.data || error.message);
      const serverResponse = error.response?.data;
      if (serverResponse && serverResponse.field === 'phone' && serverResponse.error) {
        setValidationErrors(prev => ({
          ...prev,
          phone: serverResponse.error
        }));
      } else if (serverResponse && serverResponse.field === 'initialDue' && serverResponse.error) {
        setValidationErrors(prev => ({
          ...prev,
          initialDue: serverResponse.error
        }));
      } else {
        const serverError = serverResponse?.error || error.message;
        showToast(`Error adding customer: ${serverError || 'Failed to connect to server.'}`, 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleSendReminders = () => {
    if (outstandingCustomersForReminders.length === 0) {
      showToast('No customers with outstanding Khata due to remind.', 'info');
      return;
    }
    // Updated mock to indicate 'Coming Soon'
    showToast('Reminder feature is coming soon!', 'info'); 

    // Old mock implementation (kept as a comment for context)
    /*
    const selectedNames = outstandingCustomersForReminders.map(cust => cust.name);
    showToast(`Mock: Sending WhatsApp reminder to ${outstandingCustomersForReminders.length} customer(s): ${selectedNames.slice(0, 3).join(', ')}${outstandingCustomersForReminders.length > 3 ? ' and others' : ''}.`, 'info');
    */
  }

  // --- Primary Render ---

  if (loading && customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-8 text-gray-400 bg-gray-950 transition-colors duration-300">
        <Loader className="w-10 h-10 animate-spin text-teal-400" />
        <p className='mt-3 text-lg font-semibold'>Loading your Khata Ledger...</p>
      </div>
    );
  }

  return (
    // Outer container: Full height, dark background, and a max-width for better desktop design.
    <div className="min-h-screen bg-gray-950 text-gray-200 p-4 md:p-6 lg:p-8 flex flex-col items-center">
      
      {/* Content wrapper with max-width for alignment */}
      <div className="w-full max-w-4xl">
        
        {/* 1. Main Heading and Description (Matching POS style) */}
        <div className='mb-6'>
            {/* Conditional rendering for title/caption vs. search */}
            {isSearchVisible ? (
                <div className='flex items-center space-x-2'>
                    <h1 className="text-3xl font-extrabold text-white-300 mb-1">Search Khata</h1>
                </div>
            ) : (
                <>
                    <h1 className="text-3xl font-extrabold text-white-300 mb-1">Khata Ledger</h1>
                    <p className="text-gray-400">Manage all outstanding customer credit accounts.</p>
                </>
            )}
        </div>

        {/* 2. Dashboard Header Panel (Matching POS Total/Pay block) */}
        <div className="p-4 md:p-6 bg-gray-900 rounded-xl mb-6 border border-indigo-700 shadow-2xl shadow-indigo-900/10">
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center space-y-4 md:space-y-0 md:space-x-4">
                
                {/* Total Outstanding Display */}
                <div className="flex-1 p-3 py-4 bg-red-900/40 rounded-xl border border-red-700 flex items-center justify-between shadow-inner">
                    <span className="text-xl font-bold text-white flex items-center">
                        <TrendingUp className='w-5 h-5 mr-2 text-red-300' /> Total Outstanding:
                    </span>
                    <span className="text-red-400 text-3xl font-extrabold">
                        {/* Safely render totalOutstanding */}
                        ₹{totalOutstanding?.toFixed(0) || '0'}
                    </span>
                </div>

                {/* Action Buttons (Stacked on mobile, side-by-side on desktop) */}
                <div className="flex flex-row space-x-3 w-full md:w-auto relative"> 
                    <button 
                        className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm md:text-base shadow-xl shadow-indigo-900/50 hover:bg-indigo-700 transition flex items-center justify-center active:scale-[0.99] transform disabled:opacity-50"
                        onClick={openAddCustomerModal}
                        disabled={isProcessing}
                    >
                        <UserPlus className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" /> Add Customer
                    </button>

                    <button 
                        className="relative flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold text-sm md:text-base shadow-xl shadow-teal-900/50 hover:bg-teal-700 transition flex items-center justify-center active:scale-[0.99] transform disabled:opacity-50 group px-3" // Adjusted padding for better fit
                        onClick={(e) => { e.stopPropagation(); openRemindInfoModal(); }}
                        disabled={outstandingCustomersForReminders.length === 0 || isProcessing}
                    >
                        {/* Button Content */}
                        <div className='flex items-center justify-center'>
                           <MessageSquare className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" /> 
                           <span>{outstandingCustomersForReminders.length > 0 ? `Remind (${outstandingCustomersForReminders.length})` : 'No Due'}</span>
                        </div>
                        
                        {/* Info Icon Button - Positioned absolutely within the button, right edge */}
                        {/* <button
                            onClick={(e) => { e.stopPropagation(); openRemindInfoModal(); }}
                            className="absolute right-0 top-1/2 transform -translate-y-1/2 mr-1 p-1 rounded-full text-teal-200 hover:text-white transition"
                            title="Remind Feature Information"
                            type='button'
                            disabled={isProcessing}
                        >
                            <Info className="w-3 h-3 md:w-4 md:h-4" />
                        </button> */}
                    </button>
                </div>
            </div>
        </div>

        {/* 3. Customer List - Pass down search state */}
        <CustomerList
          sortedCustomers={sortedCustomers}
          openPaymentModal={openPaymentModal}
          isProcessing={isProcessing}
          openHistoryModal={openHistoryModal} 
          isSearchVisible={isSearchVisible} // <--- NEW PROP PASSED
        />
      </div>

      {/* --- MODALS (Payment Modal) --- */}
      {isPaymentModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          {/* Modal Container: Max-w-sm and centered on all screens */}
          <div className="bg-gray-800 w-full max-w-sm rounded-xl shadow-2xl border border-indigo-700/50 transform transition-all duration-300 ease-out my-8">
            
            {/* Header */}
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-indigo-900/40 rounded-t-xl">
              <h2 className="text-lg font-semibold text-indigo-300 flex items-center">
                <CreditCard className="w-5 h-5 mr-2" /> Record Payment
              </h2>
              <button onClick={closePaymentModal} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition" disabled={isProcessing}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body Content */}
            <div className="p-4 space-y-4">
              
              {/* Customer Name */}
              <p className="text-lg font-semibold text-white truncate">
                {selectedCustomer.name}
              </p>
              
              {/* Outstanding Due */}
              <div className="bg-red-900/30 p-3 rounded-lg flex items-center justify-between border border-red-700/50">
                <span className="text-sm font-medium text-red-300">Outstanding Due:</span>
                <span className="text-2xl font-bold text-red-400">
                  ₹{selectedCustomer?.outstandingCredit?.toFixed(0) || '0'}
                </span>
              </div>
              
              {/* Payment Input */}
              <div>
                <label htmlFor="payment-input" className="block text-sm font-medium text-gray-400 mb-1">
                  Enter Payment Amount Received (₹)
                </label>
                <input
                  id="payment-input"
                  type="number"
                  placeholder="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-3 border-2 border-teal-600 rounded-lg text-3xl font-bold text-center focus:ring-teal-500 focus:border-teal-500 transition-colors bg-gray-900 text-teal-400 shadow-inner shadow-teal-900/50"
                  // autoFocus REMOVED from here
                  disabled={isProcessing}
                />
              </div>

              {/* Confirm Button */}
              <button
                className="w-full py-3 bg-teal-600 text-white rounded-lg font-semibold text-base shadow-lg shadow-teal-900/50 hover:bg-teal-700 transition flex items-center justify-center active:scale-[0.99] disabled:bg-gray-700 disabled:text-gray-400 disabled:shadow-none"
                onClick={handleRecordPayment}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || isProcessing}
              >
                {isProcessing ? <Loader className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                {isProcessing ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALS (Add Customer Modal) --- */}
      {isAddCustomerModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-85 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <form onSubmit={handleAddNewCustomer} className="bg-gray-800 w-full max-w-md rounded-xl shadow-2xl border border-indigo-700 transform transition-all duration-300 my-8">
            <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-indigo-900/40 rounded-t-xl">
              <h2 className="text-xl font-bold text-indigo-300 flex items-center">
                <UserPlus className="w-5 h-5 mr-2" /> New Khata Customer
              </h2>
              <button type="button" onClick={closeAddCustomerModal} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition" disabled={isProcessing}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-5">
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
                placeholder="e.g., Ramesh Kumar"
              />
              <InputField
                label="Phone Number (10 digits, Optional)"
                name="phone"
                type="tel"
                value={newCustomerData.phone}
                onChange={handleNewCustomerInputChange}
                placeholder="e.g., 9876543210"
                dark={true}
                error={validationErrors.phone}
                disabled={isProcessing}
              />
              {/* Initial Due Amount */}
              <InputField
                label="Initial Due Amount (₹, Optional)"
                name="initialDue"
                type="number"
                value={newCustomerData.initialDue}
                onChange={handleNewCustomerInputChange}
                min="0"
                placeholder="e.g., 1500"
                dark={true}
                error={validationErrors.initialDue}
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
                placeholder="e.g., 5000"
              />
            </div>

            <div className="p-5 border-t border-gray-700">
              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-extrabold text-lg shadow-xl shadow-indigo-900/50 hover:bg-indigo-700 transition flex items-center justify-center disabled:opacity-50 disabled:shadow-none"
                disabled={isProcessing || !isFormValid}
              >
                {isProcessing ? <Loader className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                {isProcessing ? 'Adding Customer...' : 'Confirm & Add Customer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- History MODAL --- */}
      {isHistoryModalOpen && selectedCustomerForHistory && (
        <HistoryModal 
            customer={selectedCustomerForHistory} 
            onClose={closeHistoryModal} 
            fetchCustomerHistory={fetchCustomerHistory} 
        />
      )}

      {/* --- NEW Remind Info MODAL --- */}
      {isRemindInfoModalOpen && (
        <RemindInfoModal onClose={closeRemindInfoModal} />
      )}
    </div>
  );
};


export default Ledger;