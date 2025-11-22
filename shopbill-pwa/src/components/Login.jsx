import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Eye, EyeOff, Globe } from 'lucide-react';
import axios from 'axios';
import API from '../config/api'

// --- AXIOS INSTANCE WITH AUTH INTERCEPTOR ---
const apiClient = axios.create();
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('userToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);
// --- END AXIOS CONFIG ---

// --- Custom Phone Number Validation ---
/**
 * Basic validation for E.164 format (starts with +, followed by 1 to 15 digits).
 */
const validatePhoneNumber = (inputPhone) => {
    if (!inputPhone) return 'Phone number is required.';
    // Basic regex for E.164 format: starts with +, followed by 1 to 15 digits
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(inputPhone)) {
        return 'Please enter a valid international phone number format (e.g., +12223334444).';
    }
    return null;
};

// --- Sub-Component: Login Form (Unchanged) ---
const LoginForm = ({ handleAuth, identifier, setIdentifier, password, setPassword, loading, setView, authError }) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white text-center mb-6">
                Welcome Back
            </h2>
            {authError && (
                <div className="p-3 mb-4 text-sm text-red-100 dark:text-red-100 bg-red-600 dark:bg-red-800 rounded-lg text-center" role="alert">
                    {authError}
                </div>
            )}
            <form className="space-y-4" onSubmit={handleAuth}>
                {/* Identifier Input (Email OR Phone) */}
                <input
                    type="text"
                    placeholder="Email Address or Phone Number"
                    className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border text-gray-900 dark:text-gray-200 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 border-gray-300 dark:border-gray-600`}
                    // Use identifier state and setIdentifier handler
                    onChange={(e) => setIdentifier(e.target.value)}
                    value={identifier}
                    required
                    // Note: Removed 'autoComplete="email"' as it might be phone number
                    autoComplete="username" 
                />
                
                {/* Password Input with Toggle */}
                <div className="relative">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        className="w-full pr-12 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-200 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                        onChange={(e) => setPassword(e.target.value)}
                        value={password}
                        required
                        autoComplete="current-password"
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

                {/* Forgot Password */}
                <div className="flex justify-end pt-1">
                    <button
                        type="button"
                        onClick={() => setView('forgotPassword')}
                        className="text-sm cursor-pointer text-indigo-400 hover:text-indigo-300 transition duration-150"
                    >
                        Forgot Password?
                    </button>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    className="cursor-pointer w-full mt-6 py-3 bg-indigo-600 text-white text-lg font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition transform hover:scale-[1.01] duration-300 ease-in-out disabled:bg-indigo-400"
                    disabled={loading}
                >
                    {loading ? 'Logging In...' : 'Log In'}
                </button>
            </form>

            {/* Switch View */}
            <p className="text-center text-gray-600 dark:text-gray-400 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700/50">
                New to Pocket POS?
                <button
                    onClick={() => setView('signup')}
                    className="ml-2 cursor-pointer text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-bold transition duration-150"
                    disabled={loading}
                >
                    Create Account
                </button>
            </p>
        </>
    );
};


// --- Sub-Component: Signup Form (UPDATED with Searchable Dropdown) ---
const SignupForm = ({
    handleAuth,
    email,
    handleEmailChange,
    handleEmailBlur,
    password,
    setPassword,
    phone,
    setPhone,
    loading,
    setView,
    authError,
    passwordError,
    phoneError,
    setPhoneError, // Added setPhoneError to be accessible in this component
    setPasswordError, // Added setPasswordError to be accessible in this component
    emailError,
    countryCodes
}) => {
    const [showPassword, setShowPassword] = useState(false);

    // Determine the initial dial code based on the current phone state or fall back to the first available code.
    const initialDialCode = countryCodes.find(c => phone.startsWith(c.code))?.code || (countryCodes.length > 0 ? countryCodes[0].code : '');
    const initialLocalNumber = phone.startsWith(initialDialCode) ? phone.substring(initialDialCode.length) : '';

    const [dialCode, setDialCode] = useState(initialDialCode);
    const [localNumber, setLocalNumber] = useState(initialLocalNumber);

    // NEW STATES for custom searchable dropdown
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Ref for the dropdown list element (for handling clicks outside)
    const dropdownRef = React.useRef(null);
    
    // Find the currently selected country object for display
    const selectedCountry = countryCodes.find(c => c.code === dialCode);

    // Filtered list based on search query (Memoized for performance)
    const filteredCodes = React.useMemo(() => {
        if (!searchQuery) return countryCodes;
        const query = searchQuery.toLowerCase();
        return countryCodes.filter(c =>
            c.name.toLowerCase().includes(query) ||
            c.code.includes(query)
        );
    }, [countryCodes, searchQuery]);


    // Effect to update local state when countryCodes array is fetched/updated
    useEffect(() => {
        if (countryCodes.length > 0 && !dialCode) {
            setDialCode(countryCodes[0].code);
        }
    }, [countryCodes, dialCode]);

    // Effect to update parent phone state in E.164 format
    useEffect(() => {
        // Ensure dialCode is valid before constructing the number
        if (dialCode) {
            const fullNumber = dialCode + localNumber;
            // Only update if the combined number is different from the parent state to avoid loops
            if (fullNumber !== phone) {
                setPhone(fullNumber);
            }
        }
    }, [dialCode, localNumber, phone, setPhone]);
    
    // Effect to handle clicks outside the dropdown to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
                setSearchQuery(''); // Clear search on close
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [dropdownRef]);


    const handleSelectCountry = (code) => {
        setDialCode(code);
        setIsDropdownOpen(false);
        setSearchQuery(''); // Clear search on selection
        if (phoneError) setPhoneError(null);
    };

    const handleNumberChange = (e) => {
        // Simple sanitization to only allow digits and remove non-digit characters
        const sanitizedNumber = e.target.value.replace(/\D/g, '');
        setLocalNumber(sanitizedNumber);
        // Clear phone error while typing
        if (phoneError) setPhoneError(null);
    };

    const handleNumberBlur = () => {
        // Use the combined phone state for validation on blur
        if (phone) {
            setPhoneError(validatePhoneNumber(phone));
        }
    };

    const handlePasswordBlur = (e) => {
        // Check password length on blur
        if (e.target.value && e.target.value.length < 8) {
            setPasswordError('Password must be 8 or more characters long.');
        } else {
            setPasswordError(null);
        }
    };

    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
        // Clear password error when user starts typing again
        if (passwordError) setPasswordError(null);
    };

    return (
        <>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white text-center mb-6">
                Get Started Free
            </h2>
            {authError && (
                <div className="p-3 mb-4 text-sm text-red-100 dark:text-red-100 bg-red-600 dark:bg-red-800 rounded-lg text-center" role="alert">
                    {authError}
                </div>
            )}
            <form className="space-y-4" onSubmit={handleAuth}>

                {/* 1. Phone Input (Custom Implementation with Searchable Dropdown) */}
                <div className={`
                    w-full flex rounded-lg transition duration-150 bg-gray-50 dark:bg-gray-700
                    ${phoneError ? 'border border-red-500' : 'border border-gray-300 dark:border-gray-600'}
                    focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500
                `} ref={dropdownRef}>
                    
                    {/* Country Code Selector (Custom Button) */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`
                                bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200 py-3 pl-3 pr-2 border-r border-gray-300 dark:border-gray-600 
                                focus:outline-none rounded-l-lg cursor-pointer flex items-center justify-between
                                w-auto min-w-[70px] max-w-[110px] sm:min-w-[80px] sm:max-w-[120px] 
                                text-sm truncate hover:bg-gray-200 dark:hover:bg-gray-600 transition duration-150
                                ${isDropdownOpen ? 'bg-gray-200 dark:bg-gray-600' : ''}
                            `}
                            disabled={countryCodes.length === 0}
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
                        
                        {/* Dropdown Panel with Search */}
                        {isDropdownOpen && countryCodes.length > 0 && (
                            <div className="absolute z-10 top-full left-0 mt-1 w-72 max-h-80 overflow-y-auto bg-white dark:bg-gray-700 rounded-lg shadow-xl border border-gray-200 dark:border-indigo-500/50">
                                
                                {/* Search Input */}
                                <div className="p-2 sticky top-0 bg-white dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 z-20">
                                    <input
                                        type="text"
                                        placeholder="Search country or code..."
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500 text-sm"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        // Auto-focus the search bar when the dropdown opens
                                        autoFocus
                                        onFocus={(e) => e.currentTarget.select()}
                                    />
                                </div>
                                
                                {/* Country List */}
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
                    {/* END Country Code Selector */}

                    {/* Phone Number Input */}
                    <input
                        type="tel"
                        placeholder="Enter phone number"
                        value={localNumber}
                        onChange={handleNumberChange}
                        onBlur={handleNumberBlur} // Added blur validation
                        className="w-full px-4 py-3 bg-transparent text-gray-200 placeholder-gray-400 focus:outline-none rounded-r-lg"
                        required
                        autoComplete="tel"
                        disabled={countryCodes.length === 0} // Disable while loading codes
                    />
                </div>
                {/* Phone Error Message */}
                {countryCodes.length === 0 ? (
                    <div className="flex items-center text-teal-400 text-sm mt-1">
                        <Globe className="w-4 h-4 mr-1 animate-spin" />
                        Fetching country codes...
                    </div>
                ) : phoneError && (
                    <p className="text-red-400 text-sm mt-1">{phoneError}</p>
                )}

                {/* Email Input */}
                <input
                    type="text"
                    placeholder="Email Address (Lowercase, no spaces)"
                    className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border text-gray-900 dark:text-gray-200 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ${emailError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onBlur={handleEmailBlur}
                    value={email}
                    required
                    autoComplete="email"
                />
                {/* Email Error Message */}
                {emailError && (
                    <p className="text-red-400 text-sm mt-1">{emailError}</p>
                )}

                {/* Password Input with Toggle */}
                <div className="relative">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password (Min 8 characters)"
                        className={`w-full pr-12 px-4 py-3 bg-gray-50 dark:bg-gray-700 border text-gray-900 dark:text-gray-200 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ${passwordError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                        onChange={handlePasswordChange}
                        onBlur={handlePasswordBlur}
                        value={password}
                        required
                        autoComplete="new-password"
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
                {/* Password Error Message */}
                {passwordError && (
                    <p className="text-red-400 text-sm mt-1">{passwordError}</p>
                )}


                {/* Submit Button */}
                <button
                    type="submit"
                    className="cursor-pointer w-full mt-6 py-3 bg-indigo-600 text-white text-lg font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition transform hover:scale-[1.01] duration-300 ease-in-out disabled:bg-indigo-400"
                    disabled={loading || countryCodes.length === 0} // Disable if still loading codes
                >
                    {loading ? 'Creating Account...' : 'Create Account'}
                </button>
                <p className="text-xs text-gray-400 pt-2 text-center">
                    By clicking Create Account, you agree to our Terms and Conditions.
                </p>
            </form>

            {/* Switch View */}
            <p className="text-center text-gray-600 dark:text-gray-400 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700/50">
                Already have an account?
                <button
                    onClick={() => setView('login')}
                    className="ml-2 cursor-pointer text-teal-400 hover:text-teal-300 font-bold transition duration-150"
                    disabled={loading}
                >
                    Log In
                </button>
            </p>
        </>
    );
};

// --- Sub-Component: Forgot Password Form (Unchanged) ---
const ForgotPasswordForm = ({ handleForgotPasswordRequest, email, handleEmailChange, handleEmailBlur, loading, setView, resetMessage, emailError }) => {
    return (
        <>
            <h2 className="text-3xl font-extrabold text-white text-center mb-6">
                Reset Password
            </h2>

            {/* Success Message */}
            {resetMessage && resetMessage.success && (
                <div className="p-3 mb-4 text-sm text-green-100 bg-green-800 rounded-lg text-center" role="alert">
                    <p>{resetMessage.success}</p>
                    {/* Display DEV token if available (Backend sends this for testing) */}
                    {resetMessage.devToken && (
                        <p className="mt-2 text-xs font-mono break-all text-green-300">
                            <strong>DEV ONLY</strong> Token: {resetMessage.devToken}
                        </p>
                    )}
                </div>
            )}

            {/* Error Message */}
            {resetMessage && resetMessage.error && (
                <div className="p-3 mb-4 text-sm text-red-100 bg-red-800 rounded-lg text-center" role="alert">
                    {resetMessage.error}
                </div>
            )}

            <form className="space-y-4" onSubmit={handleForgotPasswordRequest}>
                <p className="text-gray-400 text-sm text-center pt-2">
                    Enter your email address to receive a password reset link.
                </p>
                {/* Email Input */}
                <input
                    type="email"
                    placeholder="Email Address"
                    className={`w-full px-4 py-3 bg-gray-700 border text-gray-200 rounded-lg placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ${emailError ? 'border-red-500' : 'border-gray-600'}`}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onBlur={handleEmailBlur}
                    value={email}
                    required
                    autoComplete="email"
                />
                {/* Email Error Message */}
                {emailError && (
                    <p className="text-red-400 text-sm mt-1">{emailError}</p>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    className="w-full mt-6 py-3 bg-teal-600 text-white text-lg font-bold rounded-xl shadow-lg shadow-teal-600/30 hover:bg-teal-700 transition transform hover:scale-[1.01] duration-300 ease-in-out disabled:bg-teal-400"
                    disabled={loading || !!emailError}
                >
                    {loading ? 'Sending Request...' : 'Send Reset Link'}
                </button>
            </form>

            {/* Switch View */}
            <p className="text-center text-gray-600 dark:text-gray-400 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700/50">
                <button
                    onClick={() => setView('login')}
                    className="ml-2 cursor-pointer text-indigo-400 hover:text-indigo-300 font-bold transition duration-150"
                    disabled={loading}
                >
                    ← Back to Log In
                </button>
            </p>
        </>
    );
};


// Main Login Component
const Login = ({ onLogin, onBackToLanding, initialPlan }) => {
    // NOTE: initialPlan is no longer used for signup flow - checkout handles that now
    // This is kept for backward compatibility but login page always shows login form
    const [view, setView] = useState('login'); // 'login', 'signup', 'forgotPassword'
    // RENAMED STATE: 'email' is now 'identifier' for generality
    const [identifier, setIdentifier] = useState(''); 
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [authError, setAuthError] = useState(null);
    const [resetMessage, setResetMessage] = useState(null);
    const [passwordError, setPasswordError] = useState(null);
    const [phoneError, setPhoneError] = useState(null);
    const [emailError, setEmailError] = useState(null); // Kept for Signup and Forgot Password forms

    // NEW: State for dynamically loaded country codes
    const [countryCodes, setCountryCodes] = useState([]);

    const isSignup = view === 'signup';

    // --- Data Fetching Function (Unchanged) ---
    const fetchCountryCodes = useCallback(async () => {
        try {
            // Using REST Countries API (public, no key required for basic data)
            const response = await axios.get('https://restcountries.com/v3.1/all?fields=name,idd,flag');
            const data = response.data;

            const codes = data
                .map(country => {
                    const root = country.idd.root || '';
                    const suffixes = country.idd.suffixes || [];

                    // Combine root and first suffix to get the full code, e.g., '+1' + ' ' -> '+1'
                    const fullCode = suffixes.length > 0 ? `${root}${suffixes[0]}` : root;

                    // Skip entries without a valid phone code
                    if (!fullCode) return null;

                    return {
                        code: fullCode,
                        flag: country.flag, // Emoji flag
                        name: country.name.common,
                        // Priority to common name, but include full name for a better option label
                        sortName: country.name.common,
                    };
                })
                .filter(Boolean)
                // Remove duplicates (important for countries sharing a code like US/CA) and sort alphabetically
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
            // Fallback: If API fails, provide a minimal, hardcoded list (optional, but good practice)
            setCountryCodes([
                { code: '+1', flag: '🇺🇸', name: 'United States' },
                { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
                { code: '+91', flag: '🇮🇳', name: 'India' },
            ]);
        }
    }, []);

    // --- Initial Data Loading Effect (Unchanged) ---
    useEffect(() => {
        fetchCountryCodes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- Validation Functions (Unchanged) ---
    // NOTE: This is for signup/forgot password where email is strictly required.
    const validateEmail = (inputEmail) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (/\s/.test(inputEmail)) return 'Email cannot contain spaces.';
        if (inputEmail !== inputEmail.toLowerCase()) return 'Email must be entirely lowercase.';
        if (!emailRegex.test(inputEmail)) return 'Please enter a valid email address.';
        return null;
    };

    // Updated Email Change Handler (Used only for Signup/Forgot Password email field)
    const handleEmailChange = useCallback((newEmail) => {
        const sanitizedEmail = newEmail.toLowerCase().trim();
        // Since we removed the 'email' state, we need to adapt this,
        // or re-introduce a separate state for the signup/forgot password email.
        // Easiest is to use 'identifier' for login, but 'email' for signup/forgot password.
        // For simplicity, I will use a local state variable in the Signup/ForgotPassword forms 
        // if they strictly need email validation, and use 'identifier' only for the login form.
        // HOWEVER, based on the original component structure, 'email' was used for everything.
        // Let's keep the 'identifier' state for the input, and ensure the signup/forgot password logic is robust.
        setIdentifier(sanitizedEmail);
        if (emailError) setEmailError(null);
    }, [emailError]);


    // New Email Blur Handler (Used only for Signup/Forgot Password email field)
    const handleEmailBlur = useCallback(() => {
        // Only validate if in a view that strictly requires email (Signup/ForgotPassword)
        if (view !== 'login' && identifier) {
            setEmailError(validateEmail(identifier));
        }
    }, [identifier, view]);


    // --- Other Effects and Handlers (Updated) ---
    useEffect(() => {
        setAuthError(null);
        setResetMessage(null);
        setPasswordError(null);
        setPhoneError(null);
        setEmailError(null);

        // Reset sensitive inputs when switching away from signup
        if (view !== 'signup') {
            setPassword('');
            setPhone('');
        }
    }, [view]);

    // **UPDATED** - This now uses 'identifier' but validates it as an email because
    // the Forgot Password process requires an email address.
    const handleForgotPasswordRequest = async (e) => {
        e.preventDefault();
        setLoading(true);
        setResetMessage(null);
        setAuthError(null);
        setEmailError(null); 

        // Final validation before sending request: MUST be a valid email for this feature
        const emailValidation = validateEmail(identifier); 

        if (emailValidation) {
            setResetMessage({ error: emailValidation });
            setEmailError(emailValidation);
            setLoading(false);
            return;
        }

        try {
            // Note: The backend expects an 'email' field for this route
            const authData = { email: identifier };

            const response = await apiClient.post(API.forgetpassword, authData);
            const data = response.data;

            setResetMessage({
                success: data.message || 'If an account is associated with this email, a reset link has been sent.'
            });

            if (data.devResetToken) {
                console.log("PASSWORD RESET DEV TOKEN:", data.devResetToken);
                setResetMessage((prev) => ({
                    success: prev.success,
                    devToken: data.devResetToken
                }));
            }

        } catch (error) {
            console.error('Forgot Password Request Error:', error);

            const errorMessage = error.response?.data?.error
                || error.response?.data?.message
                || error.message
                || 'An unexpected error occurred during password reset.';

            setResetMessage({ error: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    // **UPDATED** - Simplified Login logic to remove client-side validation
    const handleAuth = async (e) => {
        e.preventDefault();

        setAuthError(null);
        setPasswordError(null);
        setPhoneError(null);
        setEmailError(null); 

        let hasError = false;
        if (hasError) {
            setLoading(false);
            return;
        }
        setLoading(true);

        // **LOGIN VIEW:** Skip client-side email/phone validation. Let the backend handle the identifier check.
        if (view === 'login') {
            if (!identifier) {
                setAuthError('Email or Phone Number is required.');
                hasError = true;
            }
            if (!password) {
                setAuthError('Password is required.');
                hasError = true;
            }
        }
        
        // **SIGNUP VIEW:** Keep client-side validation for the individual required fields
        if (isSignup) {
            // Identifier is expected to be the email in the signup form flow
            const emailValidation = validateEmail(identifier);
            if (emailValidation) {
                setEmailError(emailValidation);
                hasError = true;
            }
            
            if (countryCodes.length === 0) {
                setAuthError('Country codes are still loading. Please wait a moment and try again.');
                hasError = true;
            }

            const currentPassword = password; 
            if (currentPassword.length < 8) {
                setPasswordError('Password must be 8 or more characters long.');
                hasError = true;
            }

            const phoneValidation = validatePhoneNumber(phone);
            if (phoneValidation) {
                setPhoneError(phoneValidation);
                hasError = true;
            }
        }

        if (hasError) {
            setLoading(false);
            return;
        }

        setLoading(true);

        const url = isSignup ? API.signup : API.login;
        const formType = isSignup ? 'Signup' : 'Login';

        // **CRITICAL CHANGE:** Login sends 'identifier' instead of 'email'
        const authData = isSignup
            ? { email: identifier, password, phone: phone }
            : { identifier, password }; // Match the new backend identifier field


        try {
            const response = await apiClient.post(url, authData);
            const data = response.data;

            if (data && data.token && data.user) {
                localStorage.removeItem('userToken');
                localStorage.setItem('userToken', data.token);
                
                // NEW FLOW: Signup now happens in checkout, so login page just handles login
                // If user signs up here (shouldn't happen in new flow), just log them in
                onLogin(data.user, data.token);

            } else {
                setAuthError(`${formType} failed. Unexpected response structure.`);
            }
        } catch (error) {
            console.error(error);

            const errorMessage = error.response?.data?.error
                || error.response?.data?.message
                || error.message
                || `Connection or ${formType} failed. Please try again.`;

            setAuthError(errorMessage);
        } finally {
            setLoading(false);
        }
    };


    // --- Main Login Component Layout ---
    const renderForm = () => {
        // Props shared by all forms
        const commonProps = {
            // 'email' prop is now 'identifier'
            identifier,
            // 'handleEmailChange' is now just setting the identifier state
            setIdentifier: handleEmailChange, 
            handleEmailBlur,
            loading,
            setView,
            emailError,
            authError,
        };

        switch (view) {
            case 'signup':
                return (
                    <SignupForm
                        handleAuth={handleAuth}
                        password={password}
                        setPassword={setPassword}
                        phone={phone}
                        setPhone={setPhone}
                        passwordError={passwordError}
                        setPasswordError={setPasswordError} 
                        phoneError={phoneError}
                        setPhoneError={setPhoneError} 
                        countryCodes={countryCodes}
                        {...commonProps}
                        // For Signup, we rename 'identifier' back to 'email' if the SignupForm expects it:
                        email={identifier}
                        handleEmailChange={handleEmailChange}
                    />
                );
            case 'forgotPassword':
                return (
                    <ForgotPasswordForm
                        handleForgotPasswordRequest={handleForgotPasswordRequest}
                        resetMessage={resetMessage}
                        {...commonProps}
                        // For ForgotPassword, we rename 'identifier' back to 'email' if the ForgotPasswordForm expects it:
                        email={identifier}
                        handleEmailChange={handleEmailChange}
                        handleEmailBlur={handleEmailBlur}
                    />
                );
            case 'login':
            default:
                return (
                    <LoginForm
                        handleAuth={handleAuth}
                        // Pass identifier state and setter
                        identifier={identifier}
                        setIdentifier={setIdentifier} 
                        password={password}
                        setPassword={setPassword}
                        authError={authError} // Explicitly pass authError
                        loading={loading} // Explicitly pass loading
                        setView={setView} // Explicitly pass setView
                        // Other props are not needed in the simplified LoginForm
                    />
                );
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 font-inter">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 md:p-10 rounded-2xl shadow-2xl dark:shadow-indigo-900/50 border border-gray-200 dark:border-gray-700">

                {/* Logo */}
                <div className="text-center mb-4">
                    <DollarSign className="w-12 h-12 text-indigo-500 mx-auto" />
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Pocket POS</h1>
                </div>

                {/* Render the appropriate form */}
                {renderForm()}

                {/* Back Button to Landing Page */}
                <div className="text-center text-sm mt-8">
                    <button
                        onClick={onBackToLanding}
                        className="cursor-pointer text-gray-600 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition duration-150 flex items-center mx-auto"
                        disabled={loading}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></svg>
                        Back to Landing Page
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;