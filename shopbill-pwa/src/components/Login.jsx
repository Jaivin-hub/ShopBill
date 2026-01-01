import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import API from '../config/api';

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

// --- Sub-Component: Login Form ---
const LoginForm = ({ handleAuth, identifier, setIdentifier, password, setPassword, loading, setView, authError, onBackToLanding }) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <section aria-labelledby="login-heading">
            <h2 id="login-heading" className="text-3xl font-extrabold text-white text-center mb-6">
                Welcome Back
            </h2>
            {authError && (
                <div 
                    className="p-3 mb-4 text-sm text-red-100 bg-red-800/80 border border-red-600 rounded-lg text-center" 
                    role="alert" 
                    aria-live="assertive"
                >
                    {authError}
                </div>
            )}
            <form className="space-y-4" onSubmit={handleAuth} aria-label="Login form">
                <div className="space-y-1">
                    <label htmlFor="identifier" className="sr-only">Email or Phone Number</label>
                    <input
                        id="identifier"
                        type="text"
                        placeholder="Email Address or Phone Number"
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-gray-100 rounded-lg placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition duration-150"
                        onChange={(e) => setIdentifier(e.target.value)}
                        value={identifier}
                        required
                        autoComplete="username"
                        aria-required="true"
                    />
                </div>
                
                <div className="relative space-y-1">
                    <label htmlFor="password" className="sr-only">Password</label>
                    <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        className="w-full pr-12 px-4 py-3 bg-gray-900 border border-gray-700 text-gray-100 rounded-lg placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition duration-150"
                        onChange={(e) => setPassword(e.target.value)}
                        value={password}
                        required
                        autoComplete="current-password"
                        aria-required="true"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-indigo-400 transition duration-150"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                    </button>
                </div>

                <div className="flex justify-end pt-1">
                    <button
                        type="button"
                        onClick={() => setView('forgotPassword')}
                        className="text-sm cursor-pointer text-indigo-400 hover:text-indigo-300 transition duration-150"
                    >
                        Forgot Password?
                    </button>
                </div>

                <button
                    type="submit"
                    className="cursor-pointer w-full mt-6 py-3 bg-indigo-600 text-white text-lg font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition transform hover:scale-[1.01] duration-300 ease-in-out disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
                    disabled={loading}
                >
                    {loading ? 'Logging In...' : 'Log In'}
                </button>
            </form>

            <p className="text-center text-gray-400 mt-6 pt-4 border-t border-gray-800">
                New to Pocket POS?
                <button
                    onClick={onBackToLanding} 
                    className="ml-2 cursor-pointer text-teal-400 hover:text-teal-300 font-bold transition duration-150"
                    disabled={loading}
                    aria-label="Create a new account"
                >
                    Create Account
                </button>
            </p>
        </section>
    );
};

// --- Sub-Component: Forgot Password Form ---
const ForgotPasswordForm = ({ handleForgotPasswordRequest, email, handleEmailChange, handleEmailBlur, loading, setView, resetMessage, emailError }) => {
    return (
        <section aria-labelledby="reset-heading">
            <h2 id="reset-heading" className="text-3xl font-extrabold text-white text-center mb-6">
                Reset Password
            </h2>

            {resetMessage && resetMessage.success && (
                <div className="p-3 mb-4 text-sm text-green-100 bg-green-900/80 border border-green-700 rounded-lg text-center" role="status">
                    <p>{resetMessage.success}</p>
                    {resetMessage.devToken && (
                        <p className="mt-2 text-xs font-mono break-all text-green-300">
                            <strong>DEV ONLY</strong> Token: {resetMessage.devToken}
                        </p>
                    )}
                </div>
            )}

            {resetMessage && resetMessage.error && (
                <div className="p-3 mb-4 text-sm text-red-100 bg-red-900/80 border border-red-700 rounded-lg text-center" role="alert">
                    {resetMessage.error}
                </div>
            )}

            <form className="space-y-4" onSubmit={handleForgotPasswordRequest} aria-label="Password reset form">
                <p className="text-gray-400 text-sm text-center pt-2">
                    Enter your email address to receive a password reset link.
                </p>
                <div className="space-y-1">
                    <label htmlFor="reset-email" className="sr-only">Email Address</label>
                    <input
                        id="reset-email"
                        type="email"
                        inputMode="email"
                        placeholder="Email Address"
                        className={`w-full px-4 py-3 bg-gray-900 border text-gray-100 rounded-lg placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition duration-150 ${emailError ? 'border-red-500' : 'border-gray-700'}`}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        onBlur={handleEmailBlur}
                        value={email}
                        required
                        autoComplete="email"
                        aria-invalid={!!emailError}
                    />
                    {emailError && (
                        <p className="text-red-400 text-sm mt-1" role="alert">{emailError}</p>
                    )}
                </div>

                <button
                    type="submit"
                    className="w-full mt-6 py-3 bg-teal-600 text-white text-lg font-bold rounded-xl shadow-lg shadow-teal-600/30 hover:bg-teal-700 transition transform hover:scale-[1.01] duration-300 ease-in-out disabled:bg-gray-700"
                    disabled={loading || !!emailError}
                >
                    {loading ? 'Sending Request...' : 'Send Reset Link'}
                </button>
            </form>

            <p className="text-center text-gray-400 mt-6 pt-4 border-t border-gray-800">
                <button
                    onClick={() => setView('login')}
                    className="ml-2 cursor-pointer text-indigo-400 hover:text-indigo-300 font-bold transition duration-150"
                    disabled={loading}
                >
                    ← Back to Log In
                </button>
            </p>
        </section>
    );
};

const Login = ({ onLogin, onBackToLanding }) => {
    const [view, setView] = useState('login'); 
    const [identifier, setIdentifier] = useState(''); 
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [authError, setAuthError] = useState(null);
    const [resetMessage, setResetMessage] = useState(null);
    const [emailError, setEmailError] = useState(null); 

    const validateEmail = (inputEmail) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (/\s/.test(inputEmail)) return 'Email cannot contain spaces.';
        if (inputEmail !== inputEmail.toLowerCase()) return 'Email must be entirely lowercase.';
        if (!emailRegex.test(inputEmail)) return 'Please enter a valid email address.';
        return null;
    };

    const handleEmailChange = useCallback((newEmail) => {
        const sanitizedEmail = newEmail.toLowerCase().trim();
        setIdentifier(sanitizedEmail);
        if (emailError) setEmailError(null);
    }, [emailError]);

    const handleEmailBlur = useCallback(() => {
        if (view === 'forgotPassword' && identifier) {
            setEmailError(validateEmail(identifier));
        }
    }, [identifier, view]);

    useEffect(() => {
        setAuthError(null);
        setResetMessage(null);
        setEmailError(null);
        if (view !== 'login') setPassword('');
    }, [view]);

    const handleForgotPasswordRequest = async (e) => {
        e.preventDefault();
        setLoading(true);
        setResetMessage(null);
        const emailValidation = validateEmail(identifier); 
        if (emailValidation) {
            setResetMessage({ error: emailValidation });
            setEmailError(emailValidation);
            setLoading(false);
            return;
        }

        try {
            const authData = { email: identifier };
            const response = await apiClient.post(API.forgetpassword, authData);
            setResetMessage({
                success: response.data.message || 'Reset link has been sent.'
            });
            if (response.data.devResetToken) {
                setResetMessage((prev) => ({ ...prev, devToken: response.data.devResetToken }));
            }
        } catch (error) {
            setResetMessage({ error: error.response?.data?.error || 'Failed to send reset link.' });
        } finally {
            setLoading(false);
        }
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setAuthError(null);
        if (!identifier || !password) {
            setAuthError('All fields are required.');
            return;
        }
        setLoading(true);

        try {
            const authData = { identifier, password };
            const response = await apiClient.post(API.login, authData);
            const data = response.data;

            if (data?.token && data?.user) {
                localStorage.setItem('userToken', data.token);
                onLogin(data.user, data.token);
            } else {
                setAuthError('Login failed. Invalid credentials.');
            }
        } catch (error) {
            setAuthError(error.response?.data?.error || 'Connection failed.');
        } finally {
            setLoading(false);
        }
    };

    const renderForm = () => {
        const commonProps = {
            identifier,
            setIdentifier: handleEmailChange, 
            handleEmailBlur,
            loading,
            setView,
            emailError,
            authError,
        };

        return view === 'forgotPassword' ? (
            <ForgotPasswordForm
                handleForgotPasswordRequest={handleForgotPasswordRequest}
                resetMessage={resetMessage}
                {...commonProps}
                email={identifier}
                handleEmailChange={handleEmailChange}
                handleEmailBlur={handleEmailBlur}
            />
        ) : (
            <LoginForm
                handleAuth={handleAuth}
                identifier={identifier}
                setIdentifier={setIdentifier} 
                password={password}
                setPassword={setPassword}
                authError={authError}
                loading={loading}
                setView={setView}
                onBackToLanding={onBackToLanding}
            />
        );
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-950 p-4 font-inter" itemScope itemType="https://schema.org/WebPage">
            <section className="w-full max-w-md bg-gray-900 p-8 md:p-10 rounded-2xl shadow-2xl shadow-indigo-900/20 border border-gray-800">
                <header className="text-center mb-4" itemProp="headline">
                    <DollarSign className="w-12 h-12 text-indigo-500 mx-auto" aria-hidden="true" />
                    <h1 className="text-3xl font-extrabold text-white">Pocket POS</h1>
                    <p className="text-sm text-gray-400 mt-2" itemProp="description">Login to your Pocket POS account to access your retail management dashboard, billing, inventory, and digital Khata ledger.</p>
                </header>
                {renderForm()}
                <div className="text-center text-sm mt-8">
                    <button
                        onClick={onBackToLanding}
                        className="cursor-pointer text-gray-500 hover:text-indigo-400 transition duration-150 flex items-center mx-auto"
                        disabled={loading}
                        aria-label="Return to landing page"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1" aria-hidden="true"><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></svg>
                        Back to Landing Page
                    </button>
                </div>
            </section>
        </main>
    );
};

export default Login;