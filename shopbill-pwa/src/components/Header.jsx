import React from 'react';
import { Smartphone, User, Moon, Sun, Bell, LogOut } from 'lucide-react'; 

const Header = ({ companyName, userRole, setCurrentPage, isDarkMode, onToggleDarkMode, onLogout }) => (
    <header
        className="fixed top-0 left-0 right-0 
               bg-white dark:bg-gray-800 
               border-b border-gray-200 dark:border-gray-700 
               shadow-xl 
               md:hidden 
               z-30 p-4 flex justify-between items-center transition-colors duration-300"
    >
        <h1 className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 truncate flex items-center">
            <Smartphone className="inline-block w-5 h-5 mr-1 sm:mr-2" />
            {companyName}
        </h1>

        <div className="flex space-x-3 items-center">
            
            {/* Notification Icon */}
            <button
                onClick={() => setCurrentPage('notifications')} 
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

            {/* LOGOUT BUTTON - STYLED TO MATCH OTHER ICONS */}
            <button
                onClick={onLogout} 
                className="p-2 rounded-full 
                   bg-red-100 dark:bg-red-800/50 
                   text-red-600 dark:text-red-300 
                   hover:bg-red-200 dark:hover:bg-red-700/60
                   transition-all duration-300 active:scale-95 transform"
                title="Logout"
            >
                <LogOut className="w-5 h-5" />
            </button>

            {/* Dark Mode Toggle Button (You can uncomment this section if you decide to use it) */}
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

            {/* User Profile Button */}
            <button
                onClick={() => setCurrentPage('profile')} 
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