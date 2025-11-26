import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Bell, AlertTriangle, CheckCircle, Info, X, Loader } from 'lucide-react';

// NOTE: We no longer need dummyNotifications as we will fetch real data.

// Helper function to get the appropriate icon and color based on notification type
const getNotificationTypeDetails = (type) => {
    switch (type) {
        case 'inventory_low':
            // Using Amber/Orange for critical/warning
            return { 
                icon: AlertTriangle, 
                color: 'text-amber-600 dark:text-amber-400', 
                bgColor: 'bg-amber-100 dark:bg-amber-900/20', 
                borderColor: 'border-amber-300 dark:border-amber-700/50' 
            };
        case 'credit_high':
            // Using Red for error/risk
            return { 
                icon: X, 
                color: 'text-red-600 dark:text-red-400', 
                bgColor: 'bg-red-100 dark:bg-red-900/20', 
                borderColor: 'border-red-300 dark:border-red-700/50' 
            };
        case 'success':
            // Using Teal/Green for success (Placeholder, usually not fetched from this API)
            return { 
                icon: CheckCircle, 
                color: 'text-teal-600 dark:text-teal-400', 
                bgColor: 'bg-teal-100 dark:bg-teal-900/20', 
                borderColor: 'border-teal-300 dark:border-teal-700/50' 
            };
        case 'info':
        default:
            // Using Indigo/Blue for info (Placeholder)
            return { 
                icon: Info, 
                color: 'text-indigo-600 dark:text-indigo-400', 
                bgColor: 'bg-indigo-100 dark:bg-indigo-900/20', 
                borderColor: 'border-indigo-300 dark:border-indigo-700/50' 
            };
    }
};

// Assuming showToast is passed from App.jsx for error handling
const NotificationsPage = ({ apiClient, API, showToast }) => {
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- Data Fetching ---
    const fetchNotifications = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get(API.notificationalert);
            // The API returns an object with { alerts: [...] }
            setNotifications(response.data.alerts || []);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
            if (showToast) {
                showToast('Error fetching alerts. Check your server connection.', 'error');
            }
            setNotifications([]);
        } finally {
            setIsLoading(false);
        }
    }, [apiClient, API.notificationalert, showToast]);

    // Fetch notifications on mount
    useEffect(() => {
        fetchNotifications();
        
        // --- Polling Logic (For "normal" notifications) ---
        // Since we are not using push, we must poll the server periodically.
        const pollInterval = setInterval(fetchNotifications, 60000); // Poll every 60 seconds

        // Cleanup function to clear the interval when the component unmounts
        return () => clearInterval(pollInterval);
        
    }, [fetchNotifications]);
    
    // --- Utility Functions ---

    // Function to dismiss a notification
    const dismissNotification = (id) => {
        // Since we are only fetching "live" alerts (low stock), dismissing it 
        // on the client means it will reappear on the next poll if the condition 
        // hasn't been fixed on the server (i.e., stock is still low).
        // For now, we will dismiss it visually. In a real app, this would be 
        // an API call to mark the alert as "read" in the database.
        setNotifications(prev => prev.filter(n => n.id !== id));
    };
    
    // Utility to format time (simple)
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
               ' on ' + date.toLocaleDateString();
    }


    // --- Render Logic ---

    // Loading State
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-screen p-8 bg-gray-100 dark:bg-gray-950 transition-colors duration-300">
                <Loader className="w-10 h-10 animate-spin text-indigo-600 dark:text-indigo-400" />
                <p className='mt-3 text-gray-600 dark:text-gray-400'>Checking for critical alerts...</p>
            </div>
        );
    }
    
    return (
        // 💥 UPDATED: Main container uses light/dark background
        <div className="p-4 md:p-8 h-full overflow-y-auto bg-gray-100 dark:bg-gray-950 transition-colors duration-300">
            
            {/* Header - 💥 UPDATED: Text colors */}
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1 flex items-center">
                Notifications
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">View alerts, stock updates, and recent activity.</p>

            {/* UPDATED: Removed max-w-3xl mx-auto to make the list full width */}
            <div className="space-y-4">
                {notifications.length > 0 ? (
                    notifications.map(notification => {
                        const { icon: Icon, color, bgColor, borderColor } = getNotificationTypeDetails(notification.type);

                        return (
                            <div 
                                key={notification.id} 
                                // 💥 UPDATED: Card background, shadow, and border for light/dark theme
                                className={`flex items-start p-4 rounded-xl shadow-lg border ${borderColor} bg-white dark:bg-gray-900 transition duration-300 ${bgColor}`}
                            >
                                {/* Icon - Color derived from type */}
                                <div className={`flex-shrink-0 mr-3 ${color}`}>
                                    <Icon className="w-5 h-5 mt-0.5" />
                                </div>
                                
                                {/* Content - 💥 UPDATED: Text colors */}
                                <div className="flex-grow">
                                    <p className="font-medium text-gray-900 dark:text-gray-100 leading-snug">
                                        {notification.message}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {formatTime(notification.timestamp)}
                                    </p>
                                </div>

                                {/* Dismiss Button - 💥 UPDATED: Colors for light/dark theme */}
                                <button
                                    onClick={() => dismissNotification(notification.id)}
                                    className="ml-4 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                    title="Dismiss Notification"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    })
                ) : (
                    // All caught up message box - 💥 UPDATED: Colors for light/dark theme
                    <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800">
                        <CheckCircle className="w-8 h-8 mx-auto mb-3 text-teal-600 dark:text-teal-400" />
                        <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">All caught up!</p>
                        <p className="text-gray-500 dark:text-gray-400">You have no new critical alerts.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;