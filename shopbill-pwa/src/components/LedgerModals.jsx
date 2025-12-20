import React from 'react';
import { 
  X, CreditCard, Loader, CheckCircle, UserPlus, 
  History, Info, AlertTriangle, ArrowUp, ArrowDown, 
  DollarSign, Repeat, XCircle 
} from 'lucide-react';

// Helper for Ledger History Styles
const getTypeStyles = (type) => {
  switch (type) {
    case 'initial_due': return { icon: <DollarSign className="w-4 h-4 text-yellow-400" />, color: 'bg-yellow-900/40 border-yellow-700/50', label: 'Initial Due' };
    case 'credit_sale': return { icon: <ArrowUp className="w-4 h-4 text-red-400" />, color: 'bg-red-900/40 border-red-700/50', label: 'Credit Sale' };
    case 'payment_received': return { icon: <ArrowDown className="w-4 h-4 text-teal-400" />, color: 'bg-teal-900/40 border-teal-700/50', label: 'Payment Received' };
    default: return { icon: <Repeat className="w-4 h-4 text-gray-400" />, color: 'bg-gray-700/40 border-gray-600/50', label: 'Other' };
  }
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  } catch (e) { return 'Invalid Date'; }
};

const InputField = ({ label, name, type, value, onChange, error, disabled, ...props }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    <input
      {...props}
      id={name} name={name} type={type} value={value} onChange={onChange} disabled={disabled}
      className={`w-full p-3 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200 ${error ? 'border-2 border-red-500' : 'border border-gray-300 dark:border-gray-600'} ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
    />
    {error && <p className="mt-1 text-xs text-red-400 flex items-center"><XCircle className="w-3 h-3 mr-1" />{error}</p>}
  </div>
);

export const PaymentModal = ({ customer, amount, setAmount, onClose, onConfirm, isProcessing }) => (
  <div className="fixed inset-0 bg-gray-900 bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-gray-800 w-full max-w-sm rounded-xl shadow-2xl border border-indigo-700/50">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-indigo-900/40 rounded-t-xl">
        <h2 className="text-lg font-semibold text-indigo-300 flex items-center"><CreditCard className="w-5 h-5 mr-2" /> Record Payment</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-4 space-y-4">
        <p className="text-lg font-semibold text-white truncate">{customer.name}</p>
        <div className="bg-red-900/30 p-3 rounded-lg flex items-center justify-between border border-red-700/50">
          <span className="text-sm font-medium text-red-300">Outstanding Due:</span>
          <span className="text-2xl font-bold text-red-400">₹{customer?.outstandingCredit?.toFixed(0) || '0'}</span>
        </div>
        <input
          type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)}
          className="w-full p-3 border-2 border-teal-600 rounded-lg text-3xl font-bold text-center bg-gray-900 text-teal-400"
        />
        <button className="w-full py-3 bg-teal-600 text-white rounded-lg font-semibold flex items-center justify-center" onClick={onConfirm} disabled={!amount || isProcessing}>
          {isProcessing ? <Loader className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
          Confirm Payment
        </button>
      </div>
    </div>
  </div>
);

export const AddCustomerModal = ({ data, onChange, onClose, onConfirm, errors, isProcessing, isValid }) => (
  <div className="fixed inset-0 bg-gray-900 bg-opacity-85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <form onSubmit={onConfirm} className="bg-gray-800 w-full max-w-md rounded-xl shadow-2xl border border-indigo-700">
      <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-indigo-900/40 rounded-t-xl">
        <h2 className="text-xl font-bold text-indigo-300 flex items-center"><UserPlus className="w-5 h-5 mr-2" /> New Khata Customer</h2>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
      </div>
      <div className="p-6 space-y-5">
        <InputField label="Full Name" name="name" type="text" value={data.name} onChange={onChange} error={errors.name} required />
        <InputField label="Phone Number" name="phone" type="tel" value={data.phone} onChange={onChange} error={errors.phone} />
        <InputField label="Initial Due (₹)" name="initialDue" type="number" value={data.initialDue} onChange={onChange} error={errors.initialDue} />
        <InputField label="Credit Limit (₹)" name="creditLimit" type="number" value={data.creditLimit} onChange={onChange} error={errors.creditLimit} />
      </div>
      <div className="p-5 border-t border-gray-700">
        <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center disabled:opacity-50" disabled={isProcessing || !isValid}>
          {isProcessing ? <Loader className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
          Confirm & Add Customer
        </button>
      </div>
    </form>
  </div>
);

export const HistoryModal = ({ customer, onClose, fetchCustomerHistory }) => {
    const [history, setHistory] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        const loadHistory = async () => {
            try {
                const data = await fetchCustomerHistory(customer._id);
                setHistory(data);
            } catch (err) { setError('Could not load transaction history.'); }
            finally { setIsLoading(false); }
        };
        if (customer?._id) loadHistory();
    }, [customer, fetchCustomerHistory]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-xl shadow-2xl border border-gray-200 dark:border-indigo-700">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-indigo-100 dark:bg-indigo-900/40 rounded-t-xl">
                    <h2 className="text-xl font-bold text-indigo-700 dark:text-indigo-300 flex items-center"><History className="w-5 h-5 mr-2" /> Khata Ledger</h2>
                    <button onClick={onClose} className="text-gray-600 dark:text-gray-400"><X className="w-6 h-6" /></button>
                </div>
                <div className="p-4 space-y-4">
                    <div className="flex justify-between items-center border-b dark:border-gray-700 pb-2">
                        <p className="text-lg font-bold dark:text-white truncate">{customer.name}</p>
                        <span className="text-red-400 text-2xl font-extrabold">₹{customer.outstandingCredit?.toFixed(0)} <span className="text-sm text-gray-400">Due</span></span>
                    </div>
                    <div className="h-96 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        {isLoading ? <Loader className="w-6 h-6 animate-spin mx-auto mt-10" /> : history.map(t => {
                            const styles = getTypeStyles(t.type);
                            const isCredit = t.type === 'credit_sale' || t.type === 'initial_due';
                            return (
                                <div key={t._id} className={`flex items-center p-3 mb-2 rounded-lg border ${styles.color}`}>
                                    <div className="flex-grow">
                                        <p className="font-medium text-sm dark:text-white">{styles.label}</p>
                                        <p className="text-xs text-gray-500">{formatDate(t.timestamp)}</p>
                                    </div>
                                    <div className={`font-bold text-lg ${isCredit ? 'text-red-400' : 'text-teal-400'}`}>
                                        {isCredit ? '+' : '-'} ₹{t.amount?.toFixed(0)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="p-4 border-t dark:border-gray-700">
                    <button onClick={onClose} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">Close Ledger</button>
                </div>
            </div>
        </div>
    );
};

export const RemindInfoModal = ({ onClose }) => (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 w-full max-w-sm rounded-xl border border-teal-700/50">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-teal-900/40 rounded-t-xl">
                <h2 className="text-lg font-semibold text-teal-300 flex items-center"><Info className="w-5 h-5 mr-2" /> Remind Feature Info</h2>
                <button onClick={onClose} className="text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
                <p className='text-white font-medium'>The Remind feature will eventually be used for automated WhatsApp/SMS reminders.</p>
                <div className='p-3 bg-teal-900/30 rounded-lg border border-teal-700/50 text-teal-300 flex items-center'>
                    <AlertTriangle className='w-5 h-5 mr-2' /><p className='text-sm'>Status: Coming Soon</p>
                </div>
                <button onClick={onClose} className="w-full py-2 bg-teal-600 text-white rounded-lg font-semibold">Got It</button>
            </div>
        </div>
    </div>
);