import React from 'react';
import { Smartphone, User, Bell, Settings } from 'lucide-react'; 

const Header = ({ 
    companyName, 
    userRole, 
    setCurrentPage,
    currentPage,
    notifications = [], // Default to empty array
    onLogout, 
    apiClient,  
    API         
}) => {
    
    /**
     * LOGIC: Count unread notifications.
     * A notification is considered unread if isRead is explicitly false 
     * OR if the isRead property is missing (common for new real-time alerts).
     */
    const unreadCount = (notifications || []).filter(n => n.isRead === false || n.isRead === undefined).length;
    
    // We use unreadCount for the badge to alert the user of new items only
    const displayCount = unreadCount;

    const baseButtonClasses = `p-2 rounded-full 
        transition-all duration-300 active:scale-95 transform cursor-pointer`;
    
    const getButtonClasses = (pageName) => {
        const isActive = currentPage === pageName;
        return `${baseButtonClasses} ${
            isActive 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/50' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`;
    };

    return (
        <header
            className={`fixed top-0 left-0 right-0 
                   bg-white dark:bg-gray-900 
                   border-b border-gray-200 dark:border-gray-700 
                   shadow-lg dark:shadow-indigo-900/20
                   md:hidden 
                   z-30 p-4 flex justify-between items-center transition-colors duration-300`}
        >
            {/* Logo Section */}
            <h1 className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 truncate flex items-center">
                <Smartphone className="inline-block w-5 h-5 mr-1 sm:mr-2" />
                {companyName}
            </h1>

            {/* Action Icons */}
            <div className="flex space-x-3 items-center">
                
                {/* Notifications Button with Dynamic Badge */}
                <button
                    onClick={() => setCurrentPage('notifications')} 
                    className={`${getButtonClasses('notifications')} relative`}
                    title="Notifications"
                >
                    <Bell className="w-5 h-5" />
                    
                    {displayCount > 0 && (
                        <span className="absolute top-0 right-0 block h-5 w-5 rounded-full ring-2 ring-white dark:ring-gray-900 bg-red-600 text-white text-[10px] font-bold flex items-center justify-center transform translate-x-1 -translate-y-1.5 animate-pulse">
                            {displayCount > 9 ? '9+' : displayCount}
                        </span>
                    )}
                </button>

                {/* Settings Button */}
                <button
                    onClick={() => setCurrentPage('settings')} 
                    className={getButtonClasses('settings')}
                    title="Settings"
                >
                    <Settings className="w-5 h-5" />
                </button>

                {/* Profile Button */}
                <button
                    onClick={() => setCurrentPage('profile')} 
                    className={`${getButtonClasses('profile')} flex items-center`}
                    title={`Logged in as ${userRole}`}
                >
                    <User className="w-5 h-5" />
                    <span className="text-sm font-semibold hidden sm:inline-block ml-1">{userRole}</span>
                </button>
            </div>
        </header>
    );
};

export default Header;