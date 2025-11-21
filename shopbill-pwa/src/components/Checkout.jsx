import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ShoppingCart, CreditCard, CheckCircle, Lock, ArrowLeft, Loader, IndianRupee, Wifi, AlertTriangle } from 'lucide-react';

// Mock data to represent plan details (since we don't have a backend Plan API)
const PLAN_DETAILS = {
    BASIC: {
        name: 'Basic Plan',
        price: 499,
        features: ['Unlimited Transactions', '2 Users (Owner + 1 Cashier)', 'Full Inventory Management', 'Full Digital Khata'],
        interval: 'monthly',
        color: 'bg-indigo-600',
    },
    PRO: {
        name: 'Pro Plan',
        price: 999,
        features: ['Unlimited Transactions', 'Unlimited Users & Roles', 'Full Inventory & Bulk Tools', 'Khata + Automated SMS Reminders'],
        interval: 'monthly',
        color: 'bg-teal-600',
    }
};

// Simple helper to format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
    }).format(amount);
};

const Checkout = ({ plan: planKey, onPaymentSuccess, onBackToDashboard }) => {
    // Determine the plan details based on the key passed from App.js
    const plan = PLAN_DETAILS[planKey] || null;
    
    // State for payment form
    const [cardHolderName, setCardHolderName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    
    // UI state
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [paymentError, setPaymentError] = useState(null);

    // Effect to handle navigation if plan is invalid
    useEffect(() => {
        if (!plan) {
            setPaymentError("Invalid subscription plan selected. Please go back.");
        }
    }, [plan]);

    // Format the card number for display (e.g., **** **** **** 1234)
    const formattedCardNumber = useMemo(() => {
        const cleaned = cardNumber.replace(/\s/g, '');
        return cleaned.match(/.{1,4}/g)?.join(' ') || '';
    }, [cardNumber]);

    // Mock Payment Handler
    const handlePaymentSubmit = useCallback((e) => {
        e.preventDefault();
        setPaymentError(null);
        
        // --- Client-Side Mock Validation ---
        if (!plan) {
            setPaymentError("Plan error. Cannot proceed.");
            return;
        }
        if (cardNumber.replace(/\s/g, '').length < 16) {
            setPaymentError("Please enter a valid 16-digit card number.");
            return;
        }
        if (!cardHolderName.trim() || !expiry.match(/^\d{2}\/\d{2}$/) || cvv.length < 3) {
            setPaymentError("Please fill all card details correctly.");
            return;
        }
        // --- End Validation ---

        setIsProcessing(true);

        // Simulate API call to payment gateway
        setTimeout(() => {
            setIsProcessing(false);
            
            // Randomly succeed 80% of the time, fail 20%
            if (Math.random() < 0.8) {
                setPaymentSuccess(true);
                // After success animation, trigger the parent success handler
                setTimeout(() => {
                    onPaymentSuccess(plan.name); // Notify App.js
                }, 1500); 
            } else {
                // Simulate common error
                setPaymentError("Payment failed: Insufficient funds or card declined.");
            }
        }, 2000);

    }, [plan, cardNumber, cardHolderName, expiry, cvv, onPaymentSuccess]);
    
    // Function to handle card number input formatting
    const handleCardNumberChange = (e) => {
        let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
        if (value.length > 16) value = value.slice(0, 16);
        setCardNumber(value);
    };

    // Function to handle expiry date input formatting (MM/YY)
    const handleExpiryChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 4) value = value.slice(0, 4);
        
        // Auto-insert slash
        if (value.length >= 2 && !e.target.value.includes('/')) {
            value = value.slice(0, 2) + '/' + value.slice(2);
        }
        setExpiry(value);
    };


    // --- Render Content Based on State ---

    if (!plan) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-950 p-8">
                <div className="text-center text-red-400">
                    <AlertTriangle className="w-10 h-10 mx-auto mb-3" />
                    <p className="text-xl font-semibold mb-4">Plan Not Found</p>
                    <p className="text-gray-400">{paymentError}</p>
                    <button onClick={onBackToDashboard} className="mt-4 text-indigo-400 hover:text-indigo-300 transition flex items-center mx-auto">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (paymentSuccess) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-950 p-4">
                <div className="w-full max-w-md bg-gray-800 p-10 rounded-2xl shadow-2xl text-center border border-green-600/50">
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto animate-bounce" />
                    <h2 className="text-3xl font-extrabold text-white mt-4">Payment Successful!</h2>
                    <p className="text-gray-400 mt-2">
                        Your **{plan.name}** is now active. Redirecting you to the dashboard...
                    </p>
                </div>
            </div>
        );
    }


    // --- Main Checkout Form (Consolidated and Compact) ---
    return (
        // Use p-4 for padding and ensure vertical centering with items-center
        <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4 font-sans">
            {/* Reduced max-w to sm for a tighter form, using py-6 for less vertical padding */}
            <div className="w-full max-w-sm bg-white dark:bg-gray-800 px-6 py-6 rounded-2xl shadow-2xl border border-gray-700">
                
                {/* Consolidated Header & Summary (Reduced padding) */}
                <div className={`p-4 rounded-xl ${plan.color} text-white mb-5 shadow-lg`}>
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center">
                             <ShoppingCart className="w-5 h-5 mr-2" />
                            {plan.name}
                        </h2>
                        <span className="text-xs font-medium uppercase border border-white/50 px-2 py-0.5 rounded-full">{plan.interval}</span>
                    </div>

                    <div className="mt-3 border-t border-white/30 pt-3">
                        <h3 className="text-2xl font-extrabold flex items-center justify-between">
                            Total Due:
                            <span>{formatCurrency(plan.price)}</span>
                        </h3>
                    </div>
                </div>

                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center mb-4 border-b pb-3 border-gray-200 dark:border-gray-700">
                    <CreditCard className="w-5 h-5 mr-2 text-indigo-500" />
                    Complete Payment
                </h3>

                {paymentError && (
                    <div className="p-3 mb-4 text-xs bg-red-800 text-red-100 rounded-lg text-center" role="alert">
                        {paymentError}
                    </div>
                )}

                {/* Reduced space-y- to 3 */}
                <form onSubmit={handlePaymentSubmit} className="space-y-3">
                    
                    {/* Card Preview (Reduced height and mb) */}
                    <div className="w-full h-36 bg-gray-700/80 rounded-xl p-4 shadow-inner relative mb-4 overflow-hidden text-white font-mono transition-all duration-300">
                        {/* Simple Card Background Art */}
                        <div className="absolute top-0 right-0 w-2/3 h-full rounded-l-full opacity-10 bg-indigo-400 transform translate-x-1/2 -translate-y-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 rounded-r-full opacity-10 bg-teal-400 transform -translate-x-1/4 translate-y-1/4"></div>

                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <IndianRupee className="w-6 h-6 text-teal-400" />
                            <Wifi className="w-5 h-5 text-indigo-400 transform rotate-90" />
                        </div>

                        <p className="text-xl tracking-wider relative z-10">
                            {formattedCardNumber || '#### #### #### ####'}
                        </p>

                        <div className="flex justify-between items-center text-xs mt-2 relative z-10">
                            <div>
                                <p className="text-xs text-gray-400">Card Holder</p>
                                <p className="font-semibold uppercase truncate w-28">{cardHolderName || 'YOUR NAME'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Expires</p>
                                <p className="font-semibold">{expiry || 'MM/YY'}</p>
                            </div>
                        </div>
                    </div>
                    {/* End Card Preview */}


                    {/* Card Number Input (Reduced py) */}
                    <div>
                        <label htmlFor="cardNumber" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Card Number</label>
                        <input
                            type="text"
                            id="cardNumber"
                            value={formattedCardNumber}
                            onChange={handleCardNumberChange}
                            maxLength="19" // 16 digits + 3 spaces
                            placeholder="4000 1234 5678 9012"
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition"
                            required
                            disabled={isProcessing}
                        />
                    </div>

                    {/* Card Holder Name Input (Reduced py) */}
                    <div>
                        <label htmlFor="cardHolderName" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Card Holder Name</label>
                        <input
                            type="text"
                            id="cardHolderName"
                            value={cardHolderName}
                            onChange={(e) => setCardHolderName(e.target.value)}
                            placeholder="Name on Card"
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition"
                            required
                            disabled={isProcessing}
                        />
                    </div>

                    {/* Expiry and CVV (Reduced py) */}
                    <div className="flex space-x-3">
                        <div className="flex-1">
                            <label htmlFor="expiry" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry (MM/YY)</label>
                            <input
                                type="text"
                                id="expiry"
                                value={expiry}
                                onChange={handleExpiryChange}
                                placeholder="MM/YY"
                                maxLength="5"
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                required
                                disabled={isProcessing}
                            />
                        </div>
                        <div className="flex-1">
                            <label htmlFor="cvv" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">CVV</label>
                            <input
                                type="password"
                                id="cvv"
                                value={cvv}
                                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                placeholder="***"
                                maxLength="4"
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                required
                                disabled={isProcessing}
                            />
                        </div>
                    </div>

                    {/* Submit Button (Reduced mt) */}
                    <button
                        type="submit"
                        className="cursor-pointer w-full mt-4 py-3 bg-indigo-600 text-white text-base font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition transform hover:scale-[1.005] duration-300 ease-in-out disabled:bg-indigo-400 flex items-center justify-center"
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <>
                                <Loader className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                Pay {formatCurrency(plan.price)}
                                <Lock className="w-4 h-4 ml-2" />
                            </>
                        )}
                    </button>
                    
                    <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3">
                        Your transaction is secured with 256-bit encryption.
                    </p>

                    {/* Back to Dashboard Button */}
                    <div className="text-center pt-3 border-t border-gray-200 dark:border-gray-700/50">
                        <button 
                            onClick={onBackToDashboard} 
                            className="mt-1 text-xs text-gray-600 dark:text-gray-500 hover:text-indigo-400 transition flex items-center mx-auto"
                            disabled={isProcessing}
                        >
                            <ArrowLeft className="w-3 h-3 mr-1" /> Cancel and return to Dashboard
                        </button>
                    </div>

                </form>

            </div>
        </div>
    );
};

export default Checkout;