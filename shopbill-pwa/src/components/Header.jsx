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
     */
    const unreadCount = (notifications || []).filter(n => 
        n && n.isRead === false
    ).length;
    
    const displayCount = unreadCount;

    // Matches the dashboard's interactive cues: high contrast, smooth transitions, and glow shadows
    const baseButtonClasses = `p-2 rounded-xl 
        transition-all duration-300 active:scale-95 transform cursor-pointer outline-none 
        border border-transparent`;
    
    const getButtonClasses = (pageName) => {
        const isActive = currentPage === pageName;
        return `${baseButtonClasses} ${
            isActive 
                ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/50 shadow-lg shadow-indigo-900/40' 
                : 'bg-gray-900/50 text-gray-400 hover:text-white hover:bg-gray-800 border-gray-800'
        }`;
    };

    return (
        <header
            className="fixed top-0 left-0 right-0 
                   bg-gray-950/95 backdrop-blur-md
                   border-b border-gray-900 
                   md:hidden 
                   z-50 p-4 flex justify-between items-center"
        >
            {/* Logo Section - Matching the Dashboard Title Font Weight */}
            <div 
                className="flex items-center cursor-pointer group" 
                onClick={() => setCurrentPage('dashboard')}
            >
                <div className="bg-indigo-600/10 p-1.5 rounded-lg mr-2 border border-indigo-500/20 group-hover:border-indigo-500/50 transition-colors">
                    <Smartphone className="w-5 h-5 text-indigo-400" aria-hidden="true" />
                </div>
                <h1 className="text-lg font-bold text-white tracking-tight truncate" itemProp="name">
                    {companyName || 'Pocket POS'}
                </h1>
            </div>

            {/* Action Icons */}
            <div className="flex space-x-2.5 items-center">
                
                {/* Notifications Button with Dynamic Badge */}
                <button
                    onClick={() => setCurrentPage('notifications')} 
                    className={`${getButtonClasses('notifications')} relative`}
                    aria-label={`${unreadCount} notifications`}
                    title="Notifications"
                >
                    <Bell className="w-5 h-5" />
                    
                    {displayCount > 0 && (
                        <span className="absolute -top-1 -right-1 block h-5 w-5 rounded-full ring-2 ring-gray-950 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
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

                {/* Profile Button - Integrated Role Badge */}
                <button
                    onClick={() => setCurrentPage('profile')} 
                    className={`${getButtonClasses('profile')} flex items-center gap-2`}
                    title={`Logged in as ${userRole}`}
                >
                    <div className="bg-gray-800 rounded-full p-0.5">
                        <User className="w-4 h-4" />
                    </div>
                    {userRole && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 hidden xs:inline-block">
                            {userRole}
                        </span>
                    )}
                </button>
            </div>
        </header>
    );
};

export default Header;