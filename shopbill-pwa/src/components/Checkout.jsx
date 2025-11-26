import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ShoppingCart, CreditCard, CheckCircle, Lock, ArrowLeft, Loader, IndianRupee, Wifi, AlertTriangle, Eye, EyeOff, Globe, Building } from 'lucide-react';
import API from '../config/api';
import apiClient from '../lib/apiClient';
import axios from 'axios';
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
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
    }).format(amount);
};
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
const validateShopName = (name) => {
    if (!name || name.trim() === '') return 'Shop name is required.';
    if (name.length < 3) return 'Shop name must be at least 3 characters.';
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
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [shopName, setShopName] = useState('');
    const [emailError, setEmailError] = useState(null);
    const [phoneError, setPhoneError] = useState(null);
    const [passwordError, setPasswordError] = useState(null);
    const [shopNameError, setShopNameError] = useState(null);
    const [dialCode, setDialCode] = useState('+91');
    const [localNumber, setLocalNumber] = useState('');
    const [phone, setPhone] = useState('+91');
    const [countryCodes, setCountryCodes] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [paymentError, setPaymentError] = useState(null);
    const selectedCountry = countryCodes.find(c => c.code === dialCode);
    const filteredCodes = useMemo(() => {
        if (!searchQuery) return countryCodes;
        const query = searchQuery.toLowerCase();
        return countryCodes.filter(c =>
            c.name.toLowerCase().includes(query) ||
            c.code.includes(query)
        );
    }, [countryCodes, searchQuery]);
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
    useEffect(() => {
        fetchCountryCodes();
    }, [fetchCountryCodes]);
    useEffect(() => {
        if (dialCode) {
            const sanitizedLocalNumber = localNumber.replace(/\D/g, '');
            const fullNumber = dialCode + sanitizedLocalNumber;
            if (fullNumber !== phone) {
                setPhone(fullNumber);
            }
        }
    }, [dialCode, localNumber, phone]);
    useEffect(() => {
        if (countryCodes.length > 0 && !dialCode) {
            setDialCode('+91');
        }
    }, [countryCodes, dialCode]);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const handleSelectCountry = (code) => {
        setDialCode(code);
        setIsDropdownOpen(false);
        setSearchQuery('');
        if (phoneError) setPhoneError(null);
    };
    const handleNumberChange = (e) => {
        const sanitizedNumber = e.target.value.replace(/\D/g, '');
        setLocalNumber(sanitizedNumber);
        if (phoneError) setPhoneError(null);
    };
    useEffect(() => {
        if (!plan) {
            setPaymentError("Invalid subscription plan selected. Please go back.");
        }
    }, [plan]);
    const handlePaymentSubmit = useCallback(async (e) => {
        e.preventDefault();
        setPaymentError(null);
        setEmailError(null);
        setPhoneError(null);
        setPasswordError(null);
        setShopNameError(null);
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
        const shopNameValidation = validateShopName(shopName);
        if (shopNameValidation) {
            setShopNameError(shopNameValidation);
            return;
        }
        if (!password || password.length < 8) {
            setPasswordError('Password must be 8 or more characters long.');
            return;
        }
        setIsProcessing(true);
        try {
            const razorpayLoad = await loadRazorpayScript('https://checkout.razorpay.com/v1/checkout.js');
            if (!razorpayLoad) {
                setPaymentError('Failed to load the Razorpay payment script. Check your network.');
                setIsProcessing(false);
                return;
            }
            const createSubscriptionUrl = `${API.createSubscription}`; // Using the new subscription endpoint
            const subscriptionResponse = await apiClient.post(createSubscriptionUrl, {
                plan: planKey,
            });
            const { subscriptionId, currency, amount, keyId } = subscriptionResponse.data;
            if (!subscriptionId) {
                setPaymentError("Failed to initiate subscription mandate. Subscription ID missing from server.");
                setIsProcessing(false);
                return;
            }
            const options = {
                key: keyId,
                amount: amount, // This is the ₹1 verification charge (100 paise)
                currency: currency,
                name: 'Pocket POS Subscription',
                description: `Setup Mandate for ${plan.name} (1 Rupee verification)`,
                subscription_id: subscriptionId, // <<--- CRITICAL CHANGE: Use subscription_id
                handler: async (response) => {
                    setIsProcessing(true);
                    try {
                        const verifyUrl = `${API.verifySubscription}`; // Using the new verification endpoint
                        const verificationResponse = await apiClient.post(verifyUrl, {
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            razorpay_subscription_id: response.razorpay_subscription_id || subscriptionId,
                        });
                        const { success: verificationSuccess, transactionId } = verificationResponse.data;
                        if (verificationSuccess && transactionId) {
                            console.log('Subscription mandate verified. Creating user account with subscription ID:', transactionId);
                            const signupResponse = await apiClient.post(API.signup, {
                                email: email.toLowerCase().trim(),
                                password: password,
                                phone: phone,
                                plan: planKey,
                                transactionId: transactionId, // This is the Subscription ID
                                shopName: shopName,
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
                                setPaymentError("Account creation failed after verified mandate. Contact support.");
                                setIsProcessing(false);
                            }
                        } else {
                            setPaymentError('Subscription mandate verification failed. Please try again or contact support.');
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
                    name: shopName || 'POS Shop Owner',
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
            console.error('Initial Subscription Creation Error:', error);
            if (error.response?.data?.error) {
                setPaymentError(error.response.data.error);
            } else if (error.response?.data?.message) {
                setPaymentError(error.response.data.message);
            } else {
                setPaymentError("Failed to connect to the server or create subscription mandate.");
            }
            setIsProcessing(false);
        }

    }, [plan, planKey, email, phone, password, shopName, onPaymentSuccess]);
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
                    <h2 className="text-3xl font-extrabold text-white mt-4">Subscription Mandate Successful!</h2>
                    <p className="text-gray-400 mt-2">
                        Your account has been created and your 30-day free trial has begun. Redirecting you to login...
                    </p>
                </div>
            </div>
        );
    }
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4 font-sans">
            <div className="w-full max-w-5xl bg-white dark:bg-gray-800 p-8 md:p-10 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
                <div className="text-center mb-8">
                    <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
                        Complete Registration & Start Free Trial
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">Secure your subscription mandate to begin your 30-day free trial.</p>
                </div>
                {paymentError && (
                    <div className="p-4 mb-6 text-sm bg-red-800 text-red-100 rounded-lg text-center" role="alert">
                        {paymentError}
                    </div>
                )}
                <form onSubmit={handlePaymentSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                        <div className="h-full">
                            <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-700 rounded-xl h-full flex flex-col">
                                <div className='flex-grow'>
                                    <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                                        Owner & Shop Details
                                    </h4>
                                    <div className="mb-6">
                                        <label htmlFor="shopName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Shop/Business Name</label>
                                        <div className='relative'>
                                            <Building className='w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' />
                                            <input
                                                type="text"
                                                id="shopName"
                                                value={shopName}
                                                onChange={(e) => {
                                                    setShopName(e.target.value);
                                                    setShopNameError(null);
                                                }}
                                                placeholder="Ex: Sharma General Store"
                                                className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border rounded-lg text-sm text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition ${shopNameError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                                required
                                                disabled={isProcessing}
                                            />
                                        </div>
                                        {shopNameError && <p className="text-red-500 text-xs mt-1">{shopNameError}</p>}
                                    </div>
                                    <div className="mb-6">
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address (for Login)</label>
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
                                    <div className="mb-6">
                                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
                                        <div className={`
                                            w-full flex rounded-lg transition duration-150 bg-white dark:bg-gray-800
                                            ${phoneError ? 'border border-red-500' : 'border border-gray-300 dark:border-gray-600'}
                                            focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500
                                        `} ref={dropdownRef}>
                                            {/* Country Code Selector */}
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                                    className={`
                                                        bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200 py-[0.865rem] pl-3 pr-2 border-r border-gray-300 dark:border-gray-600 
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
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`ml-1 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
                                                        </>
                                                    )}
                                                </button>
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
                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password (for Login)</label>
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
                        <div className="h-full">
                            <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-700 rounded-xl h-full flex flex-col justify-start">
                                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                    Your Subscription
                                </h4>
                                <div className={`p-6 mt-2 rounded-xl ${plan.color} text-white shadow-2xl flex flex-col justify-between`}>

                                    {/* Header: Plan Name and Interval */}
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-2xl font-bold flex items-center">
                                            {/* Replace with your actual imported icon component, e.g., <ShoppingCart className="w-6 h-6 mr-3" /> */}
                                            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                            {plan.name}
                                        </h4>
                                        <span className="text-sm font-medium uppercase border border-white/70 px-3 py-1 rounded-full bg-white/10">
                                            {plan.interval}
                                        </span>
                                    </div>

                                    {/* Section 1: Verification Charge (Prominently Displayed) */}
                                    <div className="border-t border-white/30 pt-4 pb-4">
                                        <p className="text-sm text-white/90 mb-2 font-medium">Total Due Today (Start of Trial):</p>

                                        <div className="flex items-baseline">
                                            <p className="text-5xl font-extrabold mr-3">{formatCurrency(1)}</p>
                                            <span className="text-lg font-semibold text-green-300">
                                                (Verification Charge)
                                            </span>
                                        </div>
                                        <p className="text-xs text-white/70 mt-1">
                                            This amount is <strong>instantly refunded</strong> after successful card verification.
                                        </p>
                                    </div>

                                    {/* Section 2: Full Plan Charge (Trial Information) */}
                                    <div className="border-t border-white/30 pt-4">
                                        <p className="text-sm text-white/90 mb-1 font-medium">Monthly Charge After Trial:</p>
                                        <p className="text-4xl font-extrabold">{formatCurrency(plan.price)}</p>
                                        <p className="text-sm text-white/80 mt-2">
                                            Full plan charge will begin <strong>after your 30-day free trial</strong> ends.
                                        </p>
                                    </div>

                                </div>
                                {/* <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 pt-4 border-t border-gray-300 dark:border-gray-600">
                                    Secure Mandate Setup
                                </h4>
                                <div className="w-full h-48 bg-gradient-to-br from-indigo-700 to-indigo-900 rounded-xl p-5 shadow-2xl relative overflow-hidden text-white font-mono transition-all duration-300 border border-indigo-600">
                                    <div className="absolute top-0 right-0 w-2/3 h-full rounded-l-full opacity-10 bg-teal-400 transform translate-x-1/2 -translate-y-1/2"></div>
                                    <div className="absolute bottom-0 left-0 w-1/2 h-1/2 rounded-r-full opacity-10 bg-white transform -translate-x-1/4 translate-y-1/4"></div>
                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <CreditCard className="w-7 h-7 text-white" />
                                        <Wifi className="w-6 h-6 text-teal-400 transform rotate-90" />
                                    </div>
                                    <p className="text-2xl tracking-widest relative z-10 mb-4">
                                        •••• •••• •••• ••••
                                    </p>
                                    <div className="flex justify-between items-center text-sm mt-5 relative z-10">
                                        <div>
                                            <p className="text-xs text-indigo-300 mb-1">Payment Processor</p>
                                            <p className="font-semibold uppercase truncate w-32">Razorpay</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-indigo-300 mb-1">Secured by</p>
                                            <p className="font-semibold flex items-center">
                                                <Lock className='w-3 h-3 mr-1' /> HTTPS/SSL
                                            </p>
                                        </div>
                                    </div>
                                </div> */}
                            </div>
                        </div>
                    </div>
                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="submit"
                            className="cursor-pointer w-full py-4 bg-indigo-600 text-white text-lg font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition transform hover:scale-[1.005] duration-300 ease-in-out disabled:bg-indigo-400 disabled:shadow-none flex items-center justify-center"
                            disabled={isProcessing || !plan}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                                    {window.Razorpay ? 'Processing Mandate...' : 'Creating Mandate...'}
                                </>
                            ) : (
                                <>
                                    <Lock className="w-5 h-5 mr-2" />
                                    Setup Mandate & Start Free Trial
                                </>
                            )}
                        </button>
                        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4 flex items-center justify-center">
                            <Lock className="w-4 h-4 mr-1" />
                            By clicking 'Setup Mandate', you agree to our Terms and Conditions.
                        </p>
                        <div className="text-center pt-4">
                            <button
                                type="button"
                                onClick={onBackToDashboard}
                                className="cursor-pointer text-sm text-gray-600 dark:text-gray-500 hover:text-indigo-400 transition flex items-center mx-auto"
                                disabled={isProcessing}
                            >
                                <ArrowLeft className="w-4 h-4 mr-1 cursor-pointer" /> Cancel and go back to plans
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
export default Checkout;