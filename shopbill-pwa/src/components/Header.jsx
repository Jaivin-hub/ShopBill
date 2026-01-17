import React from 'react';
import { Smartphone, User, Bell, Settings, Sun, Moon, CreditCard } from 'lucide-react';

const Header = ({
    companyName,
    userRole,
    setCurrentPage,
    currentPage,
    notifications = [],
    darkMode,
    setDarkMode,
    onLogout,
    apiClient,
    API
}) => {

    const unreadCount = (notifications || []).filter(n => n && n.isRead === false).length;

    // Semantic theme colors
    const headerBg = darkMode ? 'bg-slate-950/95 border-slate-900' : 'bg-white/95 border-slate-200 shadow-sm';
    const logoText = darkMode ? 'text-white' : 'text-slate-900';

    const getButtonClasses = (pageName) => {
        const isActive = currentPage === pageName;
        if (darkMode) {
            return `p-2 rounded-xl transition-all duration-300 active:scale-95 border ${isActive
                    ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/50 shadow-lg shadow-indigo-900/40'
                    : 'bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800'
                }`;
        }
        return `p-2 rounded-xl transition-all duration-300 active:scale-95 border ${isActive
                ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                : 'bg-slate-100/50 text-slate-500 hover:text-slate-900 hover:bg-slate-200 border-transparent'
            }`;
    };

    return (
        <header className={`fixed top-0 left-0 right-0 border-b md:hidden z-50 p-4 flex justify-between items-center ${headerBg}`}>
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setCurrentPage('dashboard')}>
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5 text-white" />
                </div>
                <h1 className={`text-lg font-bold tracking-tight truncate ${logoText}`}>
                    Pocket <span className="text-indigo-500">POS</span>
                </h1>
            </div>


            <div className="flex space-x-2 items-center">
                {/* Theme Toggle */}
                <button
                    onClick={() => setDarkMode(!darkMode)}
                    className={getButtonClasses('theme-toggle')}
                    title="Switch Theme"
                >
                    {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
                </button>

                <button
                    onClick={() => setCurrentPage('notifications')}
                    className={`${getButtonClasses('notifications')} relative`}
                >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full ring-2 ring-inherit bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>

                <button onClick={() => setCurrentPage('settings')} className={getButtonClasses('settings')}>
                    <Settings className="w-5 h-5" />
                </button>

                <button onClick={() => setCurrentPage('profile')} className={`${getButtonClasses('profile')} flex items-center gap-2`}>
                    <User className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
};

export default Header;