import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import API from '../config/api'
// NOTE: Removed 'react-phone-number-input' due to environment restrictions. Using custom input.

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
 * This replaces the functionality of isValidPhoneNumber from the external library.
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

// --- Sub-Component: Login Form (UPDATED with email blur validation) ---
const LoginForm = ({ handleAuth, email, handleEmailChange, handleEmailBlur, password, setPassword, loading, setView, authError, emailError }) => {
    const [showPassword, setShowPassword] = useState(false);
    
     return (
        <>
            <h2 className="text-3xl font-extrabold text-white text-center mb-6">
                Welcome Back
            </h2>
            {authError && (
                <div className="p-3 mb-4 text-sm text-red-100 bg-red-800 rounded-lg text-center" role="alert">
                    {authError}
                </div>
            )}
            <form className="space-y-4" onSubmit={handleAuth}>
                {/* Email Input */}
                <input
                    type="text"
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
                
                {/* Password Input with Toggle */}
                <div className="relative">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        className="w-full pr-12 px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                        onChange={(e) => setPassword(e.target.value)}
                        value={password}
                        required
                        autoComplete="current-password" 
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-400 transition duration-150"
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
            <p className="text-center text-gray-400 mt-6 pt-4 border-t border-gray-700/50">
                New to Pocket POS?
                <button
                    onClick={() => setView('signup')}
                    className="ml-2 cursor-pointer text-teal-400 hover:text-teal-300 font-bold transition duration-150"
                    disabled={loading}
                >
                    Create Account
                </button>
            </p>
        </>
    );
};

// Available country codes for the custom input
const countryCodes = [
    { code: '+1', flag: '🇺🇸', name: 'United States' },
    { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
    { code: '+91', flag: '🇮🇳', name: 'India' },
    { code: '+61', flag: '🇦🇺', name: 'Australia' },
    { code: '+49', flag: '🇩🇪', name: 'Germany' },
    { code: '+81', flag: '🇯🇵', name: 'Japan' },
    { code: '+33', flag: '🇫🇷', name: 'France' },
];

// --- Sub-Component: Signup Form (UPDATED with blur validation) ---
const SignupForm = ({ 
    handleAuth, 
    email, 
    handleEmailChange, // Updated prop name
    handleEmailBlur,   // New prop
    password, 
    setPassword, 
    phone, 
    setPhone, 
    loading, 
    setView, 
    authError, 
    passwordError, 
    phoneError, 
    emailError 
}) => {
    const [showPassword, setShowPassword] = useState(false);
    
    // Split the parent's phone state into code and number for display
    const initialDialCode = countryCodes.find(c => phone.startsWith(c.code))?.code || '+1';
    const initialLocalNumber = phone.startsWith(initialDialCode) ? phone.substring(initialDialCode.length) : '';

    const [dialCode, setDialCode] = useState(initialDialCode);
    const [localNumber, setLocalNumber] = useState(initialLocalNumber);

    // Effect to update parent phone state in E.164 format
    useEffect(() => {
        const fullNumber = dialCode + localNumber;
        // Only update if the combined number is different from the parent state to avoid loops
        if (fullNumber !== phone) {
            setPhone(fullNumber);
        }
    }, [dialCode, localNumber, phone, setPhone]);


    const handleCodeChange = (e) => {
        setDialCode(e.target.value);
        // Clearing error if dial code changes, expecting user to check number next
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
            <h2 className="text-3xl font-extrabold text-white text-center mb-6">
                Get Started Free
            </h2>
            {authError && (
                <div className="p-3 mb-4 text-sm text-red-100 bg-red-800 rounded-lg text-center" role="alert">
                    {authError}
                </div>
            )}
            <form className="space-y-4" onSubmit={handleAuth}>
                
                {/* 1. Phone Input (Custom Implementation) */}
                <div className={`
                    w-full flex rounded-lg transition duration-150 bg-gray-700
                    ${phoneError ? 'border border-red-500' : 'border border-gray-600'}
                    focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500
                `}>
                    {/* Country Code Dropdown */}
                    <select
                        value={dialCode}
                        onChange={handleCodeChange}
                        className="bg-transparent text-gray-200 py-3 pl-3 border-r border-gray-600 focus:outline-none rounded-l-lg appearance-none w-20 sm:w-24 md:w-28 cursor-pointer"
                    >
                        {countryCodes.map(({ code, flag, name }) => (
                            <option key={code} value={code} className="bg-gray-700 text-gray-200">
                                {flag} {code}
                            </option>
                        ))}
                    </select>

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
                    />
                </div>
                {/* Phone Error Message */}
                {phoneError && (
                    <p className="text-red-400 text-sm mt-1">{phoneError}</p>
                )}

                {/* Email Input */}
                <input
                    type="text"
                    placeholder="Email Address (Lowercase, no spaces)"
                    className={`w-full px-4 py-3 bg-gray-700 border text-gray-200 rounded-lg placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ${emailError ? 'border-red-500' : 'border-gray-600'}`}
                    onChange={(e) => handleEmailChange(e.target.value)} // Updated to change handler
                    onBlur={handleEmailBlur} // Added blur validation
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
                        className={`w-full pr-12 px-4 py-3 bg-gray-700 border text-gray-200 rounded-lg placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ${passwordError ? 'border-red-500' : 'border-gray-600'}`}
                        onChange={handlePasswordChange} // Using local change handler to clear errors
                        onBlur={handlePasswordBlur}     // Added blur validation for length
                        value={password}
                        required
                        autoComplete="new-password"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-400 transition duration-150"
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
                    disabled={loading}
                >
                    {loading ? 'Creating Account...' : 'Create Account'}
                </button>
                <p className="text-xs text-gray-400 pt-2 text-center">
                    By clicking Create Account, you agree to our Terms and Conditions.
                </p>
            </form>

            {/* Switch View */}
            <p className="text-center text-gray-400 mt-6 pt-4 border-t border-gray-700/50">
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

// --- Sub-Component: Forgot Password Form (UPDATED with email blur validation) ---
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
                           **DEV ONLY** Token: {resetMessage.devToken}
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
                    onChange={(e) => handleEmailChange(e.target.value)} // Updated to change handler
                    onBlur={handleEmailBlur} // Added blur validation
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
            <p className="text-center text-gray-400 mt-6 pt-4 border-t border-gray-700/50">
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
const Login = ({ onLogin, onBackToLanding }) => {
    const [view, setView] = useState('login'); // 'login', 'signup', 'forgotPassword'
    const [email, setEmailState] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState(''); 
    const [loading, setLoading] = useState(false); 
    const [authError, setAuthError] = useState(null); 
    const [resetMessage, setResetMessage] = useState(null); 
    const [passwordError, setPasswordError] = useState(null);
    const [phoneError, setPhoneError] = useState(null); 
    const [emailError, setEmailError] = useState(null); 
    const isSignup = view === 'signup'; 
    
    // --- Validation Functions ---
    const validateEmail = (inputEmail) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 
        if (/\s/.test(inputEmail)) return 'Email cannot contain spaces.';
        if (inputEmail !== inputEmail.toLowerCase()) return 'Email must be entirely lowercase.';
        if (!emailRegex.test(inputEmail)) return 'Please enter a valid email address.';
        return null;
    };
    
    // Updated Email Change Handler: Updates state and clears error while typing
    const handleEmailChange = useCallback((newEmail) => {
        const sanitizedEmail = newEmail.toLowerCase().trim();
        setEmailState(sanitizedEmail);
        // Clear error immediately when user starts typing
        if (emailError) setEmailError(null);
    }, [emailError]);

    // New Email Blur Handler: Validates and sets error only when field loses focus
    const handleEmailBlur = useCallback(() => {
        if (email) {
            setEmailError(validateEmail(email));
        }
    }, [email]);


    // --- Effects and Handlers (omitted for brevity, they remain as they were in the previous iteration) ---
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

    const handleForgotPasswordRequest = async (e) => {
        e.preventDefault();
        setLoading(true);
        setResetMessage(null);
        setAuthError(null); 
        setEmailError(null); // Clear error before final submission check

        // Final validation before sending request
        const emailValidation = validateEmail(email);

        if (emailValidation) {
            setResetMessage({ error: emailValidation });
            setEmailError(emailValidation);
            setLoading(false);
            return;
        }

        try {
            const authData = { email };
            
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

    const handleAuth = async (e) => {
        e.preventDefault();
        
        setAuthError(null); 
        setPasswordError(null); 
        setPhoneError(null);
        setEmailError(null); // Clear errors before final validation

        let hasError = false;

        // Re-run all validation checks on submit
        const emailValidation = validateEmail(email);
        if (emailValidation) {
            setEmailError(emailValidation);
            hasError = true;
        }

        if (isSignup) {
            const currentPassword = password; // use current state password
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
        
        const authData = isSignup 
            ? { email, password, phone: phone }
            : { email, password };


        try {
            const response = await apiClient.post(url, authData);
            const data = response.data; 
            
            if (data && data.token && data.user) {
                localStorage.removeItem('userToken');
                localStorage.setItem('userToken', data.token);
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
            email,
            handleEmailChange,
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
                        phoneError={phoneError} 
                        {...commonProps}
                    />
                );
            case 'forgotPassword':
                return (
                    <ForgotPasswordForm
                        handleForgotPasswordRequest={handleForgotPasswordRequest}
                        resetMessage={resetMessage}
                        {...commonProps}
                    />
                );
            case 'login':
            default:
                return (
                    <LoginForm
                        handleAuth={handleAuth}
                        password={password}
                        setPassword={setPassword}
                        {...commonProps}
                    />
                );
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4 font-inter">
            <div className="w-full max-w-md bg-gray-800 p-8 md:p-10 rounded-2xl shadow-2xl shadow-indigo-900/50">

                {/* Logo */}
                <div className="text-center mb-4">
                    <DollarSign className="w-12 h-12 text-indigo-500 mx-auto" />
                    <h1 className="text-3xl font-extrabold text-white">Pocket POS</h1>
                </div>

                {/* Render the appropriate form */}
                {renderForm()}

                {/* Back Button to Landing Page */}
                <div className="text-center text-sm mt-8">
                    <button
                        onClick={onBackToLanding}
                        className="cursor-pointer text-gray-500 hover:text-indigo-400 transition duration-150 flex items-center mx-auto"
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
