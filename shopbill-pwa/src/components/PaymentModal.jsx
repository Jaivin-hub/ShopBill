import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CreditCard, IndianRupee, X, User, List, UserPlus, CornerDownRight, Search, Phone, CheckCircle, AlertCircle } from 'lucide-react'; 
import API from '../config/api'; 
export const WALK_IN_CUSTOMER = { id: 'walk_in', name: 'Walk-in Customer', outstandingCredit: 0, creditLimit: 0 };
export const ADD_NEW_CUSTOMER_ID = 'add_new'; // Special ID for the "Add New" option
/**
 * Sub-component for Payment Modal: Handles Cash, Full Credit, or Partial/Mixed Payments
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {function} props.onClose
 * @param {number} props.totalAmount
 * @param {object[]} props.allCustomers - Full list of customers including WALK_IN_CUSTOMER
 * @param {function} props.processPayment - (amountPaid, amountCredited, paymentMethod, finalCustomer, forceProceed) => void.
 * @param {function} props.showToast
 * @param {function} props.onAddNewCustomer - Function to call when "Add New Credit Customer" is selected.
 * @param {object} props.apiClient - The initialized API client for making requests.
 */
const PaymentModal = ({ isOpen, onClose, totalAmount, allCustomers = [], processPayment, showToast, onAddNewCustomer, apiClient }) => {
    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null); 
    const [localSelectedCustomer, setLocalSelectedCustomer] = useState(WALK_IN_CUSTOMER);
    const [amountPaidInput, setAmountPaidInput] = useState(totalAmount.toFixed(2));
    const [paymentType, setPaymentType] = useState('UPI');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false); 
    const [searchTerm, setSearchTerm] = useState(''); 
    const [isNewCustomerFormOpen, setIsNewCustomerFormOpen] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerPhone, setNewCustomerPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- NEW STATE: For handling Credit Limit Error ---
    const [creditError, setCreditError] = useState(null);

    // --- EFFECT: Reset state on modal open and set initial payment type ---
    useEffect(() => {
        if (isOpen) {
            setAmountPaidInput(totalAmount.toFixed(2));
            // Determine initial payment type
            const initialPaymentType = localSelectedCustomer.id !== WALK_IN_CUSTOMER.id ? 'Credit' : 'UPI';
            setPaymentType(initialPaymentType);
            
            // Note: localSelectedCustomer state is maintained between opens unless explicitly reset
            // If you want to reset customer to WALK_IN on every open, uncomment the line below:
            // setLocalSelectedCustomer(WALK_IN_CUSTOMER); 

            setSearchTerm(''); 
            setIsNewCustomerFormOpen(false); 
            setNewCustomerName('');
            setNewCustomerPhone('');
            setIsSubmitting(false); // Reset submitting state on open
            setCreditError(null); // Clear previous errors
        }
    }, [isOpen, totalAmount, localSelectedCustomer.id]); // Added localSelectedCustomer.id to dependencies

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

    // --- EFFECT: Logic to prevent 'Credit' selection if Walk-in is selected ---
    useEffect(() => {
        if (paymentType === 'Credit' && !isCreditCustomerSelected) {
            setPaymentType('UPI');
            showToast({ message: 'Select a credit customer first to use the "Full Khata" option.', type: 'info' });
        }
    }, [paymentType, isCreditCustomerSelected, showToast]);

    const {
        amountCredited, 
        changeDue,      
        newKhataBalance, 
        paymentMethod,
        effectiveAmountPaid // <--- The actual amount to record as paid
    } = useMemo(() => {
        const total = totalAmount;
        let amountCredited = 0; // Amount of the CURRENT SALE to be added to Khata
        let changeDue = 0;
        let effectiveAmountPaid = amountPaid; // Default: use the value from the input
        let method = paymentType;

        if (paymentType === 'Credit') {
            amountCredited = total;
            effectiveAmountPaid = 0; 
            method = 'Credit';
        }
        else { // UPI / Mixed
            if (amountPaid >= total) {
                changeDue = Math.max(0, amountPaid - total);
                method = 'UPI'; 
            } else if (amountPaid < total) {
                amountCredited = total - amountPaid;
                method = amountPaid > 0 ? 'Mixed' : 'Credit'; 
            }
        }

        const newKhataBalance = khataDue + amountCredited;
        return { 
            amountCredited, 
            changeDue, 
            newKhataBalance, 
            paymentMethod: method,
            effectiveAmountPaid // Return the corrected value
        };
    }, [amountPaid, totalAmount, paymentType, khataDue]);

    const filteredOptions = useMemo(() => {
        const options = [];
        
        options.push({ 
            id: ADD_NEW_CUSTOMER_ID, 
            key: ADD_NEW_CUSTOMER_ID, 
            name: 'Add New Credit Customer', 
            display: 'Add New Credit Customer...', 
            outstandingCredit: 0 
        });
        options.push({ 
            ...WALK_IN_CUSTOMER,
            key: WALK_IN_CUSTOMER.id,
            display: 'Walk-in Customer'
        });
        const regularCustomers = (allCustomers || []).filter(c => (c._id || c.id) !== WALK_IN_CUSTOMER.id);
        regularCustomers.forEach(c => {
             options.push({
                ...c, 
                id: c._id || c.id, 
                key: c._id || c.id, 
                display: `${c.name} ${c.outstandingCredit > 0 ? `(DUE: ₹${c.outstandingCredit.toFixed(0)})` : ''}`
            });
        });

        if (!searchTerm) {
            return options; 
        }

        const lowerCaseSearch = searchTerm.toLowerCase();
        const specialOptions = options.slice(0, 2); 
        const searchableCustomers = options.slice(2); 
        
        const filteredCustomers = searchableCustomers.filter(c => 
            c.name.toLowerCase().includes(lowerCaseSearch) || 
            (c.phone && c.phone.includes(searchTerm)) || 
            (c.mobile && c.mobile.includes(searchTerm))
        );

        return [...specialOptions, ...filteredCustomers];
    }, [allCustomers, searchTerm]); 
    
    // --- UPDATED: Automatically set to 'Credit' if a credit customer is selected ---
    const handleCustomerSelect = (customer) => {
        setIsDropdownOpen(false); 
        setSearchTerm(''); 
        setCreditError(null); // Clear error if customer changes
        
        if (customer.id === ADD_NEW_CUSTOMER_ID) {
            setIsNewCustomerFormOpen(true); 
            return;
        }
        
        setLocalSelectedCustomer(customer);
        
        if (customer.id !== WALK_IN_CUSTOMER.id) {
            // New requirement: If any credit customer is selected, default to Full Khata
            setPaymentType('Credit');
        } else {
            // If Walk-in is selected, default back to UPI (Cash/Mixed)
            setPaymentType('UPI');
        }
    };
    // --- END UPDATED LOGIC ---

    const handleAddNewCustomerSubmit = async (e) => {
        e.preventDefault();
        if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
            showToast({ message: 'Name and Phone Number are required.', type: 'error' });
            return;
        }
        setIsSubmitting(true);
        try {
            const dataToSend = {
                name: newCustomerName.trim(),
                phone: newCustomerPhone.trim().replace(/[^0-9]/g, ''), 
                creditLimit: 0, 
                initialDue: 0
            };
            const response = await apiClient.post(API.customers, dataToSend);
            if (response.data && response.data.customer) {
                const newCustomer = response.data.customer;
                showToast({ message: `Customer "${newCustomer.name}" added successfully!`, type: 'success' });
                
                // --- Set new customer and default payment to Credit ---
                setLocalSelectedCustomer(newCustomer);
                setPaymentType('Credit'); // Set to credit by default for new credit customer
                // --- End Update ---
                
                onAddNewCustomer(newCustomer);
                setNewCustomerName('');
                setNewCustomerPhone('');
                setIsNewCustomerFormOpen(false);
            } else {
                 showToast({ message: 'Customer created but response format was unexpected.', type: 'warning' });
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to add new customer due to a network or server error.';
            showToast({ message: errorMessage, type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmPayment = async (force = false) => {
        if (totalAmount <= 0) {
            showToast({ message: 'Cart is empty. Cannot process payment.', type: 'error' });
            return;
        }
        if (amountCredited > 0 && localSelectedCustomer.id === WALK_IN_CUSTOMER.id) {
            showToast({ message: 'Please select a specific customer to add the remaining amount to Khata/Credit.', type: 'error' });
            return;
        }
        if (effectiveAmountPaid < 0) {
             showToast({ message: 'Amount paid cannot be negative.', type: 'error' });
             return;
        }
        setIsSubmitting(true);
        try {
             // Pass force flag to parent payment processor
             await processPayment(effectiveAmountPaid, amountCredited, paymentMethod, localSelectedCustomer, force);
        } catch (error) {
            // Check for specific Credit Limit error
            if (error.response?.data?.error === "CREDIT_LIMIT_EXCEEDED") {
                setCreditError(error.response.data);
                showToast({ message: error.response.data.message, type: 'warning' });
            } else {
                showToast({ message: error.response?.data?.error || 'Payment processing failed. Please try again.', type: 'error' });
            }
            setIsSubmitting(false); 
        }
    };

    if (!isOpen) return null;

    const currentCustomerDisplay = 
        localSelectedCustomer.id === WALK_IN_CUSTOMER.id 
            ? WALK_IN_CUSTOMER.name
            : localSelectedCustomer.name + 
              (localSelectedCustomer.outstandingCredit > 0 
                ? ` (DUE: ₹${localSelectedCustomer.outstandingCredit.toFixed(0)})` 
                : '');
    
    const isWalkInSelected = localSelectedCustomer.id === WALK_IN_CUSTOMER.id;

    if (isNewCustomerFormOpen) {
        return (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-85 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100 border border-teal-700">
                    <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white flex items-center">
                            <UserPlus className="w-6 h-6 text-teal-400 mr-2" />
                            Add New Credit Customer
                        </h2>
                        <button onClick={() => setIsNewCustomerFormOpen(false)} className="p-2 rounded-full hover:bg-gray-700 text-gray-400" disabled={isSubmitting}>
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <form onSubmit={handleAddNewCustomerSubmit} className="p-5 space-y-6">
                        <div>
                            <label htmlFor="new-customer-name" className="block text-sm font-medium text-gray-300 mb-1">Customer Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-400" />
                                <input
                                    id="new-customer-name"
                                    type="text"
                                    value={newCustomerName}
                                    onChange={(e) => setNewCustomerName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                                    placeholder="Enter full name"
                                    autoFocus
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="new-customer-phone" className="block text-sm font-medium text-gray-300 mb-1">Phone Number (Required for Credit)</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-400" />
                                <input
                                    id="new-customer-phone"
                                    type="tel"
                                    value={newCustomerPhone}
                                    onChange={(e) => setNewCustomerPhone(e.target.value.replace(/[^0-9]/g, ''))} // Only allow digits
                                    className="w-full pl-10 pr-4 py-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                                    placeholder="e.g., 9876543210"
                                    maxLength="10"
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                        <button 
                            type="submit"
                            className="w-full py-4 bg-teal-600 text-white rounded-xl font-extrabold text-xl shadow-2xl shadow-teal-900/50 hover:bg-teal-700 transition active:scale-[0.99] transform disabled:opacity-50 flex items-center justify-center"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <CheckCircle className="w-6 h-6 mr-2" />
                            )}
                            {isSubmitting ? 'Saving...' : 'Save Customer'}
                        </button>
                        <button 
                            type="button"
                            onClick={() => setIsNewCustomerFormOpen(false)}
                            className="w-full py-2 text-sm text-gray-400 hover:text-white transition"
                            disabled={isSubmitting}
                        >
                            Cancel and Go Back
                        </button>
                    </form>
                </div>
            </div>
        );
    }
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-85 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100 border border-indigo-700">
                <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white flex items-center">
                        <IndianRupee className="w-6 h-6 text-teal-400 mr-2" />
                        Process Payment
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 text-gray-400" disabled={isSubmitting}>
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-5 space-y-5">
                    {/* --- ERROR MESSAGE BOX --- */}
                    {creditError && (
                        <div className="p-4 bg-red-900/40 border border-red-500 rounded-xl flex items-start space-x-3 animate-pulse">
                            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                            <div className="text-sm">
                                <p className="font-bold text-red-400 mb-1">CREDIT LIMIT EXCEEDED</p>
                                <p className="text-gray-200">{creditError.message}</p>
                                <div className="mt-2 flex space-x-4 text-xs font-mono">
                                    <span className="text-gray-400">Limit: ₹{creditError.limit}</span>
                                    <span className="text-red-300">New Total: ₹{newKhataBalance.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="relative" ref={dropdownRef}>
                        <h3 className="text-sm font-semibold flex items-center text-gray-300 mb-2">
                            <User className="w-4 h-4 mr-1 text-teal-400" /> Bill To Customer:
                        </h3>
                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`w-full px-4 py-3 border rounded-lg text-base font-semibold pr-10 transition-colors shadow-inner flex justify-between items-center 
                                ${isDropdownOpen ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-indigo-600'}
                                ${isWalkInSelected ? 'bg-gray-600 text-white' : 'bg-gray-700 text-white'}
                            `}
                            disabled={isSubmitting}
                        >
                            <span className="truncate">{currentCustomerDisplay}</span>
                            <List className="w-5 h-5 ml-2 text-indigo-400" />
                        </button>
                        {isDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 rounded-lg shadow-2xl bg-gray-700 border border-indigo-500 max-h-60 overflow-y-auto">
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
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>
                                {filteredOptions.length > 0 ? (
                                    filteredOptions.map((customer) => (
                                        <div
                                            key={customer.key}
                                            onClick={() => handleCustomerSelect(customer)}
                                            className={`px-4 py-3 cursor-pointer text-sm font-medium transition-colors border-b border-gray-600 last:border-b-0 flex items-center justify-between
                                                ${
                                                    customer.id === localSelectedCustomer.id 
                                                        ? 'bg-indigo-600 text-white' // SELECTED Customer color
                                                        
                                                    : customer.id === ADD_NEW_CUSTOMER_ID 
                                                        ? 'bg-teal-800/70 text-teal-300 hover:bg-teal-700 font-bold' // Add New
                                                        
                                                    : customer.id === WALK_IN_CUSTOMER.id
                                                        ? 'bg-gray-600 text-white hover:bg-gray-500 font-bold' // Walk-in
                                                        
                                                    : 'text-gray-200 hover:bg-gray-600' // Default unselected
                                                }
                                            `}
                                        >
                                            <span className="truncate">
                                                {customer.id === ADD_NEW_CUSTOMER_ID && <UserPlus className="w-4 h-4 inline mr-2" />}
                                                {customer.id === WALK_IN_CUSTOMER.id && <CornerDownRight className="w-4 h-4 inline mr-2" />}
                                                {customer.id !== ADD_NEW_CUSTOMER_ID && customer.id !== WALK_IN_CUSTOMER.id && <User className="w-4 h-4 inline mr-2 text-indigo-300" />}
                                                {customer.display}
                                            </span>
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
                    <div className="p-4 bg-indigo-900/60 rounded-xl shadow-xl border border-indigo-600">
                        <p className="flex justify-between items-center text-xl font-medium text-gray-200">
                            <span>Sale Total:</span>
                            <span className="text-4xl font-extrabold text-teal-400">₹{totalAmount.toFixed(2)}</span>
                        </p>
                    </div>
                    {isCreditCustomerSelected && (
                        <div className="flex justify-between items-center p-2 border-b border-gray-700 text-sm">
                            <span className="font-medium text-gray-300">Customer <strong>Old</strong> Outstanding Khata:</span>
                            <span className={`font-bold ${khataDue > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                ₹{khataDue.toFixed(2)}
                            </span>
                        </div>
                    )}
                    <div className="flex rounded-xl overflow-hidden shadow-2xl">
                        <button
                            onClick={() => {setPaymentType('UPI'); setCreditError(null);}}
                            className={`cursor-pointer flex-1 py-3 text-center font-bold text-lg transition-all duration-200 ${
                                paymentType === 'UPI' 
                                    ? 'bg-teal-600 text-white shadow-inner shadow-teal-900' 
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                            disabled={isSubmitting}
                        >
                            <IndianRupee className="w-5 h-5 inline-block mr-1" /> Cash / Mixed
                        </button>
                        <button
                            onClick={() => {setPaymentType('Credit'); setCreditError(null);}}
                            disabled={!isCreditCustomerSelected || isSubmitting}
                            className={`cursor-pointer flex-1 py-3 text-center font-bold text-lg transition-all duration-200 ${
                                paymentType === 'Credit' 
                                    ? 'bg-red-600 text-white shadow-inner shadow-red-900' 
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={!isCreditCustomerSelected ? 'Requires a selected customer other than Walk-in' : ''}
                        >
                            <CreditCard className="w-5 h-5 inline-block mr-1" /> Full Khata
                        </button>
                    </div>
                    {paymentType === 'UPI' && (
                        <div className="space-y-2">
                            <label htmlFor="amount-paid" className="block text-sm font-medium text-gray-300">Amount Received</label>
                            <input
                                id="amount-paid"
                                type="number"
                                step="0.01"
                                value={amountPaidInput}
                                onChange={(e) => {setAmountPaidInput(e.target.value); setCreditError(null);}}
                                className="w-full p-4 border-2 border-teal-600 bg-gray-700 text-teal-400 rounded-xl text-3xl font-extrabold focus:ring-teal-500 focus:border-teal-500 shadow-xl transition-colors"
                                placeholder={totalAmount.toFixed(2)}
                                disabled={isSubmitting}
                            />
                        </div>
                    )}
                    <div className="pt-2 space-y-3">
                        {changeDue > 0.01 && (
                            <p className="flex justify-between font-bold text-xl text-green-400 p-3 bg-green-900/40 rounded-lg border border-green-700">
                                <span>Change Due:</span>
                                <span>₹{changeDue.toFixed(2)}</span>
                            </p>
                        )}
                        {amountCredited > 0.01 && (
                             <p className={`flex justify-between font-bold text-xl p-3 rounded-lg border ${
                                 amountCredited > 0 && isCreditCustomerSelected 
                                     ? 'bg-red-900/40 text-red-400 border-red-700'
                                     : 'bg-yellow-900/40 text-yellow-400 border-yellow-700'
                             }`}>
                                <span>{paymentMethod === 'Credit' ? 'Current Sale to Khata' : 'Remaining Sale to Khata:'}</span>
                                <span className="text-2xl font-extrabold">₹{amountCredited.toFixed(2)}</span>
                            </p>
                        )}
                        {isCreditCustomerSelected && (khataDue > 0 || amountCredited > 0) && (
                            <p className="flex justify-between text-sm text-gray-400 pt-3 border-t border-gray-700 mt-2">
                                <span><strong>New</strong> Total Outstanding Khata Balance:</span>
                                <span className="font-semibold text-white text-base">₹{newKhataBalance.toFixed(2)}</span>
                            </p>
                        )}
                        {paymentType === 'UPI' && amountCredited > 0 && !isCreditCustomerSelected && (
                             <p className="text-xs text-center text-yellow-400 p-2 bg-yellow-900/30 rounded-lg">
                                <strong>WARNING:</strong> No customer selected. The remaining Khata amount cannot be saved to a specific account.
                            </p>
                        )}
                    </div>
                </div>
                <div className="p-5 border-t border-gray-700">
                    <button 
                        onClick={() => handleConfirmPayment(!!creditError)} 
                        className={`cursor-pointer w-full py-4 text-white rounded-xl font-extrabold text-xl shadow-2xl transition active:scale-[0.99] transform disabled:opacity-50 flex items-center justify-center
                            ${creditError ? 'bg-red-600 shadow-red-900/50 hover:bg-red-700' : 'bg-teal-600 shadow-teal-900/50 hover:bg-teal-700'}
                        `}
                        disabled={totalAmount <= 0 || isSubmitting} 
                    >
                        {isSubmitting ? (
                            <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <CheckCircle className="w-6 h-6 mr-2" />
                        )}
                        {isSubmitting 
                          ? 'Processing Transaction...' 
                          : creditError 
                            ? 'Bypass Limit & Confirm' 
                            : paymentMethod === 'Credit' ? `Confirm ${paymentMethod} Transaction` : `Confirm Transaction`
                        }
                    </button>
                    {creditError && (
                        <button 
                            onClick={() => setCreditError(null)}
                            className="w-full mt-3 text-gray-400 text-sm hover:text-white transition"
                        >
                            Cancel and Adjust Amount
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
export default PaymentModal;