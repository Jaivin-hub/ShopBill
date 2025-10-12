import React, { useState, useEffect, useCallback } from 'react';
// Import 'Settings' icon from lucide-react
import { Smartphone, User, Bell, Settings } from 'lucide-react'; 
// NOTE: Moon and Sun icons are no longer needed as the toggle is removed.

// ----------------------------------------------------------------------
// Integrated Header Component with State and API Logic
// ----------------------------------------------------------------------

const Header = ({ 
    companyName, 
    userRole, 
    setCurrentPage, 
    // REMOVED: isDarkMode, 
    // REMOVED: onToggleDarkMode, 
    onLogout, 
    apiClient,  
    API         
}) => {
    // 1. State for dynamic notification count and fetching status
    const [notificationCount, setNotificationCount] = useState(0);
    const [isFetching, setIsFetching] = useState(false);

    // 2. Function to fetch the current alert count (memoized with useCallback)
    const fetchAlertCount = useCallback(async () => {
        // Prevent concurrent requests if the previous one is still running
        if (isFetching) return; 
        
        setIsFetching(true);
        try {
            // Use the API client to call the notification endpoint
            const response = await apiClient.get(API.notificationalert);
            setNotificationCount(response.data.count || 0);
        } catch (error) {
            console.error("Failed to fetch notification count:", error);
            // Gracefully fail: keep count at 0
        } finally {
            setIsFetching(false);
        }
    // Dependency array ensures this function is only recreated if these dependencies change
    }, [apiClient, API.notificationalert]); 

    // 3. Polling for updates (useEffect with cleanup)
    useEffect(() => {
        // Fetch count immediately on mount
        fetchAlertCount(); 
        
        // Set up polling interval (check every 30 seconds for new alerts)
        const intervalId = setInterval(fetchAlertCount, 30000); 

        // Cleanup the interval when the component unmounts
        return () => clearInterval(intervalId);
    }, [fetchAlertCount]); // Re-run effect if fetchAlertCount changes


    // Common classes for action buttons (reused for readability)
    const buttonClasses = `p-2 rounded-full 
        bg-gray-800 
        text-gray-300 
        hover:bg-gray-700 
        transition-all duration-300 active:scale-95 transform`;
    // NOTE: Simplified classes to only use dark mode variants (e.g., removed dark:bg-gray-800 from initial state as it's the only state now).


    return (
        <header
            // Use only dark mode classes for the header background and border
            className={`fixed top-0 left-0 right-0 
                   bg-gray-900 
                   border-b border-gray-700 
                   shadow-lg dark:shadow-indigo-900/20
                   md:hidden 
                   z-30 p-4 flex justify-between items-center transition-colors duration-300`}
        >
            {/* Company Name/Logo - Fixed for dark mode */}
            <h1 className="text-xl font-extrabold text-indigo-400 truncate flex items-center">
                <Smartphone className="inline-block w-5 h-5 mr-1 sm:mr-2" />
                {companyName}
            </h1>

            <div className="flex space-x-3 items-center">
                
                {/* Notification Icon */}
                <button
                    onClick={() => setCurrentPage('notifications')} 
                    className={`${buttonClasses} relative`}
                    title="Notifications"
                >
                    <Bell className="w-5 h-5" />
                    {/* Dynamic Notification Badge */}
                    {notificationCount > 0 && (
                        <span className="absolute top-0 right-0 block h-5 w-5 rounded-full ring-2 ring-gray-900 bg-red-600 text-white text-xs font-bold flex items-center justify-center transform translate-x-1 -translate-y-1.5">
                            {notificationCount > 9 ? '9+' : notificationCount}
                        </span>
                    )}
                </button>

                {/* Settings Icon (New Addition) */}
                <button
                    onClick={() => setCurrentPage('settings')} 
                    className={buttonClasses}
                    title="Settings"
                >
                    <Settings className="w-5 h-5" />
                </button>


                {/* User Profile Button */}
                <button
                    onClick={() => setCurrentPage('profile')} 
                    className="p-2 rounded-full 
                       bg-indigo-600 
                       text-indigo-200 
                       hover:bg-indigo-700 
                       transition-colors duration-300 active:scale-95 transform 
                       flex items-center"
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