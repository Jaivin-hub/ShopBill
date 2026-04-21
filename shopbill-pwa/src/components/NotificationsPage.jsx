import React, { useEffect, useState } from 'react';
import { 
    AlertTriangle, CheckCircle, Info, X, BellOff, 
    ShieldAlert, Sparkles, Trash2, Clock, Activity,
    ShieldCheck, Zap, Layers, Bell, CreditCard, DollarSign, ArrowDown, ArrowUp, Store
} from 'lucide-react';
import apiClient from '../lib/apiClient';
import Api from '../config/api';
import ConfirmationModal from './ConfirmationModal';

const getNotificationTypeDetails = (type) => {
    switch (type) {
        case 'inventory_low':
            return { 
                icon: AlertTriangle, 
                color: 'text-amber-500', 
                bgColor: 'bg-amber-500/10', 
                borderColor: 'border-amber-500/20',
                glow: 'shadow-amber-500/5',
                label: 'Low stock'
            };
        case 'inventory_added':
            return { 
                icon: CheckCircle, 
                color: 'text-emerald-500', 
                bgColor: 'bg-emerald-500/10', 
                borderColor: 'border-emerald-500/20',
                glow: 'shadow-emerald-500/5',
                label: 'Inventory added'
            };
        case 'inventory_updated':
            return { 
                icon: Activity, 
                color: 'text-blue-500', 
                bgColor: 'bg-blue-500/10', 
                borderColor: 'border-blue-500/20',
                glow: 'shadow-blue-500/5',
                label: 'Inventory updated'
            };
        case 'inventory_deleted':
            return { 
                icon: AlertTriangle, 
                color: 'text-orange-500', 
                bgColor: 'bg-orange-500/10', 
                borderColor: 'border-orange-500/20',
                glow: 'shadow-orange-500/5',
                label: 'Inventory deleted'
            };
        case 'inventory_bulk_upload':
            return { 
                icon: Layers, 
                color: 'text-violet-500', 
                bgColor: 'bg-violet-500/10', 
                borderColor: 'border-violet-500/20',
                glow: 'shadow-violet-500/5',
                label: 'Bulk upload'
            };
        case 'purchase_recorded':
            return { 
                icon: CheckCircle, 
                color: 'text-indigo-500', 
                bgColor: 'bg-indigo-500/10', 
                borderColor: 'border-indigo-500/20',
                glow: 'shadow-indigo-500/5',
                label: 'Purchase recorded'
            };
        case 'ledger_payment':
            return { 
                icon: CreditCard, 
                color: 'text-emerald-500', 
                bgColor: 'bg-emerald-500/10', 
                borderColor: 'border-emerald-500/20',
                glow: 'shadow-emerald-500/5',
                label: 'Payment received'
            };
        case 'ledger_credit':
            return { 
                icon: DollarSign, 
                color: 'text-amber-500', 
                bgColor: 'bg-amber-500/10', 
                borderColor: 'border-amber-500/20',
                glow: 'shadow-amber-500/5',
                label: 'Credit given'
            };
        case 'credit_exceeded':
            return { 
                icon: ShieldAlert, 
                color: 'text-rose-500', 
                bgColor: 'bg-rose-500/10', 
                borderColor: 'border-rose-500/20',
                glow: 'shadow-rose-500/5',
                label: 'Credit warning'
            };
        case 'success':
            return { 
                icon: CheckCircle, 
                color: 'text-emerald-500', 
                bgColor: 'bg-emerald-500/10', 
                borderColor: 'border-emerald-500/20',
                glow: 'shadow-emerald-500/5',
                label: 'System success'
            };
        case 'new_shop_registered':
            return { 
                icon: Store, 
                color: 'text-teal-500', 
                bgColor: 'bg-teal-500/10', 
                borderColor: 'border-teal-500/20',
                glow: 'shadow-teal-500/5',
                label: 'New shop'
            };
        default:
            return { 
                icon: Info, 
                color: 'text-indigo-500', 
                bgColor: 'bg-indigo-500/10', 
                borderColor: 'border-indigo-500/20',
                glow: 'shadow-indigo-500/5',
                label: 'System info'
            };
    }
};

const NotificationsPage = ({ notifications, setNotifications, darkMode, setCurrentPage }) => {
    const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

    useEffect(() => {
        const markAsReadOnMount = async () => {
            const hasUnread = notifications.some(n => n.isRead === false);
            if (hasUnread) {
                try {
                    await apiClient.put(Api.notificationreadall);
                    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                } catch (err) {
                    console.error("Failed to sync read status:", err);
                }
            }
        };
        markAsReadOnMount();
    }, [notifications.length, setNotifications]); 

    const handleClearAllClick = () => setShowClearAllConfirm(true);

    const handleClearAllConfirm = async () => {
        setShowClearAllConfirm(false);
        try {
            await apiClient.put(Api.notificationDismissAll);
            setNotifications([]);
        } catch (error) {
            console.error("Failed to clear notifications:", error);
        }
    };

    const dismissNotification = async (id) => {
        const stringId = (id || '').toString();
        const isMongoId = /^[a-fA-F0-9]{24}$/.test(stringId);
        if (isMongoId) {
            try {
                await apiClient.put(Api.notificationDismiss(stringId));
            } catch (err) {
                console.error('Failed to dismiss notification:', err);
                return;
            }
        }
        setNotifications(prev => prev.filter(n => (n._id || n.id || '').toString() !== stringId));
    };
    
    const formatTime = (timestamp) => {
        if (!timestamp) return 'Just now';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
               ' • ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const isJustNow = (timestamp) => {
        if (!timestamp) return true;
        const date = new Date(timestamp);
        const diffMs = Date.now() - date.getTime();
        return diffMs >= 0 && diffMs < 60 * 1000;
    };

    const renderHighlightedMessage = (message) => {
        const text = typeof message === 'string' ? message : '';
        return text;
    };

    const getNotificationTargetPage = (notification) => {
        const type = String(notification?.type || '').toLowerCase();
        if (type.startsWith('inventory_') || type === 'credit_exceeded') return 'inventory';
        if (type === 'purchase_recorded') return 'scm';
        if (type === 'ledger_payment' || type === 'ledger_credit' || type === 'credit_sale' || type === 'customer_added' || type === 'credit_limit_updated') return 'khata';
        if (type === 'new_shop_registered') return 'superadmin_users';
        if (type === 'profile_updated') return 'profile';
        return null;
    };

    // Theme Variables
    const themeBase = darkMode ? 'bg-gray-950 text-gray-200' : 'bg-slate-50 text-slate-900';
    const headerBase = darkMode ? 'bg-gray-950/90 border-gray-800/60' : 'bg-white/90 border-slate-200 shadow-sm';
    const cardBase = (isNew) => {
        if (darkMode) return isNew ? 'bg-gray-900/60 border-indigo-500/30' : 'bg-gray-900/20 border-gray-800/60';
        return isNew ? 'bg-white border-indigo-200 shadow-md' : 'bg-slate-100/50 border-slate-200';
    };

    return (
        <div className={`h-full flex flex-col min-h-0 ${themeBase} transition-colors duration-200`}>
            {showClearAllConfirm && (
                <ConfirmationModal
                    message="Delete all notifications? This will clear your full notifications."
                    onConfirm={handleClearAllConfirm}
                    onCancel={() => setShowClearAllConfirm(false)}
                    darkMode={darkMode}
                    confirmText="Delete All"
                    cancelText="Cancel"
                />
            )}
            <style>{`
                .notif-scroll::-webkit-scrollbar { width: 4px; }
                .notif-scroll::-webkit-scrollbar-track { background: transparent; }
                .notif-scroll::-webkit-scrollbar-thumb { background: ${darkMode ? '#1f2937' : '#cbd5e1'}; border-radius: 4px; }
            `}</style>

            {/* --- ELITE HEADER --- */}
            <header className={`sticky top-0 z-[100] shrink-0 ${headerBase} backdrop-blur-md border-b px-6 py-6 ${darkMode ? 'bg-gray-950/95' : 'bg-white/95'}`}>
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className={`text-lg font-bold tracking-tight uppercase leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                Alert <span className="text-indigo-500">Center</span>
                            </h1>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.25em] mt-1.5 flex items-center gap-1.5">
                                Intelligence Feed
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 border rounded-lg ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-slate-100 border-slate-200'}`}>
                            <Layers className="w-3 h-3 text-gray-500" />
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{notifications.length} Signals</span>
                        </div>
                        {notifications.length > 0 && (
                            <button 
                                onClick={handleClearAllClick}
                                className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all active:scale-95 ${
                                    darkMode 
                                    ? 'bg-gray-900 border-gray-800 text-gray-500 hover:border-rose-500/50 hover:bg-rose-500/5 hover:text-rose-500' 
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 shadow-sm'
                                }`}
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Clear All
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* --- FEED SECTION --- */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div className="mx-auto px-6 py-8 space-y-4 pb-32">
                {notifications.length > 0 ? (
                    notifications.map((notification, index) => {
                        const details = getNotificationTypeDetails(notification.type);
                        const { icon: Icon, color, bgColor, borderColor, glow, label } = details;
                        const uniqueId = notification._id || notification.id || `notif-${index}`;
                        const isNew = notification.isRead === false;
                        const targetPage = getNotificationTargetPage(notification);
                        const isClickable = Boolean(targetPage && typeof setCurrentPage === 'function');

                        return (
                            <div 
                                key={uniqueId} 
                                role={isClickable ? 'button' : undefined}
                                tabIndex={isClickable ? 0 : undefined}
                                onClick={isClickable ? () => setCurrentPage(targetPage) : undefined}
                                onKeyDown={isClickable ? (e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setCurrentPage(targetPage);
                                    }
                                } : undefined}
                                className={`group relative flex items-start gap-5 p-5 rounded-2xl border transition-all duration-300 ${cardBase(isNew)} ${darkMode ? glow : ''} hover:border-indigo-500/40 animate-in fade-in slide-in-from-bottom-2 ${isClickable ? 'cursor-pointer' : ''}`}
                                style={{ animationDelay: `${index * 40}ms` }}
                            >
                                {/* UNREAD VERTICAL ACCENT */}
                                {isNew && (
                                    <div className="absolute left-0 top-6 bottom-6 w-[3px] bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.4)]" />
                                )}

                                {/* ICON MODULE */}
                                <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border ${bgColor} ${color} ${borderColor}`}>
                                    <Icon className="w-5 h-5" />
                                </div>

                                {/* CONTENT MODULE */}
                                <div className="flex-grow">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-widest ${bgColor} ${color} ${borderColor}`}>
                                                {label}
                                            </span>
                                            <div className="flex items-center gap-1.5 text-gray-500">
                                                <Clock className="w-3 h-3" />
                                                <span className="text-[9px] font-bold uppercase tabular-nums">
                                                    {formatTime(notification.createdAt || notification.timestamp)}
                                                </span>
                                                {isJustNow(notification.createdAt || notification.timestamp) && (
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest ${
                                                        darkMode
                                                            ? 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30'
                                                            : 'text-indigo-700 bg-indigo-50 border-indigo-200'
                                                    }`}>
                                                        Now
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                dismissNotification(uniqueId);
                                            }}
                                            className={`p-1.5 rounded-md transition-all ${darkMode ? 'hover:bg-gray-800 text-gray-600' : 'hover:bg-slate-200 text-slate-400'} hover:text-rose-500`}
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <p className={`text-sm leading-relaxed tracking-tight ${isNew ? (darkMode ? 'text-white font-medium' : 'text-slate-900 font-semibold') : 'text-gray-500'}`}>
                                        {renderHighlightedMessage(notification.message)}
                                    </p>

                                    {isNew && (
                                        <div className="mt-3 flex items-center gap-1.5 text-[8px] font-bold text-indigo-500 uppercase tracking-widest">
                                            <Zap className="w-2.5 h-2.5 fill-current" /> Priority Signal Detected
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className={`w-20 h-20 border rounded-2xl flex items-center justify-center mb-6 relative group ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <div className="absolute inset-0 bg-emerald-500/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                            <ShieldCheck className={`w-10 h-10 transition-colors group-hover:text-emerald-500/50 ${darkMode ? 'text-gray-800' : 'text-slate-200'}`} />
                        </div>
                        <h3 className={`text-sm font-bold uppercase tracking-widest ${darkMode ? 'text-white' : 'text-slate-800'}`}>You're all caught up</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-2">
                            No notifications right now. New alerts will show here.
                        </p>
                    </div>
                )}
            </div>
            </div>
        </div>
    );
};

export default NotificationsPage;