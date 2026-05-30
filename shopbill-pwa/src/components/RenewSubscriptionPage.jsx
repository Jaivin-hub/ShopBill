import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ArrowLeft,
    CreditCard,
    Loader2,
    Mail,
    MessageSquare,
    CheckCircle2,
    AlertCircle,
    ExternalLink,
    Store,
    Send,
} from 'lucide-react';
import axios from 'axios';
import API from '../config/api';
import ThemeToggle from './ThemeToggle';

const loadRazorpayScript = (src) => {
    return new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const RenewSubscriptionPage = ({ onBack, origin, darkMode = true, setDarkMode, checkoutToken: checkoutTokenProp }) => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [step, setStep] = useState('email');
    const [statusInfo, setStatusInfo] = useState(null);
    const [checkout, setCheckout] = useState(null);
    const [checkoutToken, setCheckoutToken] = useState(checkoutTokenProp || '');
    const [checkoutInfo, setCheckoutInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [payLoading, setPayLoading] = useState(false);
    const checkoutOpenedRef = useRef(false);

    useEffect(() => {
        window.scrollTo(0, 0);
        try {
            const saved = sessionStorage.getItem('renewEmail');
            if (saved) {
                setEmail(saved);
                sessionStorage.removeItem('renewEmail');
            }
        } catch (_) { /* ignore */ }
        const params = new URLSearchParams(window.location.search || '');
        const token = checkoutTokenProp || params.get('token') || '';
        if (token) {
            setCheckoutToken(token);
            setStep('token_checkout');
        }
    }, [checkoutTokenProp]);

    useEffect(() => {
        if (step !== 'token_checkout' || !checkoutToken) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get(API.subscriptionRenewCheckout(checkoutToken));
                if (!cancelled) {
                    setCheckoutInfo(res.data);
                    if (res.data.email) setEmail(res.data.email);
                }
            } catch (err) {
                if (!cancelled) {
                    const data = err.response?.data || {};
                    setError(data.message || data.error || 'Could not load payment link.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [step, checkoutToken]);

    const loadStatus = async (emailValue) => {
        const res = await axios.get(API.subscriptionRenewStatus(emailValue.trim().toLowerCase()));
        return res.data;
    };

    const handleCheckEmail = async (e) => {
        e?.preventDefault?.();
        setLoading(true);
        setError(null);
        setSuccess(null);
        setStatusInfo(null);
        try {
            const data = await loadStatus(email);
            if (data.redirectPage === 'mandateRestore') {
                setError(data.message || 'Use mandate restore for halted billing.');
                setTimeout(() => onBack('mandateRestore'), 2500);
                return;
            }
            if (!data.needsRenew) {
                setError(data.message || 'This account cannot restart subscription here.');
                return;
            }
            setStatusInfo(data);
            setStep('choose');
        } catch (err) {
            setError(err.response?.data?.error || 'Could not verify this email.');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestLink = async (e) => {
        e?.preventDefault?.();
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await axios.post(API.subscriptionRenewRequest, {
                email: email.trim().toLowerCase(),
                message: message.trim(),
            });
            setSuccess(res.data?.message || 'Request sent. Check your email for the payment link.');
            setStep('requested');
        } catch (err) {
            const data = err.response?.data || {};
            if (data.redirectPage === 'mandateRestore') {
                setError(data.error);
                setTimeout(() => onBack('mandateRestore'), 2500);
            } else {
                setError(data.error || 'Could not send request.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePayOnline = async () => {
        setLoading(true);
        setError(null);
        checkoutOpenedRef.current = false;
        try {
            const res = await axios.post(API.subscriptionRenewStart, {
                email: email.trim().toLowerCase(),
            });
            setCheckout(res.data);
            setStep('pay');
        } catch (err) {
            setError(err.response?.data?.error || 'Could not start online payment.');
        } finally {
            setLoading(false);
        }
    };

    const openRazorpayCheckout = useCallback(
        async (info) => {
            const subId = info?.subscriptionId;
            const keyId = info?.keyId;
            const amount = info?.amount;
            const currency = info?.currency;
            const shopName = info?.shopName;
            const tokenForVerify = checkoutToken || '';

            if (!subId || !keyId) return;
            setPayLoading(true);
            setError(null);
            try {
                const loaded = await loadRazorpayScript('https://checkout.razorpay.com/v1/checkout.js');
                if (!loaded) throw new Error('Payment gateway failed to load.');

                const options = {
                    key: keyId,
                    amount,
                    currency: currency || 'INR',
                    name: 'Pocket POS',
                    description: `Restart subscription — ${shopName || 'your store'}`,
                    subscription_id: subId,
                    handler: async (response) => {
                        try {
                            const verifyUrl = tokenForVerify
                                ? API.subscriptionRenewCheckoutVerify
                                : API.subscriptionRenewVerify;
                            const body = {
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                razorpay_subscription_id:
                                    response.razorpay_subscription_id || subId,
                            };
                            if (tokenForVerify) {
                                body.checkoutToken = tokenForVerify;
                            } else {
                                body.email = email.trim().toLowerCase();
                            }
                            const vResp = await axios.post(verifyUrl, body);
                            setSuccess(
                                vResp.data?.message ||
                                    'Subscription restarted. You can sign in now.'
                            );
                            setStep('done');
                        } catch (err) {
                            setError(err.response?.data?.error || 'Verification failed.');
                        } finally {
                            setPayLoading(false);
                        }
                    },
                    prefill: { email: email.trim().toLowerCase(), name: shopName },
                    theme: { color: '#4f46e5' },
                    modal: {
                        ondismiss: () => {
                            setPayLoading(false);
                            checkoutOpenedRef.current = false;
                        },
                    },
                };
                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', () => {
                    setPayLoading(false);
                    checkoutOpenedRef.current = false;
                });
                rzp.open();
            } catch (err) {
                setError(err.message || 'Could not start payment.');
                setPayLoading(false);
                checkoutOpenedRef.current = false;
            }
        },
        [checkout, checkoutInfo, checkoutToken, email]
    );

    useEffect(() => {
        if (step !== 'pay' || !checkout?.subscriptionId || checkoutOpenedRef.current) return;
        checkoutOpenedRef.current = true;
        openRazorpayCheckout(checkout);
    }, [step, checkout, openRazorpayCheckout]);

    const bgPage = darkMode ? 'bg-gray-950' : 'bg-slate-50';
    const textPrimary = darkMode ? 'text-white' : 'text-slate-900';
    const textMuted = darkMode ? 'text-gray-400' : 'text-slate-600';
    const cardBg = darkMode ? 'bg-gray-900' : 'bg-white';
    const borderCl = darkMode ? 'border-gray-800' : 'border-slate-200';
    const navBg = darkMode ? 'bg-gray-950/80' : 'bg-white/80';
    const inputBg = darkMode ? 'bg-gray-950' : 'bg-slate-50';
    const backHover = darkMode ? 'text-gray-400 hover:text-indigo-400' : 'text-slate-600 hover:text-indigo-600';

    return (
        <article className={`min-h-screen flex flex-col items-center ${bgPage} ${textPrimary} transition-colors duration-300`}>
            <nav className={`sticky top-0 w-full z-40 backdrop-blur-md border-b ${navBg} ${borderCl}`}>
                <div className="max-w-2xl mx-auto px-4 h-16 flex justify-between items-center">
                    <button
                        type="button"
                        onClick={() => onBack(origin === 'login' ? 'login' : 'landing')}
                        className={`flex items-center gap-2 font-medium ${backHover}`}
                    >
                        <ArrowLeft size={20} /> Back
                    </button>
                    <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} size="sm" />
                </div>
            </nav>

            <div className="w-full max-w-2xl px-4 py-8 space-y-6">
                <header className="text-center space-y-2">
                    <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <Store className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h1 className="text-xl font-black tracking-tight">Restart your subscription</h1>
                    <p className={`text-sm ${textMuted} max-w-md mx-auto`}>
                        Use your registered owner email. We will send you a secure payment link to restart billing
                        and access your existing store. You can also pay online instantly when available.
                    </p>
                </header>

                {error && (
                    <div className={`rounded-xl border p-4 flex gap-2 ${cardBg} ${borderCl} text-red-400 text-sm`}>
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className={`rounded-xl border p-4 flex gap-2 ${cardBg} ${borderCl} text-emerald-400 text-sm`}>
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{success}</span>
                    </div>
                )}

                {step === 'email' && (
                    <section className={`rounded-2xl border p-6 space-y-4 ${cardBg} ${borderCl}`}>
                        <form onSubmit={handleCheckEmail} className="space-y-3">
                            <div>
                                <label className={`text-xs font-bold ${textMuted} uppercase tracking-wider`}>
                                    Registered owner email
                                </label>
                                <div className="relative mt-1">
                                    <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={`w-full pl-10 pr-4 py-3 rounded-xl border ${borderCl} ${inputBg} ${textPrimary} text-sm`}
                                        placeholder="owner@shop.com"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Continue
                            </button>
                        </form>
                    </section>
                )}

                {step === 'choose' && statusInfo && (
                    <section className={`rounded-2xl border p-6 space-y-4 ${cardBg} ${borderCl}`}>
                        <p className={`text-sm ${textMuted}`}>
                            Shop: <strong className={textPrimary}>{statusInfo.shopName}</strong> · Plan:{' '}
                            {statusInfo.plan}
                        </p>
                        {statusInfo.pendingRequest?.status === 'requested' && (
                            <p className={`text-xs text-amber-400`}>
                                You already requested a link. Our team will email you shortly — or submit again
                                below to update your note.
                            </p>
                        )}
                        <form onSubmit={handleRequestLink} className="space-y-3">
                            <div>
                                <label className={`text-xs font-bold ${textMuted} uppercase tracking-wider`}>
                                    Note for Pocket POS (optional)
                                </label>
                                <div className="relative mt-1">
                                    <MessageSquare className={`absolute left-3 top-3 w-4 h-4 ${textMuted}`} />
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        rows={3}
                                        maxLength={2000}
                                        placeholder="e.g. Please send payment link to this email"
                                        className={`w-full pl-10 pr-4 py-3 rounded-xl border ${borderCl} ${inputBg} ${textPrimary} text-sm resize-none`}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                Email me a payment link
                            </button>
                        </form>
                        {statusInfo.canPayOnline && (
                            <button
                                type="button"
                                disabled={loading}
                                onClick={handlePayOnline}
                                className="w-full py-3 rounded-xl border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                <CreditCard className="w-4 h-4" />
                                Or pay online now (instant)
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setStep('email')}
                            className={`text-xs ${textMuted} underline`}
                        >
                            Use a different email
                        </button>
                    </section>
                )}

                {step === 'requested' && (
                    <section className={`rounded-2xl border p-6 space-y-4 ${cardBg} ${borderCl}`}>
                        <p className={`text-sm ${textMuted}`}>
                            Pocket POS support will reply to <strong className={textPrimary}>{email}</strong> with
                            your payment link. After you complete the ₹1 mandate step, you can sign in again.
                        </p>
                        <button
                            type="button"
                            onClick={() => onBack('login')}
                            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm"
                        >
                            Back to sign in
                        </button>
                    </section>
                )}

                {step === 'pay' && checkout && (
                    <section className={`rounded-2xl border p-6 space-y-4 ${cardBg} ${borderCl}`}>
                        <p className={`text-xs ${textMuted}`}>
                            {payLoading
                                ? 'Opening Razorpay…'
                                : 'If the window did not open, tap below.'}
                        </p>
                        <button
                            type="button"
                            disabled={payLoading}
                            onClick={() => {
                                checkoutOpenedRef.current = false;
                                openRazorpayCheckout(checkout);
                            }}
                            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            {payLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <CreditCard className="w-4 h-4" />
                            )}
                            Pay ₹1 &amp; authorize mandate
                        </button>
                    </section>
                )}

                {step === 'token_checkout' && (
                    <section className={`rounded-2xl border p-6 space-y-4 ${cardBg} ${borderCl}`}>
                        {loading && (
                            <div className="flex justify-center py-6">
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                            </div>
                        )}
                        {!loading && checkoutInfo?.subscriptionId && (
                            <>
                                <p className={`text-sm ${textMuted}`}>
                                    Shop: <strong className={textPrimary}>{checkoutInfo.shopName}</strong>
                                </p>
                                <button
                                    type="button"
                                    disabled={payLoading}
                                    onClick={() => openRazorpayCheckout(checkoutInfo)}
                                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {payLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CreditCard className="w-4 h-4" />
                                    )}
                                    Complete payment mandate
                                </button>
                            </>
                        )}
                    </section>
                )}

                {step === 'done' && (
                    <button
                        type="button"
                        onClick={() => onBack('login')}
                        className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm"
                    >
                        Back to sign in
                    </button>
                )}

                <p className={`text-xs text-center ${textMuted}`}>
                    <button
                        type="button"
                        onClick={() => onBack('support')}
                        className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 font-semibold"
                    >
                        Contact support <ExternalLink className="w-3 h-3" />
                    </button>
                </p>
            </div>
        </article>
    );
};

export default RenewSubscriptionPage;
