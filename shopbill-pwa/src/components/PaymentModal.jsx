import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
    CreditCard, IndianRupee, X, User, Search, 
    ShieldAlert, ChevronDown, Wallet, ArrowRight,
    Activity, Info, Layers, UserPlus, CheckCircle2
} from 'lucide-react'; 

export const WALK_IN_CUSTOMER = { id: 'walk_in', name: 'Walk-in Customer', outstandingCredit: 0, creditLimit: 0 };
export const ADD_NEW_CUSTOMER_ID = 'add_new';

const PaymentModal = ({ isOpen, onClose, totalAmount, allCustomers = [], processPayment, showToast, darkMode }) => {
    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null); 
    
    const [localSelectedCustomer, setLocalSelectedCustomer] = useState(WALK_IN_CUSTOMER);
    const [amountPaidInput, setAmountPaidInput] = useState('');
    const [paymentType, setPaymentType] = useState('UPI'); 
    const [isDropdownOpen, setIsDropdownOpen] = useState(false); 
    const [searchTerm, setSearchTerm] = useState(''); 
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [creditError, setCreditError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setAmountPaidInput(totalAmount.toString());
            setPaymentType(localSelectedCustomer.id !== WALK_IN_CUSTOMER.id ? 'Credit' : 'UPI');
            setSearchTerm(''); 
            setCreditError(null); 
        }
    }, [isOpen, totalAmount, localSelectedCustomer.id]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsDropdownOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const khataDue = localSelectedCustomer.outstandingCredit || 0;
    const creditLimit = localSelectedCustomer.creditLimit || 0;
    const enteredPaid = parseFloat(amountPaidInput) || 0;

    const { amountCredited, changeDue, paymentMethod, effectiveAmountPaid } = useMemo(() => {
        let amtCred = 0;
        let chgDue = 0;
        let effPaid = 0;
        let method = 'UPI';

        if (paymentType === 'Credit') {
            amtCred = totalAmount;
            effPaid = 0;
            method = 'Credit';
        } else {
            effPaid = enteredPaid;
            if (enteredPaid >= totalAmount) {
                chgDue = enteredPaid - totalAmount;
                amtCred = 0;
                method = 'Cash/UPI';
            } else {
                amtCred = totalAmount - enteredPaid;
                method = enteredPaid > 0 ? 'Split Payment' : 'Credit';
            }
        }
        return { amountCredited: amtCred, changeDue: chgDue, paymentMethod: method, effectiveAmountPaid: effPaid };
    }, [enteredPaid, totalAmount, paymentType]);

    const filteredOptions = useMemo(() => {
        const options = [
            { id: ADD_NEW_CUSTOMER_ID, key: ADD_NEW_CUSTOMER_ID, name: 'Register New Customer', display: 'Register New Account', outstandingCredit: 0 },
            { ...WALK_IN_CUSTOMER, key: WALK_IN_CUSTOMER.id, display: 'Walk-in Customer' }
        ];
        const regular = (allCustomers || []).filter(c => (c._id || c.id) !== WALK_IN_CUSTOMER.id);
        regular.forEach(c => options.push({ ...c, id: c._id || c.id, key: c._id || c.id, display: c.name }));
        
        if (!searchTerm) return options;
        const q = searchTerm.toLowerCase();
        return options.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)));
    }, [allCustomers, searchTerm]);

    const handleConfirmPayment = async (force = false) => {
        if (totalAmount <= 0) return showToast('Cart is empty', 'error');
        if (amountCredited > 0 && localSelectedCustomer.id === WALK_IN_CUSTOMER.id) {
            return showToast('Please select a customer for Credit/Partial payments', 'error');
        }
        
        setIsSubmitting(true);
        try {
            await processPayment(effectiveAmountPaid, amountCredited, paymentMethod, localSelectedCustomer, force);
            setCreditError(null);
            onClose();
        } catch (error) {
            const msg = error.response?.data?.error || error.response?.data?.message || 'Transaction Failed';
            if (msg.toLowerCase().includes('limit')) setCreditError({ message: msg });
            else showToast(msg, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // Theme dynamic classes
    const modalBg = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200';
    const headerBg = darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-slate-50 border-slate-200';
    const subBg = darkMode ? 'bg-gray-950 border-gray-800' : 'bg-slate-100 border-slate-200';
    const textColor = darkMode ? 'text-white' : 'text-slate-950';
    const subTextColor = darkMode ? 'text-gray-500' : 'text-slate-500';

    return (
        <div className={`fixed inset-0 z-[200] flex justify-center items-center px-4 backdrop-blur-md transition-colors ${darkMode ? 'bg-gray-950/80' : 'bg-slate-900/40'}`}>
            <div className={`${modalBg} w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200`}>
                
                {/* Header */}
                <div className={`px-8 py-5 border-b flex justify-between items-center ${headerBg}`}>
                    <div>
                        <h2 className={`text-lg font-bold tracking-tight ${textColor}`}>Checkout Settlement</h2>
                        <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${subTextColor}`}>Finalize Transaction</p>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-slate-200 text-slate-500'}`}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 md:p-8 overflow-y-auto custom-scroll space-y-6">
                    
                    {/* Amount Display Card */}
                    <div className={`border rounded-xl p-5 flex items-center justify-between ${darkMode ? 'bg-indigo-600/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                        <div>
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Payable Amount</p>
                            <h3 className={`text-4xl font-black tabular-nums ${darkMode ? 'text-white' : 'text-black'}`}>₹{totalAmount.toLocaleString('en-IN')}</h3>
                        </div>
                        <div className={`p-4 rounded-xl ${darkMode ? 'bg-indigo-600/20' : 'bg-white shadow-sm'}`}>
                            <IndianRupee className="w-6 h-6 text-indigo-600" />
                        </div>
                    </div>

                    {/* Customer Selection */}
                    <div className="space-y-2.5">
                        <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${subTextColor}`}>Account Holder</label>
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className={`w-full border rounded-xl px-5 py-4 flex items-center justify-between group transition-all ${darkMode ? 'bg-gray-950 border-gray-800 hover:border-gray-700' : 'bg-white border-slate-300 hover:border-indigo-400'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${darkMode ? 'bg-gray-900 text-gray-600' : 'bg-slate-100 text-slate-400'}`}>
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className={`text-sm font-black uppercase tracking-tight ${textColor}`}>{localSelectedCustomer.name}</p>
                                        <p className={`text-[10px] font-bold ${subTextColor}`}>
                                            {localSelectedCustomer.id === 'walk_in' ? 'Standard Transaction' : `Limit: ₹${creditLimit} • Due: ₹${khataDue}`}
                                        </p>
                                    </div>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isDropdownOpen && (
                                <div className={`absolute top-full left-0 w-full mt-2 border rounded-xl shadow-2xl z-[210] overflow-hidden animate-in slide-in-from-top-2 duration-200 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'}`}>
                                    <div className={`p-3 border-b ${darkMode ? 'bg-gray-950 border-gray-800' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                            <input
                                                ref={searchInputRef}
                                                type="text"
                                                placeholder="SEARCH ACCOUNTS..."
                                                className={`w-full border rounded-lg py-2.5 pl-10 text-[10px] font-black outline-none focus:border-indigo-500 ${darkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-slate-200 text-black'}`}
                                                value={searchTerm}
                                                onChange={e => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-52 overflow-y-auto custom-scroll">
                                        {filteredOptions.map(c => (
                                            <div 
                                                key={c.key} 
                                                onClick={() => { setLocalSelectedCustomer(c); setIsDropdownOpen(false); }}
                                                className={`px-5 py-3.5 border-b last:border-0 cursor-pointer flex justify-between items-center transition-colors group ${darkMode ? 'hover:bg-gray-800 border-gray-800' : 'hover:bg-slate-50 border-slate-50'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {c.id === ADD_NEW_CUSTOMER_ID ? <UserPlus className="w-4 h-4 text-emerald-500" /> : <User className="w-4 h-4 text-slate-400" />}
                                                    <span className={`text-[11px] font-black uppercase ${c.id === ADD_NEW_CUSTOMER_ID ? 'text-emerald-600' : darkMode ? 'text-gray-300' : 'text-slate-700'}`}>{c.display}</span>
                                                </div>
                                                {c.outstandingCredit > 0 && <span className="text-[10px] font-black text-rose-500">₹{c.outstandingCredit}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Method Toggle */}
                    <div className="space-y-2.5">
                        <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${subTextColor}`}>Settlement Method</label>
                        <div className={`grid grid-cols-2 gap-2 p-1.5 border rounded-2xl ${subBg}`}>
                            <button
                                onClick={() => setPaymentType('UPI')}
                                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${paymentType === 'UPI' ? 'bg-indigo-600 text-white shadow-lg' : darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                <Wallet className="w-3.5 h-3.5" /> Direct Payment
                            </button>
                            <button
                                onClick={() => setPaymentType('Credit')}
                                disabled={localSelectedCustomer.id === 'walk_in'}
                                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${paymentType === 'Credit' ? 'bg-indigo-600 text-white shadow-lg' : `disabled:opacity-20 ${darkMode ? 'text-gray-500' : 'text-slate-500'}`}`}
                            >
                                <CreditCard className="w-3.5 h-3.5" /> Khata Ledger
                            </button>
                        </div>
                    </div>

                    {/* Amount Input */}
                    {paymentType === 'UPI' && (
                        <div className="space-y-2.5 animate-in fade-in slide-in-from-top-2">
                            <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${subTextColor}`}>Tendered Amount</label>
                            <div className="relative">
                                <span className={`absolute left-5 top-1/2 -translate-y-1/2 font-black text-xl ${darkMode ? 'text-gray-500' : 'text-slate-400'}`}>₹</span>
                                <input
                                    type="number"
                                    value={amountPaidInput}
                                    onChange={e => setAmountPaidInput(e.target.value)}
                                    className={`w-full border focus:border-indigo-500 rounded-xl py-4 pl-10 pr-6 text-2xl font-black outline-none transition-all tabular-nums ${darkMode ? 'bg-gray-950 border-gray-800 text-white' : 'bg-white border-slate-300 text-black shadow-inner'}`}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    )}

                    {/* Summary List */}
                    <div className={`border rounded-2xl p-5 space-y-3.5 ${darkMode ? 'bg-gray-950/50 border-gray-800' : 'bg-slate-50 border-slate-200'}`}>
                        <div className={`flex justify-between items-center text-[10px] font-black border-b pb-3 ${darkMode ? 'border-gray-800/50 text-gray-500' : 'border-slate-200 text-slate-500'}`}>
                            <span className="uppercase tracking-wider">Transaction Mode</span>
                            <span className={`${darkMode ? 'text-gray-200' : 'text-slate-900'} uppercase`}>{paymentMethod}</span>
                        </div>
                        {effectiveAmountPaid > 0 && (
                            <div className="flex justify-between items-center text-xs">
                                <span className={`${subTextColor} font-bold`}>Payment Received</span>
                                <span className="text-emerald-600 font-black tabular-nums">₹{effectiveAmountPaid.toLocaleString()}</span>
                            </div>
                        )}
                        {amountCredited > 0 && (
                            <div className="flex justify-between items-center text-xs">
                                <span className={`${subTextColor} font-bold`}>Credit Added</span>
                                <span className="text-rose-500 font-black tabular-nums">₹{amountCredited.toLocaleString()}</span>
                            </div>
                        )}
                        {changeDue > 0 && (
                            <div className={`flex justify-between items-center text-xs pt-3 border-t ${darkMode ? 'border-gray-800/50' : 'border-slate-200'}`}>
                                <span className={`${subTextColor} font-bold`}>Balance Return</span>
                                <span className="text-indigo-600 font-black tabular-nums">₹{changeDue.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Action */}
                <div className={`p-6 md:p-8 border-t ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'}`}>
                    {creditError && (
                        <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-3 items-center">
                            <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
                            <p className="text-[10px] font-black text-rose-500 uppercase leading-tight">{creditError.message}</p>
                        </div>
                    )}
                    <button
                        onClick={() => handleConfirmPayment(!!creditError)}
                        disabled={isSubmitting}
                        className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 ${
                            creditError ? 'bg-rose-600 hover:bg-rose-500' : 'bg-indigo-600 hover:bg-indigo-500'
                        } text-white shadow-xl shadow-indigo-600/20`}
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                {creditError ? 'Override Limit & Post' : 'Generate Invoice'}
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const Loader2 = ({ className }) => (
    <div className={`w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin ${className}`} />
);

export default PaymentModal;