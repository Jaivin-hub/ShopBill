import React, { useState, useEffect } from 'react';
import { 
    User, Bell, Sun, Moon, 
    CreditCard, LayoutGrid, Store, Plus, ChevronRight,
    Loader2
} from 'lucide-react';

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
    showToast,
    hasModalOpen = false
}) => {
    const [showStoreHub, setShowStoreHub] = useState(false);
    const [outlets, setOutlets] = useState([]);
    const [isLoadingOutlets, setIsLoadingOutlets] = useState(false);
    const [isSwitching, setIsSwitching] = useState(false);

    const unreadCount = (notifications || []).filter(n => n && n.isRead === false).length;
    const isPremium = currentUser?.plan === 'PREMIUM';

    const headerBg = darkMode ? 'bg-slate-950/95 border-slate-900' : 'bg-white/95 border-slate-200 shadow-sm';
    const logoText = darkMode ? 'text-white' : 'text-slate-900';
    const hubBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200';

    // Fetch outlets when Hub is opened
    useEffect(() => {
        if (showStoreHub && isPremium) {
            fetchOutlets();
        }
    }, [showStoreHub]);

    const fetchOutlets = async () => {
        setIsLoadingOutlets(true);
        try {
            const response = await apiClient.get(API.outlets);
            if (response.data.success) {
                setOutlets(response.data.data || []);
            }
        } catch (error) {
            console.error("Failed to load outlets", error);
        } finally {
            setIsLoadingOutlets(false);
        }
    };

    const handleSwitchOutlet = async (outletId, outletName) => {
        if (outletId === currentOutletId) {
            setShowStoreHub(false);
            return;
        }
        
        setIsSwitching(true);
        try {
            const response = await apiClient.put(API.switchOutlet(outletId));
            if (response.data.success) {
                showToast(`Switched to ${outletName}`, 'success');
                
                // 1. Update parent state
                if (onOutletSwitch) {
                    onOutletSwitch(response.data.data.outlet);
                }

                // 2. UI cleanup
                setShowStoreHub(false);

                // OPTIONAL: Hard reload if you want to be 100% sure all background 
                // processes and old data are cleared immediately.
                // window.location.reload(); 
            }
        } catch (error) {
            showToast('Failed to switch outlet.', 'error');
        } finally {
            setIsSwitching(false);
        }
    };

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
            <header className={`fixed top-0 left-0 right-0 border-b md:hidden z-[110] p-4 flex justify-between items-center backdrop-blur-md ${headerBg} ${hasModalOpen ? 'opacity-30 pointer-events-none' : ''} transition-opacity duration-300`}>
                {hasModalOpen && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md -z-10" />
                )}
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { setCurrentPage('dashboard'); setShowStoreHub(false); }}>
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
                        <button
                            onClick={() => setShowStoreHub(!showStoreHub)}
                            className={getButtonClasses('outlets', showStoreHub)}
                            aria-label="Toggle Store Hub"
                        >
                            <LayoutGrid className="w-5 h-5" aria-hidden="true" />
                        </button>
                    )}

                    <button onClick={() => setDarkMode(!darkMode)} className={getButtonClasses('theme-toggle')}>
                        {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
                    </button>

                    <button onClick={() => { setCurrentPage('notifications'); setShowStoreHub(false); }} className={`${getButtonClasses('notifications')} relative`}>
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full ring-2 ring-inherit bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    <button onClick={() => { setCurrentPage('profile'); setShowStoreHub(false); }} className={getButtonClasses('profile')}>
                        <User className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Expansion Panel (Store Hub) */}
            {isPremium && showStoreHub && (
                <div className={`fixed top-[73px] left-0 right-0 z-[105] border-b p-4 animate-in slide-in-from-top duration-300 ${hubBg}`}>
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black tracking-widest opacity-50 uppercase">Select Active Branch</span>
                        <button 
                            onClick={() => { setCurrentPage('outlets'); setShowStoreHub(false); }}
                            className="text-[10px] font-bold text-indigo-500 flex items-center gap-1 uppercase"
                        >
                            Manage All <ChevronRight size={12} />
                        </button>
                    </div>
                    
                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x">
                        {isLoadingOutlets ? (
                            <div className="flex items-center gap-3 px-4 py-3">
                                <Loader2 size={14} className="animate-spin text-indigo-500" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Loading Stores...</span>
                            </div>
                        ) : (
                            <>
                                {outlets.map((outlet) => {
                                    const isActive = currentOutletId === outlet._id;
                                    return (
                                        <button
                                            key={outlet._id}
                                            disabled={isSwitching}
                                            onClick={() => handleSwitchOutlet(outlet._id, outlet.name)}
                                            className={`flex-shrink-0 snap-start px-4 py-3 rounded-2xl border transition-all flex items-center gap-3 ${
                                                isActive 
                                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' 
                                                : (darkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600')
                                            } ${isSwitching ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {isSwitching && isActive ? <Loader2 size={14} className="animate-spin" /> : <Store size={14} />}
                                            <span className="text-xs font-black whitespace-nowrap uppercase tracking-tight">{outlet.name}</span>
                                        </button>
                                    );
                                })}
                                <button 
                                    onClick={() => { setCurrentPage('outlets'); setShowStoreHub(false); }}
                                    className={`flex-shrink-0 snap-start px-4 py-3 rounded-2xl border border-dashed flex items-center gap-3 ${
                                        darkMode ? 'border-slate-700 text-slate-500' : 'border-slate-300 text-slate-400'
                                    }`}
                                >
                                    <Plus size={14} />
                                    <span className="text-xs font-black whitespace-nowrap uppercase tracking-tight">Add New</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Backdrop for Hub */}
            {showStoreHub && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px]" 
                    onClick={() => setShowStoreHub(false)}
                />
            )}

            <style dangerouslySetInnerHTML={{__html: `
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes slide-in-top {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-in { animation: slide-in-top 0.3s ease-out forwards; }
            `}} />
        </>
    );
};

export default Header;