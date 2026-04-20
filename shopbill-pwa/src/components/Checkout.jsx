import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
    ShoppingCart, CreditCard, CheckCircle, Lock, ArrowLeft, 
    Loader, IndianRupee, Wifi, AlertTriangle, Eye, EyeOff, 
    Globe, Building, ShieldCheck, Zap, XCircle
} from 'lucide-react';
import API from '../config/api';
import apiClient from '../lib/apiClient';
import axios from 'axios';

// Feature lists aligned with landing page (included + excluded)
const PLAN_DETAILS = {
    BASIC: {
        name: 'Small Shop',
        price: 999,
        interval: 'monthly',
        color: 'from-gray-600 to-gray-800',
        featured: false,
        tagline: 'For single-outlet starters',
        items: ['Unlimited Billing', '3 Staff User accounts', 'Standard Inventory', 'Full Digital Khata', 'Sales reports', 'Employee Audit Logs'],
        excludedItems: ['Supplier Management', 'Realtime team chat system', 'Auto SMS Payment Reminders', 'Multishop management'],
    },
    PRO: {
        name: 'Growing Business',
        price: 2199,
        interval: 'monthly',
        color: 'from-indigo-600 via-indigo-500 to-teal-600',
        featured: true,
        tagline: 'Best value for growth',
        badge: 'RECOMMENDED',
        valueNote: '₹73/day · Most chosen',
        items: ['Unlimited Billing', 'Unlimited Staff & Managers', 'Smart Stock & Auto-PO', 'Auto SMS Payment Reminders', 'Supplier Management', 'Sales reports', 'Realtime team chat system', 'Employee Audit Logs'],
        excludedItems: ['Multishop management'],
    },
    PREMIUM: {
        name: 'Big Enterprise',
        price: 4999,
        interval: 'monthly',
        color: 'from-slate-600 to-slate-800',
        featured: false,
        tagline: 'For multi-store chains',
        items: ['Unlimited Billing', 'Unlimited Staff & Managers', 'Smart Stock & Auto-PO', 'Auto SMS Payment Reminders', 'Supplier Management', 'Sales reports', 'Realtime team chat system', 'Employee Audit Logs', 'Multishop management', 'Up to 10 outlets management'],
        excludedItems: [],
    }
};

const BUSINESS_TYPE_CONTENT = {
    grocery: {
        label: 'Supermarket / Grocery',
        hint: 'Optimized for FMCG, barcode billing, shelf stock, and supplier flow.'
    },
    textile: {
        label: 'Textile / Dress Shop',
        hint: 'Includes support-focused flow for size/color variants, seasonal collections, and style-wise selling.'
    }
};

const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required.';
    if (/\s/.test(email)) return 'Email cannot contain spaces.';
    if (!emailRegex.test(email)) return 'Please enter a valid email address.';
    return null;
};

const validatePhoneNumber = (localNumber) => {
    if (!localNumber || localNumber.trim() === '') return 'Mobile number is required.';
    const digits = localNumber.replace(/\D/g, '');
    if (digits.length !== 10) return 'Mobile number must be 10 digits.';
    return null;
};

const validateShopName = (name) => {
    if (!name || name.trim() === '') return 'Shop name is required.';
    if (name.length < 3) return 'Shop name must be at least 3 characters.';
    return null;
};

const loadRazorpayScript = (src) => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const Checkout = ({ plan: planKey, setCurrentPage, onBackToLogin, onBackToPlans, showToast, darkMode = true, API }) => {
    const fromCreateAccount = !planKey;
    const [detailsComplete, setDetailsComplete] = useState(!fromCreateAccount); // true when from landing (plan pre-selected)
    const [selectedPlanInCheckout, setSelectedPlanInCheckout] = useState(planKey || 'PRO'); // Default to Pro (best value)
    const effectivePlanKey = planKey || selectedPlanInCheckout;
    const plan = useMemo(() => PLAN_DETAILS[effectivePlanKey] || null, [effectivePlanKey]);
    useEffect(() => {
        if (planKey) setSelectedPlanInCheckout(planKey);
    }, [planKey]);
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [shopName, setShopName] = useState('');
    const [businessType, setBusinessType] = useState('grocery');
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
    const [accountExistsError, setAccountExistsError] = useState(false);

    const selectedCountry = useMemo(() => 
        countryCodes.find(c => c.code === dialCode) || { flag: '🇮🇳', code: '+91', name: 'India' }
    , [countryCodes, dialCode]);

    const filteredCodes = useMemo(() => {
        if (!searchQuery) return countryCodes;
        const query = searchQuery.toLowerCase();
        return countryCodes.filter(c => c.name.toLowerCase().includes(query) || c.code.includes(query));
    }, [countryCodes, searchQuery]);

    const fetchCountryCodes = useCallback(async () => {
        try {
            const response = await axios.get('https://restcountries.com/v3.1/all?fields=name,idd,flag');
            const data = response.data;
            const codes = data.map(country => {
                const root = country.idd.root || '';
                const suffixes = country.idd.suffixes || [];
                const fullCode = suffixes.length > 0 ? `${root}${suffixes[0]}` : root;
                if (!fullCode) return null;
                return { code: fullCode, flag: country.flag, name: country.name.common, sortName: country.name.common };
            }).filter(Boolean).reduce((acc, current) => {
                if (!acc.find(item => item.code === current.code)) return acc.concat([current]);
                return acc;
            }, []).sort((a, b) => a.sortName.localeCompare(b.sortName));
            setCountryCodes(codes.length > 0 ? codes : [{ code: '+91', flag: '🇮🇳', name: 'India' }]);
        } catch (error) {
            setCountryCodes([{ code: '+91', flag: '🇮🇳', name: 'India' }]);
        }
    }, []);

    useEffect(() => { fetchCountryCodes(); }, [fetchCountryCodes]);
    
    useEffect(() => {
        const sanitizedLocalNumber = localNumber.replace(/\D/g, '');
        setPhone(dialCode + sanitizedLocalNumber);
    }, [dialCode, localNumber]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectCountry = (code) => {
        setDialCode(code);
        setIsDropdownOpen(false);
        setSearchQuery('');
        setPhoneError(null);
    };

    const handleProceedToPlanSelection = async (e) => {
        e.preventDefault();
        setPaymentError(null);
        setAccountExistsError(false);
        const emailV = validateEmail(email);
        const phoneV = validatePhoneNumber(localNumber);
        const shopV = validateShopName(shopName);
        const pwdV = (!password || password.length < 8) ? 'Password must be 8+ characters.' : null;
        setEmailError(emailV);
        setPhoneError(phoneV);
        setShopNameError(shopV);
        setPasswordError(pwdV);
        if (emailV || phoneV || shopV || pwdV) return;
        const fullPhone = (dialCode + localNumber.replace(/\D/g, '')).trim();
        setIsProcessing(true);
        try {
            const res = await apiClient.post(API?.checkAvailability ?? 'auth/check-availability', {
                email: email?.trim()?.toLowerCase() || undefined,
                phone: fullPhone || undefined,
            });
            if (res.data?.exists) {
                setAccountExistsError(true);
                setPaymentError('An account with this email or phone already exists. Use a different one or ');
                return;
            }
            setDetailsComplete(true);
        } catch (err) {
            setPaymentError(err.response?.data?.error || 'Could not verify. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleNumberChange = (e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
        setLocalNumber(digits);
        setPhoneError(null);
    };

    const handlePaymentSubmit = useCallback(async (e) => {
        e.preventDefault();
        setPaymentError(null);
        const emailV = validateEmail(email);
        const phoneV = validatePhoneNumber(localNumber);
        const shopV = validateShopName(shopName);
        const pwdV = (!password || password.length < 8) ? 'Password must be 8+ characters.' : null;
        setEmailError(emailV);
        setPhoneError(phoneV);
        setShopNameError(shopV);
        setPasswordError(pwdV);
        if (emailV || phoneV || shopV || pwdV) return;

        setIsProcessing(true);
        try {
            const razorpayLoad = await loadRazorpayScript('https://checkout.razorpay.com/v1/checkout.js');
            if (!razorpayLoad) throw new Error('Razorpay failed to load.');

            const subscriptionResponse = await apiClient.post(API.createSubscription, { plan: effectivePlanKey || 'BASIC' });
            const { subscriptionId, currency, amount, keyId } = subscriptionResponse.data;

            const options = {
                key: keyId, amount, currency, name: 'Pocket POS',
                description: `Mandate for ${plan.name}`,
                subscription_id: subscriptionId,
                handler: async (response) => {
                    setIsProcessing(true);
                    try {
                        const vResp = await apiClient.post(API.verifySubscription, {
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            razorpay_subscription_id: response.razorpay_subscription_id || subscriptionId,
                        });
                        if (vResp.data.success) {
                            await apiClient.post(API.signup, {
                                email: email.toLowerCase().trim(), password, phone, plan: effectivePlanKey || 'BASIC',
                                transactionId: vResp.data.transactionId, shopName, businessType
                            });
                            setPaymentSuccess(true);
                            setTimeout(() => {
                                showToast('Account created successfully! Please login.', 'success');
                                window.location.reload(); 
                            }, 3000);
                        }
                    } catch (err) { 
                        setPaymentError(err.response?.data?.error || 'Verification failed.'); 
                        setIsProcessing(false); 
                    }
                },
                prefill: { email, contact: phone, name: shopName },
                theme: { color: '#4f46e5' },
                modal: { ondismiss: () => setIsProcessing(false) }
            };
            new window.Razorpay(options).open();
        } catch (error) {
            setPaymentError(error.response?.data?.error || "Connection failed.");
            setIsProcessing(false);
        }
    }, [plan, effectivePlanKey, email, phone, password, shopName, businessType, showToast, localNumber]);

    const bgColor = darkMode ? 'bg-gray-950' : 'bg-slate-50';
    const textColor = darkMode ? 'text-white' : 'text-slate-900';
    const cardBg = darkMode ? 'bg-gray-900' : 'bg-white';
    const cardBorder = darkMode ? 'border-emerald-500/30' : 'border-emerald-300';
    const descColor = darkMode ? 'text-gray-400' : 'text-slate-600';
    const sectionBg = darkMode ? 'bg-gray-950' : 'bg-slate-50';
    const sectionCardBg = darkMode ? 'bg-gray-900/50' : 'bg-white';
    const sectionBorder = darkMode ? 'border-gray-800' : 'border-slate-200';
    const inputBg = darkMode ? 'bg-gray-950' : 'bg-white';
    const inputBorder = darkMode ? 'border-gray-800' : 'border-slate-300';
    const inputText = darkMode ? 'text-white' : 'text-slate-900';
    const placeholderColor = darkMode ? 'placeholder:text-gray-700' : 'placeholder:text-slate-400';
    const labelColor = darkMode ? 'text-gray-500' : 'text-slate-600';
    const iconColor = darkMode ? 'text-gray-500' : 'text-slate-500';
    const dropdownBg = darkMode ? 'bg-gray-900' : 'bg-white';
    const dropdownBorder = darkMode ? 'border-gray-800' : 'border-slate-300';
    const dropdownText = darkMode ? 'text-gray-200' : 'text-slate-700';
    const dropdownSearchBg = darkMode ? 'bg-gray-950' : 'bg-slate-50';
    const dropdownSearchBorder = darkMode ? 'border-gray-800' : 'border-slate-300';
    const dropdownSearchText = darkMode ? 'text-white' : 'text-slate-900';
    const dropdownHover = darkMode ? 'hover:bg-indigo-600' : 'hover:bg-indigo-50';
    const infoBg = darkMode ? 'bg-gray-900/50' : 'bg-slate-100';
    const infoBorder = darkMode ? 'border-gray-800' : 'border-slate-200';
    const infoText = darkMode ? 'text-gray-500' : 'text-slate-600';
    const phoneButtonBg = darkMode ? 'bg-gray-900' : 'bg-slate-100';
    const phoneButtonText = darkMode ? 'text-gray-300' : 'text-slate-700';
    const phoneButtonHover = darkMode ? 'hover:bg-gray-900' : 'hover:bg-slate-200';
    const phoneInputBg = darkMode ? 'bg-transparent' : 'bg-transparent';
    const phoneInputText = darkMode ? 'text-white' : 'text-slate-900';
    const phoneBorder = darkMode ? 'border-gray-800' : 'border-slate-300';
    const phoneBorderFocus = darkMode ? 'focus-within:border-indigo-500' : 'focus-within:border-indigo-500';

    if (paymentSuccess) return (
        <div className={`min-h-screen ${bgColor} flex items-center justify-center p-6 ${textColor} transition-colors duration-300`}>
            <div className={`max-w-md w-full ${cardBg} p-8 rounded-3xl border ${cardBorder} text-center shadow-2xl transition-colors duration-300`}>
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-emerald-500 animate-pulse" />
                </div>
                <h2 className={`text-2xl font-black tracking-tighter mb-4 ${textColor} transition-colors duration-300`}>You're All Set!</h2>
                <p className={`${descColor} font-bold leading-relaxed mb-6 transition-colors duration-300`}>Account created. Your 30-day trial has started.</p>
                <div className="flex items-center justify-center space-x-2 text-indigo-400 font-bold">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-xs">Redirecting to Login...</span>
                </div>
            </div>
        </div>
    );

    return (
        <main className={`min-h-screen ${bgColor} flex flex-col items-center p-0 sm:p-6 lg:p-12 font-sans transition-all duration-500`}>
            <div className={`flex-1 w-full max-w-6xl flex flex-col items-center min-h-0 ${fromCreateAccount && !detailsComplete ? 'justify-center' : ''}`}>
                
                {/* Main Container Card */}
                <section className={`w-full ${sectionBg} sm:${sectionCardBg} sm:backdrop-blur-2xl sm:rounded-[2.5rem] sm:border sm:${sectionBorder} shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden transition-all duration-300`}>
                    <div className="flex flex-col lg:grid lg:grid-cols-12 min-h-[600px]">
                        
                        {/* LEFT SIDE: Plan Selection / Summary */}
                        {!(fromCreateAccount && !detailsComplete) && (
                            <div className={`${fromCreateAccount && detailsComplete ? 'lg:col-span-12' : 'lg:col-span-5'} ${darkMode ? 'bg-gray-900/40' : 'bg-slate-50/50'} p-6 lg:p-12 border-b lg:border-b-0 lg:border-r ${sectionBorder} transition-colors duration-300`}>
                                {(fromCreateAccount && detailsComplete) || !plan ? (
                                    <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                                        <div className="flex items-center gap-2 mb-6">
                                            <div className="h-1 w-12 bg-indigo-500 rounded-full"></div>
                                            <p className={`text-[11px] ${descColor} font-black uppercase tracking-widest`}>Choose Your Growth Engine</p>
                                        </div>
                                        
                                        <div className={`grid gap-4 ${fromCreateAccount && detailsComplete ? 'grid-cols-1 md:grid-cols-3' : 'flex flex-col'}`}>
                                            {(['BASIC', 'PRO', 'PREMIUM']).map((key) => {
                                                const p = PLAN_DETAILS[key];
                                                const isSelected = selectedPlanInCheckout === key;
                                                const isPro = key === 'PRO';
                                                return (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        onClick={() => setSelectedPlanInCheckout(key)}
                                                        className={`group relative w-full rounded-3xl border-2 text-left transition-all duration-300 
                                                            ${isPro
                                                                ? `bg-gradient-to-br ${p.color} text-white shadow-2xl shadow-indigo-500/20 hover:scale-[1.03] ${isSelected ? 'ring-4 ring-teal-400/50 border-white/50' : 'border-transparent'}`
                                                                : `${darkMode ? 'bg-gray-800/40 border-gray-700/50' : 'bg-white border-slate-200'} ${isSelected ? 'ring-4 ring-indigo-500/30 border-indigo-500' : 'hover:border-indigo-300'}`
                                                            } p-5 lg:p-6 active:scale-95`}
                                                    >
                                                        {p.featured && (
                                                            <div className="absolute -top-3 left-6 bg-gradient-to-r from-teal-400 to-emerald-400 text-gray-900 text-[9px] font-black tracking-tighter px-3 py-1 rounded-full shadow-lg z-20">
                                                                {p.badge || 'MOST POPULAR'}
                                                            </div>
                                                        )}
                                                        
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div>
                                                                <span className={`font-black text-lg block leading-none ${isPro ? 'text-white' : textColor}`}>{p.name}</span>
                                                                <span className={`text-[10px] font-bold mt-1 block opacity-80 ${isPro ? 'text-indigo-100' : descColor}`}>{p.tagline}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className={`text-xl font-black block ${isPro ? 'text-white' : textColor}`}>₹{p.price}</span>
                                                                <span className={`text-[10px] font-bold opacity-60 ${isPro ? 'text-white' : descColor}`}>/month</span>
                                                            </div>
                                                        </div>
    
                                                        <ul className="space-y-2 mb-2">
                                                            {(p.items || []).slice(0, 4).map((f, i) => (
                                                                <li key={i} className={`text-[10px] font-bold flex items-center gap-2 ${isPro ? 'text-white' : descColor}`}>
                                                                    <ShieldCheck size={14} className={`${isPro ? 'text-teal-300' : 'text-indigo-500'} shrink-0`} /> {f}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                        
                                                        {isSelected && (
                                                            <div className={`mt-4 pt-4 border-t ${isPro ? 'border-white/20' : 'border-gray-100'} flex items-center justify-between`}>
                                                                <span className="text-[10px] font-black uppercase tracking-tighter">Selected Plan</span>
                                                                <CheckCircle size={16} className={isPro ? 'text-white' : 'text-indigo-500'} />
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
    
                                        {fromCreateAccount && detailsComplete && (
                                            <div className="mt-10 animate-in fade-in zoom-in-95 duration-700">
                                                <form onSubmit={handlePaymentSubmit} className="max-w-md mx-auto space-y-4">
                                                    <button type="submit" disabled={!selectedPlanInCheckout || isProcessing} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black tracking-[0.2em] py-5 rounded-2xl transition-all hover:shadow-[0_20px_40px_-12px_rgba(79,70,229,0.4)] active:scale-95 flex items-center justify-center disabled:opacity-50 uppercase text-xs">
                                                        {isProcessing ? <Loader className="w-5 h-5 animate-spin" /> : <><Lock className="w-4 h-4 mr-2" /> Activate My Account</>}
                                                    </button>
                                                    <p className={`text-[10px] ${infoText} text-center font-bold opacity-60 italic`}>Secure 256-bit SSL encrypted payment</p>
                                                    <button type="button" onClick={() => setDetailsComplete(false)} className={`w-full text-[10px] font-black ${labelColor} hover:text-indigo-500 flex items-center justify-center py-2 transition-all uppercase tracking-widest`}>
                                                        <ArrowLeft size={14} className="mr-2" /> Edit Business Info
                                                    </button>
                                                </form>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col justify-between">
                                        <div className={`p-8 rounded-[2.5rem] bg-gradient-to-br ${plan.color} relative overflow-hidden shadow-2xl`}>
                                            <div className="absolute -right-8 -bottom-8 text-white/10 rotate-12">
                                                <ShoppingCart size={180} />
                                            </div>
                                            <div className="relative z-10">
                                                <span className="text-[10px] font-black tracking-widest bg-white/20 px-3 py-1 rounded-full text-white uppercase backdrop-blur-md">Your Selection</span>
                                                <h3 className="text-3xl lg:text-4xl font-black text-white mt-4 tracking-tighter">{plan.name}</h3>
                                                <div className="mt-8 pt-8 border-t border-white/20">
                                                    <div className="flex justify-between items-end">
                                                        <div>
                                                            <p className="text-white/60 text-[10px] font-black uppercase">Monthly Subscription</p>
                                                            <p className="text-3xl font-black text-white">₹{plan.price}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-white/60 text-[10px] font-black uppercase">Trial Deposit</p>
                                                            <p className="text-3xl font-black text-white">₹1</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`mt-8 p-6 ${infoBg} rounded-3xl border ${infoBorder} backdrop-blur-sm`}>
                                            <div className="flex items-start gap-4">
                                                <div className="p-2 bg-indigo-500/20 rounded-lg">
                                                    <ShieldCheck className="w-5 h-5 text-indigo-400" />
                                                </div>
                                                <div>
                                                    <h4 className={`text-xs font-black ${textColor} uppercase tracking-wider`}>Razorpay Secure</h4>
                                                    <p className={`text-[10px] font-bold ${infoText} mt-1 leading-relaxed`}>Your payment is processed securely. You can cancel your subscription at any time directly from your Pocket POS settings.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
    
                        {/* RIGHT SIDE: Account Details Form */}
                        {!(fromCreateAccount && detailsComplete) && (
                            <div className={`px-6 py-10 lg:p-16 ${fromCreateAccount && !detailsComplete ? 'lg:col-span-12 max-w-3xl mx-auto' : 'lg:col-span-7'} flex flex-col justify-center`}>
                                <header className="mb-1">
                                    <div className="inline-flex items-center space-x-2 bg-indigo-500/10 px-4 py-1.5 rounded-full mb-4">
                                        <Zap className="w-3.5 h-3.5 text-indigo-500" />
                                        <span className="text-[10px] font-black text-indigo-500 tracking-[0.2em] uppercase">30-Days Free Trail</span>
                                    </div>
                                </header>
    
                                <form onSubmit={fromCreateAccount && !detailsComplete ? handleProceedToPlanSelection : handlePaymentSubmit} noValidate className="space-y-8">
                                    {paymentError && (
                                        <div className="p-4 bg-red-500/10 border-l-4 border-red-500 rounded-r-xl text-red-500 text-[11px] font-bold animate-pulse">
                                            {paymentError}
                                        </div>
                                    )}
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                        <div className="md:col-span-2">
                                            <label className={`text-[11px] font-black ${labelColor} tracking-widest mb-3 block uppercase`}>Business Type</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {Object.entries(BUSINESS_TYPE_CONTENT).map(([key, value]) => {
                                                    const selected = businessType === key;
                                                    return (
                                                        <button
                                                            key={key}
                                                            type="button"
                                                            onClick={() => setBusinessType(key)}
                                                            className={`text-left rounded-2xl border-2 p-4 transition-all duration-300 ${
                                                                selected
                                                                    ? 'border-indigo-500 bg-indigo-500/5 ring-4 ring-indigo-500/10'
                                                                    : `${inputBorder} ${darkMode ? 'hover:border-gray-600' : 'hover:border-slate-300'} bg-transparent`
                                                            }`}
                                                        >
                                                            <p className={`text-xs font-black ${textColor}`}>{value.label}</p>
                                                            <p className={`text-[10px] mt-1 font-bold ${descColor} opacity-70`}>{value.hint}</p>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
    
                                        <div className="md:col-span-2">
                                            <InputField
                                                label={businessType === 'textile' ? 'Textile Brand Name' : 'Shop/Business Name'}
                                                id="shopName"
                                                icon={<Building className="w-4 h-4 opacity-50" />}
                                                value={shopName}
                                                error={shopNameError}
                                                onChange={(v) => { setShopName(v); setShopNameError(null); }}
                                                placeholder={businessType === 'textile' ? 'Ex: Trend Weaves' : 'Ex: Sharma Stores'}
                                                disabled={isProcessing}
                                                darkMode={darkMode}
                                            />
                                        </div>
    
                                        <InputField label="Email Address" id="email" type="text" inputMode="email" value={email} error={emailError} onChange={(v) => { setEmail(v); setEmailError(null); setAccountExistsError(false); setPaymentError(null); }} placeholder="owner@business.com" disabled={isProcessing} icon={<Globe className="w-4 h-4 opacity-50" />} darkMode={darkMode} />
                                        
                                        <div className="relative" ref={dropdownRef}>
                                            <label className={`text-[11px] font-black ${labelColor} tracking-widest mb-2 block uppercase`}>Mobile Number</label>
                                            <div className={`flex ${inputBg} rounded-2xl border-2 transition-all duration-300 ${phoneError ? 'border-red-500' : `${phoneBorder} focus-within:border-indigo-500`}`}>
                                                <button type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} className={`px-4 border-r ${phoneBorder} flex items-center space-x-2 text-sm font-bold ${phoneButtonText} hover:bg-indigo-500/5 transition-colors min-w-[90px]`}>
                                                    <span>{selectedCountry.flag}</span>
                                                    <span>{selectedCountry.code}</span>
                                                </button>
                                                <input type="tel" inputMode="numeric" maxLength={10} value={localNumber} onChange={(e) => { handleNumberChange(e); setAccountExistsError(false); setPaymentError(null); }} className={`flex-1 bg-transparent px-4 py-4 text-sm ${phoneInputText} focus:outline-none font-bold`} placeholder="9876543210" disabled={isProcessing} />
                                            </div>
                                            {isDropdownOpen && (
                                                <div className={`absolute z-[100] mt-2 w-full max-w-[300px] max-h-72 overflow-y-auto custom-scrollbar ${dropdownBg} border ${dropdownBorder} rounded-2xl shadow-2xl p-3 left-0 top-full animate-in fade-in zoom-in-95 duration-200`}>
                                                    <input type="text" placeholder="Search country..." className={`w-full ${dropdownSearchBg} border ${dropdownSearchBorder} rounded-xl px-4 py-2.5 text-xs ${dropdownSearchText} mb-3 outline-none focus:border-indigo-500 transition-colors`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                                    {filteredCodes.map(c => (
                                                        <div key={c.code} onClick={() => handleSelectCountry(c.code)} className={`flex justify-between items-center p-3 ${dropdownHover} rounded-xl cursor-pointer text-xs font-bold ${dropdownText} transition-all`}>
                                                            <span>{c.flag} {c.name}</span>
                                                            <span className="opacity-50">{c.code}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {phoneError && <p className="text-red-500 text-[10px] mt-1.5 font-bold ml-1">{phoneError}</p>}
                                        </div>
    
                                        <div className="relative md:col-span-2">
                                            <InputField label="Secure Password" id="password" type={showPassword ? 'text' : 'password'} value={password} error={passwordError} onChange={(v) => { setPassword(v); setPasswordError(null); }} placeholder="Create a strong password" disabled={isProcessing} icon={<Lock className="w-4 h-4 opacity-50" />} darkMode={darkMode} />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute right-5 top-11 ${iconColor} hover:text-indigo-500 transition-colors`}>
                                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                    </div>
    
                                    <div className="pt-8 border-t border-dashed border-gray-500/20">
                                        <button type="submit" disabled={isProcessing || (detailsComplete && !plan)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black tracking-[0.25em] py-5 rounded-[1.25rem] transition-all hover:shadow-[0_20px_40px_-12px_rgba(79,70,229,0.4)] active:scale-[0.97] flex items-center justify-center disabled:opacity-50 text-xs uppercase">
                                            {isProcessing ? <Loader className="w-6 h-6 animate-spin" /> : (fromCreateAccount && !detailsComplete) ? <><CreditCard className="w-5 h-5 mr-3" /> Select Plan & Continue</> : <><Lock className="w-5 h-5 mr-3" /> Start Free Trial</>}
                                        </button>
                                        <div className="flex flex-col items-center gap-4 mt-6">
                                            <p className={`text-[10px] ${infoText} text-center font-black tracking-widest uppercase opacity-60`}>
                                                {(fromCreateAccount && !detailsComplete) ? 'Step 1 of 2: Account Creation' : 'Authorization of ₹1 required for security'}
                                            </p>
                                            <button type="button" onClick={(e) => { e.preventDefault(); (planKey ? onBackToPlans : onBackToLogin)?.(); }} className={`text-[11px] font-black ${labelColor} hover:text-indigo-500 flex items-center transition-all uppercase tracking-widest group`}>
                                                <ArrowLeft size={14} className="mr-2 group-hover:-translate-x-1 transition-transform" /> {planKey ? 'Change Plan' : 'Return to Login'}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
};

const InputField = ({ label, id, type = 'text', value, onChange, placeholder, error, disabled, icon, darkMode = true, inputMode }) => {
    const labelColor = darkMode ? 'text-gray-500' : 'text-slate-600';
    const inputBg = darkMode ? 'bg-gray-950' : 'bg-white';
    const inputBorder = darkMode ? 'border-gray-800' : 'border-slate-300';
    const inputText = darkMode ? 'text-white' : 'text-slate-900';
    const placeholderColor = darkMode ? 'placeholder:text-gray-700' : 'placeholder:text-slate-400';
    const iconColor = darkMode ? 'text-gray-500' : 'text-slate-500';
    return (
    <div className="group w-full">
        <label htmlFor={id} className={`text-[10px] font-black ${labelColor} tracking-widest mb-2 block transition-colors group-focus-within:text-indigo-400 uppercase`}>{label}</label>
        <div className="relative">
            {icon && <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${iconColor} group-focus-within:text-indigo-400 transition-colors`}>{icon}</div>}
            <input 
                id={id} 
                type={type} 
                value={value} 
                onChange={(e) => onChange(e.target.value)} 
                disabled={disabled}
                placeholder={placeholder}
                inputMode={inputMode}
                className={`w-full ${inputBg} border ${error ? 'border-red-500' : `${inputBorder} group-focus-within:border-indigo-500`} rounded-2xl px-5 py-3.5 sm:py-3 text-sm font-bold ${inputText} ${placeholderColor} outline-none transition-all ${icon ? 'pl-11' : ''}`}
            />
        </div>
        {error && <p className="text-red-500 text-[9px] mt-1 font-bold tracking-tight">{error}</p>}
    </div>
    );
};

export default Checkout;