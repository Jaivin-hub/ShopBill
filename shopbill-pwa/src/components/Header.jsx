import React from 'react';
import { DollarSign, User, Moon, Sun, Bell } from 'lucide-react'; // Import Bell icon

// UPDATED: onProfileClick prop is replaced by setCurrentPage
const Header = ({ companyName, userRole, setCurrentPage, isDarkMode, onToggleDarkMode }) => (
    <header
        className="fixed top-0 left-0 right-0 
               bg-white dark:bg-gray-800 
               border-b border-gray-200 dark:border-gray-700 
               shadow-xl 
               md:hidden 
               z-30 p-4 flex justify-between items-center transition-colors duration-300"
    >
        <h1 className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 truncate flex items-center">
            <DollarSign className="inline-block w-5 h-5 mr-1 sm:mr-2" />
            {companyName}
        </h1>

        <div className="flex space-x-3 items-center">
            
            {/* NEW: Notification Icon with Badge - Now uses setCurrentPage */}
            <button
                onClick={() => setCurrentPage('notifications')} // Navigate to 'notifications' page
                className="p-2 rounded-full 
                   bg-gray-100 dark:bg-gray-700 
                   text-gray-600 dark:text-gray-300 
                   hover:bg-gray-200 dark:hover:bg-gray-600 
                   transition-all duration-300 active:scale-95 transform
                   relative"
                title="Notifications"
            >
                <Bell className="w-5 h-5" />
                {/* Dummy Notification Badge */}
                <span className="absolute top-0 right-0 block h-5 w-5 rounded-full ring-2 ring-white dark:ring-gray-800 bg-red-500 text-white text-xs font-bold flex items-center justify-center transform translate-x-1 -translate-y-1.5">
                    5
                </span>
            </button>

            {/* Dark Mode Toggle Button */}
            {/* <button
                onClick={onToggleDarkMode}
                className="p-2 rounded-full 
                   bg-gray-100 dark:bg-gray-700 
                   text-gray-600 dark:text-yellow-400 
                   hover:bg-gray-200 dark:hover:bg-gray-600 
                   transition-all duration-300 active:scale-95 transform"
                title={`Toggle ${isDarkMode ? 'Light' : 'Dark'} Mode`}
            >
                {isDarkMode ? (
                    <Sun className="w-5 h-5" />
                ) : (
                    <Moon className="w-5 h-5" />
                )}
            </button> */}

            {/* User Profile Button - Now uses setCurrentPage */}
            <button
                onClick={() => setCurrentPage('profile')} // Navigate to 'profile' page
                className="p-2 rounded-full 
                   bg-indigo-100 dark:bg-indigo-700 
                   text-indigo-600 dark:text-indigo-200 
                   hover:bg-indigo-200 dark:hover:bg-indigo-600 
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

export default Header;