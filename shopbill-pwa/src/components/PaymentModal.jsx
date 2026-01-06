import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
    CreditCard, IndianRupee, X, User, Search, 
    ShieldAlert, ChevronDown, Wallet, ArrowRight,
    Activity, Info, Layers
} from 'lucide-react'; 

export const WALK_IN_CUSTOMER = { id: 'walk_in', name: 'Walk-in Customer', outstandingCredit: 0, creditLimit: 0 };
export const ADD_NEW_CUSTOMER_ID = 'add_new';

const PaymentModal = ({ isOpen, onClose, totalAmount, allCustomers = [], processPayment, showToast }) => {
    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null); 
    
    const [localSelectedCustomer, setLocalSelectedCustomer] = useState(WALK_IN_CUSTOMER);
    const [amountPaidInput, setAmountPaidInput] = useState('');
    const [paymentType, setPaymentType] = useState('UPI'); // 'UPI' (covers Cash/Digital) or 'Credit'
    const [isDropdownOpen, setIsDropdownOpen] = useState(false); 
    const [searchTerm, setSearchTerm] = useState(''); 
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [creditError, setCreditError] = useState(null);

    // Synchronize input when modal opens or total changes
    useEffect(() => {
        if (isOpen) {
            setAmountPaidInput(totalAmount.toString());
            setPaymentType(localSelectedCustomer.id !== WALK_IN_CUSTOMER.id ? 'Credit' : 'UPI');
            setSearchTerm(''); 
            setCreditError(null); 
        }
    }, [isOpen, totalAmount, localSelectedCustomer.id]);

    // UI Click logic
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

    // --- LOGIC ENGINE ---
    const { amountCredited, changeDue, paymentMethod, effectiveAmountPaid } = useMemo(() => {
        let amtCred = 0;
        let chgDue = 0;
        let effPaid = 0;
        let method = 'UPI';

        if (paymentType === 'Credit') {
            // Full amount goes to Khata
            amtCred = totalAmount;
            effPaid = 0;
            method = 'Credit';
        } else {
            // User is on "Direct" mode but might pay partially or extra
            effPaid = enteredPaid;
            if (enteredPaid >= totalAmount) {
                chgDue = enteredPaid - totalAmount;
                amtCred = 0;
                method = 'UPI';
            } else {
                // Partial Payment Logic
                amtCred = totalAmount - enteredPaid;
                method = enteredPaid > 0 ? 'Mixed' : 'Credit';
            }
        }

        return { amountCredited: amtCred, changeDue: chgDue, paymentMethod: method, effectiveAmountPaid: effPaid };
    }, [enteredPaid, totalAmount, paymentType]);

    const newKhataBalance = khataDue + amountCredited;
    const creditUsagePercent = creditLimit > 0 ? (newKhataBalance / creditLimit) * 100 : 0;

    const filteredOptions = useMemo(() => {
        const options = [
            { id: ADD_NEW_CUSTOMER_ID, key: ADD_NEW_CUSTOMER_ID, name: 'Add New Customer', display: 'Add New Credit Account...', outstandingCredit: 0 },
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
            return showToast('Select a customer to record partial credit/Khata', 'error');
        }
        
        setIsSubmitting(true);
        try {
            // We pass the calculated values to the parent processPayment function
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

    return (
        <div className="fixed inset-0 bg-gray-950/90 z-[200] flex justify-center items-start pt-6 md:pt-12 px-4 backdrop-blur-xl overflow-y-auto pb-10">
            <div className="bg-gray-900 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] w-full max-w-lg border border-gray-800 overflow-hidden transition-all animate-in slide-in-from-top-4">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-800 flex justify-between items-center bg-gray-950/40">
                    <div>
                        <div className="flex items-center gap-2 text-indigo-500 mb-1">
                            <Activity className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-black uppercase tracking-[0.3em]">Execution Terminal</span>
                        </div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Finalize <span className="text-indigo-500">Settlement</span></h2>
                    </div>
                    <button onClick={onClose} className="p-3 bg-gray-900 border border-gray-800 text-gray-500 rounded-2xl hover:text-white transition-all active:scale-90">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {/* Customer Identity Selection */}
                    <div className="relative" ref={dropdownRef}>
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block ml-1">Client Authorization</label>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full bg-gray-950 border border-gray-800 rounded-2xl px-5 py-4 flex items-center justify-between group transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${localSelectedCustomer.id === 'walk_in' ? 'bg-gray-800 text-gray-600' : 'bg-indigo-600 text-white'}`}>
                                    <User className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[13px] font-black text-white uppercase">{localSelectedCustomer.name}</p>
                                    {localSelectedCustomer.id !== 'walk_in' && (
                                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                                            Limit: ₹{creditLimit} • Bal: ₹{khataDue}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute top-[110%] left-0 w-full bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl z-[210] overflow-hidden animate-in fade-in zoom-in-95">
                                <div className="p-3 bg-gray-950/50 border-b border-gray-800">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            placeholder="FILTER CLIENT REGISTRY..."
                                            className="w-full bg-gray-900 border border-gray-800 rounded-xl py-3 pl-12 text-[10px] font-black uppercase text-white outline-none"
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="max-h-60 overflow-y-auto p-2">
                                    {filteredOptions.map(c => (
                                        <div 
                                            key={c.key} 
                                            onClick={() => { setLocalSelectedCustomer(c); setIsDropdownOpen(false); }}
                                            className="px-4 py-3 hover:bg-indigo-600/10 rounded-xl cursor-pointer flex justify-between items-center transition-all"
                                        >
                                            <span className={`text-[11px] font-black uppercase ${c.id === ADD_NEW_CUSTOMER_ID ? 'text-emerald-400' : 'text-gray-300'}`}>{c.display}</span>
                                            {c.outstandingCredit > 0 && <span className="text-[9px] font-black text-rose-500 tabular-nums">₹{c.outstandingCredit}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Financial Summary Card */}
                    <div className="bg-indigo-600 rounded-[2rem] p-8 shadow-xl relative overflow-hidden group">
                        <div className="relative z-10 flex justify-between items-center">
                            <div>
                                <p className="text-[9px] font-black text-indigo-100 uppercase tracking-[0.2em] mb-1">Settlement Total</p>
                                <h3 className="text-5xl font-black text-white italic tracking-tighter">
                                    <span className="text-2xl mr-1 not-italic opacity-50">₹</span>{totalAmount.toLocaleString()}
                                </h3>
                            </div>
                            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/5">
                                <IndianRupee className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                    </div>

                    {/* Payment Mode Selector */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-gray-950 border border-gray-800 rounded-2xl">
                        <button
                            onClick={() => setPaymentType('UPI')}
                            className={`py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${paymentType === 'UPI' ? 'bg-gray-800 text-emerald-400 border border-gray-700 shadow-lg' : 'text-gray-600'}`}
                        >
                            Direct Payment
                        </button>
                        <button
                            onClick={() => setPaymentType('Credit')}
                            disabled={localSelectedCustomer.id === 'walk_in'}
                            className={`py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${paymentType === 'Credit' ? 'bg-gray-800 text-rose-500 border border-gray-700 shadow-lg' : 'text-gray-600 disabled:opacity-20'}`}
                        >
                            Credit (Khata)
                        </button>
                    </div>

                    {/* Input Field - Shows only if not forced full credit */}
                    {paymentType === 'UPI' && (
                        <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-300">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Capital Received</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={amountPaidInput}
                                    onChange={e => setAmountPaidInput(e.target.value)}
                                    className="w-full bg-gray-950 border border-gray-800 focus:border-indigo-500 rounded-2xl py-5 px-6 text-3xl font-black text-white italic outline-none transition-all tabular-nums"
                                    placeholder="0.00"
                                />
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-700 font-black text-xs uppercase tracking-tighter">INR Buffer</div>
                            </div>
                        </div>
                    )}

                    {/* Transaction Manifest (The logic result) */}
                    <div className="p-5 bg-gray-950/50 border border-gray-800 rounded-2xl space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Type</span>
                            <span className="text-[10px] font-black text-white uppercase">{paymentMethod}</span>
                        </div>
                        {effectiveAmountPaid > 0 && (
                            <div className="flex justify-between items-center text-emerald-500">
                                <span className="text-[9px] font-black uppercase tracking-widest">Received Cash</span>
                                <span className="text-sm font-black italic">₹{effectiveAmountPaid.toLocaleString()}</span>
                            </div>
                        )}
                        {amountCredited > 0 && (
                            <div className="flex justify-between items-center text-rose-500">
                                <span className="text-[9px] font-black uppercase tracking-widest">Ledger (Debt)</span>
                                <span className="text-sm font-black italic">₹{amountCredited.toLocaleString()}</span>
                            </div>
                        )}
                        {changeDue > 0 && (
                            <div className="flex justify-between items-center text-indigo-400">
                                <span className="text-[9px] font-black uppercase tracking-widest">Refund Due</span>
                                <span className="text-sm font-black italic">₹{changeDue.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-8 bg-gray-950/60 border-t border-gray-800">
                    {creditError && (
                        <div className="mb-6 p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl flex gap-4 items-center animate-pulse">
                            <ShieldAlert className="w-5 h-5 text-rose-500" />
                            <p className="text-[10px] font-black text-rose-500 uppercase leading-relaxed">{creditError.message}</p>
                        </div>
                    )}
                    <button
                        onClick={() => handleConfirmPayment(!!creditError)}
                        disabled={isSubmitting}
                        className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl ${
                            creditError ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/30' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/40'
                        } text-white`}
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                {creditError ? 'Force Bypass Registry' : 'Commit Transaction'}
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;