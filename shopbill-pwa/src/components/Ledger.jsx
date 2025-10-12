import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
    List, MessageSquare, CheckCircle, XCircle, ArrowRight, UserPlus, 
    CreditCard, X, TrendingUp, DollarSign, Phone, AlertTriangle, Loader 
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


const Ledger = ({ apiClient, API, showToast }) => {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalInOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  
  // State now uses the updated initialNewCustomerState
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

    const amountChange = -Math.min(amount, selectedCustomer.outstandingCredit); 
    
    if (amountChange === 0) {
        showToast('Outstanding credit is already zero.', 'info');
        closePaymentModal();
        return;
    }

    setIsProcessing(true);
    try {
        await apiClient.put(`${API.customers}/${customerId}/credit`, {
            amountChange: amountChange,
            type: 'payment_received',
            paymentAmount: amount,
        });

        showToast(`Payment of ₹${amount.toFixed(0)} recorded for ${selectedCustomer.name}`, 'success');
        
        await fetchCustomers();

        closePaymentModal();

    } catch (error) {
        console.error('Record Payment Error:', error.response?.data || error.message);
        showToast(`Error recording payment: ${error.response?.data?.error || 'Failed to connect to server.'}`, 'error');
    } finally {
        setIsProcessing(false);
    }
  };
  
  // CRUCIAL FIX: Handle Add New Customer now sends 'initialDue' in the payload
  const handleAddNewCustomer = async (e) => {
    e.preventDefault();

    const errors = validateCustomerForm(newCustomerData);
    setValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsProcessing(true);
    try {
        // Calculate outstandingCredit from initialDue, defaulting to 0
        const parsedInitialDue = parseFloat(newCustomerData.initialDue) || 0;

        const dataToSend = {
            name: newCustomerData.name.trim(),
            phone: newCustomerData.phone ? String(newCustomerData.phone).trim().replace(/[^0-9]/g, '') : null,
            creditLimit: parseFloat(newCustomerData.creditLimit) || 0,
            
            // 🔥 CRITICAL FIX HERE: Send the parsed value under the key 'initialDue'
            // to match what the server-side router.post expects to receive.
            initialDue: parsedInitialDue 
        };

        await apiClient.post(API.customers, dataToSend); 

        await fetchCustomers();
        
        // Use parsedInitialDue for the toast message
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
            // Handle server-side validation for the new field, if implemented there.
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
          
      const selectedNames = outstandingCustomersForReminders.map(cust => cust.name);
          
      showToast(`Mock: Sending WhatsApp reminder to ${outstandingCustomersForReminders.length} customer(s): ${selectedNames.slice(0, 3).join(', ')}${outstandingCustomersForReminders.length > 3 ? ' and others' : ''}.`, 'info');
  }

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
    // 🔥 FIX APPLIED HERE: Removed 'h-full' and 'overflow-y-auto' 
    // to allow the child CustomerList component to correctly enforce its own scrolling height.
    <div className="p-4 md:p-8 bg-gray-950 transition-colors duration-300"> 
      
      {/* Render the Presentational Child Component */}
      <CustomerList
          sortedCustomers={sortedCustomers}
          totalOutstanding={totalOutstanding}
          outstandingCustomersForReminders={outstandingCustomersForReminders}
          openPaymentModal={openPaymentModal}
          openAddCustomerModal={openAddCustomerModal}
          handleSendReminders={handleSendReminders}
          isProcessing={isProcessing}
      />
      
      {/* --- MODALS (Payment Modal - Unchanged) --- */}
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
      
      {/* --- MODALS (Add Customer Modal - UPDATED) --- */}
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
                
                {/* NEW FIELD: Initial Due Amount */}
                <InputField 
                    label="Initial Due Amount (Optional)" 
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
    </div>
  );
};


export default Ledger;