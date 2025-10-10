import React, { useState, useEffect } from 'react';
import { DollarSign, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
// IMPORTANT: Assuming the original API import is uncommented in a real environment
import API from '../config/api' 


// --- AXIOS INSTANCE WITH AUTH INTERCEPTOR (Remains Global) ---
const apiClient = axios.create();

apiClient.interceptors.request.use(
  (config) => {
    // CRITICAL: Interceptor reads token from localStorage on EVERY request creation
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


// --- Sub-Component: Login Form (NO CHANGES) ---
const LoginForm = ({ handleAuth, email, setEmail, password, setPassword, loading, setView, authError }) => {
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
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                    onChange={(e) => setEmail(e.target.value)}
                    value={email}
                    required
                />
                
                {/* Password Input with Toggle */}
                <div className="relative">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        className="w-full pr-12 px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                        onChange={(e) => setPassword(e.target.value)}
                        value={password}
                        required
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

                {/* Forgot Password - NOW FUNCTIONAL */}
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

// --- Sub-Component: Signup Form (MODIFIED to accept and display validation errors) ---
const SignupForm = ({ handleAuth, email, setEmail, password, setPassword, phone, setPhone, loading, setView, authError, passwordError, phoneError }) => {
    const [showPassword, setShowPassword] = useState(false);

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
                {/* Phone Number Input */}
                <input
                    type="tel"
                    placeholder="Phone Number (10-15 digits)"
                    // Removed pattern/title to allow JS validation to handle feedback
                    className={`w-full px-4 py-3 bg-gray-700 border text-gray-200 rounded-lg placeholder-gray-400 focus:ring-teal-500 focus:border-teal-500 transition duration-150 ${phoneError ? 'border-red-500' : 'border-gray-600'}`}
                    onChange={(e) => setPhone(e.target.value)}
                    value={phone}
                    required
                />
                {/* Phone Error Message */}
                {phoneError && (
                    <p className="text-red-400 text-sm mt-1">{phoneError}</p>
                )}

                {/* Email Input */}
                <input
                    type="text"
                    placeholder="Email Address"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                    onChange={(e) => setEmail(e.target.value)}
                    value={email}
                    required
                />
                
                {/* Password Input with Toggle */}
                <div className="relative">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password (Min 8 characters)"
                        className={`w-full pr-12 px-4 py-3 bg-gray-700 border text-gray-200 rounded-lg placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ${passwordError ? 'border-red-500' : 'border-gray-600'}`}
                        onChange={(e) => setPassword(e.target.value)}
                        value={password}
                        required
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

// --- Sub-Component: Forgot Password Form (NO CHANGES) ---
const ForgotPasswordForm = ({ handleForgotPasswordRequest, email, setEmail, loading, setView, resetMessage }) => {
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
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                    onChange={(e) => setEmail(e.target.value)}
                    value={email}
                    required
                />
                
                {/* Submit Button */}
                <button
                    type="submit"
                    className="w-full mt-6 py-3 bg-teal-600 text-white text-lg font-bold rounded-xl shadow-lg shadow-teal-600/30 hover:bg-teal-700 transition transform hover:scale-[1.01] duration-300 ease-in-out disabled:bg-teal-400"
                    disabled={loading}
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


// Main Login Component (MODIFIED to include validation states and logic)
const Login = ({ onLogin, onBackToLanding }) => {
    const [view, setView] = useState('login'); // 'login', 'signup', 'forgotPassword'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false); 
    const [authError, setAuthError] = useState(null); 
    const [resetMessage, setResetMessage] = useState(null); 

    // --- NEW VALIDATION STATES ---
    const [passwordError, setPasswordError] = useState(null);
    const [phoneError, setPhoneError] = useState(null);
    // ----------------------------

    // Helper to determine if we are in signup mode
    const isSignup = view === 'signup'; 

    // Effect to clear error messages when switching views
    useEffect(() => {
        setAuthError(null);
        setResetMessage(null);
        // Clear client validation errors too
        setPasswordError(null);
        setPhoneError(null);
    }, [view]);

    // --- Forgot Password Request Handler (NO CHANGES) ---
    const handleForgotPasswordRequest = async (e) => {
        e.preventDefault();
        setLoading(true);
        setResetMessage(null);
        setAuthError(null); 

        if (!email) {
            setResetMessage({ error: 'Please enter your email address.' });
            setLoading(false);
            return;
        }

        try {
            const authData = { email };
            
            // Using apiClient (Axios) for POST request
            const response = await apiClient.post(API.forgetpassword, authData);
            const data = response.data;

            // Backend returns a generic message for security, regardless of user existence
            setResetMessage({ 
                success: data.message || 'If an account is associated with this email, a reset link has been sent.' 
            });

            // Log and optionally show the DEV token returned by the backend for testing
            if (data.devResetToken) {
                 console.log("PASSWORD RESET DEV TOKEN:", data.devResetToken);
                 setResetMessage((prev) => ({ 
                    success: prev.success, 
                    devToken: data.devResetToken 
                 }));
            }
            
        } catch (error) {
            console.error('Forgot Password Request Error:', error);
            
            // Extract error message from Axios error response
            const errorMessage = error.response?.data?.error 
                || error.response?.data?.message 
                || error.message 
                || 'An unexpected error occurred during password reset.';

            setResetMessage({ error: errorMessage });
        } finally {
            setLoading(false);
        }
    };


    // --- Auth Handler (Login/Signup - MODIFIED for Validation) ---
    const handleAuth = async (e) => {
        e.preventDefault();
        
        // Clear previous errors
        setAuthError(null); 
        setPasswordError(null); 
        setPhoneError(null);    

        const formType = isSignup ? 'Signup' : 'Login';
        const url = isSignup ? API.signup : API.login;
        const authData = isSignup ? { email, password, phone } : { email, password };

        // --- CLIENT-SIDE VALIDATION FOR SIGNUP ---
        if (isSignup) {
            let hasError = false;

            // 1. Password Validation: Must be more than 8 characters
            if (password.length < 8) {
                setPasswordError('Password must be at least 8 characters long.');
                hasError = true;
            }

            // 2. Phone Number Validation: Basic check for digits (10-15 digits)
            // This regex allows for optional leading '+' and optional spaces/dashes between digits
            const phoneRegex = /^\+?(\d[\s-]?){10,15}$/; 
            if (!phone || !phoneRegex.test(phone.trim())) {
                 setPhoneError('Please enter a valid phone number (10-15 digits).');
                 hasError = true;
            }
            
            // Stop form submission if client-side validation fails
            if (hasError) {
                return; 
            }
        }
        // --- END CLIENT-SIDE VALIDATION ---
        
        setLoading(true);

        try {
            // Using apiClient (Axios) for POST request.
            const response = await apiClient.post(url, authData);
            const data = response.data; 
            
            // Expected response: { token, user: { id, email, role, shopId } }
            if (data && data.token && data.user) {
                
                localStorage.setItem('userToken', data.token);
                onLogin(data.user, data.token); 
            } else {
                 setAuthError(`${formType} failed. Unexpected response structure.`);
            }
        } catch (error) {
            console.error(error);
            
            // Extract error message from Axios error response
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
        switch (view) {
            case 'signup':
                return (
                    <SignupForm 
                        handleAuth={handleAuth}
                        email={email}
                        setEmail={setEmail}
                        password={password}
                        setPassword={setPassword}
                        phone={phone}
                        setPhone={setPhone}
                        loading={loading}
                        setView={setView}
                        authError={authError}
                        // --- NEW PROPS ---
                        passwordError={passwordError} 
                        phoneError={phoneError}
                        // -----------------
                    />
                );
            case 'forgotPassword':
                return (
                    <ForgotPasswordForm
                        handleForgotPasswordRequest={handleForgotPasswordRequest}
                        email={email}
                        setEmail={setEmail}
                        loading={loading}
                        setView={setView}
                        resetMessage={resetMessage}
                    />
                );
            case 'login':
            default:
                return (
                    <LoginForm
                        handleAuth={handleAuth}
                        email={email}
                        setEmail={setEmail}
                        password={password}
                        setPassword={setPassword}
                        loading={loading}
                        setView={setView}
                        authError={authError}
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