import React, { useState, useMemo, useCallback, useEffect } from 'react';
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

const Ledger = ({ darkMode, apiClient, API, showToast }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('due-high');
  const [activeModal, setActiveModal] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [newCustomerData, setNewCustomerData] = useState(initialNewCustomerState);
  
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
    e.preventDefault();
    if (!newCustomerData.name) {
       if(showToast) showToast('Name is required', 'error');
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
    } catch (e) { 
      if(showToast) showToast('Error adding customer', 'error'); 
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

      // Handle the success response and update cooldown state
      if (response.data && response.data.success) {
        setSentReminders(prev => ({
          ...prev,
          [selectedCustomer._id]: Date.now()
        }));
        
        // Use toast if available, otherwise UI will handle it via sentReminders state
        if(showToast) showToast(`Reminder sent via ${reminderType.toUpperCase()}`, 'success');
        
        // Close modal after a slight delay so user can see completion
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
  const headerBg = darkMode ? 'bg-slate-950/80' : 'bg-white/80';

  if (loading) return (
    <div className={`h-screen flex flex-col items-center justify-center ${themeBase}`}>
      <RefreshCcw className="w-6 h-6 animate-spin text-indigo-500 mb-4" />
      <span className="text-[10px] font-black text-slate-500 tracking-[0.3em]">Syncing Ledger...</span>
    </div>
  );

  return (
    <div className={`min-h-screen flex flex-col transition-all duration-500 ${themeBase}`}>
      <style>{scrollbarStyles}</style>

      <header className={`sticky top-0 z-[100] w-full backdrop-blur-xl border-b px-6 py-4 md:py-6 ${headerBg} ${darkMode ? 'border-slate-800/60' : 'border-slate-200'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-2xl font-black tracking-tight flex items-center gap-2">
              Ledger <span className="text-indigo-500">Terminal</span>
            </h1>
            <div className="flex items-center gap-2">
              <p className="text-[9px] text-slate-500 font-black tracking-[0.15em]">System Live • 128-bit Encrypted</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowSearch(!showSearch); setShowSort(false); }}
              className={`p-2.5 md:p-3 rounded-2xl border transition-all active:scale-90 ${showSearch ? 'bg-indigo-600 border-indigo-500 text-white' : (darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 shadow-sm')}`}
            >
              <Search size={18} />
            </button>
            <button
              onClick={() => { setShowSort(!showSort); setShowSearch(false); }}
              className={`p-2.5 md:p-3 rounded-2xl border transition-all active:scale-90 ${showSort ? 'bg-indigo-600 border-indigo-500 text-white' : (darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 shadow-sm')}`}
            >
              <Filter size={18} />
            </button>
            <button
              onClick={() => { setNewCustomerData(initialNewCustomerState); setActiveModal('add') }}
              className="hidden md:flex items-center gap-2 bg-slate-900 text-white border border-slate-700 hover:border-indigo-500 px-6 py-3 rounded-2xl text-[10px] font-black tracking-widest transition-all active:scale-95"
            >
              <UserPlus size={14} className="text-indigo-400" /> New Account
            </button>
          </div>
        </div>

        {(showSearch || showSort) && (
          <div className="max-w-7xl mx-auto mt-4 animate-in fade-in slide-in-from-top-3">
            {showSearch ? (
              <div className="relative group px-1">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-indigo-500 transition-colors z-10" />
                <input
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="search account..."
                  className="no-zoom-input w-full border rounded-2xl py-4 pl-12 pr-12 text-base md:text-[10px] font-black tracking-widest outline-none transition-all bg-transparent"
                />
                <X onClick={() => { setShowSearch(false); setSearchTerm('') }} className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 cursor-pointer hover:text-indigo-500 z-10" />
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 px-1">
                {[
                  { id: 'due-high', label: 'Highest Priority' },
                  { id: 'due-low', label: 'Settled Priority' },
                  { id: 'alpha', label: 'A-Z Index' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSortBy(opt.id)}
                    className={`px-6 py-3 rounded-2xl text-[9px] font-black border transition-all active:scale-95 whitespace-nowrap ${sortBy === opt.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : (darkMode ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-400')}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      <main className="px-4 py-4">
        <div className="max-w-7xl mx-auto space-y-4 pb-32">
          <div className={`rounded-xl p-5 border relative overflow-hidden group transition-all duration-700 ${cardBase}`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-rose-500/10 transition-colors" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500 border border-rose-500/20 shadow-sm">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 tracking-[0.2em] mb-0.5">Total Outstanding</p>
                  <h2 className="text-3xl md:text-4xl font-black text-rose-500 tracking-tighter tabular-nums leading-none">
                    ₹{totalOutstanding.toLocaleString('en-IN')}
                  </h2>
                </div>
              </div>
              <div className={`hidden md:flex flex-col items-end border-l pl-6 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <p className="text-[9px] font-black text-slate-500 tracking-widest mb-1">Risk Status</p>
                <span className="text-[10px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">MONITORED</span>
              </div>
            </div>
          </div>

          <div className={`rounded-xl border overflow-hidden ${cardBase}`}>
            <div className="px-6 py-5 border-b border-inherit flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-500/5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500">
                  <LayoutGrid size={20} />
                </div>
                <div>
                  <h3 className="text-[11px] font-black text-slate-500 tracking-[0.2em]">Customer Registry</h3>
                  <p className="text-[9px] font-bold text-slate-400 mt-0.5">Managing {customers.length} Accounts</p>
                </div>
              </div>
            </div>

            <div className="p-3 md:p-6">
              <CustomerList
                customersList={customers}
                searchTerm={searchTerm}
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
      </main>

      <button
        onClick={() => { setNewCustomerData(initialNewCustomerState); setActiveModal('add') }}
        className="md:hidden fixed bottom-24 right-6 w-12 h-12 bg-indigo-600 text-white rounded-xl shadow-[0_15px_30px_rgba(79,70,229,0.4)] flex items-center justify-center z-50 active:scale-90 transition-all border-2 border-white/10"
      >
        <UserPlus size={24} />
      </button>

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
          onChange={(e) => setNewCustomerData({ ...newCustomerData, [e.target.name]: e.target.value })}
          onClose={() => setActiveModal(null)}
          onConfirm={handleAddCustomer}
          isProcessing={isProcessing}
          isValid={!!newCustomerData.name}
          darkMode={darkMode}
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

export default Ledger;