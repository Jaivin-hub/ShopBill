import React, { useState, useEffect, useRef } from 'react';
import { 
    User, Bell, Sun, Moon, 
    CreditCard, LayoutGrid, Store, Plus, ChevronRight,
    Loader2, Settings
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
    hasModalOpen = false,
    outlets = [] // Receive outlets from parent to avoid duplicate fetching
}) => {
    const [showStoreHub, setShowStoreHub] = useState(false);
    const [isSwitching, setIsSwitching] = useState(false);
    const [switchingOutletId, setSwitchingOutletId] = useState(null);
    const [isLoadingOutlets, setIsLoadingOutlets] = useState(false);
    const [localOutlets, setLocalOutlets] = useState(outlets || []);
    const [businessName, setBusinessName] = useState(currentUser?.shopName || '');
    const hasFetchedRef = useRef(false);
    const hasFetchedBusinessNameRef = useRef(false);
    const lastUserIdRef = useRef(null);

    const unreadCount = (notifications || []).filter(n => n && n.isRead === false).length;
    const isPremium = currentUser?.plan === 'PREMIUM';
    const isOwner = userRole?.toLowerCase() === 'owner';

    // Sync local outlets with prop (always update when prop changes)
    useEffect(() => {
        if (outlets && Array.isArray(outlets)) {
            setLocalOutlets(outlets);
            // Reset fetch flag when outlets are provided from parent
            if (outlets.length > 0) {
                hasFetchedRef.current = true;
            }
        }
    }, [outlets]);

    // Fetch outlets when dropdown opens if they're empty
    useEffect(() => {
        if (showStoreHub && isPremium && isOwner && apiClient && API) {
            // Only fetch if outlets are empty and we haven't fetched yet
            if (localOutlets.length === 0 && !isLoadingOutlets && !hasFetchedRef.current) {
                hasFetchedRef.current = true;
                fetchOutletsInHeader();
            }
        } else if (!showStoreHub) {
            // Reset fetch flag when dropdown closes so we can fetch again if needed
            hasFetchedRef.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showStoreHub, isPremium, isOwner, apiClient, API]);

    const fetchOutletsInHeader = async () => {
        if (!apiClient || !API) return;
        setIsLoadingOutlets(true);
        try {
            const response = await apiClient.get(API.outlets);
            if (response.data?.success && Array.isArray(response.data.data)) {
                setLocalOutlets(response.data.data);
            }
        } catch (error) {
            if (error.cancelled || error.message?.includes('cancelled')) {
                return;
            }
            console.error('Failed to fetch outlets in Header:', error);
        } finally {
            setIsLoadingOutlets(false);
        }
    };

    const headerBg = darkMode ? 'bg-slate-950/95 border-slate-900' : 'bg-white/95 border-slate-200 shadow-sm';
    const logoText = darkMode ? 'text-white' : 'text-slate-900';
    const hubBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200';

    // Fetch business name (shopName) from profile if not available in currentUser
    useEffect(() => {
        if (!currentUser || !apiClient || !API) return;
        
        // Reset fetch flag if user changed
        const currentUserId = currentUser.id || currentUser._id;
        if (lastUserIdRef.current !== currentUserId) {
            hasFetchedBusinessNameRef.current = false;
            lastUserIdRef.current = currentUserId;
        }
        
        // If shopName is already in currentUser, use it immediately
        if (currentUser.shopName) {
            setBusinessName(currentUser.shopName);
            hasFetchedBusinessNameRef.current = true;
            return;
        }
        
        // Otherwise, fetch from profile API (only once per user)
        if (!hasFetchedBusinessNameRef.current) {
            hasFetchedBusinessNameRef.current = true;
            const fetchBusinessName = async () => {
                try {
                    const response = await apiClient.get(API.profile);
                    const data = response.data.user || response.data.data || response.data;
                    if (data.shopName) {
                        setBusinessName(data.shopName);
                    }
                } catch (error) {
                    if (error.cancelled || error.message?.includes('cancelled')) {
                        return; // Ignore cancellation
                    }
                    console.error('Failed to fetch business name in Header:', error);
                    hasFetchedBusinessNameRef.current = false; // Reset on error to allow retry
                }
            };
            fetchBusinessName();
        }
    }, [currentUser, apiClient, API]);

    // Update business name when currentUser.shopName changes (e.g., after profile update)
    useEffect(() => {
        if (currentUser?.shopName && currentUser.shopName !== businessName) {
            setBusinessName(currentUser.shopName);
        }
    }, [currentUser?.shopName, businessName]);

    // Fetch outlet if we have ID but not the outlet object (only if not in outlets list)
    useEffect(() => {
        if (isPremium && isOwner && currentOutletId && !currentOutlet && apiClient && API) {
            // First check if outlet is in the outlets list from parent
            const outletInList = outlets.find(o => o._id === currentOutletId);
            if (outletInList) {
                onOutletSwitch(outletInList);
                return;
            }
            
            // Only fetch individually if not in list
            const fetchOutlet = async () => {
                try {
                    const response = await apiClient.get(API.outletDetails(currentOutletId));
                    if (response.data?.success && response.data.data) {
                        onOutletSwitch(response.data.data);
                    }
                } catch (error) {
                    if (error.cancelled || error.message?.includes('cancelled')) {
                        return; // Ignore cancellation
                    }
                    console.error('Failed to fetch outlet in Header:', error);
                }
            };
            fetchOutlet();
        }
    }, [isPremium, isOwner, currentOutletId, currentOutlet, apiClient, API, onOutletSwitch, outlets]);

    const handleSwitchOutlet = async (outletId, outletName) => {
        if (outletId === currentOutletId) {
            setShowStoreHub(false);
            return;
        }
        
        setIsSwitching(true);
        setSwitchingOutletId(outletId); // Track which outlet is being switched to
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
            setSwitchingOutletId(null); // Clear switching outlet ID
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
                        {businessName && (
                            <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest truncate max-w-[120px]">
                                {businessName}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex space-x-2 items-center">
                    {isPremium && isOwner && (
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
                            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full ring-2 ring-inherit bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                                {unreadCount > 99 ? '99+' : unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Settings button for managers and cashiers - after notifications */}
                    {!isOwner && (
                        <button 
                            onClick={() => { setCurrentPage('settings'); setShowStoreHub(false); }} 
                            className={getButtonClasses('settings')}
                            aria-label="Settings"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                    )}

                    <button onClick={() => { setCurrentPage('profile'); setShowStoreHub(false); }} className={getButtonClasses('profile')}>
                        <User className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Expansion Panel (Store Hub) */}
            {isPremium && isOwner && showStoreHub && (
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
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Loading stores...</span>
                            </div>
                        ) : localOutlets.length === 0 ? (
                            <div className="flex items-center gap-3 px-4 py-3">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">No stores available</span>
                            </div>
                        ) : (
                            <>
                                {localOutlets.map((outlet) => {
                                    const isActive = currentOutletId === outlet._id;
                                    const isSwitchingToThis = switchingOutletId === outlet._id;
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
                                            {isSwitchingToThis ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <Store size={14} />
                                            )}
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