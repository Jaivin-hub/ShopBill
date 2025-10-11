import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CreditCard, DollarSign, X, User, List, UserPlus, CornerDownRight, Search } from 'lucide-react'; 

// Default Walk-in Customer for UPI sales
export const WALK_IN_CUSTOMER = { id: 'walk_in', name: 'Walk-in Customer', outstandingCredit: 0, creditLimit: 0 };
export const ADD_NEW_CUSTOMER_ID = 'add_new'; // Special ID for the "Add New" option

/**
 * Sub-component for Payment Modal: Handles Cash, Full Credit, or Partial/Mixed Payments
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {function} props.onClose
 * @param {number} props.totalAmount
 * @param {object[]} props.allCustomers - Full list of customers including WALK_IN_CUSTOMER
 * @param {function} props.processPayment - (amountPaid, amountCredited, paymentMethod, finalCustomer) => void
 * @param {function} props.showToast
 * @param {function} props.onAddNewCustomer - Function to call when "Add New Credit Customer" is selected.
 */
const PaymentModal = ({ isOpen, onClose, totalAmount, allCustomers = [], processPayment, showToast, onAddNewCustomer }) => {
    // 1-2. Refs
    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null); 
    
    // 3-7. State
    const [localSelectedCustomer, setLocalSelectedCustomer] = useState(WALK_IN_CUSTOMER);
    const [amountPaidInput, setAmountPaidInput] = useState(totalAmount.toFixed(2));
    const [paymentType, setPaymentType] = useState('UPI');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false); 
    const [searchTerm, setSearchTerm] = useState(''); 


    // 8. useEffect - Reset state when modal opens/total changes
    useEffect(() => {
        if (isOpen) {
            setAmountPaidInput(totalAmount.toFixed(2));
            setPaymentType('UPI');
            setLocalSelectedCustomer(WALK_IN_CUSTOMER); 
            setSearchTerm(''); 
        }
    }, [isOpen, totalAmount]);
    
    // 9. useEffect - Close dropdown if user clicks outside and autofocus search when opened
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        
        if (isDropdownOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 10);
        }

        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isDropdownOpen]);


    const khataDue = localSelectedCustomer.outstandingCredit || 0;
    const isCreditCustomerSelected = localSelectedCustomer.id !== WALK_IN_CUSTOMER.id;
    const amountPaid = parseFloat(amountPaidInput) || 0;
    
    // 10. useEffect - Credit payment check
    useEffect(() => {
        if (paymentType === 'Credit' && !isCreditCustomerSelected) {
            setPaymentType('UPI');
            showToast('Select a credit customer first to use the "Full Khata" option.', 'info');
        }
    }, [paymentType, isCreditCustomerSelected, showToast]);


    // 11. useMemo - Calculations based on user input
    const {
        amountCredited, 
        changeDue,      
        newKhataBalance, 
        paymentMethod    
    } = useMemo(() => {
        const total = totalAmount;

        let amountCredited = 0;
        let changeDue = 0;
        let method = paymentType;
        
        if (paymentType === 'Credit') {
            amountCredited = total;
            method = 'Credit';
        }
        else {
            if (amountPaid >= total) {
                changeDue = amountPaid - total;
                method = 'UPI';
            } else if (amountPaid > 0 && amountPaid < total) {
                amountCredited = total - amountPaid;
                method = 'Mixed';
            } else if (amountPaid === 0 && total > 0) {
                 amountCredited = total;
                 method = 'Credit';
            }
        }
        
        const newKhataBalance = khataDue + amountCredited;

        return { amountCredited, changeDue, newKhataBalance, paymentMethod: method };
    }, [amountPaid, totalAmount, paymentType, khataDue]);


    // --- Customer Options Memoization and Filtering ---
    // 12. useMemo - HOOK 12 (MOVED UP TO FIX THE ERROR)
    const filteredOptions = useMemo(() => {
        const options = [];
        
        // 1. Build the full list (allOptions logic)
        options.push({ 
            id: ADD_NEW_CUSTOMER_ID, 
            key: ADD_NEW_CUSTOMER_ID, 
            name: 'Add New Credit Customer', 
            display: '➕ Add New Credit Customer...', 
            outstandingCredit: 0 
        });
        options.push({ 
            ...WALK_IN_CUSTOMER,
            key: WALK_IN_CUSTOMER.id,
            display: 'Walk-in Customer'
        });

        // Add actual customers from props
        const regularCustomers = (allCustomers || []).filter(c => (c._id || c.id) !== WALK_IN_CUSTOMER.id);

        regularCustomers.forEach(c => {
             options.push({
                ...c, 
                key: c._id || c.id, 
                display: `${c.name} ${c.outstandingCredit > 0 ? `(DUE: ₹${c.outstandingCredit.toFixed(0)})` : ''}`
            });
        });
        
        // 2. Filter the list (filteredOptions logic)
        if (!searchTerm) {
            return options; // Return the full list if no search term
        }
        
        const lowerCaseSearch = searchTerm.toLowerCase();
        
        // Always include 'Add New' and 'Walk-in' at the top
        const specialOptions = options.slice(0, 2); 
        const searchableCustomers = options.slice(2); 
        
        const filteredCustomers = searchableCustomers.filter(c => 
            c.name.toLowerCase().includes(lowerCaseSearch) || 
            (c.phone && c.phone.includes(searchTerm)) || 
            (c.mobile && c.mobile.includes(searchTerm))
        );
        
        return [...specialOptions, ...filteredCustomers];
    }, [allCustomers, searchTerm]); // Now only depends on props and search term


    // Handle selection from the custom list
    const handleCustomerSelect = (customer) => {
        setIsDropdownOpen(false); 
        setSearchTerm(''); 
        
        if (customer.id === ADD_NEW_CUSTOMER_ID) {
            onAddNewCustomer(); 
            return;
        }
        
        setLocalSelectedCustomer(customer);
        
        if (customer.id === WALK_IN_CUSTOMER.id && paymentType === 'Credit') {
            setPaymentType('UPI');
        }
    };


    const handleConfirmPayment = () => {
        if (totalAmount <= 0) {
            showToast('Cart is empty. Cannot process payment.', 'error');
            return;
        }

        if (amountCredited > 0 && localSelectedCustomer.id === WALK_IN_CUSTOMER.id) {
            showToast('Please select a specific customer to add the remaining amount to Khata/Credit.', 'error');
            return;
        }

        if (amountPaid < 0) {
             showToast('Amount paid cannot be negative.', 'error');
             return;
        }
        
        processPayment(amountPaid, amountCredited, paymentMethod, localSelectedCustomer);
    };


    // Conditional Render: MUST be after all hooks (Hooks 1-12)
    if (!isOpen) return null;


    // Styling for the currently selected display
    const currentCustomerDisplay = 
        localSelectedCustomer.id === WALK_IN_CUSTOMER.id 
            ? WALK_IN_CUSTOMER.name
            : localSelectedCustomer.name + 
              (localSelectedCustomer.outstandingCredit > 0 
                ? ` (DUE: ₹${localSelectedCustomer.outstandingCredit.toFixed(0)})` 
                : '');
    
    const isWalkInSelected = localSelectedCustomer.id === WALK_IN_CUSTOMER.id;


    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-85 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100 border border-indigo-700">
                
                {/* Modal Header */}
                <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white flex items-center">
                        <DollarSign className="w-6 h-6 text-teal-400 mr-2" />
                        Process Payment
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 space-y-5">
                    
                    {/* CUSTOM Customer Selection Dropdown with Search */}
                    <div className="relative" ref={dropdownRef}>
                        <h3 className="text-sm font-semibold flex items-center text-gray-300 mb-2">
                            <User className="w-4 h-4 mr-1 text-teal-400" /> Bill To Customer:
                        </h3>
                        
                        {/* Custom Dropdown Input/Button */}
                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`w-full px-4 py-3 border rounded-lg text-base font-semibold pr-10 transition-colors shadow-inner flex justify-between items-center 
                                ${isDropdownOpen ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-indigo-600'}
                                ${isWalkInSelected ? 'bg-gray-600 text-white' : 'bg-gray-700 text-white'}
                            `}
                        >
                            <span className="truncate">{currentCustomerDisplay}</span>
                            <List className="w-5 h-5 ml-2 text-indigo-400" />
                        </button>
                        
                        {/* Custom Dropdown List (Styled <div>) */}
                        {isDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 rounded-lg shadow-2xl bg-gray-700 border border-indigo-500 max-h-60 overflow-y-auto">
                                
                                {/* Search Input Field */}
                                <div className="p-2 sticky top-0 bg-gray-700 border-b border-gray-600">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            placeholder="Search name or mobile..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white border border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                            onClick={(e) => e.stopPropagation()} // Prevent closing dropdown when clicking search
                                        />
                                    </div>
                                </div>
                                
                                {/* List of Filtered Options */}
                                {filteredOptions.length > 0 ? (
                                    filteredOptions.map((customer) => (
                                        <div
                                            key={customer.key}
                                            onClick={() => handleCustomerSelect(customer)}
                                            className={`px-4 py-3 cursor-pointer text-sm font-medium transition-colors border-b border-gray-600 last:border-b-0 flex items-center justify-between
                                                ${customer.id === ADD_NEW_CUSTOMER_ID 
                                                    ? 'bg-teal-800/70 text-teal-300 hover:bg-teal-700 font-bold' // Add New (distinctive color)
                                                    : customer.id === localSelectedCustomer.id // Selected customer
                                                        ? 'bg-indigo-600 text-white' 
                                                        : customer.id === WALK_IN_CUSTOMER.id
                                                            ? 'bg-gray-600 text-white hover:bg-gray-500 font-bold' // Walk-in
                                                            : 'text-gray-200 hover:bg-gray-600' // Default
                                                }
                                            `}
                                        >
                                            <span className="truncate">
                                                {customer.id === ADD_NEW_CUSTOMER_ID && <UserPlus className="w-4 h-4 inline mr-2" />}
                                                {customer.id === WALK_IN_CUSTOMER.id && <CornerDownRight className="w-4 h-4 inline mr-2" />}
                                                {customer.id !== ADD_NEW_CUSTOMER_ID && customer.id !== WALK_IN_CUSTOMER.id && <User className="w-4 h-4 inline mr-2 text-indigo-300" />}
                                                {customer.display}
                                            </span>
                                            {/* Only show SELECTED for the *actual* localSelectedCustomer */}
                                            {customer.id === localSelectedCustomer.id && (
                                                <span className="text-xs font-bold text-teal-300">✓ SELECTED</span>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-4 py-3 text-sm text-gray-400">
                                        No customer found matching "{searchTerm}".
                                    </div>
                                )}
                            </div>
                        )}
                    </div>


                    {/* Total Due */}
                    <div className="p-4 bg-indigo-900/60 rounded-xl shadow-xl border border-indigo-600">
                        <p className="flex justify-between items-center text-xl font-medium text-gray-200">
                            <span>Sale Total:</span>
                            <span className="text-4xl font-extrabold text-teal-400">₹{totalAmount.toFixed(2)}</span>
                        </p>
                    </div>

                    {/* Khata Status */}
                    {isCreditCustomerSelected && (
                        <div className="flex justify-between items-center p-2 border-b border-gray-700 text-sm">
                            <span className="font-medium text-gray-300">Customer Outstanding Khata:</span>
                            <span className={`font-bold ${khataDue > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                ₹${khataDue.toFixed(2)}
                            </span>
                        </div>
                    )}
                    
                    {/* Payment Type Toggle (Full Credit vs Cash/Mixed) */}
                    <div className="flex rounded-xl overflow-hidden shadow-2xl">
                        <button
                            onClick={() => setPaymentType('UPI')}
                            className={`flex-1 py-3 text-center font-bold text-lg transition-all duration-200 ${
                                paymentType === 'UPI' 
                                    ? 'bg-teal-600 text-white shadow-inner shadow-teal-900' 
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        >
                            <DollarSign className="w-5 h-5 inline-block mr-1" /> Cash / Mixed
                        </button>
                        <button
                            onClick={() => setPaymentType('Credit')}
                            disabled={!isCreditCustomerSelected}
                            className={`flex-1 py-3 text-center font-bold text-lg transition-all duration-200 ${
                                paymentType === 'Credit' 
                                    ? 'bg-red-600 text-white shadow-inner shadow-red-900' 
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={!isCreditCustomerSelected ? 'Requires a selected customer other than Walk-in' : ''}
                        >
                            <CreditCard className="w-5 h-5 inline-block mr-1" /> Full Khata
                        </button>
                    </div>

                    {/* Amount Paid Input (Visible only for Cash/Mixed) */}
                    {paymentType === 'UPI' && (
                        <div className="space-y-2">
                            <label htmlFor="amount-paid" className="block text-sm font-medium text-gray-300">Amount Received (UPI)</label>
                            <input
                                id="amount-paid"
                                type="number"
                                step="0.01"
                                value={amountPaidInput}
                                onChange={(e) => setAmountPaidInput(e.target.value)}
                                className="w-full p-4 border-2 border-teal-600 bg-gray-700 text-teal-400 rounded-xl text-3xl font-extrabold focus:ring-teal-500 focus:border-teal-500 shadow-xl transition-colors"
                                placeholder={totalAmount.toFixed(2)}
                                autoFocus
                            />
                        </div>
                    )}
                    
                    {/* Transaction Summary */}
                    <div className="pt-2 space-y-3">
                        {/* Change Due (Cash Overpayment) */}
                        {changeDue > 0.01 && (
                            <p className="flex justify-between font-bold text-xl text-green-400 p-3 bg-green-900/40 rounded-lg border border-green-700">
                                <span>Change Due:</span>
                                <span>₹${changeDue.toFixed(2)}</span>
                            </p>
                        )}

                        {/* Amount Added to Khata (Credit/Partial Payment) */}
                        {amountCredited > 0.01 && (
                             <p className={`flex justify-between font-bold text-xl p-3 rounded-lg border ${
                                 amountCredited > 0 && isCreditCustomerSelected 
                                     ? 'bg-red-900/40 text-red-400 border-red-700'
                                     : 'bg-yellow-900/40 text-yellow-400 border-yellow-700'
                             }`}>
                                <span>{paymentMethod === 'Credit' ? 'Full Sale to Khata' : 'Remaining Khata/Credit:'}</span>
                                <span className="text-2xl font-extrabold">₹${amountCredited.toFixed(2)}</span>
                            </p>
                        )}

                        {/* New Khata Balance */}
                        {isCreditCustomerSelected && amountCredited > 0 && (
                            <p className="flex justify-between text-sm text-gray-400 pt-3 border-t border-gray-700 mt-2">
                                <span>New Outstanding Khata Balance:</span>
                                <span className="font-semibold text-white text-base">₹${newKhataBalance.toFixed(2)}</span>
                            </p>
                        )}
                        
                        {/* Status Message if paid 0 in UPI mode and not credit customer */}
                        {paymentType === 'UPI' && amountCredited > 0 && !isCreditCustomerSelected && (
                             <p className="text-xs text-center text-yellow-400 p-2 bg-yellow-900/30 rounded-lg">
                                **WARNING:** No customer selected. The remaining Khata amount cannot be saved.
                            </p>
                        )}
                    </div>

                </div>

                {/* Modal Footer (Action Button) */}
                <div className="p-5 border-t border-gray-700">
                    <button 
                        onClick={handleConfirmPayment} 
                        className="w-full py-4 bg-teal-600 text-white rounded-xl font-extrabold text-xl shadow-2xl shadow-teal-900/50 hover:bg-teal-700 transition active:scale-[0.99] transform disabled:opacity-50"
                        disabled={totalAmount <= 0}
                    >
                        Confirm {paymentMethod} Transaction
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;