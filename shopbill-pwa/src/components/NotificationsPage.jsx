import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, X, BellOff, ShieldAlert } from 'lucide-react';
import apiClient from '../lib/apiClient';
import Api from '../config/api'

const getNotificationTypeDetails = (type) => {
    switch (type) {
        case 'inventory_low':
            return { 
                icon: AlertTriangle, 
                color: 'text-amber-600 dark:text-amber-400', 
                bgColor: 'bg-amber-50 dark:bg-amber-900/10', 
                borderColor: 'border-amber-200 dark:border-amber-700/50' 
            };
        case 'credit_exceeded':
            return { 
                icon: ShieldAlert, 
                color: 'text-red-600 dark:text-red-400', 
                bgColor: 'bg-red-50 dark:bg-red-900/10', 
                borderColor: 'border-red-200 dark:border-red-700/50' 
            };
        case 'success':
            return { 
                icon: CheckCircle, 
                color: 'text-teal-600 dark:text-teal-400', 
                bgColor: 'bg-teal-50 dark:bg-teal-900/10', 
                borderColor: 'border-teal-200 dark:border-teal-700/50' 
            };
        default:
            return { 
                icon: Info, 
                color: 'text-indigo-600 dark:text-indigo-400', 
                bgColor: 'bg-indigo-50 dark:bg-indigo-900/10', 
                borderColor: 'border-indigo-200 dark:border-indigo-700/50' 
            };
    }
};

const NotificationsPage = ({ notifications, setNotifications }) => {
    
    useEffect(() => {
        const markAsReadOnMount = async () => {
            // Check if there are any notifications that are UNREAD for the current user
            const hasUnread = notifications.some(n => n.isRead === false);
            
            if (hasUnread) {
                try {
                    await apiClient.put(Api.notificationreadall);
                    // Update local state to hide "New" stripes for this user only
                    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                } catch (err) {
                    console.error("Failed to sync read status:", err);
                }
            }
        };
        markAsReadOnMount();
    }, [notifications.length]); 

    const handleClearAll = async () => {
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
        if (!timestamp) return 'Just now';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
               ' on ' + date.toLocaleDateString();
    }

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">Notifications</h1>
                    <p className="text-gray-600 dark:text-gray-400 text-sm italic">Real-time system alerts & stock updates</p>
                </div>
                {notifications.length > 0 && (
                    <button 
                        onClick={handleClearAll}
                        className="text-xs font-bold uppercase tracking-wider text-red-500 hover:text-white hover:bg-red-600 transition-all bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg border border-red-200 dark:border-red-900/50 outline-none active:scale-95"
                    >
                        Clear All
                    </button>
                )}
            </div>

            <div className="space-y-3 pb-24 md:pb-12">
                {notifications.length > 0 ? (
                    notifications.map((notification, index) => {
                        const { icon: Icon, color, bgColor, borderColor } = getNotificationTypeDetails(notification.type);
                        const uniqueId = notification._id || notification.id || `notif-${index}`;
                        const isNew = notification.isRead === false;

                        return (
                            <div 
                                key={uniqueId} 
                                className={`flex items-start p-4 rounded-xl shadow-sm border ${borderColor} ${bgColor} transition-all duration-500 hover:shadow-md animate-in fade-in slide-in-from-right-4 relative overflow-hidden`}
                            >
                                {isNew && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 animate-pulse" />}
                                <div className={`flex-shrink-0 mr-4 ${color} p-2 bg-white dark:bg-gray-900 rounded-lg shadow-sm`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-grow">
                                    <div className="flex justify-between items-start">
                                        <p className={`text-gray-900 dark:text-gray-100 leading-snug ${isNew ? 'font-bold' : 'font-medium'}`}>
                                            {notification.message}
                                        </p>
                                    </div>
                                    <div className="flex items-center mt-2 space-x-3">
                                        <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-black border ${borderColor} ${color} bg-white/80 dark:bg-black/40`}>
                                            {notification.type?.replace('_', ' ')}
                                        </span>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                            {formatTime(notification.createdAt || notification.timestamp)}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => dismissNotification(uniqueId)}
                                    className="ml-4 p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                        <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                            <BellOff className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">No new alerts</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-xs text-center text-sm">
                            We'll notify you here when inventory runs low or credit limits are reached.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;