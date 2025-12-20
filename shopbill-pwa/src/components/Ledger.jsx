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

  useEffect(() => { fetchCustomers(); }, []);

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
    <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-teal-400">
      <Loader className="w-10 h-10 animate-spin" />
      <p className='mt-3 font-semibold'>Loading Khata Ledger...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-200 w-full p-4 md:p-8">
      <div className='mb-6'>
        <h1 className="text-3xl font-extrabold dark:text-white">Khata Ledger</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage all outstanding customer credit accounts.</p>
      </div>

      <div className="p-6 bg-gray-100 dark:bg-gray-900 rounded-xl mb-6 border dark:border-indigo-700 shadow-2xl">
        <div className="flex flex-col xl:flex-row justify-between items-center space-y-4 xl:space-y-0">
          <div className="flex-1 w-full p-4 bg-red-900/40 rounded-xl border border-red-700 flex justify-between items-center">
            <span className="text-xl font-bold dark:text-white flex items-center"><TrendingUp className='w-5 h-5 mr-2' /> Total Outstanding:</span>
            <span className="text-red-400 text-3xl font-extrabold">₹{totalOutstanding.toFixed(0)}</span>
          </div>
          <div className="flex space-x-3 w-full xl:w-auto xl:ml-4">
            <button onClick={() => {setNewCustomerData(initialNewCustomerState); setActiveModal('add')}} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center"><UserPlus className="w-5 h-5 mr-2" /> Add Customer</button>
            <button onClick={() => setActiveModal('remind')} className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold flex items-center justify-center"><MessageSquare className="w-5 h-5 mr-2" /> Remind ({hasDues})</button>
          </div>
        </div>
      </div>

      <CustomerList 
        sortedCustomers={sortedCustomers} 
        openPaymentModal={(c) => { setSelectedCustomer(c); setPaymentAmount(''); setActiveModal('payment'); }} 
        openHistoryModal={(c) => { setSelectedCustomer(c); setActiveModal('history'); }}
        isSearchVisible={isSearchVisible}
      />

      {/* Render Modals Conditionally */}
      {activeModal === 'payment' && (
        <PaymentModal customer={selectedCustomer} amount={paymentAmount} setAmount={setPaymentAmount} onClose={() => setActiveModal(null)} onConfirm={handleRecordPayment} isProcessing={isProcessing} />
      )}
      {activeModal === 'add' && (
        <AddCustomerModal data={newCustomerData} onChange={(e) => setNewCustomerData({...newCustomerData, [e.target.name]: e.target.value})} onClose={() => setActiveModal(null)} onConfirm={handleAddCustomer} errors={validationErrors} isProcessing={isProcessing} isValid={!!newCustomerData.name} />
      )}
      {activeModal === 'history' && (
        <HistoryModal customer={selectedCustomer} onClose={() => setActiveModal(null)} fetchCustomerHistory={fetchCustomerHistory} />
      )}
      {activeModal === 'remind' && <RemindInfoModal onClose={() => setActiveModal(null)} />}
    </div>
  );
};

export default Ledger;