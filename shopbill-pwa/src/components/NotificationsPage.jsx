import React from 'react';
import { Bell, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

// Dummy data for the notification list
const dummyNotifications = [
    { 
        id: 1, 
        type: 'warning', 
        message: 'Low Stock Alert: Only 5 units of "Premium Basmati Rice" remain.', 
        time: '5 minutes ago' 
    },
    { 
        id: 2, 
        type: 'info', 
        message: 'New Update Available: POS system version 3.2 is ready for deployment.', 
        time: '1 hour ago' 
    },
    { 
        id: 3, 
        type: 'success', 
        message: 'Sale Processed: ₹1,540.00 transaction completed by John Doe.', 
        time: '3 hours ago' 
    },
    { 
        id: 4, 
        type: 'error', 
        message: 'Credit Limit Reached: Customer "Priya Traders" exceeded their limit on the last sale attempt.', 
        time: 'Yesterday' 
    },
    { 
        id: 5, 
        type: 'info', 
        message: 'Customer "Walk-in Customer" selected for billing.', 
        time: 'Yesterday' 
    },
];

// Helper function to get the appropriate icon and color based on notification type
const getNotificationTypeDetails = (type) => {
    switch (type) {
        case 'warning':
            return { icon: AlertTriangle, color: 'text-yellow-500', bgColor: 'bg-yellow-100 dark:bg-yellow-900/40' };
        case 'error':
            return { icon: X, color: 'text-red-500', bgColor: 'bg-red-100 dark:bg-red-900/40' };
        case 'success':
            return { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900/40' };
        case 'info':
        default:
            return { icon: Info, color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/40' };
    }
};

const NotificationsPage = () => {
    const [notifications, setNotifications] = React.useState(dummyNotifications);

    // Function to dismiss a notification
    const dismissNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1 flex items-center">
                <Bell className="w-7 h-7 mr-2 text-indigo-600" />
                Notifications
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Review system alerts, stock updates, and recent activity.</p>

            <div className="space-y-4 max-w-3xl mx-auto">
                {notifications.length > 0 ? (
                    notifications.map(notification => {
                        const { icon: Icon, color, bgColor } = getNotificationTypeDetails(notification.type);

                        return (
                            <div 
                                key={notification.id} 
                                className={`flex items-start p-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 transition duration-300 ${bgColor}`}
                            >
                                {/* Icon */}
                                <div className={`flex-shrink-0 mr-3 ${color}`}>
                                    <Icon className="w-5 h-5 mt-0.5" />
                                </div>
                                
                                {/* Content */}
                                <div className="flex-grow">
                                    <p className="font-medium text-gray-800 dark:text-gray-100 leading-snug">
                                        {notification.message}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {notification.time}
                                    </p>
                                </div>

                                {/* Dismiss Button */}
                                <button
                                    onClick={() => dismissNotification(notification.id)}
                                    className="ml-4 p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                    title="Dismiss Notification"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                        <CheckCircle className="w-8 h-8 mx-auto mb-3 text-green-500" />
                        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">All caught up!</p>
                        <p className="text-gray-500 dark:text-gray-400">You have no new notifications.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;