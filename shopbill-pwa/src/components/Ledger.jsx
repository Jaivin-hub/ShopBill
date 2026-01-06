import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  UserPlus, TrendingUp, Loader, Search, ArrowUpDown, X, 
  Wallet, Users, Bell, ArrowUpRight, ShieldCheck, Activity,
  Filter, Download, ChevronRight, Scale
} from 'lucide-react';
import CustomerList from './CustomerList';
import { PaymentModal, AddCustomerModal, HistoryModal, RemindInfoModal } from './LedgerModals';

const scrollbarStyles = `
  .custom-ledger-scroll::-webkit-scrollbar { width: 4px; }
  .custom-ledger-scroll::-webkit-scrollbar-track { background: transparent; }
  .custom-ledger-scroll::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 10px; }
  .custom-ledger-scroll::-webkit-scrollbar-thumb:hover { background: #312e81; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
`;

const initialNewCustomerState = { name: '', phone: '', creditLimit: '', initialDue: '' };

const Ledger = ({ apiClient, API, showToast }) => {
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-950">
      <div className="flex flex-col items-center gap-4">
        <Loader className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em]">Syncing Ledger Database</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-gray-200">
      <style>{scrollbarStyles}</style>

      {/* --- ELITE HEADER --- */}
      <header className="sticky top-0 z-[100] bg-gray-950/90 backdrop-blur-md border-b border-gray-800/60 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white uppercase leading-none">
                Receivables <span className="text-indigo-500">Terminal</span>
              </h1>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.25em] mt-1.5 flex items-center gap-1.5">
                Account Reconciliation Active
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
              onClick={() => { setShowSearch(!showSearch); setShowSort(false); }} 
              className={`p-2.5 rounded-lg border transition-all ${showSearch ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-indigo-400 hover:border-indigo-500/30'}`}
            >
              <Search className="w-4 h-4" />
            </button>
            <button 
              onClick={() => { setShowSort(!showSort); setShowSearch(false); }} 
              className={`p-2.5 rounded-lg border transition-all ${showSort ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-indigo-400 hover:border-indigo-500/30'}`}
            >
              <Filter className="w-4 h-4" />
            </button>
            <div className="h-8 w-[1px] bg-gray-800 mx-2 hidden md:block" />
            <button 
              onClick={() => { setNewCustomerData(initialNewCustomerState); setActiveModal('add') }}
              className="hidden md:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-indigo-900/20"
            >
              <UserPlus className="w-3.5 h-3.5" /> New Account
            </button>
          </div>
        </div>

        {/* --- DYNAMIC TOOLS PANEL --- */}
        {(showSearch || showSort) && (
          <div className="max-w-7xl mx-auto mt-4 animate-in fade-in slide-in-from-top-2">
            {showSearch ? (
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  autoFocus 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  placeholder="LOCATE ACCOUNT BY IDENTIFIER (NAME, PHONE)..." 
                  className="w-full bg-gray-950 border border-gray-800 focus:border-indigo-500/50 rounded-xl py-3.5 pl-12 pr-12 text-[11px] font-bold uppercase tracking-[0.1em] outline-none transition-all" 
                />
                <X onClick={() => { setShowSearch(false); setSearchTerm('') }} className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 cursor-pointer hover:text-white" />
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {[
                  { id: 'due-high', label: 'Highest Priority' },
                  { id: 'due-low', label: 'Settled Priority' },
                  { id: 'alpha', label: 'A-Z Index' }
                ].map((opt) => (
                  <button 
                    key={opt.id} 
                    onClick={() => setSortBy(opt.id)} 
                    className={`px-6 py-2 rounded-lg text-[9px] font-bold uppercase border transition-all whitespace-nowrap ${sortBy === opt.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-950 border-gray-800 text-gray-500'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      {/* --- CONTENT WORKSPACE --- */}
      <main className="flex-1 px-6 py-8 dashboard-scroll">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* REVENUE STATUS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 bg-gray-900/40 border border-gray-800 rounded-2xl p-6 relative overflow-hidden group hover:border-rose-500/30 transition-all">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <TrendingUp className="w-16 h-16 text-rose-500" />
                </div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Gross Outstanding Debt</p>
                <div className="flex items-end justify-between">
                  <div>
                    <h2 className="text-4xl font-bold text-white tabular-nums tracking-tight">₹{totalOutstanding.toLocaleString('en-IN')}</h2>
                    <div className="flex items-center gap-2 mt-3 text-[10px] font-bold uppercase tracking-wider text-rose-500 bg-rose-500/10 w-fit px-2 py-1 rounded">
                       <ShieldCheck className="w-3 h-3" /> Risk Exposure Level
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-400 tabular-nums">{hasDuesCount}</p>
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">At-Risk Accounts</p>
                  </div>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <button 
                  onClick={() => setActiveModal('remind')} 
                  className="flex-1 bg-gray-900/40 border border-gray-800 hover:border-emerald-500/30 hover:bg-emerald-500/5 p-4 rounded-xl flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-white uppercase tracking-widest">Reminders</p>
                      <p className="text-[9px] text-gray-500 font-medium">Auto-Notify Debtors</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-emerald-500 transition-colors" />
                </button>
            </div>
          </div>

          {/* TABLE SECTION */}
          <div className="bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-800/50 flex justify-between items-center bg-gray-900/30">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-indigo-500" />
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Registry</h3>
              </div>
              <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 uppercase">
                Database Synced
              </span>
            </div>

            <div className="p-2">
              <CustomerList
                customersList={customers}
                searchTerm={searchTerm}
                sortBy={sortBy}
                openPaymentModal={(c) => { setSelectedCustomer(c); setPaymentAmount(''); setActiveModal('payment'); }}
                openHistoryModal={(c) => { setSelectedCustomer(c); setActiveModal('history'); }}
                isProcessing={isProcessing}
                setActiveModal={setActiveModal}
              />
            </div>
          </div>
        </div>
      </main>

      {/* MOBILE QUICK ADD BUTTON */}
      <button 
        onClick={() => { setNewCustomerData(initialNewCustomerState); setActiveModal('add') }}
        className="md:hidden fixed bottom-8 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center z-50 active:scale-90 transition-transform"
      >
        <UserPlus className="w-6 h-6" />
      </button>

      {/* MODAL SYSTEMS */}
      {activeModal === 'payment' && (
        <PaymentModal 
          customer={selectedCustomer} 
          amount={paymentAmount} 
          setAmount={setPaymentAmount} 
          onClose={() => setActiveModal(null)} 
          onConfirm={handleRecordPayment} 
          isProcessing={isProcessing} 
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
        />
      )}
      {activeModal === 'history' && (
        <HistoryModal 
          customer={selectedCustomer} 
          onClose={() => setActiveModal(null)} 
          fetchCustomerHistory={fetchCustomerHistory} 
        />
      )}
      {activeModal === 'remind' && <RemindInfoModal onClose={() => setActiveModal(null)} />}
    </div>
  );
};

export default Ledger;