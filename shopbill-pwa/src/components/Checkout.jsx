import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
    ShoppingCart, CreditCard, CheckCircle, Lock, ArrowLeft, 
    Loader, IndianRupee, Wifi, AlertTriangle, Eye, EyeOff, 
    Globe, Building, ShieldCheck, Zap
} from 'lucide-react';
import API from '../config/api';
import apiClient from '../lib/apiClient';
import axios from 'axios';

const PLAN_DETAILS = {
    BASIC: {
        name: 'Basic Plan',
        price: 499,
        features: ['Unlimited Transactions', '2 Users (Owner + 1 Cashier)', 'Full Inventory Management', 'Full Digital Khata'],
        interval: 'monthly',
        color: 'from-indigo-600 to-blue-600',
    },
    PRO: {
        name: 'Pro Plan',
        price: 799,
        features: ['Unlimited Transactions', 'Unlimited Users & Roles', 'Full Inventory & Bulk Tools', 'Khata + Automated SMS Reminders'],
        interval: 'monthly',
        color: 'from-teal-600 to-emerald-600',
    },
    PREMIUM: {
        name: 'Premium Plan',
        price: 999,
        features: ['Unlimited Transactions', 'Unlimited Users & Roles', 'Full Inventory & Bulk Tools', 'Khata + Automated SMS Reminders'],
        interval: 'monthly',
        color: 'from-indigo-600 to-purple-600',
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

const Checkout = ({ plan: planKey, setCurrentPage, onBackToDashboard, showToast }) => {
    const plan = useMemo(() => PLAN_DETAILS[planKey] || PLAN_DETAILS.BASIC, [planKey]);
    
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

            const subscriptionResponse = await apiClient.post(API.createSubscription, { plan: planKey || 'BASIC' });
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
                                email: email.toLowerCase().trim(), password, phone, plan: planKey || 'BASIC',
                                transactionId: vResp.data.transactionId, shopName
                            });
                            setPaymentSuccess(true);
                            
                            // Success Redirection Logic
                            setTimeout(() => {
                                showToast('Account created successfully! Please login.', 'success');
                                // In App.jsx, we need to show the login screen.
                                // We do this by setting current page to dashboard and letting the login view trigger.
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
    }, [plan, planKey, email, phone, password, shopName, showToast]);

    if (paymentSuccess) return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-gray-900 p-10 rounded-[1.25rem] border border-emerald-500/30 text-center shadow-2xl">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-emerald-500 animate-pulse" />
                </div>
                <h2 className="text-3xl font-black text-white  tracking-tighter mb-4">You're All Set!</h2>
                <p className="text-gray-400 font-bold leading-relaxed mb-6">Account created. Your 30-day trial has started.</p>
                <div className="flex items-center justify-center space-x-2 text-indigo-400 font-bold">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Redirecting to Login...</span>
                </div>
            </div>
        </div>
    );

    return (
        <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4 sm:p-8 font-sans">
            <section className="max-w-5xl w-full bg-gray-900/50 backdrop-blur-xl rounded-[1.25rem] border border-gray-800 shadow-2xl overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-12">
                    
                    {/* Form Side */}
                    <div className="lg:col-span-7 p-8 sm:p-12 order-2 lg:order-1">
                        <header className="mb-10">
                            <div className="inline-flex items-center space-x-2 bg-indigo-500/10 px-3 py-1 rounded-full mb-4">
                                <Zap className="w-3 h-3 text-indigo-400" />
                                <span className="text-[10px] font-black text-indigo-400  tracking-widest">30-Day Free Trial</span>
                            </div>
                            <h1 className="text-3xl font-black text-white  tracking-tighter">Business Registration</h1>
                        </header>

                        <form onSubmit={handlePaymentSubmit} className="space-y-6">
                            {paymentError && <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-2xl text-red-400 text-xs font-bold">{paymentError}</div>}
                            
                            <div className="grid grid-cols-1 gap-5">
                                <InputField label="Shop/Business Name" id="shopName" icon={<Building className="w-4 h-4" />} value={shopName} error={shopNameError} onChange={setShopName} placeholder="Ex: Sharma Stores" disabled={isProcessing} />
                                <InputField label="Email Address" id="email" type="email" value={email} error={emailError} onChange={setEmail} placeholder="owner@business.com" disabled={isProcessing} icon={<Globe className="w-4 h-4" />} />
                                
                                <div className="relative" ref={dropdownRef}>
                                    <label className="text-[10px] font-black text-gray-500  tracking-widest mb-2 block">Mobile Number</label>
                                    <div className={`flex bg-gray-950 rounded-2xl border transition-all ${phoneError ? 'border-red-500' : 'border-gray-800 focus-within:border-indigo-500'}`}>
                                        <button type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="px-4 border-r border-gray-800 flex items-center space-x-2 text-base md:text-sm font-bold text-gray-300 hover:bg-gray-900 rounded-l-2xl transition-colors min-w-[90px]">
                                            <span>{selectedCountry.flag}</span>
                                            <span>{selectedCountry.code}</span>
                                        </button>
                                        <input type="tel" value={localNumber} onChange={handleNumberChange} className="flex-1 bg-transparent px-4 py-3.5 text-base md:text-sm text-white focus:outline-none font-bold" placeholder="98765 43210" disabled={isProcessing} />
                                    </div>
                                    {isDropdownOpen && (
                                        <div className="absolute z-[100] mt-2 w-full max-w-[280px] max-h-60 overflow-y-auto bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-2 left-0 top-full">
                                            <input type="text" placeholder="Search country..." className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white mb-2 outline-none focus:border-indigo-500" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                            {filteredCodes.map(c => (
                                                <div key={c.code} onClick={() => handleSelectCountry(c.code)} className="flex justify-between p-2 hover:bg-indigo-600 rounded-lg cursor-pointer text-xs font-bold text-gray-200">
                                                    <span>{c.flag} {c.name}</span>
                                                    <span className="text-gray-500">{c.code}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {phoneError && <p className="text-red-500 text-[10px] mt-1 font-bold ">{phoneError}</p>}
                                </div>

                                <div className="relative">
                                    <InputField label="Login Password" id="password" type={showPassword ? 'text' : 'password'} value={password} error={passwordError} onChange={setPassword} placeholder="Min 8 characters" disabled={isProcessing} icon={<Lock className="w-4 h-4" />} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-9 text-gray-500 hover:text-white transition-colors">
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-800">
                                <button type="submit" disabled={isProcessing} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black  tracking-widest py-4 rounded-2xl transition-all active:scale-95 shadow-xl shadow-indigo-600/20 flex items-center justify-center cursor-pointer disabled:opacity-50">
                                    {isProcessing ? <Loader className="w-5 h-5 animate-spin" /> : <><Lock className="w-4 h-4 mr-2" /> Setup & Start Trial</>}
                                </button>
                                <p className="text-[9px] text-gray-600 text-center mt-4 font-bold leading-relaxed  tracking-tighter">By proceeding, you authorize a ₹1 verification charge. No other charges during trial.</p>
                                <button type="button" onClick={onBackToDashboard} className="w-full text-center text-[10px] font-black  text-gray-500 mt-4 hover:text-indigo-400 flex items-center justify-center cursor-pointer transition-colors">
                                    <ArrowLeft size={12} className="mr-1" /> Cancel and Go Back
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Summary Side */}
                    <div className="lg:col-span-5 bg-gray-950/50 p-8 sm:p-12 border-l border-gray-800 order-1 lg:order-2">
                        <div className={`p-8 rounded-[2rem] bg-gradient-to-br ${plan.color} relative overflow-hidden shadow-2xl`}>
                            <div className="absolute top-0 right-0 p-6 opacity-20"><ShoppingCart size={80} /></div>
                            <div className="relative z-10">
                                <span className="text-[10px] font-black  tracking-[0.2em] bg-white/20 px-3 py-1 rounded-full mb-4 inline-block text-white">{plan.interval}</span>
                                <h3 className="text-3xl font-black text-white tracking-tighter mb-8">{plan.name}</h3>
                                
                                <div className="space-y-6 mb-8">
                                    <div className="flex justify-between items-end border-b border-white/20 pb-4">
                                        <span className="text-[10px] font-black  text-white/70">Start Trial Fee</span>
                                        <span className="text-3xl font-black text-white">₹1</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black  text-white/70">After 30 Days</span>
                                        <span className="text-2xl font-black text-white">₹{plan.price}</span>
                                    </div>
                                </div>

                                <ul className="space-y-3">
                                    {plan.features.map((f, i) => (
                                        <li key={i} className="flex items-center text-[10px] font-black text-white  tracking-wider">
                                            <ShieldCheck size={14} className="mr-2 text-white/70" /> {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        
                        <div className="mt-8 p-6 bg-gray-900/50 rounded-2xl border border-gray-800">
                            <h4 className="text-[10px] font-black text-white  tracking-widest mb-2 flex items-center">
                                <ShieldCheck className="w-3 h-3 mr-1 text-indigo-400" /> Secure Payment
                            </h4>
                            <p className="text-[10px] font-bold text-gray-500 leading-relaxed  tracking-tighter">Transactions are encrypted and handled by Razorpay. You can cancel your subscription anytime via the dashboard.</p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
};

const InputField = ({ label, id, type = 'text', value, onChange, placeholder, error, disabled, icon }) => (
    <div className="group">
        <label htmlFor={id} className="text-[10px] font-black text-gray-500  tracking-widest mb-2 block transition-colors group-focus-within:text-indigo-400">{label}</label>
        <div className="relative">
            {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400">{icon}</div>}
            <input 
                id={id} 
                type={type} 
                value={value} 
                onChange={(e) => onChange(e.target.value)} 
                disabled={disabled}
                placeholder={placeholder}
                className={`w-full bg-gray-950 border ${error ? 'border-red-500' : 'border-gray-800 group-focus-within:border-indigo-500'} rounded-2xl px-5 py-3.5 text-base md:text-sm font-bold text-white placeholder-gray-700 outline-none transition-all ${icon ? 'pl-11' : ''}`}
            />
        </div>
        {error && <p className="text-red-500 text-[10px] mt-1 font-bold  tracking-tight">{error}</p>}
    </div>
);

export default Checkout;