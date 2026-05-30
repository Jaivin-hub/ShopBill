import React, { useCallback, useEffect, useState } from 'react';
import {
    ArrowLeft,
    CreditCard,
    Loader2,
    Mail,
    MessageSquare,
    CheckCircle2,
    AlertCircle,
    ExternalLink,
    LogOut,
    Store,
    RefreshCw,
} from 'lucide-react';
import axios from 'axios';
import API from '../config/api';
import ThemeToggle from './ThemeToggle';

const loadRazorpayScript = (src) => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const MandateRestorePage = ({
    onBack,
    origin,
    darkMode = true,
    setDarkMode,
    checkoutToken: checkoutTokenProp,
    gateMode = false,
    apiClient = null,
    currentUser = null,
    userRole = null,
    onAccessRestored,
    onLogout,
}) => {
    const isOwner = String(userRole || currentUser?.role || '').toLowerCase() === 'owner';
    const http = gateMode && apiClient ? apiClient : axios;

    const [email, setEmail] = useState('');
    const [shopName, setShopName] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [checkoutToken, setCheckoutToken] = useState(checkoutTokenProp || '');
    const [checkoutInfo, setCheckoutInfo] = useState(null);
    const [payLoading, setPayLoading] = useState(false);
    const [paySuccess, setPaySuccess] = useState(null);
    const [gateLoading, setGateLoading] = useState(gateMode);

    const loadGateStatus = useCallback(async () => {
        if (!gateMode || !apiClient) return;
        setGateLoading(true);
        setError(null);
        try {
            const res = await apiClient.get(API.mandateRestoreMe);
            const data = res.data || {};
            setEmail(data.email || '');
            setShopName(data.shopName || '');
            const token = data.request?.checkoutToken || '';
            if (token) setCheckoutToken(token);
            if (data.request?.status === 'link_ready' && token) {
                try {
                    const checkoutRes = await apiClient.get(API.mandateRestoreMyCheckout);
                    setCheckoutInfo(checkoutRes.data);
                } catch (checkoutErr) {
                    if (checkoutErr.response?.status === 409) {
                        setCheckoutInfo(checkoutErr.response.data);
                    }
                }
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Could not load account status.');
        } finally {
            setGateLoading(false);
        }
    }, [gateMode, apiClient]);

    useEffect(() => {
        window.scrollTo(0, 0);
        if (gateMode) {
            loadGateStatus();
            return;
        }
        const params = new URLSearchParams(window.location.search || '');
        const token = checkoutTokenProp || params.get('token') || '';
        if (token) setCheckoutToken(token);
    }, [checkoutTokenProp, gateMode, loadGateStatus]);

    useEffect(() => {
        if (gateMode || !checkoutToken) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await axios.get(API.mandateRestoreCheckout(checkoutToken));
                if (!cancelled) setCheckoutInfo(res.data);
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err.response?.data?.message ||
                            err.response?.data?.error ||
                            'Could not load payment link.'
                    );
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [checkoutToken, gateMode]);

    const handleRequest = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const url = gateMode ? API.mandateRestoreRequestMe : API.mandateRestoreRequest;
            const body = gateMode
                ? { message: message.trim() }
                : { email: email.trim().toLowerCase(), message: message.trim() };
            const res = await http.post(url, body);
            setSuccess(res.data?.message || 'Request submitted.');
            if (gateMode && res.data?.checkoutToken) {
                setCheckoutToken(res.data.checkoutToken);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Could not submit request.');
        } finally {
            setLoading(false);
        }
    };

    const openRazorpayCheckout = useCallback(async () => {
        if (!checkoutInfo?.subscriptionId) return;
        setPayLoading(true);
        setError(null);
        try {
            const loaded = await loadRazorpayScript('https://checkout.razorpay.com/v1/checkout.js');
            if (!loaded) throw new Error('Payment gateway failed to load.');

            const token = checkoutInfo.checkoutToken || checkoutToken;

            const options = {
                key: checkoutInfo.keyId,
                amount: checkoutInfo.amount,
                currency: checkoutInfo.currency || 'INR',
                name: 'Pocket POS',
                description: `Restore mandate — ${checkoutInfo.shopName || shopName || 'your store'}`,
                subscription_id: checkoutInfo.subscriptionId,
                handler: async (response) => {
                    try {
                        const vResp = await http.post(API.mandateRestoreVerify, {
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            razorpay_subscription_id:
                                response.razorpay_subscription_id || checkoutInfo.subscriptionId,
                            checkoutToken: token,
                        });
                        setPaySuccess(
                            vResp.data?.message ||
                                'Mandate verified. Access will restore once payment is confirmed.'
                        );
                        if (gateMode && onAccessRestored) {
                            setTimeout(() => onAccessRestored(), 1500);
                        }
                    } catch (err) {
                        setError(err.response?.data?.error || 'Verification failed.');
                    } finally {
                        setPayLoading(false);
                    }
                },
                prefill: {
                    email: checkoutInfo.email || email,
                    name: checkoutInfo.shopName || shopName,
                },
                theme: { color: '#4f46e5' },
                modal: { ondismiss: () => setPayLoading(false) },
            };
            new window.Razorpay(options).open();
        } catch (err) {
            setError(err.message || 'Could not start payment.');
            setPayLoading(false);
        }
    }, [checkoutInfo, checkoutToken, email, shopName, gateMode, http, onAccessRestored]);

    const refreshCheckout = async () => {
        if (!gateMode || !apiClient) return;
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.get(API.mandateRestoreMyCheckout);
            setCheckoutInfo(res.data);
            setSuccess('Payment link is ready.');
        } catch (err) {
            const data = err.response?.data || {};
            if (data.pendingLink) setCheckoutInfo(data);
            else setError(data.error || data.message || 'Link not ready yet.');
        } finally {
            setLoading(false);
        }
    };

    const bgPage = darkMode ? 'bg-gray-950' : 'bg-slate-50';
    const textPrimary = darkMode ? 'text-white' : 'text-slate-900';
    const textMuted = darkMode ? 'text-gray-400' : 'text-slate-600';
    const cardBg = darkMode ? 'bg-gray-900' : 'bg-white';
    const borderCl = darkMode ? 'border-gray-800' : 'border-slate-200';
    const navBg = darkMode ? 'bg-gray-950/80' : 'bg-white/80';
    const inputBg = darkMode ? 'bg-gray-950' : 'bg-slate-50';
    const backHover = darkMode ? 'text-gray-400 hover:text-indigo-400' : 'text-slate-600 hover:text-indigo-600';

    const showPaySection =
        checkoutInfo?.success &&
        checkoutInfo.subscriptionId &&
        !checkoutInfo.alreadyCompleted &&
        !checkoutInfo.pendingLink;

    if (gateMode && gateLoading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${bgPage}`}>
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
        );
    }

    return (
        <article className={`min-h-screen flex flex-col items-center ${bgPage} ${textPrimary} transition-colors duration-300`}>
            <nav className={`sticky top-0 w-full z-40 backdrop-blur-md border-b ${navBg} ${borderCl}`}>
                <div className="max-w-2xl mx-auto px-4 h-16 flex justify-between items-center">
                    {gateMode ? (
                        <div className="flex items-center gap-2 min-w-0">
                            <Store className="w-5 h-5 text-indigo-400 shrink-0" />
                            <span className="font-bold text-sm truncate">{shopName || 'Pocket POS'}</span>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onBack(origin === 'login' ? 'login' : 'landing')}
                            className={`flex items-center gap-2 font-medium ${backHover}`}
                        >
                            <ArrowLeft size={20} /> Back
                        </button>
                    )}
                    <div className="flex items-center gap-2">
                        {gateMode && (
                            <button
                                type="button"
                                onClick={onLogout}
                                className={`flex items-center gap-1 text-xs font-bold ${textMuted} hover:text-red-400`}
                            >
                                <LogOut className="w-4 h-4" /> Sign out
                            </button>
                        )}
                        <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} size="sm" />
                    </div>
                </div>
            </nav>

            <div className="w-full max-w-2xl px-4 py-8 space-y-6">
                <header className="text-center space-y-2">
                    <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                        <CreditCard className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h1 className="text-xl font-black tracking-tight">Restore payment mandate</h1>
                    <p className={`text-sm ${textMuted} max-w-md mx-auto`}>
                        {gateMode
                            ? isOwner
                                ? 'Your subscription is paused after failed payment retries. Complete a new mandate below to unlock your store. Other pages are temporarily unavailable.'
                                : 'This store’s subscription is paused. Ask the owner to complete the payment mandate below, or contact Pocket POS support.'
                            : 'If your subscription was halted after failed payment retries, request a new mandate here.'}
                    </p>
                    {gateMode && email && (
                        <p className={`text-xs ${textMuted}`}>
                            Signed in as <span className="text-indigo-400">{email}</span>
                        </p>
                    )}
                </header>

                {checkoutInfo?.alreadyCompleted && (
                    <div className={`rounded-xl border p-4 flex gap-3 ${cardBg} ${borderCl}`}>
                        <CheckCircle2 className="text-emerald-500 shrink-0" />
                        <p className="text-sm">
                            {checkoutInfo.message || 'Mandate is active. Refreshing access…'}
                        </p>
                    </div>
                )}

                {showPaySection && isOwner && (
                    <section className={`rounded-2xl border p-6 space-y-4 ${cardBg} ${borderCl}`}>
                        <h2 className="font-bold text-sm uppercase tracking-wider text-indigo-400">
                            Complete mandate payment
                        </h2>
                        <p className={`text-sm ${textMuted}`}>
                            Plan: {checkoutInfo.plan}
                        </p>
                        {paySuccess ? (
                            <p className="text-sm text-emerald-400">{paySuccess}</p>
                        ) : (
                            <button
                                type="button"
                                disabled={payLoading}
                                onClick={openRazorpayCheckout}
                                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {payLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CreditCard className="w-4 h-4" />
                                )}
                                Pay ₹1 &amp; authorize mandate
                            </button>
                        )}
                    </section>
                )}

                {(checkoutInfo?.pendingLink || (gateMode && !showPaySection && !checkoutInfo?.alreadyCompleted)) && (
                    <div className={`rounded-xl border p-4 ${cardBg} ${borderCl} text-sm ${textMuted} space-y-3`}>
                        <p>
                            {checkoutInfo?.message ||
                                'Waiting for your secure payment link. Submit a request below if you have not already.'}
                        </p>
                        {gateMode && isOwner && (
                            <button
                                type="button"
                                onClick={refreshCheckout}
                                disabled={loading}
                                className="inline-flex items-center gap-2 text-indigo-400 font-bold text-xs"
                            >
                                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                                Check if link is ready
                            </button>
                        )}
                    </div>
                )}

                {isOwner && (
                    <section className={`rounded-2xl border p-6 space-y-4 ${cardBg} ${borderCl}`}>
                        <h2 className="font-bold text-sm uppercase tracking-wider">
                            {gateMode ? 'Request mandate link' : 'Request mandate link'}
                        </h2>
                        {!gateMode && (
                            <p className={`text-sm ${textMuted}`}>
                                Enter the email registered with your shop.
                            </p>
                        )}

                        {error && (
                            <div className="flex gap-2 items-start text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}
                        {success && (
                            <div className="flex gap-2 items-start text-emerald-400 text-sm">
                                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{success}</span>
                            </div>
                        )}

                        <form onSubmit={handleRequest} className="space-y-3">
                            {!gateMode && (
                                <div>
                                    <label className={`text-xs font-bold ${textMuted} uppercase tracking-wider`}>
                                        Registered email
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
                            )}
                            <div>
                                <label className={`text-xs font-bold ${textMuted} uppercase tracking-wider`}>
                                    Message (optional)
                                </label>
                                <div className="relative mt-1">
                                    <MessageSquare className={`absolute left-3 top-3 w-4 h-4 ${textMuted}`} />
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        rows={3}
                                        className={`w-full pl-10 pr-4 py-3 rounded-xl border ${borderCl} ${inputBg} ${textPrimary} text-sm resize-none`}
                                        placeholder="Any details for support…"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Submit request
                            </button>
                        </form>

                        {!gateMode && (
                            <p className={`text-xs ${textMuted} pt-2 border-t ${borderCl}`}>
                                Need help?{' '}
                                <button
                                    type="button"
                                    onClick={() => onBack('support')}
                                    className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 font-semibold"
                                >
                                    Contact support <ExternalLink className="w-3 h-3" />
                                </button>
                            </p>
                        )}
                    </section>
                )}
            </div>
        </article>
    );
};

export default MandateRestorePage;
