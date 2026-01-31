import React from 'react';
import { 
  X, CreditCard, Loader, CheckCircle, UserPlus, 
  History, Info, AlertTriangle, ArrowUp, ArrowDown, 
  DollarSign, Repeat, XCircle, Phone, ShieldAlert, Calendar,
  MessageSquare, Send, Sparkles, RefreshCcw, MessageCircle,
  BellRing, AlertCircle
} from 'lucide-react';

// --- UPDATED: Added reminder_sent to styles ---
const getTypeStyles = (type, darkMode) => {
  switch (type) {
    case 'initial_due': return { icon: <DollarSign className="w-4 h-4 text-yellow-500" />, color: darkMode ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200', label: 'Initial Due' };
    case 'credit_sale': return { icon: <ArrowUp className="w-4 h-4 text-rose-500" />, color: darkMode ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-200', label: 'Credit Sale' };
    case 'payment_received': return { icon: <ArrowDown className="w-4 h-4 text-teal-500" />, color: darkMode ? 'bg-teal-500/10 border-teal-500/20' : 'bg-teal-50 border-teal-200', label: 'Payment Received' };
    case 'reminder_sent': return { icon: <BellRing className="w-4 h-4 text-amber-500" />, color: darkMode ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200', label: 'Payment Reminder' };
    default: return { icon: <Repeat className="w-4 h-4 text-gray-400" />, color: darkMode ? 'bg-gray-700/10 border-gray-600/20' : 'bg-slate-50 border-slate-200', label: 'Other' };
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

const InputField = ({ label, name, type, value, onChange, error, disabled, icon: Icon, darkMode, ...props }) => (
  <div className="space-y-1.5">
    <label htmlFor={name} className={`text-[10px] font-black  tracking-widest ml-1 ${darkMode ? 'text-gray-500' : 'text-slate-500'}`}>{label}</label>
    <div className="relative group">
      {Icon && <Icon className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${darkMode ? 'text-gray-500 group-focus-within:text-indigo-400' : 'text-slate-400 group-focus-within:text-indigo-600'}`} />}
      <input
        {...props}
        id={name} name={name} type={type} value={value || ''} onChange={onChange} disabled={disabled}
        className={`w-full ${Icon ? 'pl-11' : 'px-4'} py-3.5 border rounded-2xl outline-none transition-all font-bold text-[16px] md:text-base
          ${darkMode ? 'bg-gray-950 text-white border-gray-800 placeholder-gray-700 focus:border-indigo-500' : 'bg-white text-slate-900 border-slate-200 placeholder-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5'} 
          ${error ? 'border-rose-500 ring-2 ring-rose-500/10' : ''} 
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
    </div>
    {error && <p className="mt-1 text-[10px] font-bold text-rose-500 flex items-center px-1  tracking-tighter"><XCircle className="w-3 h-3 mr-1" />{error}</p>}
  </div>
);

export const PaymentModal = ({ customer, amount, setAmount, onClose, onConfirm, isProcessing, darkMode }) => (
  <div className={`fixed inset-0 backdrop-blur-md flex items-center justify-center z-[100] p-4 ${darkMode ? 'bg-gray-950/80' : 'bg-slate-900/40'}`}>
    <section className={`max-sm rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in duration-200 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'}`}>
      <header className={`p-6 border-b flex justify-between items-center ${darkMode ? 'border-gray-800' : 'border-slate-100 bg-slate-50/50'}`}>
        <h2 className={`text-sm font-black  tracking-widest flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          <CreditCard className="w-4 h-4 text-teal-500" /> Collect Payment
        </h2>
        <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-slate-100 text-slate-400'}`}><X className="w-5 h-5" /></button>
      </header>
      
      <div className="p-6 space-y-6">
        <div className="text-center">
            <p className={`text-[10px] font-black  tracking-widest mb-1 ${darkMode ? 'text-gray-500' : 'text-slate-400'}`}>Customer Account</p>
            <p className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{customer?.name}</p>
        </div>

        <div className={`p-4 rounded-2xl border flex flex-col items-center ${darkMode ? 'bg-rose-500/5 border-rose-500/10' : 'bg-rose-50 border-rose-100'}`}>
          <span className={`text-[10px] font-black  tracking-[0.2em] mb-1 ${darkMode ? 'text-rose-500/60' : 'text-rose-400'}`}>Current Due</span>
          <span className={`text-3xl font-black ${darkMode ? 'text-rose-400' : 'text-rose-600'}`}>₹{customer?.outstandingCredit?.toLocaleString('en-IN') || '0'}</span>
        </div>

        <div className="relative">
            <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black ${darkMode ? 'text-teal-500/50' : 'text-teal-300'}`}>₹</span>
            <input
              type="number"  placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)}
              className={`w-full py-5 pl-10 pr-4 border rounded-2xl text-3xl font-black text-center outline-none focus:ring-4 transition-all ${darkMode ? 'bg-gray-950 border-teal-500/30 text-teal-400 focus:ring-teal-500/10' : 'bg-white border-teal-200 text-teal-600 focus:ring-teal-600/5'}`}
            />
        </div>

        <button 
          className="w-full py-4 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl font-black  tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-teal-600/20" 
          onClick={onConfirm} disabled={!amount || isProcessing}
        >
          {isProcessing ? <Loader className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
          Confirm Payment
        </button>
      </div>
    </section>
  </div>
);

export const AddCustomerModal = ({ 
  data, 
  onChange, 
  onClose, 
  onConfirm, 
  errorMessage, // Received from Ledger.js
  validationErrors = {}, // Field-specific validation errors
  isProcessing, 
  isValid, 
  darkMode 
}) => {
  if (!data) return null;

  return (
    <div className={`fixed inset-0 backdrop-blur-md flex items-center justify-center z-[100] p-4 overflow-y-auto custom-scrollbar ${darkMode ? 'bg-gray-950/80' : 'bg-slate-900/40'}`}>
      <form onSubmit={onConfirm} className={`w-full max-w-md rounded-2xl shadow-2xl border animate-in fade-in zoom-in duration-200 my-auto ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'}`}>
        <div className={`p-6 border-b flex justify-between items-center ${darkMode ? 'border-gray-800' : 'border-slate-100 bg-slate-50/50'}`}>
          <h2 className={`text-sm font-black tracking-widest flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <UserPlus className="w-4 h-4 text-indigo-500" /> New Account
          </h2>
          <button type="button" onClick={onClose} className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-slate-100 text-slate-400'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* --- API ERROR FEEDBACK --- */}
          {errorMessage && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 animate-in shake duration-300 ${darkMode ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-100'}`}>
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-none">Registration Error</p>
                <p className={`text-xs font-bold leading-tight ${darkMode ? 'text-rose-200' : 'text-rose-700'}`}>
                  {errorMessage}
                </p>
              </div>
            </div>
          )}

          <InputField 
            label="Customer Full Name" 
            name="name" 
            type="text" 
            value={data.name} 
            onChange={onChange} 
            placeholder="John Doe"
            error={validationErrors.name}
            darkMode={darkMode}
            required 
          />
          <InputField 
            label="Phone Number" 
            name="phone" 
            type="tel" 
            icon={Phone}
            value={data.phone} 
            onChange={onChange} 
            placeholder="10-digit mobile"
            maxLength="10"
            error={validationErrors.phone}
            darkMode={darkMode}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <InputField 
              label="Initial Due (₹)" 
              name="initialDue" 
              type="number" 
              value={data.initialDue} 
              onChange={onChange} 
              placeholder="0"
              error={validationErrors.initialDue}
              darkMode={darkMode}
            />
            <InputField 
              label="Credit Limit (₹)" 
              name="creditLimit" 
              type="number" 
              icon={ShieldAlert}
              value={data.creditLimit} 
              onChange={onChange} 
              placeholder="5000"
              error={validationErrors.creditLimit}
              darkMode={darkMode}
              required
            />
          </div>
        </div>

        <div className={`p-6 border-t ${darkMode ? 'border-gray-800' : 'border-slate-100'}`}>
          <button 
            type="submit" 
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 shadow-xl shadow-indigo-600/20" 
            disabled={isProcessing || !isValid}
          >
            {isProcessing ? <Loader className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
            Create Account
          </button>
          {!isValid && !isProcessing && (
            <p className={`text-center text-[10px] font-bold mt-4 tracking-widest ${darkMode ? 'text-gray-600' : 'text-slate-400'}`}>All mandatory fields required</p>
          )}
        </div>
      </form>
    </div>
  );
};
// --- UPDATED: HistoryModal with Reminder Logs ---
export const HistoryModal = ({ customer, onClose, fetchCustomerHistory, darkMode }) => {
    const [history, setHistory] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [activeTab, setActiveTab] = React.useState('ledger'); // 'ledger' or 'reminders'

    React.useEffect(() => {
        const loadHistory = async () => {
            try {
                const data = await fetchCustomerHistory(customer._id);
                setHistory(data || []);
            } catch (err) { console.error('History sync failed'); }
            finally { setIsLoading(false); }
        };
        if (customer?._id) loadHistory();
    }, [customer, fetchCustomerHistory]);

    // Separate the data
    const ledgerEntries = history.filter(t => t.type !== 'reminder_sent');
    const reminderEntries = history.filter(t => t.type === 'reminder_sent');

    const tabBtnBase = "flex-1 py-3 text-[10px] font-black tracking-[0.2em] transition-all duration-300 rounded-xl flex items-center justify-center gap-2";

    return (
        <div className={`fixed inset-0 backdrop-blur-md flex items-center justify-center z-[100] p-4 ${darkMode ? 'bg-gray-950/80' : 'bg-slate-900/40'}`}>
            <div className={`w-full max-w-lg rounded-3xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in duration-200 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'}`}>
                
                {/* Header: Title and Close */}
                <div className={`p-6 border-b flex justify-between items-center ${darkMode ? 'border-gray-800' : 'border-slate-100 bg-slate-50/50'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                            <History size={18} />
                        </div>
                        <h2 className={`text-sm font-black tracking-widest ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            Customer Activity
                        </h2>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-slate-100 text-slate-400'}`}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Account Summary (The "Livya / ₹1,000" section you wanted) */}
                <div className="px-6 pt-6">
                    <div className={`flex justify-between items-center p-5 rounded-2xl border mb-4 ${darkMode ? 'bg-gray-950/50 border-gray-800' : 'bg-slate-50 border-slate-100 shadow-sm'}`}>
                        <div className="truncate pr-4">
                            <p className={`text-[9px] font-black tracking-widest uppercase mb-1 ${darkMode ? 'text-gray-600' : 'text-slate-400'}`}>Account Holder</p>
                            <p className={`text-lg font-black truncate tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                {customer?.name}
                            </p>
                        </div>
                        <div className="text-right whitespace-nowrap">
                            <p className={`text-[9px] font-black tracking-widest uppercase mb-1 ${darkMode ? 'text-rose-500/70' : 'text-rose-400'}`}>Balance Due</p>
                            <p className={`text-xl font-black tracking-tighter ${darkMode ? 'text-rose-400' : 'text-rose-600'}`}>
                                ₹{customer?.outstandingCredit?.toLocaleString('en-IN')}
                            </p>
                        </div>
                    </div>

                    {/* Tab Switcher */}
                    <div className={`flex p-1 rounded-2xl border mb-6 ${darkMode ? 'bg-gray-950 border-gray-800' : 'bg-white border-slate-100 shadow-inner'}`}>
                        <button 
                            onClick={() => setActiveTab('ledger')}
                            className={`${tabBtnBase} ${activeTab === 'ledger' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <DollarSign size={14} /> FINANCIALS
                        </button>
                        <button 
                            onClick={() => setActiveTab('reminders')}
                            className={`${tabBtnBase} ${activeTab === 'reminders' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <BellRing size={14} /> REMINDERS
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="px-6 pb-6">
                    <div className="h-72 overflow-y-auto pr-2 custom-ledger-scroll">
                        {isLoading ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-50">
                                <RefreshCcw className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                                <p className="text-[10px] font-black tracking-widest uppercase">Syncing Records...</p>
                            </div>
                        ) : activeTab === 'ledger' ? (
                            ledgerEntries.length === 0 ? (
                                <EmptyState message="No transactions found" darkMode={darkMode} />
                            ) : (
                                ledgerEntries.map(t => {
                                    const styles = getTypeStyles(t.type, darkMode);
                                    const isCredit = t.type === 'credit_sale' || t.type === 'initial_due';
                                    return (
                                        <div key={t._id} className={`flex items-center p-4 mb-3 rounded-2xl border transition-all hover:translate-x-1 ${styles.color}`}>
                                            <div className={`p-2 rounded-xl mr-4 ${darkMode ? 'bg-gray-900/50' : 'bg-white shadow-sm'}`}>{styles.icon}</div>
                                            <div className="flex-grow min-w-0">
                                                <p className={`font-black text-[10px] tracking-widest uppercase truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>{styles.label}</p>
                                                <div className="flex items-center text-[9px] font-bold text-slate-400 mt-1 uppercase">
                                                    <Calendar size={10} className="mr-1" /> {formatDate(t.timestamp)}
                                                </div>
                                            </div>
                                            <div className={`font-black text-base shrink-0 ${isCredit ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                {isCredit ? '+' : '-'} ₹{t.amount?.toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                    )
                                })
                            )
                        ) : (
                            reminderEntries.length === 0 ? (
                                <EmptyState message="No reminders sent yet" darkMode={darkMode} />
                            ) : (
                                reminderEntries.map(t => (
                                    <div key={t._id} className={`p-4 mb-3 rounded-2xl border animate-in slide-in-from-left-2 ${darkMode ? 'bg-amber-500/5 border-amber-500/10' : 'bg-amber-50 border-amber-100 shadow-sm shadow-amber-500/5'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-amber-500 rounded-lg text-white">
                                                    <MessageCircle size={12} />
                                                </div>
                                                <p className={`text-[10px] font-black tracking-widest ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>MSG DISPATCHED</p>
                                            </div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter opacity-60">
                                                {formatDate(t.timestamp)}
                                            </p>
                                        </div>
                                        <p className={`text-[11px] font-bold leading-relaxed mb-3 ${darkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                                            {t.details?.includes('Reminder') ? t.details : "Standard payment reminder sent via system automation."}
                                        </p>
                                    </div>
                                ))
                            )
                        )}
                    </div>
                </div>

                {/* Footer Action */}
                <div className={`p-6 border-t ${darkMode ? 'border-gray-800' : 'border-slate-100 bg-slate-50/30'}`}>
                    <button onClick={onClose} className={`w-full py-4 rounded-2xl font-black tracking-widest transition-all active:scale-95 ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white shadow-lg shadow-black/20' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`}>
                        BACK TO LEDGER
                    </button>
                </div>
            </div>
        </div>
    );
};

const EmptyState = ({ message, darkMode }) => (
  <div className="h-full flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className={`p-4 rounded-3xl mb-4 ${darkMode ? 'bg-gray-800/50' : 'bg-slate-50'}`}>
      <Info className={`w-8 h-8 ${darkMode ? 'text-gray-600' : 'text-slate-300'}`} />
    </div>
    <p className={`text-[10px] font-black tracking-[0.2em] uppercase ${darkMode ? 'text-gray-600' : 'text-slate-400'}`}>
      {message}
    </p>
    <p className={`text-[11px] font-bold mt-1 ${darkMode ? 'text-gray-700' : 'text-slate-300'}`}>
      No activity recorded for this period
    </p>
  </div>
);

// --- UPDATED REMIND MODAL ---
export const RemindModal = ({ customer, message, setMessage, onClose, onConfirm, isProcessing, darkMode }) => {
  const [selectedLang, setSelectedLang] = React.useState('en');
  
  const cardBg = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200';

  const templates = {
    en: `Dear ${customer?.name}, this is a reminder regarding your outstanding balance of ₹${customer?.outstandingCredit?.toLocaleString('en-IN')}. Please settle the payment at your earliest convenience. Thank you.`,
    ml: `പ്രിയപ്പെട്ട ${customer?.name}, നിങ്ങളുടെ കുടിശ്ശിക തുകയായ ₹${customer?.outstandingCredit?.toLocaleString('en-IN')} എത്രയും വേഗം അടച്ചു തീർക്കണമെന്ന് ഓർമ്മിപ്പിക്കുന്നു. നന്ദി.`
  };

  React.useEffect(() => {
    setMessage(templates.en);
    setSelectedLang('en');
  }, [customer?.name, customer?.outstandingCredit]);

  const handleLangChange = (lang) => {
    setSelectedLang(lang);
    setMessage(templates[lang]);
  };

  return (
    <div className={`fixed inset-0 backdrop-blur-md flex items-center justify-center z-[100] p-3 sm:p-4 md:p-6 overflow-y-auto ${darkMode ? 'bg-gray-950/80' : 'bg-slate-900/40'}`}>
      <div className={`w-full max-w-md rounded-xl sm:rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ${cardBg} my-auto max-h-[95vh] sm:max-h-[90vh] flex flex-col`}>
        <div className="p-4 sm:p-5 md:p-6 overflow-y-auto flex-1 min-h-0">
          <div className="flex justify-between items-center mb-6">
            <h3 className={`text-sm font-black  tracking-widest flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                <MessageSquare className="w-4 h-4 text-indigo-500" /> Automated Alert
            </h3>
            <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-slate-100 text-slate-400'}`}>
              <X size={20} />
            </button>
          </div>

          <div className="space-y-5">
            <div className={`p-4 rounded-2xl border flex items-center gap-4 ${darkMode ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
              <div className="flex -space-x-3 shrink-0">
                <div className="w-10 h-10 rounded-full bg-teal-600 border-2 border-white dark:border-gray-900 flex items-center justify-center shadow-lg">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className="w-10 h-10 rounded-full bg-indigo-600 border-2 border-white dark:border-gray-900 flex items-center justify-center shadow-lg">
                  <Send className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="min-w-0">
                <p className={`text-[10px] font-black tracking-widest ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>DUAL TRANSMISSION</p>
                <p className={`text-xs font-bold truncate ${darkMode ? 'text-gray-400' : 'text-slate-600'}`}>WhatsApp & SMS Channels Active</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className={`text-[10px] font-black tracking-widest ml-1 ${darkMode ? 'text-gray-500' : 'text-slate-500'}`}>SELECT LANGUAGE</label>
              <div className={`flex gap-2 p-1 border rounded-2xl ${darkMode ? 'bg-gray-950 border-gray-800' : 'bg-slate-50 border-slate-100'}`}>
                <button 
                  type="button"
                  onClick={() => handleLangChange('en')}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all ${selectedLang === 'en' ? 'bg-indigo-600 text-white shadow-lg' : darkMode ? 'text-gray-500 hover:text-gray-400' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  ENGLISH
                </button>
                <button 
                  type="button"
                  onClick={() => handleLangChange('ml')}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all ${selectedLang === 'ml' ? 'bg-indigo-600 text-white shadow-lg' : darkMode ? 'text-gray-500 hover:text-gray-400' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  മലയാളം
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className={`text-[10px] font-black  tracking-widest ml-1 ${darkMode ? 'text-gray-500' : 'text-slate-500'}`}>MESSAGE PREVIEW</label>
              <textarea
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setSelectedLang('custom');
                }}
                rows={5}
                className={`w-full p-4 rounded-2xl border text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all resize-none ${darkMode ? 'bg-gray-950 border-gray-800 text-white placeholder-gray-700' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-300'}`}
                placeholder="Type custom message..."
              />
            </div>

            <button
              onClick={onConfirm}
              disabled={isProcessing || !message?.trim()}
              className={`w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black tracking-widest text-[10px] transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-indigo-600/20`}
            >
              {isProcessing ? <RefreshCcw className="animate-spin" size={16} /> : <Sparkles size={16} />}
              TRANSMIT DUAL ALERTS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RemindInfoModal = ({ onClose, darkMode }) => (
    <div className={`fixed inset-0 backdrop-blur-md flex items-center justify-center z-[100] p-3 sm:p-4 md:p-6 overflow-y-auto ${darkMode ? 'bg-gray-950/80' : 'bg-slate-900/40'}`}>
        <div className={`w-full max-w-sm rounded-xl sm:rounded-2xl border overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'} my-auto max-h-[95vh] sm:max-h-[90vh] flex flex-col`}>
            <div className={`p-4 sm:p-5 md:p-6 border-b flex justify-between items-center ${darkMode ? 'border-gray-800' : 'border-slate-100 bg-slate-50/50'} flex-shrink-0`}>
                <h2 className={`text-sm font-black  tracking-widest flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    <Info className="w-4 h-4 text-amber-500" /> Reminder System
                </h2>
                <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-slate-100 text-slate-400'}`}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1 min-h-0">
                <div className="space-y-3">
                    <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-slate-600 font-medium'}`}>Automated recovery alerts via <span className="text-teal-500 font-bold">WhatsApp</span> and <span className="text-indigo-600 font-bold">SMS</span> are currently in development.</p>
                    <div className={`p-4 rounded-2xl border flex items-start gap-3 ${darkMode ? 'bg-amber-500/5 border-amber-500/10' : 'bg-amber-50 border-amber-100'}`}>
                        <AlertTriangle className='w-5 h-5 text-amber-500 shrink-0 mt-0.5' />
                        <div>
                            <p className={`text-[10px] font-black  tracking-widest ${darkMode ? 'text-amber-500' : 'text-amber-600'}`}>Status</p>
                            <p className={`text-xs font-bold ${darkMode ? 'text-amber-200/70' : 'text-amber-700/80'}`}>Integration Phase: Coming Soon</p>
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black  tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-600/20">
                    Acknowledged
                </button>
            </div>
        </div>
    </div>
);