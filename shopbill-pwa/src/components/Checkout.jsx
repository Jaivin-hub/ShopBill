import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
    ShoppingCart, CreditCard, CheckCircle, Lock, ArrowLeft, 
    Loader, IndianRupee, Wifi, AlertTriangle, Eye, EyeOff, 
    Globe, Building, ShieldCheck, Zap, Smartphone
} from 'lucide-react';
import API from '../config/api';
import apiClient from '../lib/apiClient';
import axios from 'axios';

const PLAN_DETAILS = {
    BASIC: {
        name: 'Small Shop',
        price: 999,
        features: ['Unlimited Billing', '3 Staff Users', 'Standard Inventory', 'Full Digital Khata'],
        interval: 'monthly',
        color: 'from-gray-600 to-gray-800',
        featured: false,
        tagline: 'For single-outlet starters',
    },
    PRO: {
        name: 'Growing Business',
        price: 2199,
        features: ['Unlimited Billing', 'Unlimited Staff & Managers', 'Smart Stock & Auto-PO', 'Auto SMS Payment Reminders', 'Supplier Management'],
        interval: 'monthly',
        color: 'from-indigo-600 via-indigo-500 to-teal-600',
        featured: true,
        tagline: 'Best value for growth',
        badge: 'RECOMMENDED',
        valueNote: '₹73/day · Most chosen',
    },
    PREMIUM: {
        name: 'Big Enterprise',
        price: 4999,
        features: ['All Pro Features', 'Up to 10 Store Locations', 'Inventory Syncing', 'Employee Audit Logs', '24/7 Priority Support'],
        interval: 'monthly',
        color: 'from-slate-600 to-slate-800',
        featured: false,
        tagline: 'For multi-store chains',
    }
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
    if (!phoneRegex.test(phone)) return 'Use international format (e.g., +919876543210).';
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

const Checkout = ({ plan: planKey, setCurrentPage, onBackToLogin, onBackToPlans, showToast, darkMode = true }) => {
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

    const handleProceedToPlanSelection = (e) => {
        e.preventDefault();
        setPaymentError(null); setEmailError(null); setPhoneError(null); setPasswordError(null); setShopNameError(null);
        const emailV = validateEmail(email); if (emailV) return setEmailError(emailV);
        const phoneV = validatePhoneNumber(phone); if (phoneV) return setPhoneError(phoneV);
        const shopV = validateShopName(shopName); if (shopV) return setShopNameError(shopV);
        if (!password || password.length < 8) return setPasswordError('Password must be 8+ characters.');
        setDetailsComplete(true);
    };

    const handleNumberChange = (e) => {
        setLocalNumber(e.target.value.replace(/\D/g, ''));
        setPhoneError(null);
    };

    const handlePaymentSubmit = useCallback(async (e) => {
        e.preventDefault();
        setPaymentError(null); setEmailError(null); setPhoneError(null); setPasswordError(null); setShopNameError(null);
        const emailV = validateEmail(email); if (emailV) return setEmailError(emailV);
        const phoneV = validatePhoneNumber(phone); if (phoneV) return setPhoneError(phoneV);
        const shopV = validateShopName(shopName); if (shopV) return setShopNameError(shopV);
        if (!password || password.length < 8) return setPasswordError('Password must be 8+ characters.');

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
                                transactionId: vResp.data.transactionId, shopName
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
    }, [plan, effectivePlanKey, email, phone, password, shopName, showToast]);

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
        <main className={`min-h-screen ${bgColor} flex flex-col items-center p-0 sm:p-6 lg:p-8 font-sans transition-colors duration-300`}>
            <div className="flex-1 w-full flex flex-col items-center min-h-0">
            <section className={`max-w-5xl w-full ${sectionBg} sm:${sectionCardBg} sm:backdrop-blur-xl sm:rounded-[2rem] sm:border sm:${sectionBorder} shadow-2xl overflow-hidden transition-colors duration-300`}>
                <div className="flex flex-col lg:grid lg:grid-cols-12">
                    
                    {/* Compact Summary Side (Top on Mobile) - Plan selection only after details complete (Create Account) or plan summary when from landing */}
                    <div className={`${fromCreateAccount && detailsComplete ? 'lg:col-span-12' : 'lg:col-span-4'} ${sectionBg} sm:${sectionCardBg} p-3 sm:p-6 lg:p-10 border-b lg:border-b-0 lg:border-r ${sectionBorder} transition-colors duration-300`}>
                        {fromCreateAccount && !detailsComplete ? (
                            <div className={`p-4 sm:p-6 ${infoBg} rounded-2xl border ${infoBorder} transition-colors duration-300`}>
                                <div className="flex flex-col items-center gap-4">
                                    <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                                        <Building className={`w-7 h-7 sm:w-8 sm:h-8 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} strokeWidth={2} />
                                    </div>
                                    <div className="text-center">
                                        <h3 className={`text-sm font-black ${textColor} tracking-widest mb-2 uppercase`}>Step 1</h3>
                                        <p className={`text-[11px] font-bold ${infoText} leading-relaxed`}>Enter your business details on the right, then click Continue to choose your plan.</p>
                                    </div>
                                </div>
                            </div>
                        ) : (fromCreateAccount && detailsComplete) || !plan ? (
                            <div>
                                <h3 className={`text-sm font-black ${textColor} tracking-widest mb-1 uppercase`}>Choose your plan</h3>
                                <p className={`text-[10px] ${descColor} mb-4 font-bold`}>Pro gives you the best value to grow</p>
                                <div className={`grid gap-3 md:gap-4 ${fromCreateAccount && detailsComplete ? 'grid-cols-1 md:grid-cols-3 md:grid-rows-1' : 'space-y-3'}`}>
                                    {(['BASIC', 'PRO', 'PREMIUM']).map((key) => {
                                        const p = PLAN_DETAILS[key];
                                        const isSelected = selectedPlanInCheckout === key;
                                        const isPro = key === 'PRO';
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setSelectedPlanInCheckout(key)}
                                                className={`relative w-full rounded-2xl border-2 text-left transition-all duration-300 active:scale-[0.98]
                                                    ${isPro
                                                        ? `bg-gradient-to-br ${p.color} text-white shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/30 hover:scale-[1.02] ring-2 ${isSelected ? `ring-teal-400 ring-offset-2 border-teal-400/80 ${darkMode ? 'ring-offset-gray-950' : 'ring-offset-slate-50'}` : 'ring-transparent border-indigo-400/40'} md:scale-105 md:z-10`
                                                        : `${darkMode ? 'bg-gray-800/70 border-gray-700' : 'bg-slate-100 border-slate-300'} ${isSelected ? `ring-2 ring-indigo-500/50 ring-offset-2 border-indigo-500 ${darkMode ? 'ring-offset-gray-950' : 'ring-offset-slate-50'}` : 'hover:border-gray-600'}`
                                                    } p-4 ${p.featured ? 'pt-7' : ''}`}
                                            >
                                                {p.featured && (
                                                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-teal-400 to-emerald-400 text-gray-900 text-[8px] font-black tracking-[0.15em] px-3 py-1 rounded-full whitespace-nowrap shadow-lg">
                                                        {p.badge || 'MOST POPULAR'}
                                                    </div>
                                                )}
                                                {p.valueNote && (
                                                    <p className="text-[9px] font-black text-teal-200/90 mb-1.5">{p.valueNote}</p>
                                                )}
                                                <div className="flex justify-between items-start gap-2">
                                                    <div>
                                                        <span className={`font-black text-sm block ${isPro ? 'text-white' : textColor}`}>{p.name}</span>
                                                        {p.tagline && <span className={`text-[9px] block mt-0.5 ${isPro ? 'text-white/70' : descColor}`}>{p.tagline}</span>}
                                                    </div>
                                                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                                                        {isSelected && (
                                                            <span className={`flex items-center gap-1 text-[8px] font-black px-2 py-0.5 rounded-full ${isPro ? 'bg-white/25 text-white' : 'bg-indigo-500/20 text-indigo-300'}`}>
                                                                <CheckCircle size={10} /> Selected
                                                            </span>
                                                        )}
                                                        <span className={`font-black text-sm ${isPro ? 'text-white' : textColor}`}>₹{p.price}<span className="text-[10px] font-bold opacity-80">/mo</span></span>
                                                    </div>
                                                </div>
                                                <p className={`text-[9px] mt-1 ${isPro ? 'text-white/60' : descColor}`}>Verification: ₹1</p>
                                                <ul className="mt-2.5 space-y-1">
                                                    {p.features.map((f, i) => (
                                                        <li key={i} className={`text-[9px] font-bold flex items-center gap-1.5 ${isPro ? 'text-white/95' : descColor}`}>
                                                            <ShieldCheck size={10} className={`shrink-0 ${isPro ? 'text-teal-300/80' : 'text-indigo-500/70'}`} /> {f}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className={`text-[9px] ${descColor} mt-4`}>Select a plan to proceed to payment</p>
                                {fromCreateAccount && detailsComplete && (
                                    <div className="mt-6 space-y-3">
                                        <button type="button" onClick={() => setDetailsComplete(false)} className={`w-full text-center text-[10px] font-black ${labelColor} hover:text-indigo-400 flex items-center justify-center cursor-pointer transition-colors uppercase`}>
                                            <ArrowLeft size={12} className="mr-1" /> Back to edit details
                                        </button>
                                        <form onSubmit={handlePaymentSubmit} className="space-y-3">
                                            <button type="submit" disabled={!selectedPlanInCheckout || isProcessing} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black tracking-widest py-4 rounded-2xl transition-all active:scale-95 shadow-xl shadow-indigo-600/20 flex items-center justify-center cursor-pointer disabled:opacity-50">
                                                {isProcessing ? <Loader className="w-5 h-5 animate-spin" /> : <><Lock className="w-4 h-4 mr-2" /> Start My Free Trial</>}
                                            </button>
                                            <p className={`text-[9px] ${infoText} text-center font-bold`}>By proceeding, you authorize a ₹1 verification charge.</p>
                                            <button type="button" onClick={(e) => { e.preventDefault(); onBackToLogin?.(); }} className={`w-full text-center text-[10px] font-black ${labelColor} hover:text-indigo-400 flex items-center justify-center cursor-pointer uppercase py-2`}>
                                                <ArrowLeft size={12} className="mr-1 shrink-0" /> Back to Login
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        ) : (
                        <>
                        <div className={`p-5 lg:p-8 rounded-2xl lg:rounded-[2rem] bg-gradient-to-br ${plan.color} relative overflow-hidden shadow-xl`}>
                            <div className="absolute -top-2 -right-2 p-4 opacity-10 lg:opacity-20 hidden sm:block">
                                <ShoppingCart size={60} className="lg:w-20 lg:h-20" />
                            </div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4 lg:mb-8">
                                    <div>
                                        <span className="text-[9px] font-black tracking-[0.2em] bg-white/20 px-2 py-0.5 rounded-full mb-1 inline-block text-white uppercase">{plan.interval}</span>
                                        <h3 className="text-xl lg:text-2xl font-black text-white tracking-tighter">{plan.name}</h3>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-[9px] font-black text-white/70 uppercase">After Trial</span>
                                        <span className="text-xl lg:text-2xl font-black text-white">₹{plan.price}</span>
                                    </div>
                                </div>
                                
                                <div className="flex lg:flex-col items-center lg:items-start justify-between border-t border-white/20 pt-4 lg:space-y-4">
                                    <div className="flex flex-col lg:w-full">
                                        <span className="text-[9px] font-black text-white/70 uppercase">Verification Fee</span>
                                        <span className="text-xl lg:text-3xl font-black text-white">₹1</span>
                                    </div>
                                    <ul className="hidden sm:grid grid-cols-2 lg:grid-cols-1 gap-2 lg:space-y-2 mt-0 lg:mt-4">
                                        {plan.features.map((f, i) => (
                                            <li key={i} className="flex items-center text-[9px] lg:text-[10px] font-black text-white tracking-wider">
                                                <ShieldCheck size={12} className="mr-1.5 text-white/70 shrink-0" /> {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                        </>
                        )}
                        
                        <div className={`mt-4 lg:mt-8 p-4 ${infoBg} rounded-xl border ${infoBorder} hidden lg:block transition-colors duration-300`}>
                            <h4 className={`text-[10px] font-black ${textColor} tracking-widest mb-2 flex items-center uppercase transition-colors duration-300`}>
                                <ShieldCheck className="w-3 h-3 mr-1 text-indigo-400" /> Secure Payment
                            </h4>
                            <p className={`text-[10px] font-bold ${infoText} leading-relaxed tracking-tighter transition-colors duration-300`}>Encrypted by Razorpay. Cancel anytime via dashboard.</p>
                        </div>
                    </div>

                    {/* Form Side - hidden when Create Account flow has proceeded to plan selection */}
                    {!(fromCreateAccount && detailsComplete) && (
                    <div className="lg:col-span-8 px-4 pt-4 pb-4 sm:p-10 lg:p-14">
                        <header className="mb-5 sm:mb-8 lg:mb-10 text-center lg:text-left">
                            <div className="inline-flex items-center space-x-2 bg-indigo-500/10 px-3 py-1 rounded-full mb-3">
                                <Zap className="w-3 h-3 text-indigo-400" />
                                <span className="text-[9px] lg:text-[10px] font-black text-indigo-400 tracking-widest uppercase">30-Day Free Trial</span>
                            </div>
                            <h1 className={`text-2xl lg:text-4xl font-black ${textColor} tracking-tighter transition-colors duration-300`}>Create Your Business Account</h1>
                        </header>

                        <form onSubmit={fromCreateAccount && !detailsComplete ? handleProceedToPlanSelection : handlePaymentSubmit} className="space-y-5 lg:space-y-6">
                            {paymentError && <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-[10px] font-bold">{paymentError}</div>}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
                                <div className="md:col-span-2">
                                    <InputField label="Shop/Business Name" id="shopName" icon={<Building className="w-4 h-4" />} value={shopName} error={shopNameError} onChange={setShopName} placeholder="Ex: Sharma Stores" disabled={isProcessing} darkMode={darkMode} />
                                </div>
                                <InputField label="Email Address" id="email" type="email" value={email} error={emailError} onChange={setEmail} placeholder="owner@business.com" disabled={isProcessing} icon={<Globe className="w-4 h-4" />} darkMode={darkMode} />
                                
                                <div className="relative" ref={dropdownRef}>
                                    <label className={`text-[10px] font-black ${labelColor} tracking-widest mb-2 block uppercase transition-colors duration-300`}>Mobile Number</label>
                                    <div className={`flex ${inputBg} rounded-2xl border transition-all ${phoneError ? 'border-red-500' : `${phoneBorder} ${phoneBorderFocus}`}`}>
                                        <button type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} className={`px-3 border-r ${phoneBorder} flex items-center space-x-1 text-sm font-bold ${phoneButtonText} ${phoneButtonHover} rounded-l-2xl transition-colors min-w-[80px]`}>
                                            <span>{selectedCountry.flag}</span>
                                            <span>{selectedCountry.code}</span>
                                        </button>
                                        <input type="tel" value={localNumber} onChange={handleNumberChange} className={`flex-1 ${phoneInputBg} px-4 py-3 text-sm ${phoneInputText} focus:outline-none font-bold`} placeholder="98765 43210" disabled={isProcessing} />
                                    </div>
                                    {isDropdownOpen && (
                                        <div className={`absolute z-[100] mt-2 w-full max-w-[280px] max-h-60 overflow-y-auto custom-scrollbar ${dropdownBg} border ${dropdownBorder} rounded-2xl shadow-2xl p-2 left-0 top-full transition-colors duration-300`}>
                                            <input type="text" placeholder="Search country..." className={`w-full ${dropdownSearchBg} border ${dropdownSearchBorder} rounded-xl px-3 py-2 text-xs ${dropdownSearchText} mb-2 outline-none focus:border-indigo-500 transition-colors duration-300`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                            {filteredCodes.map(c => (
                                                <div key={c.code} onClick={() => handleSelectCountry(c.code)} className={`flex justify-between p-2 ${dropdownHover} rounded-lg cursor-pointer text-xs font-bold ${dropdownText} transition-colors duration-300`}>
                                                    <span>{c.flag} {c.name}</span>
                                                    <span className={darkMode ? 'text-gray-500' : 'text-slate-500'}>{c.code}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {phoneError && <p className="text-red-500 text-[9px] mt-1 font-bold">{phoneError}</p>}
                                </div>

                                <div className="relative md:col-span-2">
                                    <InputField label="Login Password" id="password" type={showPassword ? 'text' : 'password'} value={password} error={passwordError} onChange={setPassword} placeholder="Min 8 characters" disabled={isProcessing} icon={<Lock className="w-4 h-4" />} darkMode={darkMode} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute right-4 top-9 ${iconColor} hover:text-indigo-400 transition-colors`}>
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className={`pt-3 pb-1 sm:pt-4 sm:pb-0 lg:pt-6 border-t ${sectionBorder} transition-colors duration-300 relative z-10`}>
                                <button type="submit" disabled={isProcessing || (detailsComplete && !plan)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black tracking-widest py-4 rounded-2xl transition-all active:scale-95 shadow-xl shadow-indigo-600/20 flex items-center justify-center cursor-pointer disabled:opacity-50">
                                    {isProcessing ? <Loader className="w-5 h-5 animate-spin" /> : (fromCreateAccount && !detailsComplete) ? <><CreditCard className="w-4 h-4 mr-2" /> Continue to Plan</> : <><Lock className="w-4 h-4 mr-2" /> Start My Free Trial</>}
                                </button>
                                <p className={`text-[9px] ${infoText} text-center mt-2 sm:mt-4 font-bold leading-relaxed tracking-tighter uppercase transition-colors duration-300`}>
                                    {(fromCreateAccount && !detailsComplete) ? 'Next: Select your plan and complete payment.' : 'By proceeding, you authorize a ₹1 verification charge.'}
                                </p>
                                <button type="button" onClick={(e) => { e.preventDefault(); (planKey ? onBackToPlans : onBackToLogin)?.(); }} className={`w-full text-center text-[10px] font-black ${labelColor} mt-2 sm:mt-4 hover:text-indigo-400 flex items-center justify-center cursor-pointer transition-colors uppercase py-2 -mb-2`}>
                                    <ArrowLeft size={12} className="mr-1 shrink-0" /> {planKey ? 'Back to Plans' : 'Back to Login'}
                                </button>
                            </div>
                        </form>
                    </div>
                    )}
                </div>
            </section>
            </div>
            {/* Footer - fills space and adds trust (hidden on desktop) */}
            <footer className={`w-full max-w-5xl py-4 px-4 flex flex-col items-center justify-center gap-3 sm:hidden ${darkMode ? 'text-gray-500 bg-gray-900/40' : 'text-slate-600 bg-slate-100/50'} border-t ${sectionBorder} relative z-0`}>
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${darkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                        <Smartphone className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    </div>
                    <span className="text-[10px] font-black tracking-wider uppercase">Pocket POS</span>
                </div>
                <div className="flex items-center gap-4 text-[9px] font-bold">
                    <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-indigo-500" /> Secure checkout</span>
                    <span>·</span>
                    <span>Razorpay</span>
                </div>
            </footer>
        </main>
    );
};

const InputField = ({ label, id, type = 'text', value, onChange, placeholder, error, disabled, icon, darkMode = true }) => {
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
                className={`w-full ${inputBg} border ${error ? 'border-red-500' : `${inputBorder} group-focus-within:border-indigo-500`} rounded-2xl px-5 py-3 text-sm font-bold ${inputText} ${placeholderColor} outline-none transition-all ${icon ? 'pl-11' : ''}`}
            />
        </div>
        {error && <p className="text-red-500 text-[9px] mt-1 font-bold tracking-tight">{error}</p>}
    </div>
    );
};

export default Checkout;