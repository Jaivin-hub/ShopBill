import React, { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import {
  UserPlus, TrendingUp, Loader, Search, X,
  Wallet, Bell, ShieldCheck, Filter, ChevronRight,
  Sparkles, AlertCircle, RefreshCcw, LayoutGrid
} from 'lucide-react';
import CustomerList from './CustomerList';
import { 
  PaymentModal, 
  AddCustomerModal, 
  HistoryModal, 
  RemindModal 
} from './LedgerModals';
import { validateName, validatePhoneNumber, validateCreditLimit, validatePositiveNumber } from '../utils/validation';

const scrollbarStyles = `
  .custom-ledger-scroll::-webkit-scrollbar { width: 4px; }
  .custom-ledger-scroll::-webkit-scrollbar-track { background: transparent; }
  .custom-ledger-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
  .custom-ledger-scroll::-webkit-scrollbar-thumb:hover { background: #6366f1; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  
  /* Prevent Auto-Zoom on iOS and Horizontal Jump */
  .no-zoom-input {
    font-size: 16px !important;
  }
  @media (max-width: 768px) {
    .no-zoom-input {
      transform: scale(0.9);
      transform-origin: left center;
      width: 111% !important;
    }
  }
`;

const initialNewCustomerState = { name: '', phone: '', creditLimit: '', initialDue: '' };

const Ledger = ({ darkMode, apiClient, API, showToast, onModalStateChange }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce search by 300ms
  const [sortBy, setSortBy] = useState('due-high');
  const [activeModal, setActiveModal] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [newCustomerData, setNewCustomerData] = useState(initialNewCustomerState);
  
  // Notify parent when modal state changes
  useEffect(() => {
    if (onModalStateChange) {
      onModalStateChange(!!activeModal);
    }
  }, [activeModal, onModalStateChange]);
  
  // State for specific error feedback in Add Customer Modal
  const [addCustomerError, setAddCustomerError] = useState(null);
  
  // Validation errors state
  const [validationErrors, setValidationErrors] = useState({});
  
  // Track sent reminders to provide visual feedback and cooldown
  const [sentReminders, setSentReminders] = useState({});

  // States for the Reminder feature
  const [reminderMessage, setReminderMessage] = useState('');
  const [reminderType, setReminderType] = useState('whatsapp');

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await apiClient.get(API.customers);
      setCustomers(response.data || []);
    } catch (error) { 
      if(showToast) showToast('Error loading Ledger.', 'error'); 
    }
    finally { setLoading(false); }
  }, [apiClient, API.customers, showToast]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const fetchCustomerHistory = useCallback(async (id) => {
    const response = await apiClient.get(`${API.customers}/${id}/history`);
    return response.data;
  }, [apiClient, API.customers]);

  const totalOutstanding = useMemo(() => customers.reduce((sum, c) => sum + (c.outstandingCredit || 0), 0), [customers]);

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || isNaN(amount)) {
      if(showToast) showToast('Enter valid amount', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      await apiClient.put(`${API.customers}/${selectedCustomer._id}/credit`, {
        amountChange: -Math.min(amount, selectedCustomer.outstandingCredit),
        type: 'payment_received',
        paymentAmount: amount
      });
      if(showToast) showToast('Payment recorded', 'success');
      await fetchCustomers();
      setActiveModal(null);
    } catch (e) { 
      if(showToast) showToast('Payment failed', 'error'); 
    }
    finally { setIsProcessing(false); }
  };

  const handleAddCustomer = async (e) => {
    if (e) e.preventDefault();
    setAddCustomerError(null);
    
    // Validate all fields
    const errors = {};
    const nameError = validateName(newCustomerData.name, 'Customer name');
    if (nameError) errors.name = nameError;
    
    const phoneError = validatePhoneNumber(newCustomerData.phone);
    if (phoneError) errors.phone = phoneError;
    
    const creditLimitError = validateCreditLimit(newCustomerData.creditLimit);
    if (creditLimitError) errors.creditLimit = creditLimitError;
    
    const initialDueError = validatePositiveNumber(newCustomerData.initialDue, 'Initial due');
    if (initialDueError) errors.initialDue = initialDueError;
    
    setValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      if(showToast) showToast('Please fix validation errors', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      await apiClient.post(API.customers, {
        ...newCustomerData,
        phone: newCustomerData.phone.replace(/\D/g, ''),
        creditLimit: parseFloat(newCustomerData.creditLimit) || 0,
        initialDue: parseFloat(newCustomerData.initialDue) || 0
      });
      
      if(showToast) showToast('Customer created', 'success');
      await fetchCustomers();
      setActiveModal(null);
      setNewCustomerData(initialNewCustomerState);
      setValidationErrors({});
    } catch (err) { 
      // Handling the 400 response and extracting the message
      const errorData = err.response?.data;
      const errorMsg = errorData?.error || 'Error adding customer';
      
      setAddCustomerError(errorMsg); // This will show in the modal
    }
    finally { setIsProcessing(false); }
  };

  const handleSendReminder = async () => {
    if (!reminderMessage.trim()) return;
    setIsProcessing(true);
    try {
      const response = await apiClient.post(`${API.customers}/${selectedCustomer._id}/remind`, {
        message: reminderMessage,
        type: reminderType 
      });

      if (response.data && response.data.success) {
        setSentReminders(prev => ({
          ...prev,
          [selectedCustomer._id]: Date.now()
        }));
        
        if(showToast) showToast(`Reminder sent via ${reminderType.toUpperCase()}`, 'success');
        setTimeout(() => setActiveModal(null), 600);
      }
    } catch (e) { 
      if(showToast) showToast('Failed to send reminder', 'error'); 
      console.error(e);
    } finally { 
      setIsProcessing(false); 
    }
  };

  const openRemindModal = (customer) => {
    setSelectedCustomer(customer);
    setReminderType('whatsapp'); 
    const defaultMsg = `Hi ${customer.name}, this is a friendly reminder from our store regarding your outstanding balance of ₹${(customer.outstandingCredit || 0).toLocaleString('en-IN')}. Please settle it at your earliest convenience. Thank you!`;
    setReminderMessage(defaultMsg);
    setActiveModal('remind');
  };

  const themeBase = darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const cardBase = darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const sidebarBg = darkMode ? 'bg-slate-950' : 'bg-slate-50';
  const headerBg = darkMode ? 'bg-slate-950' : 'bg-white';
  const borderStyle = darkMode ? 'border-slate-800/60' : 'border-slate-200';

  return (
    <div className={`flex flex-col md:flex-row ${themeBase} w-full h-screen overflow-hidden`}>
      <style>{scrollbarStyles}</style>

      {/* Sidebar - Customer List */}
      <div className={`w-full md:w-80 flex flex-col h-full transition-all duration-300 ${sidebarBg} ${darkMode ? 'border-slate-800' : 'border-slate-200'} border-r overflow-hidden`}>
        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Sticky Header Area */}
          <div className={`sticky top-0 border-b ${borderStyle} ${darkMode ? 'bg-slate-950 backdrop-blur-xl' : 'bg-white backdrop-blur-xl'} shadow-lg transition-all duration-300 ${activeModal ? 'z-[50]' : 'z-[100]'}`}>
            {activeModal && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-10" />
            )}
            <div className={`relative ${activeModal ? 'opacity-30' : ''}`}>
            {/* Title and Description */}
            <div className="p-4 md:p-6 pb-3 md:pb-4">
              <div className="mb-3 md:mb-4">
                <div className="flex-1 min-w-0">
                  <h1 className={`text-xl md:text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Ledger <span className="text-indigo-500">Terminal</span>
                  </h1>
                  <p className={`text-[9px] font-black tracking-[0.2em] mt-0.5 md:mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Customer account management system.
                  </p>
                </div>
              </div>

              {/* Toggle - Search/Filter */}
              <div className={`flex p-1 rounded-xl gap-1 border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                <button
                  onClick={() => { setShowSearch(true); setShowSort(false); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2 py-2 rounded-lg text-[8px] md:text-[9px] font-black tracking-[0.2em] transition-all ${
                    showSearch ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]' : darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <Search size={11} className="md:w-3 md:h-3" />
                  <span className="hidden sm:inline">SEARCH</span>
                  <span className="sm:hidden">Search</span>
                </button>
                <button
                  onClick={() => { setShowSort(true); setShowSearch(false); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2 py-2 rounded-lg text-[8px] md:text-[9px] font-black tracking-[0.2em] transition-all ${
                    showSort ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]' : darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <Filter size={11} className="md:w-3 md:h-3" />
                  <span className="hidden sm:inline">FILTER</span>
                  <span className="sm:hidden">Filter</span>
                </button>
              </div>
            </div>

            {/* Search - Inside Sticky Header */}
            {showSearch && (
              <div className={`px-4 md:px-6 pb-3 md:pb-4 ${darkMode ? 'bg-slate-950' : 'bg-white'}`}>
                <div className="relative group">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${darkMode ? 'text-slate-600' : 'text-slate-400'} group-focus-within:text-indigo-500 transition-colors`} />
                  <input
                    type="text"
                    autoFocus
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search accounts..."
                    className={`w-full pl-10 pr-10 py-2.5 md:py-3 ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-xl text-[16px] md:text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all ${darkMode ? 'placeholder:text-slate-500' : 'placeholder:text-slate-400'}`}
                  />
                  <X 
                    onClick={() => { setShowSearch(false); setSearchTerm(''); }} 
                    className={`absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${darkMode ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-600'} cursor-pointer transition-colors`} 
                  />
                </div>
              </div>
            )}

            </div>
            {/* Sort Options */}
            {showSort && (
              <div className={`px-4 md:px-6 pb-3 md:pb-4 ${darkMode ? 'bg-slate-950' : 'bg-white'}`}>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  {[
                    { id: 'due-high', label: 'Highest Priority' },
                    { id: 'due-low', label: 'Settled Priority' },
                    { id: 'alpha', label: 'A-Z Index' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { setSortBy(opt.id); setShowSort(false); }}
                      className={`px-4 py-2 rounded-xl text-[8px] md:text-[9px] font-black tracking-[0.2em] transition-all whitespace-nowrap ${
                        sortBy === opt.id 
                          ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]' 
                          : darkMode ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-300' : 'bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Scrollable Content Area - Customer List */}
          <div className="min-h-0">
            <CustomerList
              customersList={customers}
              searchTerm={debouncedSearchTerm}
              sortBy={sortBy}
              openPaymentModal={(c) => { setSelectedCustomer(c); setPaymentAmount(''); setActiveModal('payment'); }}
              openHistoryModal={(c) => { setSelectedCustomer(c); setActiveModal('history'); }}
              openRemindModal={openRemindModal}
              isProcessing={isProcessing}
              setActiveModal={setActiveModal}
              darkMode={darkMode}
              sentReminders={sentReminders}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col w-full min-w-0 h-full overflow-hidden">
        {/* Fixed Header */}
        <div className={`shrink-0 w-full ${headerBg} border-b ${borderStyle} shadow-sm transition-all duration-300 relative ${activeModal ? 'z-[50]' : 'z-50'}`}>
          {activeModal && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-10" />
          )}
          <div className={`relative ${activeModal ? 'opacity-30' : ''}`}>
            <div className={`p-3 md:p-4 flex items-center justify-between gap-2 overflow-hidden`}>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative shrink-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                  darkMode 
                    ? 'bg-slate-800 text-slate-400 border-slate-700' 
                    : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}>
                  <Wallet size={18} />
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 ${darkMode ? 'border-slate-950' : 'border-white'} rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]`} />
              </div>

              <div className="flex-1 min-w-0 text-left overflow-hidden">
                <h3 className={`text-[13px] font-black truncate tracking-tight uppercase ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Account Overview
                </h3>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                  <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest truncate">
                    {customers.length} ACCOUNTS ACTIVE
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              <button className={`hidden md:flex p-2 transition-colors ${darkMode ? 'text-slate-500 hover:text-white' : 'text-slate-600 hover:text-indigo-600'}`}>
                <TrendingUp size={18} />
              </button>
              <button 
                onClick={fetchCustomers}
                className={`p-2 transition-colors ${darkMode ? 'text-slate-500 hover:text-white' : 'text-slate-600 hover:text-indigo-600'}`}
              >
                <RefreshCcw size={18} />
              </button>
            </div>
          </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 pb-4 custom-scrollbar min-h-0">
          <div className="max-w-7xl mx-auto space-y-4">

            {/* Total Outstanding Card */}
            <div className={`rounded-xl p-4 md:p-5 border relative overflow-hidden group transition-all duration-700 ${cardBase}`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-rose-500/10 transition-colors" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4 md:gap-5">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center border ${darkMode ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-500/10 border-rose-500/20'} shadow-sm`}>
                    <AlertCircle size={18} className="md:w-5 md:h-5 text-rose-500" />
                  </div>
                  <div>
                    <p className={`text-[9px] md:text-[10px] font-black tracking-[0.2em] mb-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Outstanding</p>
                    <h2 className={`text-2xl md:text-3xl lg:text-4xl font-black text-rose-500 tracking-tighter tabular-nums leading-none ${darkMode ? 'text-rose-400' : 'text-rose-500'}`}>
                      ₹{totalOutstanding.toLocaleString('en-IN')}
                    </h2>
                  </div>
                </div>
                <div className={`hidden md:flex flex-col items-end border-l pl-4 md:pl-6 ${borderStyle}`}>
                  <p className={`text-[8px] md:text-[9px] font-black tracking-widest mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Risk Status</p>
                  <span className={`text-[9px] md:text-[10px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 ${darkMode ? 'text-rose-400' : 'text-rose-500'}`}>MONITORED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAB for Mobile Account Creation */}
      <button
        onClick={() => { setAddCustomerError(null); setNewCustomerData(initialNewCustomerState); setActiveModal('add') }}
        className="md:hidden fixed bottom-24 right-4 z-[60] w-14 h-14 rounded-full bg-indigo-600 text-white shadow-2xl shadow-indigo-500/50 hover:bg-indigo-500 active:scale-95 transition-all flex items-center justify-center hover:shadow-indigo-600/60"
        aria-label="Create new account"
      >
        <UserPlus className="w-6 h-6" strokeWidth={2.5} />
      </button>

      {/* Modals Rendering */}
      {activeModal === 'payment' && (
        <PaymentModal
          customer={selectedCustomer}
          amount={paymentAmount}
          setAmount={setPaymentAmount}
          onClose={() => setActiveModal(null)}
          onConfirm={handleRecordPayment}
          isProcessing={isProcessing}
          darkMode={darkMode}
        />
      )}
      {activeModal === 'add' && (
        <AddCustomerModal
          data={newCustomerData}
          onChange={(e) => {
            setAddCustomerError(null);
            setNewCustomerData({ ...newCustomerData, [e.target.name]: e.target.value });
          }}
          onClose={() => { setActiveModal(null); setAddCustomerError(null); }}
          onConfirm={handleAddCustomer}
          isProcessing={isProcessing}
          isValid={!!newCustomerData.name}
          darkMode={darkMode}
          errorMessage={addCustomerError}
        />
      )}
      {activeModal === 'history' && (
        <HistoryModal
          customer={selectedCustomer}
          onClose={() => setActiveModal(null)}
          fetchCustomerHistory={fetchCustomerHistory}
          darkMode={darkMode}
        />
      )}
      {activeModal === 'remind' && (
        <RemindModal 
          customer={selectedCustomer}
          message={reminderMessage}
          setMessage={setReminderMessage}
          type={reminderType}
          setType={setReminderType}
          onClose={() => setActiveModal(null)} 
          onConfirm={handleSendReminder}
          isProcessing={isProcessing}
          darkMode={darkMode} 
        />
      )}
    </div>
  );
};

export default memo(Ledger);