import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
    CreditCard, IndianRupee, X, User, Search, 
    ShieldAlert, ChevronDown, ArrowRight,
    UserPlus, Banknote, Smartphone, Receipt, Plus, Phone, CheckCircle,
    UserCheck, History, Info
} from 'lucide-react'; 
import API from '../config/api'; 

export const WALK_IN_CUSTOMER = { id: 'walk_in', name: 'Walk-in Customer', outstandingCredit: 0, creditLimit: 0 };
export const ADD_NEW_CUSTOMER_ID = 'add_new';

const PaymentModal = ({ isOpen, onClose, totalAmount, allCustomers = [], processPayment, showToast, darkMode, onAddNewCustomer, apiClient }) => {
    const dropdownRef = useRef(null);
    const [localSelectedCustomer, setLocalSelectedCustomer] = useState(WALK_IN_CUSTOMER);
    const [amountPaidInput, setAmountPaidInput] = useState('');
    const [paymentType, setPaymentType] = useState('UPI'); 
    const [isDropdownOpen, setIsDropdownOpen] = useState(false); 
    const [searchTerm, setSearchTerm] = useState(''); 
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [creditError, setCreditError] = useState(null);

    // --- New Customer Form States ---
    const [isNewCustomerFormOpen, setIsNewCustomerFormOpen] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerPhone, setNewCustomerPhone] = useState('');
    const [newCustomerCreditLimit, setNewCustomerCreditLimit] = useState('');
    const [formErrors, setFormErrors] = useState({});

    // Only set defaults when modal opens. Do NOT re-run when user selects a customer—otherwise partial pay (Cash/UPI/Card + 200) would get overwritten to Credit + full amount.
    useEffect(() => {
        if (isOpen) {
            setAmountPaidInput(totalAmount.toString());
            setPaymentType('UPI');
            setSearchTerm(''); 
            setCreditError(null); 
            setIsNewCustomerFormOpen(false);
            setFormErrors({});
        }
    }, [isOpen, totalAmount]);

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
                // Keep the selected payment method (Cash, UPI, or Card)
                finalMethod = paymentType;
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
            { ...WALK_IN_CUSTOMER, display: 'Walk-in Customer' }
        ];
        const regular = (allCustomers || []).filter(c => (c._id || c.id) !== WALK_IN_CUSTOMER.id);
        regular.forEach(c => options.push({ ...c, id: c._id || c.id, display: c.name }));
        
        if (!searchTerm) return options;
        const q = searchTerm.toLowerCase();
        return options.filter(c => 
            c.name.toLowerCase().includes(q) || 
            (c.phone && c.phone.includes(q)) ||
            (c.mobile && c.mobile.includes(q))
        );
    }, [allCustomers, searchTerm]);

    const handleAddNewCustomerSubmit = async (e) => {
        e.preventDefault();
        const errors = {};
        if (!newCustomerName.trim()) errors.name = "Required";
        if (!newCustomerPhone.trim() || newCustomerPhone.length < 10) errors.phone = "Invalid Phone";
        if (!newCustomerCreditLimit || parseFloat(newCustomerCreditLimit) < 0) errors.limit = "Invalid Limit";

        if (Object.keys(errors).length > 0) return setFormErrors(errors);

        setIsSubmitting(true);
        try {
            const dataToSend = {
                name: newCustomerName.trim(),
                phone: newCustomerPhone.trim().replace(/[^0-9]/g, ''), 
                creditLimit: parseFloat(newCustomerCreditLimit), 
                initialDue: 0
            };
            const response = await apiClient.post(API.customers, dataToSend);
            if (response.data?.customer) {
                const newC = response.data.customer;
                showToast(`Customer "${newC.name}" added!`, 'success');
                setLocalSelectedCustomer(newC);
                setPaymentType('Credit');
                onAddNewCustomer(newC);
                setIsNewCustomerFormOpen(false);
            }
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to add customer', 'error');
        } finally { setIsSubmitting(false); }
    };

    const handleConfirmPayment = async (force = false) => {
        if (amountCredited > 0 && localSelectedCustomer.id === WALK_IN_CUSTOMER.id) {
            return showToast('Select a credit customer from the dropdown to finalize.', 'error');
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
        card: darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100',
        text: darkMode ? 'text-slate-200' : 'text-slate-800',
        muted: 'text-slate-500 font-black uppercase text-[9px] tracking-widest'
    };

    // --- Sub-Form: Add New Customer ---
    if (isNewCustomerFormOpen) {
        return (
            <div className="fixed inset-0 z-[200] flex justify-center items-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm">
                <div className={`${theme.bg} w-full max-w-md h-[85vh] sm:h-[80vh] max-h-[600px] rounded-xl sm:rounded-2xl border shadow-2xl overflow-hidden flex flex-col`}>
                    <div className="px-4 sm:px-5 py-3 sm:py-4 border-b flex justify-between items-center bg-inherit flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-emerald-500" />
                            <h2 className={`text-sm font-black uppercase tracking-tight ${theme.text}`}>Register Account</h2>
                        </div>
                        <button onClick={() => setIsNewCustomerFormOpen(false)} className="p-1 hover:bg-slate-500/10 rounded-md">
                            <X className="w-4 h-4 text-slate-500" />
                        </button>
                    </div>
                    <form onSubmit={handleAddNewCustomerSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
                        <div>
                            <label className={theme.muted}>Full Name</label>
                            <input type="text" value={newCustomerName} placeholder="Customer Name"
                                onChange={(e) => {setNewCustomerName(e.target.value); setFormErrors({...formErrors, name: null})}}
                                className={`w-full border rounded-lg py-2.5 px-3 text-[11px] font-bold outline-none mt-1 ${theme.input} ${formErrors.name ? 'border-rose-500 ring-1 ring-rose-500' : 'focus:border-emerald-500'}`}
                                style={{ fontSize: '16px' }}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={theme.muted}>Phone (10 Digits)</label>
                                <input type="tel" maxLength="10" value={newCustomerPhone} placeholder="9876..."
                                    onChange={(e) => {setNewCustomerPhone(e.target.value.replace(/[^0-9]/g, '')); setFormErrors({...formErrors, phone: null})}}
                                    className={`w-full border rounded-lg py-2.5 px-3 text-[11px] font-bold outline-none mt-1 ${theme.input} ${formErrors.phone ? 'border-rose-500 ring-1 ring-rose-500' : 'focus:border-emerald-500'}`}
                                    style={{ fontSize: '16px' }}
                                />
                            </div>
                            <div>
                                <label className={theme.muted}>Credit Limit</label>
                                <input type="number" value={newCustomerCreditLimit} placeholder="5000"
                                    onChange={(e) => {setNewCustomerCreditLimit(e.target.value); setFormErrors({...formErrors, limit: null})}}
                                    className={`w-full border rounded-lg py-2.5 px-3 text-[11px] font-bold outline-none mt-1 ${theme.input} ${formErrors.limit ? 'border-rose-500 ring-1 ring-rose-500' : 'focus:border-emerald-500'}`}
                                    style={{ fontSize: '16px' }}
                                />
                            </div>
                        </div>
                        <button type="submit" disabled={isSubmitting}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]">
                            {isSubmitting ? 'Creating...' : 'Save & Select Customer'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[200] flex justify-center items-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm">
            <div className={`${theme.bg} w-full max-w-md h-[85vh] sm:h-[80vh] max-h-[600px] rounded-xl sm:rounded-2xl border shadow-2xl overflow-hidden flex flex-col`}>
                
                {/* Header */}
                <div className="px-4 sm:px-5 py-3 sm:py-4 border-b flex justify-between items-center bg-inherit flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                            <Receipt className="w-4 h-4 text-indigo-500" />
                        </div>
                        <h2 className={`text-sm font-black uppercase tracking-tight ${theme.text}`}>Transaction Settlement</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-500/10 rounded-lg transition-colors">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                <div className="p-4 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
                    {/* Amount Banner */}
                    <div className={`p-4 rounded-xl border flex justify-between items-center ${darkMode ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                        <span className={theme.muted}>Final Payable</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-sm font-black text-indigo-500/60">₹</span>
                            <h3 className={`text-3xl font-black tracking-tighter ${theme.text}`}>{totalAmount.toLocaleString()}</h3>
                        </div>
                    </div>

                    {/* UPDATED DROPDOWN DESIGN */}
                    <div className="space-y-1.5" ref={dropdownRef}>
                        <div className="flex justify-between items-center px-1">
                            <label className={theme.muted}>Customer Account</label>
                            {localSelectedCustomer.id !== WALK_IN_CUSTOMER.id && (
                                <span className="text-[8px] font-black text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded uppercase">Credit Linked</span>
                            )}
                        </div>
                        
                        <div className="relative">
                            <button 
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                                className={`w-full border rounded-xl px-4 py-3 flex items-center justify-between text-left transition-all hover:border-indigo-500/50 ${theme.input} ${isDropdownOpen ? 'ring-2 ring-indigo-500/20 border-indigo-500' : ''}`}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${localSelectedCustomer.id === WALK_IN_CUSTOMER.id ? 'bg-slate-500/10' : 'bg-indigo-500/10'}`}>
                                        <User className={`w-4 h-4 ${localSelectedCustomer.id === WALK_IN_CUSTOMER.id ? 'text-slate-500' : 'text-indigo-500'}`} />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-[11px] font-black uppercase truncate">{localSelectedCustomer.name}</p>
                                        {localSelectedCustomer.id !== 'walk_in' && (
                                            <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[9px] opacity-60 font-bold">Balance: ₹{localSelectedCustomer.outstandingCredit || 0}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                                            <span className="text-[9px] opacity-60 font-bold">Limit: ₹{localSelectedCustomer.creditLimit || 0}</span>
                                        </div>
                                        )}
                                        
                                    </div>
                                </div>
                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-indigo-500' : 'opacity-30'}`} />
                            </button>

                            {isDropdownOpen && (
                                <div className={`absolute top-[calc(100%+6px)] left-0 w-full border rounded-2xl shadow-2xl z-[250] overflow-hidden ${theme.bg} animate-in fade-in slide-in-from-top-2 duration-200`}>
                                    {/* Dropdown Search */}
                                    <div className="p-3 border-b border-inherit bg-slate-500/5">
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-500/10">
                                            <Search className="w-3.5 h-3.5 text-slate-400" />
                                            <input 
                                                type="text" 
                                                inputMode="search"
                                                placeholder="Search by name or mobile..." 
                                                className="w-full bg-transparent text-[11px] font-bold outline-none"
                                                style={{ fontSize: '16px' }} // Prevents iOS/Mobile zoom
                                                value={searchTerm} 
                                                onChange={e => setSearchTerm(e.target.value)} 
                                            />
                                        </div>
                                    </div>

                                    {/* Action Item: Add New */}
                                    <button 
                                        onClick={() => { setIsNewCustomerFormOpen(true); setIsDropdownOpen(false); }}
                                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-emerald-500/10 transition-colors border-b border-inherit"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                                            <Plus className="w-4 h-4 text-emerald-500" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase text-emerald-600">Register New Account</span>
                                    </button>

                                    {/* Customer List */}
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
                                        {filteredOptions.length > 0 ? (
                                            filteredOptions.map(c => (
                                                <button 
                                                    key={c.id} 
                                                    onClick={() => {
                                                        setLocalSelectedCustomer(c);
                                                        setIsDropdownOpen(false);
                                                        // Only switch to UPI when selecting Walk-in (invalid to have Credit + Walk-in). Do NOT force Credit when selecting a credit customer—keep user's chosen method (e.g. Cash with partial pay).
                                                        if (c.id === WALK_IN_CUSTOMER.id) setPaymentType('UPI');
                                                    }}
                                                    className={`w-full px-4 py-2.5 flex items-center justify-between group transition-all hover:bg-indigo-500/5 ${localSelectedCustomer.id === c.id ? 'bg-indigo-500/10' : ''}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-2 h-2 rounded-full ${c.id === WALK_IN_CUSTOMER.id ? 'bg-slate-300' : 'bg-indigo-400 opacity-40 group-hover:opacity-100'}`} />
                                                        <div className="text-left">
                                                            <p className={`text-[10px] font-black uppercase ${localSelectedCustomer.id === c.id ? 'text-indigo-500' : ''}`}>{c.name}</p>
                                                            {c.phone && <p className="text-[8px] opacity-50 font-bold">{c.phone}</p>}
                                                        </div>
                                                    </div>
                                                    {!c.isAction && c.outstandingCredit > 0 && (
                                                        <div className="text-right">
                                                            <p className="text-[9px] font-black text-rose-500">₹{c.outstandingCredit}</p>
                                                            <p className="text-[7px] opacity-40 uppercase font-black">Due</p>
                                                        </div>
                                                    )}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-8 text-center">
                                                <Info className="w-5 h-5 text-slate-300 mx-auto mb-2" />
                                                <p className="text-[9px] font-black text-slate-400 uppercase">No accounts found</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment Selector - Credit is always selectable; user must pick a credit customer from dropdown before finalizing */}
                    <div className="space-y-1.5">
                        <label className={theme.muted}>Settlement Method</label>
                        <div className={`grid grid-cols-4 gap-1.5 p-1.5 rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                            {[
                                { id: 'Cash', icon: Banknote, color: 'text-emerald-500' },
                                { id: 'UPI', icon: Smartphone, color: 'text-indigo-500' },
                                { id: 'Card', icon: CreditCard, color: 'text-blue-500' },
                                { id: 'Credit', icon: Receipt, color: 'text-rose-500' }
                            ].map((m) => (
                                <button key={m.id} 
                                    onClick={() => { setPaymentType(m.id); setCreditError(null); }}
                                    className={`flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg text-[9px] font-black transition-all ${
                                        paymentType === m.id 
                                        ? 'bg-white shadow-md text-indigo-600 scale-[1.02]' 
                                        : 'opacity-40 hover:opacity-100 grayscale hover:grayscale-0'
                                    } ${darkMode && paymentType === m.id ? 'bg-slate-800 text-indigo-400' : ''}`}
                                >
                                    <m.icon className={`w-3.5 h-3.5 ${m.color}`} /> 
                                    <span className="uppercase tracking-widest">{m.id}</span>
                                </button>
                            ))}
                        </div>
                        {/* When Credit selected without customer, or partial pay (missed amount) without customer */}
                        {(paymentType === 'Credit' || amountCredited > 0.01) && localSelectedCustomer.id === WALK_IN_CUSTOMER.id && (
                            <p className="text-[10px] font-bold text-amber-600 flex items-center gap-1.5 pt-1">
                                <Info className="w-3.5 h-3.5 shrink-0" />
                                Select a credit customer from the dropdown above to finalize. {amountCredited > 0.01 ? `Remaining ₹${amountCredited.toFixed(0)} will be added to their ledger.` : ''}
                            </p>
                        )}
                    </div>

                    {/* Payment Amount: pay full or partial; remaining goes to customer ledger (missed payment) */}
                    {paymentType !== 'Credit' && (
                        <div className="space-y-1.5">
                            <label className={theme.muted}>Payment Amount</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xs text-slate-400 group-focus-within:text-indigo-500 transition-colors">₹</span>
                                <input 
                                    type="number" 
                                    value={amountPaidInput} 
                                    onChange={e => {setAmountPaidInput(e.target.value); setCreditError(null);}}
                                    className={`w-full border rounded-xl py-3.5 pl-8 pr-4 text-sm font-black outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 ${theme.input}`}
                                    style={{ fontSize: '16px' }}
                                />
                            </div>
                            <p className="text-[9px] font-bold text-slate-500 flex items-center gap-1">
                                <Info className="w-3 h-3 shrink-0" />
                                Pay what you can; remaining will be added to the customer&apos;s ledger. Select a customer above for partial payment.
                            </p>
                        </div>
                    )}

                    {/* Summary Card */}
                    <div className={`rounded-xl p-4 border space-y-3 text-[10px] font-black uppercase tracking-wider ${theme.card}`}>
                        <div className="flex justify-between items-center">
                            <span className="opacity-60">Transaction Mode</span>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] ${backendMethod === 'Mixed' ? 'bg-orange-500/10 text-orange-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                {backendMethod} 
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="opacity-60">Amount Paid</span>
                            <span className={theme.text}>₹{effectiveAmountPaid.toLocaleString()}</span>
                        </div>
                        
                        {amountCredited > 0.01 && (
                            <div className="flex justify-between items-center text-rose-500 pt-1 border-t border-inherit">
                                <span>Balance to Khata</span>
                                <span className="text-xs">₹{amountCredited.toLocaleString()}</span>
                            </div>
                        )}
                        
                        {changeDue > 0.01 && (
                            <div className="flex justify-between items-center text-emerald-500 pt-1 border-t border-inherit">
                                <span>Change Return</span>
                                <span className="text-xs">₹{changeDue.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Action */}
                <div className="px-4 sm:px-5 pb-3 sm:pb-4 pt-2 flex-shrink-0">
                    {creditError && (
                        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-3 items-start animate-pulse">
                            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <div className="flex flex-col">
                                <p className="text-[9px] font-black text-rose-500 uppercase leading-none">Credit Limit Blocked</p>
                                <p className="text-[8px] text-rose-400 uppercase mt-1.5 leading-relaxed">{creditError.message}</p>
                            </div>
                        </div>
                    )}
                    
                    <button 
                        onClick={() => handleConfirmPayment(!!creditError)} 
                        disabled={isSubmitting || (amountCredited > 0.01 && localSelectedCustomer.id === WALK_IN_CUSTOMER.id)}
                        className={`w-full py-3 sm:py-4 rounded-xl font-black uppercase text-[9px] sm:text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 sm:gap-3 transition-all active:scale-[0.97] shadow-xl ${
                            creditError 
                                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20' 
                                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                        } text-white disabled:opacity-50`}
                    >
                        {isSubmitting ? (
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span className="hidden sm:inline">{creditError ? 'Bypass & Process' : 'Finalize Transaction'}</span>
                                <span className="sm:hidden">{creditError ? 'Bypass' : 'Finalize'}</span>
                                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;