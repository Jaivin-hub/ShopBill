import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ShoppingCart, CreditCard, CheckCircle, Lock, ArrowLeft, Loader, IndianRupee, Wifi, AlertTriangle, Eye, EyeOff, Globe } from 'lucide-react';
import API from '../config/api';
import apiClient from '../lib/apiClient';
import axios from 'axios';

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
        price: 799,
        features: ['Unlimited Transactions', 'Unlimited Users & Roles', 'Full Inventory & Bulk Tools', 'Khata + Automated SMS Reminders'],
        interval: 'monthly',
        color: 'bg-teal-600',
    },
    PREMIUM: {
        name: 'Premium Plan',
        price: 999,
        features: ['Unlimited Transactions', 'Unlimited Users & Roles', 'Full Inventory & Bulk Tools', 'Khata + Automated SMS Reminders'],
        interval: 'monthly',
        color: 'bg-indigo-600',
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

// Validation functions
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required.';
    if (/\s/.test(email)) return 'Email cannot contain spaces.';
    if (email !== email.toLowerCase()) return 'Email must be entirely lowercase.';
    if (!emailRegex.test(email)) return 'Please enter a valid email address.';
    return null;
};

const validatePhoneNumber = (phone) => {
    if (!phone) return 'Phone number is required.';
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone)) {
        return 'Please enter a valid international phone number format (e.g., +919876543210).';
    }
    return null;
};

/**
 * Utility to load the Razorpay script dynamically.
 * @param {string} src - The script URL
 * @returns {Promise<boolean>} Resolves true if script loaded successfully.
 */
const loadRazorpayScript = (src) => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const Checkout = ({ plan: planKey, onPaymentSuccess, onBackToDashboard }) => {
    const plan = PLAN_DETAILS[planKey] || null;
    
    // State for user info
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState(null);
    const [phoneError, setPhoneError] = useState(null);
    const [passwordError, setPasswordError] = useState(null);
    
    // Phone number state
    const [dialCode, setDialCode] = useState('+91');
    const [localNumber, setLocalNumber] = useState('');
    const [phone, setPhone] = useState('+91');
    
    // Country code dropdown state
    const [countryCodes, setCountryCodes] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef(null);
    
    // UI state
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [paymentError, setPaymentError] = useState(null);
    
    // Selected country for display
    const selectedCountry = countryCodes.find(c => c.code === dialCode);
    
    // Filtered country codes based on search
    const filteredCodes = useMemo(() => {
        if (!searchQuery) return countryCodes;
        const query = searchQuery.toLowerCase();
        return countryCodes.filter(c =>
            c.name.toLowerCase().includes(query) ||
            c.code.includes(query)
        );
    }, [countryCodes, searchQuery]);
    
    // Fetch country codes 
    const fetchCountryCodes = useCallback(async () => {
        try {
            const response = await axios.get('https://restcountries.com/v3.1/all?fields=name,idd,flag');
            const data = response.data;

            const codes = data
                .map(country => {
                    const root = country.idd.root || '';
                    const suffixes = country.idd.suffixes || [];
                    const fullCode = suffixes.length > 0 ? `${root}${suffixes[0]}` : root;
                    if (!fullCode) return null;
                    return {
                        code: fullCode,
                        flag: country.flag,
                        name: country.name.common,
                        sortName: country.name.common,
                    };
                })
                .filter(Boolean)
                .reduce((acc, current) => {
                    const x = acc.find(item => item.code === current.code);
                    if (!x) {
                        return acc.concat([current]);
                    }
                    return acc;
                }, [])
                .sort((a, b) => a.sortName.localeCompare(b.sortName));

            setCountryCodes(codes);
        } catch (error) {
            console.error('Failed to fetch country codes:', error);
            setCountryCodes([
                { code: '+1', flag: '🇺🇸', name: 'United States' },
                { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
                { code: '+91', flag: '🇮🇳', name: 'India' },
            ]);
        }
    }, []);
    
    // Load country codes on mount 
    useEffect(() => {
        fetchCountryCodes();
    }, [fetchCountryCodes]);
    
    // Update phone when dialCode or localNumber changes 
    useEffect(() => {
        if (dialCode) {
            const sanitizedLocalNumber = localNumber.replace(/\D/g, '');
            const fullNumber = dialCode + sanitizedLocalNumber;
            if (fullNumber !== phone) {
                setPhone(fullNumber);
            }
        }
    }, [dialCode, localNumber, phone]);
    
    // Set default dial code when codes are loaded 
    useEffect(() => {
        if (countryCodes.length > 0 && !dialCode) {
            setDialCode('+91');
        }
    }, [countryCodes, dialCode]);
    
    // Handle clicks outside dropdown 
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    // Handle country selection 
    const handleSelectCountry = (code) => {
        setDialCode(code);
        setIsDropdownOpen(false);
        setSearchQuery('');
        if (phoneError) setPhoneError(null);
    };
    
    // Handle phone number change 
    const handleNumberChange = (e) => {
        const sanitizedNumber = e.target.value.replace(/\D/g, '');
        setLocalNumber(sanitizedNumber);
        if (phoneError) setPhoneError(null);
    };

    // Effect to handle navigation if plan is invalid 
    useEffect(() => {
        if (!plan) {
            setPaymentError("Invalid subscription plan selected. Please go back.");
        }
    }, [plan]);

    // --- RAZORPAY PAYMENT HANDLER ---
    const handlePaymentSubmit = useCallback(async (e) => {
        e.preventDefault();
        setPaymentError(null);
        setEmailError(null);
        setPhoneError(null);
        setPasswordError(null);
        
        // --- Validation ---
        if (!plan) {
            setPaymentError("Plan error. Cannot proceed.");
            return;
        }
        
        const emailValidation = validateEmail(email);
        if (emailValidation) {
            setEmailError(emailValidation);
            return;
        }
        
        const phoneValidation = validatePhoneNumber(phone);
        if (phoneValidation) {
            setPhoneError(phoneValidation);
            return;
        }
        
        if (!password || password.length < 8) {
            setPasswordError('Password must be 8 or more characters long.');
            return;
        }
        // --- End Validation ---

        setIsProcessing(true);

        try {
            // STEP 1: Load Razorpay Script
            const razorpayLoad = await loadRazorpayScript('https://checkout.razorpay.com/v1/checkout.js');
            if (!razorpayLoad) {
                setPaymentError('Failed to load the Razorpay payment script. Check your network.');
                setIsProcessing(false);
                return;
            }
            
            // STEP 2: Create Order on Server (GET ORDER ID)
            const createOrderUrl = `${API.createpayment}`;
            const orderResponse = await axios.post(createOrderUrl, {
                plan: planKey,
            });
            
            const { orderId, currency, amount, keyId } = orderResponse.data;
            if (!orderId) {
                setPaymentError("Failed to initiate payment. Order ID missing from server.");
                setIsProcessing(false);
                return;
            }

            // STEP 3: Configure and Open Razorpay Checkout Popup
            const options = {
                key: keyId, 
                amount: amount, 
                currency: currency,
                name: 'Pocket POS Subscription',
                description: `Payment for ${plan.name}`,
                order_id: orderId,
                handler: async (response) => {
                    // This function is executed when payment succeeds on the popup
                    setIsProcessing(true);
                    
                    try {
                        // STEP 4: Verify Payment Signature on Server
                        const verifyUrl = `${API.payment}/verify`;
                        const verificationResponse = await axios.post(verifyUrl, {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });

                        const { success: verificationSuccess, transactionId } = verificationResponse.data;

                        if (verificationSuccess && transactionId) {
                            // STEP 5: Signup User using the Verified Transaction ID
                            console.log('Payment verified. Creating user account with email:', email);
                            
                            const signupResponse = await apiClient.post(API.signup, {
                                email: email.toLowerCase().trim(),
                                password: password,
                                phone: phone,
                                plan: planKey,
                                transactionId: transactionId 
                            });

                            if (signupResponse.data && signupResponse.data.user) {
                                setPaymentSuccess(true);
                                setTimeout(() => {
                                    onPaymentSuccess({
                                        success: true,
                                        message: 'Account created successfully! Please login to continue.',
                                        email: email.toLowerCase().trim()
                                    });
                                }, 1500);
                            } else {
                                setPaymentError("Account creation failed after verified payment. Contact support.");
                                setIsProcessing(false);
                            }
                        } else {
                            setPaymentError('Payment verification failed. Please try again or contact support.');
                            setIsProcessing(false);
                        }
                        
                    } catch (error) {
                        console.error('Verification/Signup Error:', error);
                        setPaymentError(error.response?.data?.error || 'Verification failed. Server error.');
                        setIsProcessing(false);
                    }
                },
                prefill: {
                    email: email,
                    contact: phone,
                    name: 'POS Shop Owner', 
                },
                theme: {
                    color: '#4f46e5' 
                },
                modal: {
                    ondismiss: () => {
                        console.log('Razorpay popup dismissed');
                        setIsProcessing(false); 
                    }
                }
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.open();
            

        } catch (error) {
            console.error('Initial Order Creation Error:', error);
            
            if (error.response?.data?.error) {
                setPaymentError(error.response.data.error);
            } else if (error.response?.data?.message) {
                setPaymentError(error.response.data.message);
            } else {
                setPaymentError("Failed to connect to the server or create order.");
            }
            
            setIsProcessing(false);
        }

    }, [plan, planKey, email, phone, password, onPaymentSuccess]);


    // --- Render Content Based on State ---

    if (!plan) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-950 p-8">
                <div className="text-center text-red-400">
                    <AlertTriangle className="w-10 h-10 mx-auto mb-3" />
                    <p className="text-xl font-semibold mb-4">Plan Not Found</p>
                    <p className="text-gray-400">{paymentError}</p>
                    <button onClick={onBackToDashboard} className="mt-4 text-indigo-400 hover:text-indigo-300 transition flex items-center mx-auto" disabled={isProcessing}>
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
                        Your account has been created. Redirecting you to login...
                    </p>
                </div>
            </div>
        );
    }


    // --- Main Checkout Form (RENDER) ---
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4 font-sans">
            <div className="w-full max-w-5xl bg-white dark:bg-gray-800 p-8 md:p-10 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
                
                {/* Header (Unchanged) */}
                <div className="text-center mb-8">
                    <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
                        Complete Payment & Create Account
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">Enter your details to complete your subscription</p>
                </div>

                {paymentError && (
                    <div className="p-4 mb-6 text-sm bg-red-800 text-red-100 rounded-lg text-center" role="alert">
                        {paymentError}
                    </div>
                )}

                <form onSubmit={handlePaymentSubmit}>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        
                        {/* Left Side: Plan Details + Account Information (User Info Section REMAINS) */}
                        <div className="h-full">
                            <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-700 rounded-xl h-full">
                                
                                {/* Plan Details (Unchanged) */}
                                <div className={`p-6 rounded-xl ${plan.color} text-white shadow-lg h-48 flex flex-col justify-between`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xl font-bold flex items-center">
                                            <ShoppingCart className="w-5 h-5 mr-2" />
                                            {plan.name}
                                        </h4>
                                        <span className="text-xs font-medium uppercase border border-white/50 px-2 py-1 rounded-full">{plan.interval}</span>
                                    </div>
                                    <div className="mt-auto pt-4 border-t border-white/30">
                                        <p className="text-sm text-white/90 mb-1">Total Due:</p>
                                        <p className="text-4xl font-extrabold">{formatCurrency(plan.price)}</p>
                                    </div>
                                </div>

                                <div>
                                    {/* Account Information Header (Unchanged) */}
                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pt-4 pb-2 border-t border-gray-200 dark:border-gray-600">
                                        Account Information
                                    </h4>
                                    
                                    {/* Email Input (Unchanged) */}
                                    <div className="mb-4">
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                                        <input
                                            type="email"
                                            id="email"
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                setEmailError(null);
                                            }}
                                            placeholder="your@email.com"
                                            className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-lg text-sm text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition ${emailError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                            required
                                            disabled={isProcessing}
                                        />
                                        {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
                                    </div>
                                    
                                    {/* Phone Input (Unchanged) */}
                                    <div className="mb-4">
                                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
                                        <div className={`
                                            w-full flex rounded-lg transition duration-150 bg-white dark:bg-gray-800
                                            ${phoneError ? 'border border-red-500' : 'border border-gray-300 dark:border-gray-600'}
                                            focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500
                                        `} ref={dropdownRef}>
                                            {/* Country Code Selector and Phone Number Input (Same logic) */}
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                                    className={`
                                                        bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200 py-3 pl-3 pr-2 border-r border-gray-300 dark:border-gray-600 
                                                        focus:outline-none rounded-l-lg cursor-pointer flex items-center justify-between
                                                        w-auto min-w-[80px] max-w-[120px]
                                                        text-sm truncate hover:bg-gray-200 dark:hover:bg-gray-600 transition duration-150
                                                        ${isDropdownOpen ? 'bg-gray-200 dark:bg-gray-600' : ''}
                                                    `}
                                                    disabled={countryCodes.length === 0 || isProcessing}
                                                >
                                                    {countryCodes.length === 0 ? (
                                                        <span className="text-gray-500 dark:text-gray-400">...</span>
                                                    ) : (
                                                        <>
                                                            <span>{selectedCountry?.flag}</span>
                                                            <span className="mx-1 font-semibold">{selectedCountry?.code}</span>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`ml-1 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
                                                        </>
                                                    )}
                                                </button>
                                                
                                                {/* Dropdown Panel with Search (Same logic) */}
                                                {isDropdownOpen && countryCodes.length > 0 && (
                                                    <div className="absolute z-10 top-full left-0 mt-1 w-72 max-h-80 overflow-y-auto bg-white dark:bg-gray-700 rounded-lg shadow-xl border border-gray-200 dark:border-indigo-500/50">
                                                        <div className="p-2 sticky top-0 bg-white dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 z-20">
                                                            <input
                                                                type="text"
                                                                placeholder="Search country or code..."
                                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                                                                value={searchQuery}
                                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                                autoFocus
                                                                onFocus={(e) => e.currentTarget.select()}
                                                            />
                                                        </div>
                                                        <ul className="p-1">
                                                            {filteredCodes.length > 0 ? (
                                                                filteredCodes.map(({ code, flag, name }) => (
                                                                    <li
                                                                        key={code}
                                                                        className={`
                                                                            p-2 text-sm rounded-md cursor-pointer flex justify-between items-center
                                                                            ${code === dialCode ? 'bg-indigo-600 text-white' : 'text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'}
                                                                        `}
                                                                        onClick={() => handleSelectCountry(code)}
                                                                    >
                                                                        <span className="font-medium truncate">{flag} {name}</span>
                                                                        <span className={`${code === dialCode ? 'font-bold' : 'text-gray-600 dark:text-gray-400'}`}>{code}</span>
                                                                    </li>
                                                                ))
                                                            ) : (
                                                                <li className="p-2 text-sm text-gray-600 dark:text-gray-400 text-center">No countries found.</li>
                                                            )}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Phone Number Input (Same logic) */}
                                            <input
                                                type="tel"
                                                placeholder="Enter phone number"
                                                value={localNumber}
                                                onChange={handleNumberChange}
                                                className="w-full px-4 py-3 bg-transparent text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none rounded-r-lg"
                                                required
                                                autoComplete="tel-national"
                                                disabled={countryCodes.length === 0 || isProcessing}
                                            />
                                        </div>
                                        {countryCodes.length === 0 ? (
                                            <div className="flex items-center text-indigo-500 text-xs mt-1">
                                                <Globe className="w-3 h-3 mr-1 animate-spin" />
                                                Fetching country codes...
                                            </div>
                                        ) : phoneError && (
                                            <p className="text-red-500 text-xs mt-1">{phoneError}</p>
                                        )}
                                    </div>
                                    
                                    {/* Password Input (Unchanged) */}
                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                id="password"
                                                value={password}
                                                onChange={(e) => {
                                                    setPassword(e.target.value);
                                                    setPasswordError(null);
                                                }}
                                                placeholder="Minimum 8 characters"
                                                className={`w-full px-4 py-3 pr-12 bg-white dark:bg-gray-800 border rounded-lg text-sm text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition ${passwordError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                                required
                                                disabled={isProcessing}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition duration-150"
                                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                        {passwordError && <p className="text-red-500 text-xs mt-1">{passwordError}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Razorpay Payment Info (REPLACED CONTENT) */}
                        <div className="h-full">
                            <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-700 rounded-xl h-full flex flex-col justify-center items-center text-center">
                                
                                {/* Card Preview (Visual Element) - RETAINED FOR BRANDING/UX */}
                                <div className="w-full h-48 bg-gradient-to-br from-indigo-700 to-indigo-900 rounded-xl p-5 shadow-2xl relative overflow-hidden text-white font-mono transition-all duration-300 border border-indigo-600">
                                    <div className="absolute top-0 right-0 w-2/3 h-full rounded-l-full opacity-10 bg-teal-400 transform translate-x-1/2 -translate-y-1/2"></div>
                                    <div className="absolute bottom-0 left-0 w-1/2 h-1/2 rounded-r-full opacity-10 bg-white transform -translate-x-1/4 translate-y-1/4"></div>

                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <CreditCard className="w-7 h-7 text-white" />
                                        <Wifi className="w-6 h-6 text-teal-400 transform rotate-90" />
                                    </div>

                                    <p className="text-2xl tracking-widest relative z-10 mb-4">
                                        #### #### #### ####
                                    </p>

                                    <div className="flex justify-between items-center text-sm mt-5 relative z-10">
                                        <div>
                                            <p className="text-xs text-indigo-300 mb-1">Payment via</p>
                                            <p className="font-semibold uppercase truncate w-32">Razorpay</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-indigo-300 mb-1">Secured by</p>
                                            <p className="font-semibold">HTTPS/SSL</p>
                                        </div>
                                    </div>
                                </div>
                                {/* End Card Preview */}

                                {/* Payment Details Header and Info */}
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pt-4 pb-2 border-t border-gray-200 dark:border-gray-600">
                                        Secure Payment
                                    </h4>
                                    
                                    <div className="text-gray-700 dark:text-gray-300 space-y-3">
                                        <p className="text-center">
                                            Click the button below to open the secure **Razorpay** popup.
                                        </p>
                                        <p className="font-medium text-sm text-center">
                                            You can complete your payment using **UPI, Netbanking, or Card** within the popup window.
                                        </p>
                                        <div className="flex items-center justify-center text-sm text-indigo-600 dark:text-indigo-400">
                                            <IndianRupee className="w-4 h-4 mr-1" />
                                            We only accept payments in Indian Rupees (INR).
                                        </div>
                                    </div>
                                    
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button - Triggers Order Creation and Razorpay Popup */}
                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="submit"
                            className="cursor-pointer w-full py-4 bg-indigo-600 text-white text-lg font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition transform hover:scale-[1.005] duration-300 ease-in-out disabled:bg-indigo-400 disabled:shadow-none flex items-center justify-center"
                            disabled={isProcessing || !plan}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                                    {window.Razorpay ? 'Waiting for Payment...' : 'Creating Order...'} 
                                </>
                            ) : (
                                <>
                                    Pay {formatCurrency(plan.price)}
                                    <Lock className="w-5 h-5 ml-2" />
                                </>
                            )}
                        </button>
                        
                        {/* Footer (Unchanged) */}
                        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4 flex items-center justify-center">
                            <Lock className="w-4 h-4 mr-1" />
                            Secure payment processing via Razorpay.
                        </p>

                        <div className="text-center pt-4">
                            <button 
                                type="button" 
                                onClick={onBackToDashboard} 
                                className="cursor-pointer text-sm text-gray-600 dark:text-gray-500 hover:text-indigo-400 transition flex items-center mx-auto"
                                disabled={isProcessing}
                            >
                                <ArrowLeft className="w-4 h-4 mr-1 cursor-pointer" /> Cancel and go back
                            </button>
                        </div>
                    </div>

                </form>

            </div>
        </div>
    );
};

export default Checkout;