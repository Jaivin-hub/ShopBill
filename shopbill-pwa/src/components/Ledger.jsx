import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { UserPlus, MessageSquare, TrendingUp, Loader } from 'lucide-react';
import CustomerList from './CustomerList';
import { PaymentModal, AddCustomerModal, HistoryModal, RemindInfoModal } from './LedgerModals';

const initialNewCustomerState = { name: '', phone: '', creditLimit: '', initialDue: '' };

const Ledger = ({ apiClient, API, showToast }) => {
  // State Management
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Modal Visibility States
  const [activeModal, setActiveModal] = useState(null); // 'payment', 'add', 'history', 'remind'
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Form States
  const [paymentAmount, setPaymentAmount] = useState('');
  const [newCustomerData, setNewCustomerData] = useState(initialNewCustomerState);
  const [validationErrors, setValidationErrors] = useState({});

  // Logic: Fetching
  const fetchCustomers = useCallback(async () => {
    try {
      const response = await apiClient.get(API.customers);
      setCustomers(response.data);
    } catch (error) { showToast('Error loading Khata data.', 'error'); }
    finally { setLoading(false); }
  }, [apiClient, API.customers]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const fetchCustomerHistory = useCallback(async (id) => {
    const response = await apiClient.get(`${API.customers}/${id}/history`);
    return response.data;
  }, [apiClient, API.customers]);

  // Calculations
  const totalOutstanding = useMemo(() => customers.reduce((sum, c) => sum + c.outstandingCredit, 0), [customers]);
  const sortedCustomers = useMemo(() => [...customers].sort((a, b) => b.outstandingCredit - a.outstandingCredit), [customers]);
  const hasDues = customers.filter(c => c.outstandingCredit > 0).length;

  // Handlers
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
    setIsProcessing(true);
    try {
      await apiClient.post(API.customers, {
        ...newCustomerData,
        phone: newCustomerData.phone.replace(/\D/g, ''),
        creditLimit: parseFloat(newCustomerData.creditLimit) || 0,
        initialDue: parseFloat(newCustomerData.initialDue) || 0
      });
      showToast('Customer Added', 'success');
      await fetchCustomers();
      setActiveModal(null);
    } catch (e) { showToast('Error adding customer', 'error'); }
    finally { setIsProcessing(false); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-teal-400" role="status" aria-label="Loading Ledger">
      <Loader className="w-10 h-10 animate-spin" />
      <span className="sr-only">Loading Khata data...</span>
    </div>
  );

  return (
    <main className="h-screen flex flex-col bg-gray-950 transition-colors duration-300 overflow-hidden" itemScope itemType="https://schema.org/FinancialProduct">
      
      {/* Main Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 space-y-6 pb-20 scroll-smooth">

        {/* 1. Header Section */}
        <header className="pt-4 md:pt-8" itemProp="headline">
          <h1 className="text-3xl font-extrabold text-white">Khata Ledger</h1>
          <p className="text-sm text-gray-400 mb-4" itemProp="description">Track customer credit, payments, and digital ledgers.</p>
        </header>

        {/* 2. Stats and Actions Section */}
        <section aria-label="Financial Overview" className="p-6 bg-gray-900 rounded-2xl border border-indigo-900/50 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

            {/* Left Side: Stats Card */}
            <article className="flex-1 w-full lg:max-w-md p-5 bg-red-950/20 rounded-2xl border border-red-900/30 flex justify-between items-center shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-900/40 rounded-lg flex-shrink-0" aria-hidden="true">
                  <TrendingUp className="w-6 h-6 text-red-400" />
                </div>
                <h2 className="text-sm uppercase tracking-wider font-semibold text-gray-400">
                  Total Outstanding
                </h2>
              </div>
              <data value={totalOutstanding} className="text-2xl lg:text-3xl font-black text-red-400">
                ₹{totalOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </data>
            </article>

            {/* Right Side: Action Buttons */}
            <nav className="grid grid-cols-2 lg:flex lg:space-x-4 w-full lg:w-auto gap-3" aria-label="Ledger actions">
              <button
                onClick={() => { setNewCustomerData(initialNewCustomerState); setActiveModal('add') }}
                aria-haspopup="dialog"
                aria-expanded={activeModal === 'add'}
                className="flex items-center justify-center px-4 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all transform active:scale-95 shadow-lg shadow-indigo-500/20"
              >
                <UserPlus className="w-6 h-6 flex-shrink-0 mr-2" aria-hidden="true" />
                <span className="text-sm md:text-base whitespace-nowrap">Add Customer</span>
              </button>

              <button
                onClick={() => setActiveModal('remind')}
                aria-label={`Send payment reminders to ${hasDues} customers`}
                className="flex items-center justify-center px-4 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all transform active:scale-95 shadow-lg shadow-teal-500/20"
              >
                <MessageSquare className="w-6 h-6 flex-shrink-0 mr-2" aria-hidden="true" />
                <span className="text-sm md:text-base whitespace-nowrap">Remind ({hasDues})</span>
              </button>
            </nav>
          </div>
        </section>

        {/* 3. Customer List Section */}
        <section aria-label="Customer Accounts List" className="relative">
          <CustomerList
            sortedCustomers={sortedCustomers}
            openPaymentModal={(c) => { setSelectedCustomer(c); setPaymentAmount(''); setActiveModal('payment'); }}
            openHistoryModal={(c) => { setSelectedCustomer(c); setActiveModal('history'); }}
            isSearchVisible={isSearchVisible}
          />
        </section>

      </div>

      {/* Render Modals Conditionally */}
      {/* Note: Ensure these sub-components use role="dialog" and aria-modal="true" internally */}
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
          errors={validationErrors} 
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
    </main>
  );
};

export default Ledger;