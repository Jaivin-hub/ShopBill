import React, { useState, useEffect, useCallback } from 'react';
import {
    DollarSign, Eye, EyeOff, Lock, Mail,
    ArrowLeft, Loader2, AlertCircle,
    CheckCircle2, Smartphone
} from 'lucide-react';
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
    (error) => Promise.reject(error)
);

// --- Sub-Component: Login Form ---
const LoginForm = ({ handleAuth, identifier, setIdentifier, password, setPassword, loading, setView, authError, onBackToLanding, setCurrentPage, darkMode = true }) => {
    const [showPassword, setShowPassword] = useState(false);

    // Color variables for LoginForm
    const labelColor = darkMode ? 'text-gray-500' : 'text-slate-600';
    const inputBg = darkMode ? 'bg-gray-900/50' : 'bg-slate-50';
    const inputBorder = darkMode ? 'border-gray-800' : 'border-slate-300';
    const inputText = darkMode ? 'text-white' : 'text-slate-900';
    const placeholderColor = darkMode ? 'placeholder:text-gray-700' : 'placeholder:text-slate-400';
    const iconColor = darkMode ? 'text-gray-600' : 'text-slate-500';
    const buttonBg = darkMode ? 'bg-gray-900' : 'bg-slate-100';
    const buttonBorder = darkMode ? 'border-gray-800' : 'border-slate-300';
    const buttonHover = darkMode ? 'hover:bg-gray-800' : 'hover:bg-slate-200';
    const buttonText = darkMode ? 'text-white' : 'text-slate-900';
    const errorBg = darkMode ? 'bg-red-500/10' : 'bg-red-50';
    const errorBorder = darkMode ? 'border-red-500/20' : 'border-red-200';
    const errorText = darkMode ? 'text-red-200/80' : 'text-red-700';
    const successBg = darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50';
    const successBorder = darkMode ? 'border-emerald-500/20' : 'border-emerald-200';
    const successText = darkMode ? 'text-emerald-200/80' : 'text-emerald-700';

    return (
        <section aria-labelledby="login-form" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {authError && (
                <div className={`${errorBg} border ${errorBorder} rounded-xl p-3 flex gap-2 items-center justify-between transition-colors duration-300`} role="alert">
                    <div className="flex gap-2 items-center">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        <p className={`text-[10px] font-bold ${errorText}  tracking-wide`}>
                            {authError}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setCurrentPage('support')}
                        className="text-[10px] font-extrabold text-red-400 hover:text-red-300 underline  tracking-tighter transition-colors"
                    >
                        Contact Support
                    </button>
                </div>
            )}

            <form className="space-y-3" onSubmit={handleAuth}>
                <div className="space-y-1.5">
                    <label htmlFor="identifier" className={`text-[9px] font-black ${labelColor}  tracking-widest ml-1 transition-colors duration-300`}>Identity</label>
                    <div className="relative group">
                        <Smartphone className={`absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${iconColor} group-focus-within:text-indigo-500 transition-colors`} />
                        <input
                            id="identifier"
                            type="text"
                            placeholder="Email or Phone"
                            /* Changed text-sm to text-base (16px) to prevent iOS zoom */
                            className={`w-full pl-11 pr-4 py-3 ${inputBg} border ${inputBorder} ${inputText} text-base md:text-sm font-bold rounded-xl focus:border-indigo-500 outline-none transition-all ${placeholderColor}`}
                            onChange={(e) => setIdentifier(e.target.value)}
                            value={identifier}
                            required
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                        <label htmlFor="password" className={`text-[9px] font-black ${labelColor}  tracking-widest transition-colors duration-300`}>Password</label>
                        <button
                            type="button"
                            onClick={() => setView('forgotPassword')}
                            className="text-[9px] font-black text-indigo-500  tracking-widest hover:text-indigo-600 transition-colors"
                        >
                            Forgot Password?
                        </button>
                    </div>
                    <div className="relative group">
                        <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${iconColor} group-focus-within:text-indigo-500 transition-colors`} />
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            /* Changed text-sm to text-base (16px) to prevent iOS zoom */
                            className={`w-full pl-11 pr-11 py-3 ${inputBg} border ${inputBorder} ${inputText} text-base md:text-sm font-bold rounded-xl focus:border-indigo-500 outline-none transition-all ${placeholderColor}`}
                            onChange={(e) => setPassword(e.target.value)}
                            value={password}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className={`absolute right-4 top-1/2 -translate-y-1/2 ${iconColor} hover:text-indigo-400 transition-colors`}
                        >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-[11px]  tracking-widest transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>Access Hub <CheckCircle2 className="w-3.5 h-3.5" /></>
                    )}
                </button>
            </form>

            <div className={`pt-4 border-t ${darkMode ? 'border-gray-800/50' : 'border-slate-200'} text-center transition-colors duration-300`}>
                <p className={`text-[9px] font-bold ${labelColor}  tracking-widest mb-2 transition-colors duration-300`}>New User?</p>
                <button
                    onClick={onBackToLanding}
                    className={`w-full py-3 ${buttonBg} border ${buttonBorder} ${buttonText} rounded-xl font-black text-[10px]  tracking-widest ${buttonHover} transition-all active:scale-[0.98]`}
                >
                    Create Account
                </button>
            </div>
        </section>
    );
};

// --- Sub-Component: Forgot Password Form ---
const ForgotPasswordForm = ({ handleForgotPasswordRequest, email, handleEmailChange, handleEmailBlur, loading, setView, resetMessage, emailError, darkMode = true }) => {
    // Color variables for ForgotPasswordForm
    const labelColor = darkMode ? 'text-gray-500' : 'text-slate-600';
    const inputBg = darkMode ? 'bg-gray-900/50' : 'bg-slate-50';
    const inputBorder = darkMode ? 'border-gray-800' : 'border-slate-300';
    const inputText = darkMode ? 'text-white' : 'text-slate-900';
    const placeholderColor = darkMode ? 'placeholder:text-gray-700' : 'placeholder:text-slate-400';
    const iconColor = darkMode ? 'text-gray-600' : 'text-slate-500';
    const titleColor = darkMode ? 'text-white' : 'text-slate-900';
    const successBg = darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50';
    const successBorder = darkMode ? 'border-emerald-500/20' : 'border-emerald-200';
    const successText = darkMode ? 'text-emerald-200/80' : 'text-emerald-700';

    return (
        <section aria-labelledby="reset-heading" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="text-center">
                <h2 id="reset-heading" className={`text-lg font-black ${titleColor}  tracking-tighter`}>
                    Reset Access
                </h2>
            </div>

            {resetMessage?.success && (
                <div className={`${successBg} border ${successBorder} rounded-xl p-3 flex items-center gap-2 text-center transition-colors duration-300`} role="status">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <p className={`text-[10px] font-bold ${successText}  tracking-wide`}>{resetMessage.success}</p>
                </div>
            )}

            <form className="space-y-4" onSubmit={handleForgotPasswordRequest}>
                <div className="space-y-1.5">
                    <label htmlFor="reset-email" className={`text-[9px] font-black ${labelColor}  tracking-widest ml-1 transition-colors duration-300`}>Account Email</label>
                    <div className="relative group">
                        <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${iconColor} group-focus-within:text-indigo-500 transition-colors`} />
                        <input
                            id="reset-email"
                            type="email"
                            placeholder="your@email.com"
                            /* Changed text-sm to text-base (16px) to prevent iOS zoom */
                            className={`w-full pl-11 pr-4 py-3 ${inputBg} border ${emailError ? 'border-red-500' : inputBorder} ${inputText} text-base md:text-sm font-bold rounded-xl focus:border-indigo-500 outline-none transition-all ${placeholderColor}`}
                            onChange={(e) => handleEmailChange(e.target.value)}
                            onBlur={handleEmailBlur}
                            value={email}
                            required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || !!emailError}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-[11px] tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Reset Link"}
                </button>
            </form>

            <div className="pt-6 space-y-4">
                <button
                    onClick={() => setView('login')}
                    className={`w-full flex items-center justify-center gap-2 text-[10px] font-black ${darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'} tracking-widest transition-colors py-3 border ${darkMode ? 'border-indigo-500/30 hover:border-indigo-500/50' : 'border-indigo-200 hover:border-indigo-300'} rounded-xl ${darkMode ? 'bg-indigo-500/10 hover:bg-indigo-500/20' : 'bg-indigo-50 hover:bg-indigo-100'}`}
                    disabled={loading}
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Log In
                </button>
            </div>
        </section>
    );
};

const Login = ({ onLogin, onBackToLanding, onBackToLandingNormal, setCurrentPage, darkMode = true }) => {
    const [view, setView] = useState('login');
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [authError, setAuthError] = useState(null);
    const [resetMessage, setResetMessage] = useState(null);
    const [emailError, setEmailError] = useState(null);

    const validateEmail = (inputEmail) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(inputEmail)) return 'Invalid format.';
        return null;
    };

    const handleEmailChange = useCallback((newEmail) => {
        setIdentifier(newEmail.toLowerCase().trim());
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
        try {
            const response = await apiClient.post(API.forgetpassword, { email: identifier });
            setResetMessage({ success: response.data.message || 'Reset link sent.' });
        } catch (error) {
            setResetMessage({ error: error.response?.data?.error || 'Failed.' });
        } finally {
            setLoading(false);
        }
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await apiClient.post(API.login, { identifier, password });
            if (response.data?.token) {
                localStorage.setItem('userToken', response.data.token);
                onLogin(response.data.user, response.data.token);
            }
        } catch (error) {
            setAuthError(error.response?.data?.error || 'Auth failed.');
        } finally {
            setLoading(false);
        }
    };

    const bgColor = darkMode ? 'bg-gray-950' : 'bg-slate-50';
    const cardBg = darkMode ? 'bg-gray-950' : 'bg-white';
    const cardBorder = darkMode ? 'border-gray-800' : 'border-slate-200';
    const headerBg = darkMode ? 'bg-gray-900/20' : 'bg-slate-50';
    const headerBorder = darkMode ? 'border-gray-800/50' : 'border-slate-200';
    const titleColor = darkMode ? 'text-white' : 'text-slate-900';
    const labelColor = darkMode ? 'text-gray-500' : 'text-slate-600';
    const inputBg = darkMode ? 'bg-gray-900/50' : 'bg-slate-50';
    const inputBorder = darkMode ? 'border-gray-800' : 'border-slate-300';
    const inputText = darkMode ? 'text-white' : 'text-slate-900';
    const placeholderColor = darkMode ? 'placeholder:text-gray-700' : 'placeholder:text-slate-400';
    const iconColor = darkMode ? 'text-gray-600' : 'text-slate-500';
    const footerText = darkMode ? 'text-gray-600' : 'text-slate-600';
    const buttonBg = darkMode ? 'bg-gray-900' : 'bg-slate-100';
    const buttonBorder = darkMode ? 'border-gray-800' : 'border-slate-300';
    const buttonHover = darkMode ? 'hover:bg-gray-800' : 'hover:bg-slate-200';
    const buttonText = darkMode ? 'text-white' : 'text-slate-900';
    const errorBg = darkMode ? 'bg-red-500/10' : 'bg-red-50';
    const errorBorder = darkMode ? 'border-red-500/20' : 'border-red-200';
    const errorText = darkMode ? 'text-red-200/80' : 'text-red-700';
    const successBg = darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50';
    const successBorder = darkMode ? 'border-emerald-500/20' : 'border-emerald-200';
    const successText = darkMode ? 'text-emerald-200/80' : 'text-emerald-700';

    return (
        <main className={`h-screen w-full flex items-center justify-center ${bgColor} p-4 sm:p-6 overflow-hidden transition-colors duration-300`}>
            <div className="w-full max-w-[380px] flex flex-col relative">

                <div className={`absolute -inset-10 ${darkMode ? 'bg-indigo-500/5' : 'bg-indigo-100/30'} blur-[80px] -z-10 rounded-full`} />

                <section className={`${cardBg} border ${cardBorder} rounded-[2rem] shadow-2xl overflow-hidden flex flex-col transition-colors duration-300`}>

                    <header className={`pt-6 pb-4 px-6 text-center ${headerBg} border-b ${headerBorder} transition-colors duration-300`}>
                        <div className="inline-flex items-center justify-center w-11 h-11 bg-indigo-500/10 rounded-xl mb-2 border border-indigo-500/20">
                            <DollarSign className="w-5 h-5 text-indigo-500" />
                        </div>
                        <h1 className={`text-base font-black ${titleColor} tracking-[0.2em] transition-colors duration-300`}>Pocket <span className="text-indigo-500">POS</span></h1>
                    </header>

                    <div className="p-6 sm:p-8">
                        {view === 'forgotPassword' ? (
                            <ForgotPasswordForm
                                handleForgotPasswordRequest={handleForgotPasswordRequest}
                                resetMessage={resetMessage}
                                loading={loading}
                                setView={setView}
                                emailError={emailError}
                                email={identifier}
                                handleEmailChange={handleEmailChange}
                                handleEmailBlur={handleEmailBlur}
                                darkMode={darkMode}
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
                                setCurrentPage={setCurrentPage}
                                darkMode={darkMode}
                            />
                        )}
                    </div>

                    <footer className="pb-6 px-6 text-center pt-4">
                        <button
                            onClick={onBackToLandingNormal}
                            className={`inline-flex items-center gap-2 text-[10px] font-black ${footerText} tracking-widest hover:text-indigo-400 transition-colors py-2 px-4 rounded-lg ${darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-slate-100'}`}
                            disabled={loading}
                        >
                            <ArrowLeft className="w-3 h-3" /> Back to Landing
                        </button>
                    </footer>
                </section>
            </div>
        </main>
    );
};

export default Login;