import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Info, X, Loader } from 'lucide-react';
import { io } from 'socket.io-client'; // 1. Import Socket.io client

const getNotificationTypeDetails = (type) => {
    switch (type) {
        case 'inventory_low':
            return { 
                icon: AlertTriangle, 
                color: 'text-amber-600 dark:text-amber-400', 
                bgColor: 'bg-amber-100 dark:bg-amber-900/20', 
                borderColor: 'border-amber-300 dark:border-amber-700/50' 
            };
        case 'credit_exceeded': // Matches backend key
            return { 
                icon: X, 
                color: 'text-red-600 dark:text-red-400', 
                bgColor: 'bg-red-100 dark:bg-red-900/20', 
                borderColor: 'border-red-300 dark:border-red-700/50' 
            };
        case 'success':
            return { 
                icon: CheckCircle, 
                color: 'text-teal-600 dark:text-teal-400', 
                bgColor: 'bg-teal-100 dark:bg-teal-900/20', 
                borderColor: 'border-teal-300 dark:border-teal-700/50' 
            };
        default:
            return { 
                icon: Info, 
                color: 'text-indigo-600 dark:text-indigo-400', 
                bgColor: 'bg-indigo-100 dark:bg-indigo-900/20', 
                borderColor: 'border-indigo-300 dark:border-indigo-700/50' 
            };
    }
};

const NotificationsPage = ({ apiClient, API, showToast, user }) => {
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- 1. Fetch initial history via API ---
    // const fetchNotifications = useCallback(async () => {
    //     setIsLoading(true);
    //     try {
    //         const response = await apiClient.get(API.notificationalert);
    //         setNotifications(response.data.alerts || []);
    //     } catch (error) {
    //         console.error("Failed to fetch notifications:", error);
    //         if (showToast) showToast('Error fetching history.', 'error');
    //     } finally {
    //         setIsLoading(false);
    //     }
    // }, [apiClient, API.notificationalert, showToast]);

    // --- 2. Setup WebSockets for real-time updates ---
    useEffect(() => {
        // fetchNotifications();

        // Connect to the backend socket server
        // Replace with your actual backend URL (e.g., http://localhost:5000)
        const socket = io(`https://shopbill-1-frontend.onrender.com/api`);
        console.log('socket io----',socket)

        // Join the shop-specific room for multi-tenancy
        if (user?.shopId) {
            socket.emit('join_shop', user.shopId);
        }

        // Listen for the 'new_notification' event emitted by the backend
        socket.on('new_notification', (newAlert) => {
            setNotifications((prev) => [newAlert, ...prev]);
            
            // Optional: Trigger a browser toast when a notification arrives
            if (showToast) {
                showToast(newAlert.message, 'info');
            }
        });

        // Cleanup on unmount
        return () => {
            socket.off('new_notification');
            socket.disconnect();
        };
    }, [user?.shopId, showToast]);

    const dismissNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };
    
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
               ' on ' + date.toLocaleDateString();
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-screen p-8 bg-gray-100 dark:bg-gray-950 transition-colors duration-300">
                <Loader className="w-10 h-10 animate-spin text-indigo-600 dark:text-indigo-400" />
                <p className='mt-3 text-gray-600 dark:text-gray-400'>Connecting to live alert stream...</p>
            </div>
        );
    }
    
    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto bg-gray-100 dark:bg-gray-950 transition-colors duration-300">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">
                        Notifications
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-sm italic">
                        Live updates enabled 📡
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                {notifications.length > 0 ? (
                    notifications.map(notification => {
                        const { icon: Icon, color, bgColor, borderColor } = getNotificationTypeDetails(notification.type);

                        return (
                            <div 
                                key={notification.id} 
                                className={`flex items-start p-4 rounded-xl shadow-lg border ${borderColor} bg-white dark:bg-gray-900 transition duration-300 ${bgColor}`}
                            >
                                <div className={`flex-shrink-0 mr-3 ${color}`}>
                                    <Icon className="w-5 h-5 mt-0.5" />
                                </div>
                                
                                <div className="flex-grow">
                                    <p className="font-medium text-gray-900 dark:text-gray-100 leading-snug">
                                        {notification.message}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {formatTime(notification.timestamp)}
                                    </p>
                                </div>

                                <button
                                    onClick={() => dismissNotification(notification.id)}
                                    className="ml-4 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800">
                        <CheckCircle className="w-8 h-8 mx-auto mb-3 text-teal-600 dark:text-teal-400" />
                        <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">All caught up!</p>
                        <p className="text-gray-500 dark:text-gray-400">Waiting for live activity...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;