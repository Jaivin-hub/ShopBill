import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
    CreditCard, IndianRupee, X, User, Search, 
    ShieldAlert, ChevronDown, Wallet, ArrowRight,
    UserPlus, Banknote, Smartphone, Receipt, Scale, Plus
} from 'lucide-react'; 

export const WALK_IN_CUSTOMER = { id: 'walk_in', name: 'Walk-in Customer', outstandingCredit: 0, creditLimit: 0 };
export const ADD_NEW_CUSTOMER_ID = 'add_new';

const PaymentModal = ({ isOpen, onClose, totalAmount, allCustomers = [], processPayment, showToast, darkMode, onAddNewCustomer }) => {
    const dropdownRef = useRef(null);
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

    // Handle Clicks Outside Dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsDropdownOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const { amountCredited, changeDue, backendMethod, effectiveAmountPaid } = useMemo(() => {
        let amtCred = 0, chgDue = 0, effPaid = 0;
        let finalMethod = paymentType;
        const total = parseFloat(totalAmount) || 0;
        const paid = parseFloat(amountPaidInput) || 0;

        if (paymentType === 'Credit') {
            amtCred = total;
            effPaid = 0;
            finalMethod = 'Credit';
        } else {
            if (paid >= total) {
                effPaid = total; 
                chgDue = paid - total;
                amtCred = 0;
            } else {
                effPaid = paid;
                amtCred = total - paid;
                finalMethod = paid > 0 ? 'Mixed' : 'Credit';
            }
        }
        return { amountCredited: amtCred, changeDue: chgDue, backendMethod: finalMethod, effectiveAmountPaid: effPaid };
    }, [amountPaidInput, totalAmount, paymentType]);

    const filteredOptions = useMemo(() => {
        const options = [
            { id: ADD_NEW_CUSTOMER_ID, name: 'Register New Account', isAction: true },
            { ...WALK_IN_CUSTOMER }
        ];
        const regular = (allCustomers || []).filter(c => (c._id || c.id) !== WALK_IN_CUSTOMER.id);
        regular.forEach(c => options.push({ ...c, id: c._id || c.id }));
        
        if (!searchTerm) return options;
        const q = searchTerm.toLowerCase();
        return options.filter(c => c.name.toLowerCase().includes(q));
    }, [allCustomers, searchTerm]);

    const handleConfirmPayment = async (force = false) => {
        if (amountCredited > 0 && localSelectedCustomer.id === WALK_IN_CUSTOMER.id) {
            return showToast(`Select a customer for Credit.`, 'error');
        }
        setIsSubmitting(true);
        try {
            await processPayment(effectiveAmountPaid, amountCredited, backendMethod, localSelectedCustomer, force);
            setCreditError(null);
            onClose();
        } catch (error) {
            const msg = error.response?.data?.error || error.response?.data?.message || 'Failed';
            if (msg.toLowerCase().includes('limit')) setCreditError({ message: msg });
            else showToast(msg, 'error');
        } finally { setIsSubmitting(false); }
    };

    if (!isOpen) return null;

    const theme = {
        bg: darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200',
        input: darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900',
        text: darkMode ? 'text-slate-200' : 'text-slate-800',
        muted: 'text-slate-500 font-bold uppercase text-[9px] tracking-widest'
    };

    return (
        <div className="fixed inset-0 z-[200] flex justify-center items-center px-4 bg-slate-950/60 backdrop-blur-sm">
            <div className={`${theme.bg} w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col`}>
                
                {/* Header: Compact */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-inherit">
                    <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-indigo-500" />
                        <h2 className={`text-sm font-black uppercase tracking-tight ${theme.text}`}>Settlement</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-500/10 rounded-md transition-colors">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {/* Total Amount: Slimmed down */}
                    <div className={`p-4 rounded-xl border flex justify-between items-end ${darkMode ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                        <div>
                            <span className={theme.muted}>Payable Amount</span>
                            <div className="flex items-center gap-1">
                                <span className="text-xl font-black text-indigo-500">₹</span>
                                <h3 className={`text-3xl font-black tracking-tighter ${theme.text}`}>{totalAmount.toLocaleString()}</h3>
                            </div>
                        </div>
                    </div>

                    {/* Customer Dropdown: Professional Density */}
                    <div className="space-y-1.5" ref={dropdownRef}>
                        <label className={theme.muted}>Customer</label>
                        <div className="relative">
                            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                                className={`w-full border rounded-lg px-3 py-2.5 flex items-center justify-between text-left transition-all ${theme.input}`}>
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-7 h-7 rounded-md bg-indigo-500/10 flex items-center justify-center shrink-0">
                                        <User className="w-3.5 h-3.5 text-indigo-500" />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-[11px] font-black uppercase truncate">{localSelectedCustomer.name}</p>
                                        <p className="text-[9px] opacity-60 font-bold">Due: ₹{localSelectedCustomer.outstandingCredit || 0}</p>
                                    </div>
                                </div>
                                <ChevronDown className="w-3.5 h-3.5 opacity-40" />
                            </button>

                            {isDropdownOpen && (
                                <div className={`absolute top-full left-0 w-full mt-1 border rounded-xl shadow-xl z-50 overflow-hidden ${theme.bg}`}>
                                    <div className="p-2 border-b border-inherit bg-slate-500/5">
                                        <input autoFocus type="text" placeholder="Filter..." 
                                            className="w-full bg-transparent text-[10px] font-bold p-1 outline-none"
                                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                    </div>
                                    <div className="max-h-48 overflow-y-auto custom-scroll">
                                        {filteredOptions.map(c => (
                                            <div key={c.id} 
                                                onClick={() => {
                                                    if (c.isAction) {
                                                        onAddNewCustomer(); // Trigger your existing function
                                                        setIsDropdownOpen(false);
                                                    } else {
                                                        setLocalSelectedCustomer(c);
                                                        setIsDropdownOpen(false);
                                                    }
                                                }}
                                                className={`px-3 py-2 border-b last:border-0 cursor-pointer flex justify-between items-center hover:bg-indigo-500/10 transition-colors`}>
                                                <div className="flex items-center gap-2">
                                                    {c.isAction ? <Plus className="w-3 h-3 text-emerald-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
                                                    <span className={`text-[10px] font-black uppercase ${c.isAction ? 'text-emerald-500' : ''}`}>{c.name}</span>
                                                </div>
                                                {!c.isAction && c.outstandingCredit > 0 && (
                                                    <span className="text-[9px] font-black text-rose-500">₹{c.outstandingCredit}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment Selector: High Tech Grid */}
                    <div className="space-y-1.5">
                        <label className={theme.muted}>Method</label>
                        <div className={`grid grid-cols-3 gap-1.5 p-1 rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                            {[
                                { id: 'UPI', icon: Smartphone, color: 'text-indigo-500' },
                                { id: 'Cash', icon: Banknote, color: 'text-emerald-500' },
                                { id: 'Credit', icon: CreditCard, color: 'text-rose-500' }
                            ].map((m) => (
                                <button key={m.id} disabled={m.id === 'Credit' && localSelectedCustomer.id === 'walk_in'}
                                    onClick={() => setPaymentType(m.id)}
                                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black transition-all ${
                                        paymentType === m.id ? 'bg-white shadow-sm text-indigo-600 scale-[1.02]' : 'opacity-40 hover:opacity-100'
                                    } ${darkMode && paymentType === m.id ? 'bg-slate-800 text-indigo-400' : ''}`}>
                                    <m.icon className={`w-3 h-3 ${m.color}`} /> {m.id}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Received Input: Balanced Size */}
                    {paymentType !== 'Credit' && (
                        <div className="space-y-1.5">
                            <label className={theme.muted}>Tendered Amount</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-xs text-slate-400">₹</span>
                                <input type="number" value={amountPaidInput} onChange={e => setAmountPaidInput(e.target.value)}
                                    className={`w-full border rounded-lg py-2.5 pl-7 pr-3 text-sm font-black outline-none transition-all focus:border-indigo-500 ${theme.input}`}
                                />
                            </div>
                        </div>
                    )}

                    {/* Summary Card: Dense information */}
                    <div className={`rounded-xl p-3 border space-y-2 text-[10px] font-black uppercase tracking-wider ${darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex justify-between items-center opacity-50">
                            <span>Backend Tag</span>
                            <span className="text-indigo-500">{backendMethod}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="opacity-60">Received</span>
                            <span className={theme.text}>₹{effectiveAmountPaid.toLocaleString()}</span>
                        </div>
                        {amountCredited > 0 && (
                            <div className="flex justify-between items-center text-rose-500">
                                <span>Due to Khata</span>
                                <span>₹{amountCredited.toLocaleString()}</span>
                            </div>
                        )}
                        {changeDue > 0 && (
                            <div className="flex justify-between items-center text-emerald-500 pt-1 border-t border-dashed border-inherit">
                                <span>Balance Return</span>
                                <span>₹{changeDue.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Action: Single Strong Button */}
                <div className="px-5 pb-5 pt-2">
                    {creditError && (
                        <div className="mb-3 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg flex gap-2 items-center">
                            <ShieldAlert className="w-3 h-3 text-rose-500" />
                            <p className="text-[8px] font-black text-rose-500 uppercase leading-none">{creditError.message}</p>
                        </div>
                    )}
                    <button onClick={() => handleConfirmPayment(!!creditError)} disabled={isSubmitting}
                        className={`w-full py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                            creditError ? 'bg-rose-600' : 'bg-indigo-600 shadow-lg shadow-indigo-500/20'
                        } text-white`}>
                        {isSubmitting ? (
                            <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                {creditError ? 'Bypass Limit' : 'Confirm & Invoice'}
                                <ArrowRight className="w-3 h-3" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;