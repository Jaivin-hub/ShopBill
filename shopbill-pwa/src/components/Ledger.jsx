import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  UserPlus, TrendingUp, Loader, Search, X,
  Wallet, Bell, ShieldCheck, Filter, ChevronRight,
  Sparkles, AlertCircle, RefreshCcw, LayoutGrid
} from 'lucide-react';
import CustomerList from './CustomerList';
import { PaymentModal, AddCustomerModal, HistoryModal, RemindInfoModal } from './LedgerModals';

const scrollbarStyles = `
  .custom-ledger-scroll::-webkit-scrollbar { width: 4px; }
  .custom-ledger-scroll::-webkit-scrollbar-track { background: transparent; }
  .custom-ledger-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
  .custom-ledger-scroll::-webkit-scrollbar-thumb:hover { background: #6366f1; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
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

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await apiClient.get(API.customers);
      setCustomers(response.data || []);
    } catch (error) { showToast('Error loading Ledger.', 'error'); }
    finally { setLoading(false); }
  }, [apiClient, API.customers, showToast]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const fetchCustomerHistory = useCallback(async (id) => {
    const response = await apiClient.get(`${API.customers}/${id}/history`);
    return response.data;
  }, [apiClient, API.customers]);

  const totalOutstanding = useMemo(() => customers.reduce((sum, c) => sum + (c.outstandingCredit || 0), 0), [customers]);
  const hasDuesCount = customers.filter(c => c.outstandingCredit > 0).length;

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || isNaN(amount)) return showToast('Enter valid amount', 'error');
    setIsProcessing(true);
    try {
      await apiClient.put(`${API.customers}/${selectedCustomer._id}/credit`, {
        amountChange: -Math.min(amount, selectedCustomer.outstandingCredit),
        type: 'payment_received',
        paymentAmount: amount
      });
      showToast('Payment recorded', 'success');
      await fetchCustomers();
      setActiveModal(null);
    } catch (e) { showToast('Payment failed', 'error'); }
    finally { setIsProcessing(false); }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomerData.name) return showToast('Name is required', 'error');
    setIsProcessing(true);
    try {
      await apiClient.post(API.customers, {
        ...newCustomerData,
        phone: newCustomerData.phone.replace(/\D/g, ''),
        creditLimit: parseFloat(newCustomerData.creditLimit) || 0,
        initialDue: parseFloat(newCustomerData.initialDue) || 0
      });
      showToast('Customer created', 'success');
      await fetchCustomers();
      setActiveModal(null);
    } catch (e) { showToast('Error adding customer', 'error'); }
    finally { setIsProcessing(false); }
  };

  const themeBase = darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const cardBase = darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const headerBg = darkMode ? 'bg-slate-950/80' : 'bg-white/80';

  if (loading) return (
    <div className={`h-screen flex flex-col items-center justify-center ${themeBase}`}>
      <RefreshCcw className="w-6 h-6 animate-spin text-indigo-500 mb-4" />
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Authenticating Ledger...</span>
    </div>
  );

  return (
    <div className={`min-h-screen flex flex-col transition-all duration-500 ${themeBase}`}>
      <style>{scrollbarStyles}</style>

      {/* --- PREMIUM HEADER --- */}
      <header className={`sticky top-0 z-[100] backdrop-blur-xl border-b px-6 py-6 ${headerBg} ${darkMode ? 'border-slate-800/60' : 'border-slate-200'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-black tracking-tight uppercase flex items-center gap-2">
              Ledger <span className="text-indigo-500">Terminal</span>
            </h1>
            <div className="flex items-center gap-2">
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.15em]">System Live • 128-bit Encrypted</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowSearch(!showSearch); setShowSort(false); }}
              className={`p-3 rounded-2xl border transition-all active:scale-90 ${showSearch ? 'bg-indigo-600 border-indigo-500 text-white' : (darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 shadow-sm')}`}
            >
              <Search size={18} />
            </button>
            <button
              onClick={() => { setShowSort(!showSort); setShowSearch(false); }}
              className={`p-3 rounded-2xl border transition-all active:scale-90 ${showSort ? 'bg-indigo-600 border-indigo-500 text-white' : (darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 shadow-sm')}`}
            >
              <Filter size={18} />
            </button>
            <button
              onClick={() => { setNewCustomerData(initialNewCustomerState); setActiveModal('add') }}
              className="hidden md:flex items-center gap-2 bg-slate-900 text-white border border-slate-700 hover:border-indigo-500 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              <UserPlus size={14} className="text-indigo-400" /> New Account
            </button>
          </div>
        </div>

        {/* --- EXPANDABLE SEARCH/FILTER --- */}
        {(showSearch || showSort) && (
          <div className="max-w-7xl mx-auto mt-5 animate-in fade-in slide-in-from-top-3">
            {showSearch ? (
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="SEARCH BY ACCOUNT NAME OR CONTACT..."
                  className={`w-full border rounded-2xl py-4.5 pl-14 pr-12 text-[10px] font-black uppercase tracking-widest outline-none transition-all ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-100 border-slate-200'}`}
                />
                <X onClick={() => { setShowSearch(false); setSearchTerm('') }} className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 cursor-pointer hover:text-indigo-500" />
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                {[
                  { id: 'due-high', label: 'Highest Priority' },
                  { id: 'due-low', label: 'Settled Priority' },
                  { id: 'alpha', label: 'A-Z Index' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSortBy(opt.id)}
                    className={`px-8 py-3 rounded-2xl text-[9px] font-black uppercase border transition-all active:scale-95 whitespace-nowrap ${sortBy === opt.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : (darkMode ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-400')}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      {/* --- WORKSPACE --- */}
      <main className="flex-1 px-4 py-3 overflow-y-auto custom-ledger-scroll">
        <div className="max-w-7xl mx-auto space-y-8 pb-32">

          {/* TOP METRICS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className={`lg:col-span-8 rounded-xl p-5 border relative overflow-hidden group transition-all duration-700 ${cardBase}`}>
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-rose-500/10 transition-colors" />

              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  {/* Status Icon */}
                  <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500 border border-rose-500/20 shadow-sm">
                    <AlertCircle size={20} />
                  </div>

                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5">
                      Total Outstanding
                    </p>
                    <h2 className="text-3xl md:text-4xl font-black text-rose-500 tracking-tighter tabular-nums leading-none">
                      ₹{totalOutstanding.toLocaleString('en-IN')}
                    </h2>
                  </div>
                </div>

                {/* Optional Mini Status or Badge */}
                <div className={`hidden md:flex flex-col items-end border-l pl-6 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Risk Status</p>
                  <span className="text-[10px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                    MONITORED
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ACCOUNTS LIST SECTION */}
          <div className={`rounded-xl border overflow-hidden ${cardBase}`}>
            <div className="px-8 py-7 border-b border-inherit flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-500/5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500">
                  <LayoutGrid size={20} />
                </div>
                <div>
                  <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Customer Registry</h3>
                  <p className="text-[9px] font-bold text-slate-400 mt-0.5">Managing {customers.length} Accounts</p>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-6">
              <CustomerList
                customersList={customers}
                searchTerm={searchTerm}
                sortBy={sortBy}
                openPaymentModal={(c) => { setSelectedCustomer(c); setPaymentAmount(''); setActiveModal('payment'); }}
                openHistoryModal={(c) => { setSelectedCustomer(c); setActiveModal('history'); }}
                isProcessing={isProcessing}
                setActiveModal={setActiveModal}
                darkMode={darkMode}
              />
            </div>
          </div>
        </div>
      </main>

      {/* MOBILE QUICK ADD - POSITIONED ABOVE FOOTER MENU */}
      <button
        onClick={() => { setNewCustomerData(initialNewCustomerState); setActiveModal('add') }}
        className="md:hidden fixed bottom-20 right-6 w-12 h-12 bg-indigo-600 text-white rounded-xl shadow-[0_15px_30px_rgba(79,70,229,0.4)] flex items-center justify-center z-50 active:scale-90 transition-all border-2 border-white/10"
      >
        <UserPlus size={24} />
      </button>

      {/* MODAL ARCHITECTURE */}
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
      {activeModal === 'remind' && <RemindInfoModal onClose={() => setActiveModal(null)} darkMode={darkMode} />}
    </div>
  );
};

export default Ledger;