import React, { useEffect } from 'react';
import { 
    AlertTriangle, CheckCircle, Info, X, BellOff, 
    ShieldAlert, Sparkles, Trash2, Clock, Activity,
    ShieldCheck, Zap, Layers, Bell
} from 'lucide-react';
import apiClient from '../lib/apiClient';
import Api from '../config/api'

const getNotificationTypeDetails = (type) => {
    switch (type) {
        case 'inventory_low':
            return { 
                icon: AlertTriangle, 
                color: 'text-amber-500', 
                bgColor: 'bg-amber-500/10', 
                borderColor: 'border-amber-500/20',
                glow: 'shadow-amber-500/5',
                label: 'INVENTORY ALERT'
            };
        case 'credit_exceeded':
            return { 
                icon: ShieldAlert, 
                color: 'text-rose-500', 
                bgColor: 'bg-rose-500/10', 
                borderColor: 'border-rose-500/20',
                glow: 'shadow-rose-500/5',
                label: 'CREDIT WARNING'
            };
        case 'success':
            return { 
                icon: CheckCircle, 
                color: 'text-emerald-500', 
                bgColor: 'bg-emerald-500/10', 
                borderColor: 'border-emerald-500/20',
                glow: 'shadow-emerald-500/5',
                label: 'SYSTEM SUCCESS'
            };
        default:
            return { 
                icon: Info, 
                color: 'text-indigo-500', 
                bgColor: 'bg-indigo-500/10', 
                borderColor: 'border-indigo-500/20',
                glow: 'shadow-indigo-500/5',
                label: 'SYSTEM INFO'
            };
    }
};

const NotificationsPage = ({ notifications, setNotifications, darkMode }) => {
    
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

    const handleClearAll = async () => {
        if (!window.confirm("Purge all notification signals?")) return;
        try {
            await apiClient.put(Api.notificationreadall);
            setNotifications([]);
        } catch (error) {
            console.error("Failed to clear notifications:", error);
        }
    };

    const dismissNotification = (id) => {
        setNotifications(prev => prev.filter(n => (n._id || n.id) !== id));
    };
    
    const formatTime = (timestamp) => {
        if (!timestamp) return 'JUST NOW';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
               ' • ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    // Theme Variables
    const themeBase = darkMode ? 'bg-gray-950 text-gray-200' : 'bg-slate-50 text-slate-900';
    const headerBase = darkMode ? 'bg-gray-950/90 border-gray-800/60' : 'bg-white/90 border-slate-200 shadow-sm';
    const cardBase = (isNew) => {
        if (darkMode) return isNew ? 'bg-gray-900/60 border-indigo-500/30' : 'bg-gray-900/20 border-gray-800/60';
        return isNew ? 'bg-white border-indigo-200 shadow-md' : 'bg-slate-100/50 border-slate-200';
    };

    return (
        <main className={`min-h-screen ${themeBase} transition-colors duration-200`}>
            <style>{`
                .notif-scroll::-webkit-scrollbar { width: 4px; }
                .notif-scroll::-webkit-scrollbar-track { background: transparent; }
                .notif-scroll::-webkit-scrollbar-thumb { background: ${darkMode ? '#1f2937' : '#cbd5e1'}; border-radius: 4px; }
            `}</style>

            {/* --- ELITE HEADER --- */}
            <header className={`sticky top-0 z-[100] ${headerBase} backdrop-blur-md border-b px-6 py-6`}>
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
                                onClick={handleClearAll}
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
            <div className="mx-auto px-6 py-8 space-y-4 pb-32">
                {notifications.length > 0 ? (
                    notifications.map((notification, index) => {
                        const details = getNotificationTypeDetails(notification.type);
                        const { icon: Icon, color, bgColor, borderColor, glow, label } = details;
                        const uniqueId = notification._id || notification.id || `notif-${index}`;
                        const isNew = notification.isRead === false;

                        return (
                            <div 
                                key={uniqueId} 
                                className={`group relative flex items-start gap-5 p-5 rounded-2xl border transition-all duration-300 ${cardBase(isNew)} ${darkMode ? glow : ''} hover:border-indigo-500/40 animate-in fade-in slide-in-from-bottom-2`}
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
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => dismissNotification(uniqueId)}
                                            className={`p-1.5 rounded-md transition-all ${darkMode ? 'hover:bg-gray-800 text-gray-600' : 'hover:bg-slate-200 text-slate-400'} hover:text-rose-500`}
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <p className={`text-sm leading-relaxed tracking-tight ${isNew ? (darkMode ? 'text-white font-medium' : 'text-slate-900 font-semibold') : 'text-gray-500'}`}>
                                        {notification.message}
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
                        <h3 className={`text-sm font-bold uppercase tracking-widest ${darkMode ? 'text-white' : 'text-slate-800'}`}>Status Nominal</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-2">
                            No high-priority alerts in the active buffer
                        </p>
                    </div>
                )}
            </div>

            {/* --- PERSISTENT FOOTER STATUS --- */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30">
                 <div className={`px-5 py-2.5 backdrop-blur-xl border rounded-full shadow-2xl flex items-center gap-4 ${darkMode ? 'bg-gray-900/80 border-gray-800' : 'bg-white/80 border-slate-200'}`}>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em]">Monitor Active</span>
                    </div>
                    {notifications.length > 0 && (
                        <>
                            <div className={`h-3 w-px ${darkMode ? 'bg-gray-800' : 'bg-slate-200'}`} />
                            <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-[0.2em]">{notifications.length} Live Signals</span>
                        </>
                    )}
                 </div>
            </div>
        </main>
    );
};

export default NotificationsPage;