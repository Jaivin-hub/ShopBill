import React from 'react';
import { 
  X, CreditCard, Loader, CheckCircle, UserPlus, 
  History, Info, AlertTriangle, ArrowUp, ArrowDown, 
  DollarSign, Repeat, XCircle, Phone, ShieldAlert, Calendar
} from 'lucide-react';

// Helper for Ledger History Styles
const getTypeStyles = (type) => {
  switch (type) {
    case 'initial_due': return { icon: <DollarSign className="w-4 h-4 text-yellow-400" />, color: 'bg-yellow-500/10 border-yellow-500/20', label: 'Initial Due' };
    case 'credit_sale': return { icon: <ArrowUp className="w-4 h-4 text-rose-400" />, color: 'bg-rose-500/10 border-rose-500/20', label: 'Credit Sale' };
    case 'payment_received': return { icon: <ArrowDown className="w-4 h-4 text-teal-400" />, color: 'bg-teal-500/10 border-teal-500/20', label: 'Payment Received' };
    default: return { icon: <Repeat className="w-4 h-4 text-gray-400" />, color: 'bg-gray-700/10 border-gray-600/20', label: 'Other' };
  }
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-IN', { 
      day: '2-digit', month: 'short', year: 'numeric'
    });
  } catch (e) { return 'Invalid Date'; }
};

const InputField = ({ label, name, type, value, onChange, error, disabled, icon: Icon, ...props }) => (
  <div className="space-y-1.5">
    <label htmlFor={name} className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative group">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />}
      <input
        {...props}
        id={name} name={name} type={type} value={value || ''} onChange={onChange} disabled={disabled}
        className={`w-full ${Icon ? 'pl-11' : 'px-4'} py-3.5 bg-gray-950 border rounded-2xl text-white placeholder-gray-700 outline-none transition-all
          ${error ? 'border-rose-500 ring-2 ring-rose-500/10' : 'border-gray-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'} 
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
    </div>
    {error && <p className="mt-1 text-[10px] font-bold text-rose-400 flex items-center px-1 uppercase tracking-tighter"><XCircle className="w-3 h-3 mr-1" />{error}</p>}
  </div>
);

export const PaymentModal = ({ customer, amount, setAmount, onClose, onConfirm, isProcessing }) => (
  <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
    <section className="bg-gray-900 w-full max-w-sm rounded-[32px] shadow-2xl border border-gray-800 overflow-hidden animate-in fade-in zoom-in duration-200">
      <header className="p-6 border-b border-gray-800 flex justify-between items-center">
        <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-teal-400" /> Collect Payment
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-xl text-gray-500 transition-colors"><X className="w-5 h-5" /></button>
      </header>
      
      <div className="p-6 space-y-6">
        <div className="text-center">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Customer Account</p>
            <p className="text-xl font-black text-white">{customer?.name}</p>
        </div>

        <div className="bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10 flex flex-col items-center">
          <span className="text-[10px] font-black text-rose-500/60 uppercase tracking-[0.2em] mb-1">Current Due</span>
          <span className="text-3xl font-black text-rose-400 italic">₹{customer?.outstandingCredit?.toLocaleString('en-IN') || '0'}</span>
        </div>

        <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-teal-500/50">₹</span>
            <input
              type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full py-5 pl-10 pr-4 bg-gray-950 border border-teal-500/30 rounded-2xl text-3xl font-black text-center text-teal-400 outline-none focus:ring-4 focus:ring-teal-500/10"
            />
        </div>

        <button 
          className="w-full py-4 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-teal-900/20" 
          onClick={onConfirm} disabled={!amount || isProcessing}
        >
          {isProcessing ? <Loader className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
          Confirm Payment
        </button>
      </div>
    </section>
  </div>
);

export const AddCustomerModal = ({ data, onChange, onClose, onConfirm, errors = {}, isProcessing, isValid }) => {
  // Guard against undefined data to prevent the 'reading name' crash
  if (!data) return null;

  return (
    <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <form onSubmit={onConfirm} className="bg-gray-900 w-full max-w-md rounded-[32px] shadow-2xl border border-gray-800 animate-in fade-in zoom-in duration-200 my-auto">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-indigo-400" /> New Account
          </h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-800 rounded-xl text-gray-500 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <InputField 
            label="Customer Full Name" 
            name="name" 
            type="text" 
            value={data.name} 
            onChange={onChange} 
            error={errors.name} 
            placeholder="John Doe"
            required 
          />
          <InputField 
            label="Phone Number" 
            name="phone" 
            type="tel" 
            icon={Phone}
            value={data.phone} 
            onChange={onChange} 
            error={errors.phone} 
            placeholder="10-digit mobile"
            maxLength="10"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <InputField 
              label="Initial Due (₹)" 
              name="initialDue" 
              type="number" 
              value={data.initialDue} 
              onChange={onChange} 
              error={errors.initialDue} 
              placeholder="0"
            />
            <InputField 
              label="Credit Limit (₹)" 
              name="creditLimit" 
              type="number" 
              icon={ShieldAlert}
              value={data.creditLimit} 
              onChange={onChange} 
              error={errors.creditLimit} 
              placeholder="5000"
              required
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-800">
          <button 
            type="submit" 
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:bg-gray-800 disabled:text-gray-600 shadow-xl shadow-indigo-900/20" 
            disabled={isProcessing || !isValid}
          >
            {isProcessing ? <Loader className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
            Create Account
          </button>
          {!isValid && !isProcessing && (
            <p className="text-center text-[10px] font-bold text-gray-600 mt-4 uppercase tracking-widest italic">All mandatory fields required</p>
          )}
        </div>
      </form>
    </div>
  );
};

export const HistoryModal = ({ customer, onClose, fetchCustomerHistory }) => {
    const [history, setHistory] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        const loadHistory = async () => {
            try {
                const data = await fetchCustomerHistory(customer._id);
                setHistory(data || []);
            } catch (err) { setError('Failed to sync history.'); }
            finally { setIsLoading(false); }
        };
        if (customer?._id) loadHistory();
    }, [customer, fetchCustomerHistory]);

    return (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-gray-900 w-full max-w-lg rounded-[32px] shadow-2xl border border-gray-800 overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <History className="w-4 h-4 text-indigo-400" /> Account Ledger
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-xl text-gray-500 transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6">
                    <div className="flex justify-between items-center bg-gray-950/50 p-4 rounded-2xl border border-gray-800 mb-4">
                        <div className="truncate pr-4">
                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Account Holder</p>
                            <p className="text-lg font-black text-white truncate">{customer?.name}</p>
                        </div>
                        <div className="text-right whitespace-nowrap">
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Balance Due</p>
                            <p className="text-xl font-black text-rose-400 italic">₹{customer?.outstandingCredit?.toLocaleString('en-IN')}</p>
                        </div>
                    </div>

                    <div className="h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {isLoading ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-50">
                                <Loader className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Fetching records...</p>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-600 text-[10px] font-black uppercase tracking-widest">No transaction history</div>
                        ) : history.map(t => {
                            const styles = getTypeStyles(t.type);
                            const isCredit = t.type === 'credit_sale' || t.type === 'initial_due';
                            return (
                                <div key={t._id} className={`flex items-center p-4 mb-3 rounded-2xl border ${styles.color} transition-all hover:bg-opacity-20`}>
                                    <div className="p-2 rounded-xl bg-gray-900/50 mr-4">
                                        {styles.icon}
                                    </div>
                                    <div className="flex-grow">
                                        <p className="font-black text-[10px] text-white uppercase tracking-widest">{styles.label}</p>
                                        <div className="flex items-center text-[10px] font-bold text-gray-500 mt-0.5">
                                            <Calendar className="w-3 h-3 mr-1" /> {formatDate(t.timestamp)}
                                        </div>
                                    </div>
                                    <div className={`font-black text-lg ${isCredit ? 'text-rose-400' : 'text-teal-400'} italic`}>
                                        {isCredit ? '+' : '-'} ₹{t.amount?.toLocaleString('en-IN')}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-6 border-t border-gray-800">
                    <button onClick={onClose} className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95">
                        Close History
                    </button>
                </div>
            </div>
        </div>
    );
};

export const RemindInfoModal = ({ onClose }) => (
    <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
        <div className="bg-gray-900 w-full max-w-sm rounded-[32px] border border-gray-800 overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-400" /> Reminder System
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-xl text-gray-500 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-6">
                <div className="space-y-3">
                    <p className='text-sm text-gray-300 leading-relaxed'>Automated recovery alerts via <span className="text-teal-400 font-bold">WhatsApp</span> and <span className="text-indigo-400 font-bold">SMS</span> are currently in development.</p>
                    <div className='p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 flex items-start gap-3'>
                        <AlertTriangle className='w-5 h-5 text-amber-500 shrink-0 mt-0.5' />
                        <div>
                            <p className='text-[10px] font-black text-amber-500 uppercase tracking-widest'>Status</p>
                            <p className='text-xs font-bold text-amber-200/70'>Integration Phase: Coming Soon</p>
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95">
                    Acknowledged
                </button>
            </div>
        </div>
    </div>
);