import React, { useState } from 'react';
import { 
    Smartphone, User, Bell, Settings, Sun, Moon, 
    CreditCard, LayoutGrid, Store, Plus, ChevronRight 
} from 'lucide-react';
import OutletSelector from './OutletSelector';

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
    API,
    currentUser,
    currentOutlet,
    currentOutletId,
    onOutletSwitch,
    showToast
}) => {
    const [showStoreHub, setShowStoreHub] = useState(false);
    const unreadCount = (notifications || []).filter(n => n && n.isRead === false).length;
    const isPremium = currentUser?.plan === 'PREMIUM';

    const headerBg = darkMode ? 'bg-slate-950/95 border-slate-900' : 'bg-white/95 border-slate-200 shadow-sm';
    const logoText = darkMode ? 'text-white' : 'text-slate-900';
    const hubBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200';

    const getButtonClasses = (pageName, isStoreActive = false) => {
        const isActive = currentPage === pageName || isStoreActive;
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
        <>
            {/* Main Header - Increased z-index to 110 to beat Dashboard header */}
            <header className={`fixed top-0 left-0 right-0 border-b md:hidden z-[110] p-4 flex justify-between items-center backdrop-blur-md ${headerBg}`}>
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setCurrentPage('dashboard')}>
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                        <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className={`text-lg font-bold tracking-tight truncate leading-tight ${logoText}`}>
                            Pocket <span className="text-indigo-500">POS</span>
                        </h1>
                        {isPremium && currentOutlet && (
                            <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest truncate max-w-[120px]">
                                {currentOutlet.name}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex space-x-2 items-center">
                    {isPremium && (
                        <>
                            <OutletSelector
                                apiClient={apiClient}
                                currentUser={currentUser}
                                currentOutletId={currentOutletId}
                                onOutletSwitch={onOutletSwitch}
                                showToast={showToast}
                            />
                            <button
                                onClick={() => { setCurrentPage('outlets'); setShowStoreHub(false); }}
                                className={getButtonClasses('outlets', currentPage === 'outlets')}
                                aria-label="Manage outlets"
                            >
                                <LayoutGrid className="w-5 h-5" aria-hidden="true" />
                            </button>
                        </>
                    )}

                    <button onClick={() => setDarkMode(!darkMode)} className={getButtonClasses('theme-toggle')}>
                        {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
                    </button>

                    <button onClick={() => setCurrentPage('notifications')} className={`${getButtonClasses('notifications')} relative`}>
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full ring-2 ring-inherit bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    <button onClick={() => setCurrentPage('settings')} className={getButtonClasses('settings')}>
                        <Settings className="w-5 h-5" />
                    </button>

                    <button onClick={() => setCurrentPage('profile')} className={getButtonClasses('profile')}>
                        <User className="w-5 h-5" />
                    </button>
                </div>
            </header>


            <style jsx="true">{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes slide-in-top {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-in { animation: slide-in-top 0.3s ease-out forwards; }
            `}</style>
        </>
    );
};

export default Header;