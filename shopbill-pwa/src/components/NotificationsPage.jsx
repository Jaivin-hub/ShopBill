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
    // Note: Dark theme background classes now use darker colors (e.g., -900/40)
    switch (type) {
        case 'warning':
            // Using Amber/Orange for warning
            return { icon: AlertTriangle, color: 'text-amber-400', bgColor: 'bg-amber-900/20', borderColor: 'border-amber-700/50' };
        case 'error':
            // Using Red
            return { icon: X, color: 'text-red-400', bgColor: 'bg-red-900/20', borderColor: 'border-red-700/50' };
        case 'success':
            // Using Teal/Green for success
            return { icon: CheckCircle, color: 'text-teal-400', bgColor: 'bg-teal-900/20', borderColor: 'border-teal-700/50' };
        case 'info':
        default:
            // Using Indigo/Blue for info
            return { icon: Info, color: 'text-indigo-400', bgColor: 'bg-indigo-900/20', borderColor: 'border-indigo-700/50' };
    }
};

const NotificationsPage = () => {
    const [notifications, setNotifications] = React.useState(dummyNotifications);

    // Function to dismiss a notification
    const dismissNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        // Main container uses the darkest background
        <div className="p-4 md:p-8 h-full overflow-y-auto bg-gray-950 transition-colors duration-300">
            
            {/* Header - Updated for dark theme */}
            <h1 className="text-3xl font-extrabold text-white mb-1 flex items-center">
                {/* <Bell className="w-7 h-7 mr-2 text-indigo-400" /> */}
                Notifications
            </h1>
            <p className="text-gray-400 mb-6">View alerts, stock updates, and recent activity.</p>

            <div className="space-y-4 max-w-3xl mx-auto">
                {notifications.length > 0 ? (
                    notifications.map(notification => {
                        // Using the new borderColor class
                        const { icon: Icon, color, bgColor, borderColor } = getNotificationTypeDetails(notification.type);

                        return (
                            <div 
                                key={notification.id} 
                                // Updated to use the dark gray card background and the specific type border/bg
                                className={`flex items-start p-4 rounded-xl shadow-lg border ${borderColor} bg-gray-900 transition duration-300 ${bgColor}`}
                            >
                                {/* Icon - Color derived from type */}
                                <div className={`flex-shrink-0 mr-3 ${color}`}>
                                    <Icon className="w-5 h-5 mt-0.5" />
                                </div>
                                
                                {/* Content - Updated text colors for dark theme */}
                                <div className="flex-grow">
                                    <p className="font-medium text-gray-100 leading-snug">
                                        {notification.message}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {notification.time}
                                    </p>
                                </div>

                                {/* Dismiss Button - Updated colors for dark theme */}
                                <button
                                    onClick={() => dismissNotification(notification.id)}
                                    className="ml-4 p-1 text-gray-500 hover:text-red-400 transition-colors"
                                    title="Dismiss Notification"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    })
                ) : (
                    // All caught up message box - Updated for dark theme
                    <div className="text-center py-12 bg-gray-900 rounded-xl shadow-2xl border border-gray-800">
                        <CheckCircle className="w-8 h-8 mx-auto mb-3 text-teal-400" />
                        <p className="text-lg font-semibold text-gray-200">All caught up!</p>
                        <p className="text-gray-400">You have no new notifications.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;