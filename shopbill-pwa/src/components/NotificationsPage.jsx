import React from 'react';
import { AlertTriangle, CheckCircle, Info, X, BellOff } from 'lucide-react';
import apiClient from '../lib/apiClient'; // Ensure this import path is correct

/**
 * Helper to determine styling based on notification type
 */
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
                icon: X, 
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
    console.log("notification page",notifications)
    
    /**
     * Mark all as read in the database and clear the local state
     */
    const handleClearAll = async () => {
        try {
            // Call the backend route we created in notificationRoutes.js
            await apiClient.put('/notifications/read-all');
            // Clear frontend state
            setNotifications([]);
        } catch (error) {
            console.error("Failed to clear notifications:", error);
        }
    };

    /**
     * Remove a single notification (visually)
     */
    const dismissNotification = (id) => {
        setNotifications(prev => prev.filter(n => (n.id || n._id) !== id));
    };
    
    /**
     * Format timestamp to a human-readable string
     */
    const formatTime = (timestamp) => {
        if (!timestamp) return 'Just now';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
               ' on ' + date.toLocaleDateString();
    }

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
            {/* Header Section */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">
                        Notifications
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-sm italic">
                        Real-time system alerts & stock updates
                    </p>
                </div>
                {notifications.length > 0 && (
                    <button 
                        onClick={handleClearAll}
                        className="text-xs font-bold uppercase tracking-wider text-red-500 hover:text-white hover:bg-red-600 transition-all bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg border border-red-200 dark:border-red-900/50"
                    >
                        Mark All Read
                    </button>
                )}
            </div>

            {/* Notifications List */}
            <div className="space-y-3">
                {notifications.length > 0 ? (
                    notifications.map((notification, index) => {
                        const { icon: Icon, color, bgColor, borderColor } = getNotificationTypeDetails(notification.type);
                        const uniqueId = notification._id || notification.id || `notif-${index}`;

                        return (
                            <div 
                                key={uniqueId} 
                                className={`flex items-start p-4 rounded-xl shadow-sm border ${borderColor} ${bgColor} transition duration-300 hover:shadow-md animate-in slide-in-from-right-5`}
                            >
                                {/* Icon Container */}
                                <div className={`flex-shrink-0 mr-4 ${color}`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                
                                {/* Content */}
                                <div className="flex-grow">
                                    <p className="font-semibold text-gray-900 dark:text-gray-100 leading-snug">
                                        {notification.message}
                                    </p>
                                    <div className="flex items-center mt-1 space-x-2">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold border ${borderColor} ${color}`}>
                                            {notification.type?.replace('_', ' ')}
                                        </span>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatTime(notification.createdAt || notification.timestamp)}
                                        </p>
                                    </div>
                                </div>

                                {/* Dismiss Button */}
                                <button
                                    onClick={() => dismissNotification(uniqueId)}
                                    className="ml-4 p-1.5 rounded-full hover:bg-white/50 dark:hover:bg-black/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                    title="Dismiss"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    })
                ) : (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
                        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                            <BellOff className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-xl font-bold text-gray-800 dark:text-gray-200">All caught up!</p>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 max-w-xs text-center">
                            New inventory alerts and credit limit warnings will appear here in real-time.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;