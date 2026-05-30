import React, { useCallback, useEffect, useState } from 'react';
import {
    CreditCard,
    Loader2,
    RefreshCw,
    Link2,
    Copy,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';
import API from '../config/api';
import apiClient from '../lib/apiClient';

const MandateRestoreRequests = ({ showToast, darkMode = true, embedded = false }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generatingId, setGeneratingId] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    const cardBg = darkMode ? 'bg-gray-900' : 'bg-white';
    const borderCl = darkMode ? 'border-gray-800' : 'border-slate-200';
    const textMuted = darkMode ? 'text-gray-400' : 'text-slate-600';

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get(API.superadminMandateRestoreRequests);
            setRequests(res.data?.data || []);
        } catch (err) {
            showToast?.(err.response?.data?.error || 'Failed to load mandate requests.', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleGenerateLink = async (id) => {
        setGeneratingId(id);
        try {
            const res = await apiClient.post(API.superadminMandateRestoreGenerateLink(id));
            const url = res.data?.publicCheckoutUrl || res.data?.paymentLinkUrl;
            showToast?.(res.data?.message || 'Link generated.', 'success');
            if (url) {
                try {
                    await navigator.clipboard.writeText(url);
                    setCopiedId(id);
                    setTimeout(() => setCopiedId(null), 2500);
                } catch (_) {
                    /* clipboard optional */
                }
            }
            fetchRequests();
        } catch (err) {
            showToast?.(err.response?.data?.error || 'Failed to generate link.', 'error');
        } finally {
            setGeneratingId(null);
        }
    };

    const copyUrl = async (id, url) => {
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2500);
            showToast?.('Link copied.', 'success');
        } catch (_) {
            showToast?.('Could not copy link.', 'error');
        }
    };

    if (loading) {
        return (
            <div className={`${embedded ? '' : `rounded-2xl border ${borderCl}`} p-8 flex justify-center ${embedded ? '' : cardBg}`}>
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
        );
    }

    const sectionClass = embedded
        ? `overflow-hidden ${cardBg}`
        : `rounded-2xl border overflow-hidden ${cardBg} ${borderCl}`;

    return (
        <section className={sectionClass}>
            {!embedded && (
                <div className="p-4 border-b border-inherit flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-amber-400" />
                        <h2 className="font-bold text-sm uppercase tracking-wider">Payment mandate requests</h2>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                            {requests.length}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={fetchRequests}
                        className="p-2 rounded-lg hover:bg-white/5 text-gray-400"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            )}
            {embedded && (
                <div className="px-4 py-2 flex justify-end border-b border-inherit">
                    <button
                        type="button"
                        onClick={fetchRequests}
                        className="p-2 rounded-lg hover:bg-white/5 text-gray-400"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            )}

            {requests.length === 0 ? (
                <p className={`p-6 text-sm ${textMuted}`}>No pending payment link requests.</p>
            ) : (
                <ul className="divide-y divide-inherit">
                    {requests.map((req) => {
                        const owner = req.owner || {};
                        const url = req.publicCheckoutUrl || req.paymentLinkUrl;
                        return (
                            <li key={req._id} className="p-4 space-y-3">
                                <div className="flex flex-wrap justify-between gap-2">
                                    <div>
                                        <p className="font-bold text-sm">
                                            {owner.shopName || req.shopName || 'Shop'}
                                        </p>
                                        <p className={`text-xs ${textMuted}`}>{req.email}</p>
                                        <p className={`text-xs ${textMuted} mt-1`}>
                                            <span
                                                className={`inline-block mr-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                                    req.requestType === 'renew'
                                                        ? 'bg-emerald-500/20 text-emerald-300'
                                                        : 'bg-amber-500/20 text-amber-300'
                                                }`}
                                            >
                                                {req.requestType === 'renew' ? 'Restart' : 'Halted'}
                                            </span>
                                            Status: <span className="text-amber-300">{req.status}</span>
                                            {owner.subscriptionStatus && (
                                                <> · Razorpay: {owner.subscriptionStatus}</>
                                            )}
                                        </p>
                                    </div>
                                    <span className="text-[10px] text-gray-500">
                                        {new Date(req.createdAt).toLocaleString('en-IN')}
                                    </span>
                                </div>
                                {req.ownerMessage && (
                                    <p className={`text-xs ${textMuted} italic`}>&ldquo;{req.ownerMessage}&rdquo;</p>
                                )}
                                {url && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <code className="text-[10px] break-all opacity-80 max-w-full">{url}</code>
                                        <button
                                            type="button"
                                            onClick={() => copyUrl(req._id, url)}
                                            className="inline-flex items-center gap-1 text-xs text-indigo-400 font-bold"
                                        >
                                            {copiedId === req._id ? (
                                                <CheckCircle2 className="w-3 h-3" />
                                            ) : (
                                                <Copy className="w-3 h-3" />
                                            )}
                                            Copy link
                                        </button>
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        disabled={generatingId === req._id}
                                        onClick={() => handleGenerateLink(req._id)}
                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-50"
                                    >
                                        {generatingId === req._id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <Link2 className="w-3 h-3" />
                                        )}
                                        {req.status === 'link_ready' ? 'Regenerate link' : 'Generate payment link'}
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            <p className={`px-4 py-3 text-[10px] ${textMuted} border-t border-inherit flex gap-1 items-start`}>
                <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                For <strong>Restart</strong> requests, email the checkout link to the owner. For <strong>Halted</strong>,
                share the mandate link. After payment, access restores automatically.
            </p>
        </section>
    );
};

export default MandateRestoreRequests;
