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
                color: 'text-amber-400', 
                bgColor: 'bg-amber-500/10', 
                borderColor: 'border-amber-500/20',
                glow: 'shadow-amber-500/5',
                label: 'INVENTORY ALERT'
            };
        case 'credit_exceeded':
            return { 
                icon: ShieldAlert, 
                color: 'text-rose-400', 
                bgColor: 'bg-rose-500/10', 
                borderColor: 'border-rose-500/20',
                glow: 'shadow-rose-500/5',
                label: 'CREDIT WARNING'
            };
        case 'success':
            return { 
                icon: CheckCircle, 
                color: 'text-emerald-400', 
                bgColor: 'bg-emerald-500/10', 
                borderColor: 'border-emerald-500/20',
                glow: 'shadow-emerald-500/5',
                label: 'SYSTEM SUCCESS'
            };
        default:
            return { 
                icon: Info, 
                color: 'text-indigo-400', 
                bgColor: 'bg-indigo-500/10', 
                borderColor: 'border-indigo-500/20',
                glow: 'shadow-indigo-500/5',
                label: 'SYSTEM INFO'
            };
    }
};

const NotificationsPage = ({ notifications, setNotifications }) => {
    
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

    return (
        <main className="min-h-screen bg-gray-950 text-gray-200">
            <style>{`
                .notif-scroll::-webkit-scrollbar { width: 4px; }
                .notif-scroll::-webkit-scrollbar-track { background: transparent; }
                .notif-scroll::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 4px; }
            `}</style>

            {/* --- ELITE HEADER --- */}
            <header className="sticky top-0 z-[100] bg-gray-950/90 backdrop-blur-md border-b border-gray-800/60 px-6 py-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-white uppercase leading-none">
                                Alert <span className="text-indigo-500">Center</span>
                            </h1>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.25em] mt-1.5 flex items-center gap-1.5">
                                Intelligence Feed
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg">
                            <Layers className="w-3 h-3 text-gray-500" />
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{notifications.length} Signals</span>
                        </div>
                        {notifications.length > 0 && (
                            <button 
                                onClick={handleClearAll}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-800 hover:border-rose-500/50 hover:bg-rose-500/5 text-gray-500 hover:text-rose-500 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all active:scale-95"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Purge Feed
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* --- FEED SECTION --- */}
            <div className="max-w-5xl mx-auto px-6 py-8 space-y-4 pb-32">
                {notifications.length > 0 ? (
                    notifications.map((notification, index) => {
                        const details = getNotificationTypeDetails(notification.type);
                        const { icon: Icon, color, bgColor, borderColor, glow, label } = details;
                        const uniqueId = notification._id || notification.id || `notif-${index}`;
                        const isNew = notification.isRead === false;

                        return (
                            <div 
                                key={uniqueId} 
                                className={`group relative flex items-start gap-5 p-5 rounded-2xl border transition-all duration-300 ${
                                    isNew 
                                    ? 'bg-gray-900/60 border-indigo-500/30' 
                                    : 'bg-gray-900/20 border-gray-800/60'
                                } ${glow} hover:border-gray-700 animate-in fade-in slide-in-from-bottom-2`}
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
                                            <div className="flex items-center gap-1.5 text-gray-600">
                                                <Clock className="w-3 h-3" />
                                                <span className="text-[9px] font-bold uppercase tabular-nums">
                                                    {formatTime(notification.createdAt || notification.timestamp)}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => dismissNotification(uniqueId)}
                                            className="p-1.5 rounded-md hover:bg-gray-800 text-gray-600 hover:text-rose-500 transition-all"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <p className={`text-sm leading-relaxed tracking-tight ${isNew ? 'text-white font-medium' : 'text-gray-400'}`}>
                                        {notification.message}
                                    </p>

                                    {isNew && (
                                        <div className="mt-3 flex items-center gap-1.5 text-[8px] font-bold text-indigo-400 uppercase tracking-widest">
                                            <Zap className="w-2.5 h-2.5 fill-current" /> Priority Signal Detected
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-20 h-20 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center mb-6 relative group">
                            <div className="absolute inset-0 bg-emerald-500/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                            <ShieldCheck className="w-10 h-10 text-gray-800 transition-colors group-hover:text-emerald-500/50" />
                        </div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Status Nominal</h3>
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em] mt-2">
                            No high-priority alerts in the active buffer
                        </p>
                    </div>
                )}
            </div>

            {/* --- PERSISTENT FOOTER STATUS --- */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30">
                 <div className="px-5 py-2.5 bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-full shadow-2xl flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Monitor Active</span>
                    </div>
                    {notifications.length > 0 && (
                        <>
                            <div className="h-3 w-px bg-gray-800" />
                            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-[0.2em]">{notifications.length} Live Signals</span>
                        </>
                    )}
                 </div>
            </div>
        </main>
    );
};

export default NotificationsPage;