import React from 'react';
import { Smartphone, User, Bell, Settings } from 'lucide-react'; 

const Header = ({ 
    companyName, 
    userRole, 
    setCurrentPage,
    currentPage,
    notifications = [], 
    onLogout, 
    apiClient,  
    API         
}) => {
    
    /**
     * LOGIC: Count unread notifications.
     * UPDATED: Specifically checks for isRead === false. 
     * With our new backend, this is now unique to the logged-in user.
     */
    const unreadCount = (notifications || []).filter(n => 
        n && n.isRead === false
    ).length;
    
    const displayCount = unreadCount;

    const baseButtonClasses = `p-2 rounded-full 
        transition-all duration-300 active:scale-95 transform cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-950`;
    
    const getButtonClasses = (pageName) => {
        const isActive = currentPage === pageName;
        return `${baseButtonClasses} ${
            isActive 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/50' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
        }`;
    };

    return (
        <header
            className={`fixed top-0 left-0 right-0 
                   bg-gray-900 
                   border-b border-gray-800 
                   shadow-sm shadow-indigo-900/10
                   md:hidden 
                   z-30 p-4 flex justify-between items-center transition-colors duration-300`}
        >
            {/* Logo Section */}
            <div 
                className="flex items-center cursor-pointer" 
                onClick={() => setCurrentPage('dashboard')}
            >
                <h1 className="text-xl font-extrabold text-indigo-400 truncate flex items-center" itemProp="name">
                    <Smartphone className="inline-block w-5 h-5 mr-1 sm:mr-2" aria-hidden="true" />
                    {companyName || 'Pocket POS'}
                </h1>
            </div>

            {/* Action Icons */}
            <div className="flex space-x-3 items-center">
                
                {/* Notifications Button with Dynamic Badge */}
                <button
                    onClick={() => setCurrentPage('notifications')} 
                    className={`${getButtonClasses('notifications')} relative`}
                    aria-label={`${unreadCount} notifications`}
                    title="Notifications"
                >
                    <Bell className="w-5 h-5" />
                    
                    {displayCount > 0 && (
                        <span className="absolute top-0 right-0 block h-5 w-5 rounded-full ring-2 ring-gray-900 bg-red-600 text-white text-[10px] font-bold flex items-center justify-center transform translate-x-1 -translate-y-1.5 animate-pulse">
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
                    className={`${getButtonClasses('profile')} flex items-center px-3`}
                    title={`Logged in as ${userRole}`}
                >
                    <User className="w-5 h-5" />
                    {userRole && (
                        <span className="text-xs font-bold hidden sm:inline-block ml-2 uppercase tracking-tight">
                            {userRole}
                        </span>
                    )}
                </button>
            </div>
        </header>
    );
};

export default Header;