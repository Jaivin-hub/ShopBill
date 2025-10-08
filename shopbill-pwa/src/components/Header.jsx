import React from 'react';
import { Smartphone, User, Moon, Sun, Bell, LogOut } from 'lucide-react'; 

const Header = ({ companyName, userRole, setCurrentPage, isDarkMode, onToggleDarkMode }) => (
    <header
        className="fixed top-0 left-0 right-0 
               bg-gray-900 
               border-b border-gray-700 
               shadow-xl shadow-indigo-900/20
               md:hidden 
               z-30 p-4 flex justify-between items-center transition-colors duration-300"
    >
        {/* Company Name/Logo - Using Teal as the primary app accent for a vibrant header */}
        {/* <h1 className="text-xl font-extrabold text-teal-400 truncate flex items-center">
            <Smartphone className="inline-block w-5 h-5 mr-1 sm:mr-2" />
            {companyName}
        </h1> */}
        <h1 className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 truncate flex items-center">
            <Smartphone className="inline-block w-5 h-5 mr-1 sm:mr-2" />
            {companyName}
        </h1>

        <div className="flex space-x-3 items-center">
            
            {/* Notification Icon */}
            <button
                onClick={() => setCurrentPage('notifications')} 
                className="p-2 rounded-full 
                   bg-gray-800 
                   text-gray-300 
                   hover:bg-gray-700 
                   transition-all duration-300 active:scale-95 transform
                   relative"
                title="Notifications"
            >
                <Bell className="w-5 h-5" />
                {/* Dummy Notification Badge */}
                <span className="absolute top-0 right-0 block h-5 w-5 rounded-full ring-2 ring-gray-900 bg-red-600 text-white text-xs font-bold flex items-center justify-center transform translate-x-1 -translate-y-1.5">
                    5
                </span>
            </button>

            {/* LOGOUT BUTTON - STYLED FOR DARK THEME (Red accent) */}
            {/* <button
                onClick={onLogout} 
                className="p-2 rounded-full 
                   bg-red-900/40
                   text-red-400
                   hover:bg-red-900/60
                   transition-all duration-300 active:scale-95 transform"
                title="Logout"
            >
                <LogOut className="w-5 h-5" />
            </button> */}

            {/* Dark Mode Toggle Button (Uncommented and styled for dark theme) */}
            {/* <button
                onClick={onToggleDarkMode}
                className="p-2 rounded-full 
                   bg-gray-800 
                   text-gray-300
                   hover:bg-gray-700
                   transition-all duration-300 active:scale-95 transform"
                title={`Toggle ${isDarkMode ? 'Light' : 'Dark'} Mode`}
            >
                {isDarkMode ? (
                    <Sun className="w-5 h-5 text-yellow-400" />
                ) : (
                    <Moon className="w-5 h-5 text-indigo-400" />
                )}
            </button> */}

            {/* User Profile Button - Uses Indigo accent */}
            <button
                onClick={() => setCurrentPage('profile')} 
                className="p-2 rounded-full 
                   bg-indigo-700 
                   text-indigo-200 
                   hover:bg-indigo-600 
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