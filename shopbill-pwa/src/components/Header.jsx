import React, { useState, useEffect, useCallback } from 'react';
import { Smartphone, User, Moon, Sun, Bell, LogOut } from 'lucide-react'; 

// ----------------------------------------------------------------------
// Integrated Header Component with State and API Logic
// ----------------------------------------------------------------------

const Header = ({ 
    companyName, 
    userRole, 
    setCurrentPage, 
    isDarkMode, 
    onToggleDarkMode, 
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
    }, [fetchAlertCount]); // Re-run effect if fetchAlertCount changes (though useCallback prevents frequent changes)


    return (
        <header
            // FIX: Use dynamic Tailwind classes for light/dark mode header background and border
            className={`fixed top-0 left-0 right-0 
                   bg-white dark:bg-gray-900 
                   border-b border-gray-200 dark:border-gray-700 
                   shadow-lg dark:shadow-indigo-900/20
                   md:hidden 
                   z-30 p-4 flex justify-between items-center transition-colors duration-300`}
        >
            {/* Company Name/Logo - Responsive to dark mode */}
            <h1 className="text-xl font-extrabold text-indigo-700 dark:text-indigo-400 truncate flex items-center">
                <Smartphone className="inline-block w-5 h-5 mr-1 sm:mr-2" />
                {companyName}
            </h1>

            <div className="flex space-x-3 items-center">
                
                {/* Notification Icon */}
                <button
                    onClick={() => setCurrentPage('notifications')} 
                    // FIX: Use dynamic Tailwind classes for light/dark mode button styling
                    className="p-2 rounded-full 
                       bg-gray-100 dark:bg-gray-800 
                       text-gray-700 dark:text-gray-300 
                       hover:bg-gray-200 dark:hover:bg-gray-700 
                       transition-all duration-300 active:scale-95 transform
                       relative"
                    title="Notifications"
                >
                    <Bell className="w-5 h-5" />
                    {/* Dynamic Notification Badge */}
                    {notificationCount > 0 && (
                        <span className="absolute top-0 right-0 block h-5 w-5 rounded-full ring-2 ring-white dark:ring-gray-900 bg-red-600 text-white text-xs font-bold flex items-center justify-center transform translate-x-1 -translate-y-1.5">
                            {notificationCount > 9 ? '9+' : notificationCount}
                        </span>
                    )}
                </button>

                {/* LOGOUT BUTTON - FIX: Styled for dark mode responsiveness */}
                {/* <button
                    onClick={onLogout} 
                    className="p-2 rounded-full 
                       bg-red-100 dark:bg-red-900/40
                       text-red-600 dark:text-red-400
                       hover:bg-red-200 dark:hover:bg-red-900/60
                       transition-all duration-300 active:scale-95 transform"
                    title="Logout"
                >
                    <LogOut className="w-5 h-5" />
                </button> */}

                {/* Dark Mode Toggle Button - FIX: Styled for dark mode responsiveness */}
                {/* <button
                    onClick={onToggleDarkMode}
                    className="p-2 rounded-full 
                       bg-gray-100 dark:bg-gray-800 
                       text-gray-700 dark:text-gray-300
                       hover:bg-gray-200 dark:hover:bg-gray-700
                       transition-all duration-300 active:scale-95 transform"
                    title={`Toggle ${isDarkMode ? 'Light' : 'Dark'} Mode`}
                >
                    {isDarkMode ? (
                        <Sun className="w-5 h-5 text-yellow-400" />
                    ) : (
                        <Moon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    )}
                </button> */}

                {/* User Profile Button */}
                <button
                    onClick={() => setCurrentPage('profile')} 
                    className="p-2 rounded-full 
                       bg-indigo-600 
                       text-white dark:text-indigo-200 
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
