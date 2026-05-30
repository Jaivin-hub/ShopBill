import React from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * Light/dark mode control for public pages (landing, login, checkout).
 * Uses the same themePreference localStorage as the dashboard (via App state).
 */
const ThemeToggle = ({ darkMode, setDarkMode, onToggle, className = '', size = 'md' }) => {
    const handleClick = () => {
        if (typeof onToggle === 'function') onToggle();
        else if (typeof setDarkMode === 'function') setDarkMode(!darkMode);
    };

    const dim = size === 'sm' ? 'w-9 h-9' : 'w-10 h-10';
    const icon = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Light mode' : 'Dark mode'}
            className={`${dim} shrink-0 inline-flex items-center justify-center rounded-xl border transition-all active:scale-95 ${
                darkMode
                    ? 'bg-gray-900 border-gray-800 text-amber-400 hover:bg-gray-800 hover:text-amber-300'
                    : 'bg-white border-slate-300 text-indigo-600 hover:bg-slate-100 shadow-sm'
            } ${className}`.trim()}
        >
            {darkMode ? <Sun className={icon} aria-hidden /> : <Moon className={icon} aria-hidden />}
        </button>
    );
};

export default ThemeToggle;
