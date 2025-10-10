import React, { useState, useMemo, useEffect } from 'react';
import { CreditCard, DollarSign, X } from 'lucide-react';

// Default Walk-in Customer for UPI sales (exported for use in BillingPOS)
export const WALK_IN_CUSTOMER = { id: 'walk_in', name: 'Walk-in Customer', outstandingCredit: 0, creditLimit: 0 };

/**
 * Sub-component for Payment Modal: Handles Cash, Full Credit, or Partial/Mixed Payments
 */
const PaymentModal = ({ isOpen, onClose, totalAmount, selectedCustomer, processPayment, showToast }) => {
    // Initialize amountPaid with the total due amount for quick full cash sale
    const [amountPaidInput, setAmountPaidInput] = useState(totalAmount.toFixed(2));
    const [paymentType, setPaymentType] = useState('UPI'); // 'UPI', 'Credit'

    // Reset state when modal opens/total changes
    useEffect(() => {
        if (isOpen) {
            setAmountPaidInput(totalAmount.toFixed(2));
            setPaymentType('UPI');
        }
    }, [isOpen, totalAmount]);

    const khataDue = selectedCustomer.outstandingCredit || 0;
    const isCreditCustomer = selectedCustomer.id !== WALK_IN_CUSTOMER.id;

    const amountPaid = parseFloat(amountPaidInput) || 0;
    
    // Calculations based on user input (memoized for performance)
    const {
        amountCredited, // Amount of CURRENT bill added to khata (if paid < total or full credit selected)
        changeDue,      // Change to return (if paid > total)
        newKhataBalance, // The customer's total Khata due *after* this transaction
        paymentMethod    // 'UPI', 'Credit', or 'Mixed'
    } = useMemo(() => {
        const total = totalAmount;

        let amountCredited = 0;
        let changeDue = 0;
        let method = paymentType;
        
        if (paymentType === 'Credit') {
            // Full Credit Sale
            amountCredited = total;
            method = 'Credit';
        }
        else {
            if (amountPaid >= total) {
                // Full payment or Overpayment
                changeDue = amountPaid - total;
                method = 'UPI';
            } else if (amountPaid > 0 && amountPaid < total) {
                // Partial payment: Remaining amount goes to Khata
                amountCredited = total - amountPaid;
                method = 'Mixed'; // Cash + Credit
            } else {
                 // Paid 0 UPI, meaning full amount must be credited
                 amountCredited = total;
                 method = 'Credit';
            }
        }
        
        // Final Khata balance calculation
        const newKhataBalance = khataDue + amountCredited;

        return { amountCredited, changeDue, newKhataBalance, paymentMethod: method };
    }, [amountPaid, totalAmount, paymentType, khataDue]);


    const handleConfirmPayment = () => {
        if (totalAmount <= 0) {
            showToast('Cart is empty. Cannot process payment.', 'error');
            return;
        }

        // Validation: Credit/Mixed sale requires a saved customer
        if (amountCredited > 0 && selectedCustomer.id === WALK_IN_CUSTOMER.id) {
            showToast('Please select a specific customer to add the remaining amount to Khata/Credit.', 'error');
            return;
        }

        // Validation: Amount paid cannot be negative
        if (amountPaid < 0) {
             showToast('Amount paid cannot be negative.', 'error');
             return;
        }
        
        // Call the main processing function passed from the parent
        processPayment(amountPaid, amountCredited, paymentMethod);
    };


    if (!isOpen) return null;

    // Updated Styling for the modal (Dark/Indigo theme)
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
                    
                    {/* Customer Info */}
                    <div className="flex justify-between items-center p-3 bg-indigo-900/40 rounded-lg border border-indigo-700">
                        <span className="text-sm font-semibold text-gray-300">Bill To:</span>
                        <span className="font-extrabold text-indigo-400 truncate max-w-[60%] text-lg">{selectedCustomer.name}</span>
                    </div>

                    {/* Total Due */}
                    <div className="p-4 bg-indigo-900/60 rounded-xl shadow-xl border border-indigo-600">
                        <p className="flex justify-between items-center text-xl font-medium text-gray-200">
                            <span>Sale Total:</span>
                            <span className="text-4xl font-extrabold text-teal-400">₹{totalAmount.toFixed(2)}</span>
                        </p>
                    </div>

                    {/* Khata Status */}
                    {isCreditCustomer && (
                        <div className="flex justify-between items-center p-2 border-b border-gray-700 text-sm">
                            <span className="font-medium text-gray-300">Customer Outstanding Khata:</span>
                            <span className={`font-bold ${khataDue > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                ₹{khataDue.toFixed(2)}
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
                            disabled={!isCreditCustomer}
                            className={`flex-1 py-3 text-center font-bold text-lg transition-all duration-200 ${
                                paymentType === 'Credit' 
                                    ? 'bg-red-600 text-white shadow-inner shadow-red-900' 
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={!isCreditCustomer ? 'Requires a selected customer other than Walk-in' : ''}
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
                                <span>₹{changeDue.toFixed(2)}</span>
                            </p>
                        )}

                        {/* Amount Added to Khata (Credit/Partial Payment) */}
                        {amountCredited > 0.01 && (
                             <p className={`flex justify-between font-bold text-xl p-3 rounded-lg border ${
                                 amountCredited > 0 && isCreditCustomer 
                                     ? 'bg-red-900/40 text-red-400 border-red-700'
                                     : 'bg-yellow-900/40 text-yellow-400 border-yellow-700'
                             }`}>
                                <span>{paymentMethod === 'Credit' ? 'Full Sale to Khata' : 'Remaining Khata/Credit:'}</span>
                                <span className="text-2xl font-extrabold">₹{amountCredited.toFixed(2)}</span>
                            </p>
                        )}

                        {/* New Khata Balance */}
                        {isCreditCustomer && amountCredited > 0 && (
                            <p className="flex justify-between text-sm text-gray-400 pt-3 border-t border-gray-700 mt-2">
                                <span>New Outstanding Khata Balance:</span>
                                <span className="font-semibold text-white text-base">₹{newKhataBalance.toFixed(2)}</span>
                            </p>
                        )}
                        
                        {/* Status Message if paid 0 in UPI mode and not credit customer */}
                        {paymentType === 'UPI' && amountCredited > 0 && !isCreditCustomer && (
                             <p className="text-xs text-center text-yellow-400 p-2 bg-yellow-900/30 rounded-lg">
                                This transaction requires selecting a saved customer to be recorded as Khata/Credit.
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