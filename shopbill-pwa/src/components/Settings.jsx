import React, { useEffect, useState } from 'react';
import { 
    User, Lock, Globe, Check, Bell, RefreshCw, Users, LogOut, MessageCircle, 
    UploadCloud, CheckCircle, Link, Mail, Crown, LifeBuoy, 
    Gift, ShieldCheck, Activity, Settings as SettingsIcon,
    ChevronRight, CreditCard, ExternalLink, ShieldAlert,
    Building2, Store, MapPin, Plus, Edit3, ArrowUpRight,
    ArrowLeft, Sun, Moon
} from 'lucide-react'; 
import SettingItem from './SettingItem';
import ToggleSwitch from './ToggleSwitch';
import API from '../config/api';
import { isChatSoundEnabled, setChatSoundEnabled, playMessageSound, unlockAudio } from '../utils/notificationSound';
import StoreControl from './StoreControl';

const PERMISSION_PAGE_LABELS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'billing', label: 'Billing' },
    { id: 'khata', label: 'Ledger' },
    { id: 'salesActivity', label: 'Sales History' },
    { id: 'inventory', label: 'Stock Management' },
    { id: 'scm', label: 'Supply Chain' },
    { id: 'reports', label: 'Reports' },
    { id: 'chat', label: 'Messages' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'profile', label: 'Profile' },
    { id: 'settings', label: 'Settings' },
    { id: 'staffPermissions', label: 'Team Management' }
    ,{ id: 'offers', label: 'Offers' }
];

const ROLE_DEFAULT_ACCESS = {
    manager: {
        dashboard: true,
        billing: true,
        khata: true,
        salesActivity: true,
        inventory: true,
        scm: true,
        reports: false,
        chat: true,
        notifications: true,
        profile: true,
        settings: true,
        staffPermissions: true
        ,offers: true
    },
    cashier: {
        dashboard: true,
        billing: true,
        khata: true,
        salesActivity: true,
        inventory: false,
        scm: false,
        reports: false,
        chat: true,
        notifications: true,
        profile: true,
        settings: false,
        staffPermissions: false
        ,offers: false
    }
};

// Temporarily disabled: role permissions page/entry points.
const ENABLE_ROLE_PERMISSIONS_UI = false;

// --- MODAL: Cloud Upload Confirmation ---
const CloudUploadConfirmationModal = ({ 
    isConnected, 
    accountEmail, 
    onSelectAndConfirm, 
    onCancel, 
    onDisconnect, 
    onConnect,
    darkMode 
}) => {
    const [connectEmail, setConnectEmail] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);

    const handleConnectClick = () => {
        setIsConnecting(true);
        setTimeout(() => {
            onConnect(connectEmail);
            setIsConnecting(false);
        }, 1200);
    };

    const modalBg = darkMode ? 'bg-gray-950 border-gray-800' : 'bg-white border-slate-300 shadow-2xl';

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
            <div className={`${modalBg} w-full max-w-sm rounded-2xl border overflow-hidden transform transition-all animate-in zoom-in-95 duration-200`}>
                <div className={`p-6 border-b flex justify-between items-center ${darkMode ? 'border-gray-800 bg-indigo-500/5' : 'border-slate-200 bg-slate-50'}`}>
                    <h2 className={`text-xs font-black  tracking-widest flex items-center ${darkMode ? 'text-white' : 'text-black'}`}>
                        <UploadCloud className="w-5 h-5 mr-3 text-indigo-500" /> Cloud Backup
                    </h2> 
                </div>
                
                <div className="p-8 space-y-6">
                    {isConnected ? (
                        <div className="space-y-4 text-center">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <ShieldCheck className="w-8 h-8 text-emerald-500" />
                            </div>
                            <div>
                                <p className={`text-[10px] font-black  tracking-widest mb-1 ${darkMode ? 'text-gray-500' : 'text-slate-600'}`}>Authenticated Account</p>
                                <p className={`text-sm font-bold tabular-nums ${darkMode ? 'text-white' : 'text-black'}`}>{accountEmail}</p>
                                <button onClick={onDisconnect} className="text-[10px] font-bold text-rose-600  tracking-widest hover:text-rose-500 mt-4 transition-colors">
                                    Change Account
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className={`text-[10px] font-black  tracking-widest ${darkMode ? 'text-gray-500' : 'text-black'}`}>Setup Connection</p>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="email"
                                    placeholder="Enter backup email"
                                    value={connectEmail}
                                    onChange={(e) => setConnectEmail(e.target.value)}
                                    className={`w-full pl-12 pr-4 py-4 border text-[16px] md:text-xs font-bold rounded-xl focus:border-indigo-500 outline-none transition-all ${darkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-slate-400 text-black'}`}
                                />
                            </div>
                        </div>
                    )}
                </div>
                
                <div className={`p-6 border-t flex flex-col gap-3 ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-slate-100 border-slate-200'}`}>
                    <button 
                        onClick={isConnected ? () => onSelectAndConfirm('google_drive') : handleConnectClick}
                        disabled={!isConnected && (!connectEmail.trim() || isConnecting)}
                        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-[10px]  tracking-[0.2em] hover:bg-indigo-500 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
                    >
                        {isConnecting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : isConnected ? <Check className="w-4 h-4 mr-2" /> : <Link className="w-4 h-4 mr-2" />}
                        {isConnecting ? 'Syncing...' : isConnected ? 'Execute Backup' : 'Link Account'}
                    </button>
                    <button onClick={onCancel} className={`w-full py-2 text-[10px] font-black  tracking-widest transition ${darkMode ? 'text-gray-500 hover:text-white' : 'text-black hover:text-indigo-600'}`}>
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- MODAL: Confirmation (Log Out / Wipe) ---
const ConfirmationModal = ({ message, onConfirm, onCancel, darkMode }) => (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
        <div className={`${darkMode ? 'bg-gray-950 border-gray-800' : 'bg-white border-slate-400'} w-full max-w-sm rounded-2xl shadow-2xl border overflow-hidden transform animate-in zoom-in-95 duration-200`}>
            <div className="p-10 text-center">
                <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <LogOut className="w-8 h-8 text-rose-500" />
                </div>
                <h2 className={`text-md font-black  tracking-widest mb-3 ${darkMode ? 'text-white' : 'text-black'}`}>Confirm Logout</h2>
                <p className={`text-[10px] font-bold leading-relaxed  tracking-tight px-4 ${darkMode ? 'text-gray-500' : 'text-slate-800'}`}>{message}</p>
            </div>
            <div className={`p-6 border-t flex gap-3 ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-slate-100 border-slate-200'}`}>
                <button onClick={onCancel} className={`flex-1 py-4 border rounded-xl font-bold text-[10px]  tracking-widest transition ${darkMode ? 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white' : 'bg-white border-slate-300 text-black hover:bg-slate-50'}`}>Stay</button>
                <button 
                    onClick={onConfirm}
                    className="flex-1 py-4 bg-rose-600 text-white rounded-xl font-bold text-[10px]  tracking-widest hover:bg-rose-500 active:scale-95 transition-all shadow-lg shadow-rose-900/20"
                >
                    Logout
                </button>
            </div>
        </div>
    </div>
);

const RolePermissionsPanel = ({ apiClient, showToast, darkMode }) => {
    const [permissions, setPermissions] = useState({
        manager: { ...ROLE_DEFAULT_ACCESS.manager },
        cashier: { ...ROLE_DEFAULT_ACCESS.cashier }
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchPermissions = async () => {
            setIsLoading(true);
            try {
                const response = await apiClient.get(API.staffRolePermissions);
                if (response.data?.permissions) {
                    setPermissions({
                        manager: { ...ROLE_DEFAULT_ACCESS.manager, ...(response.data.permissions.manager || {}) },
                        cashier: { ...ROLE_DEFAULT_ACCESS.cashier, ...(response.data.permissions.cashier || {}) }
                    });
                }
            } catch (error) {
                if (showToast) showToast(error.response?.data?.error || 'Failed to load page permissions.', 'error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchPermissions();
    }, [apiClient, showToast]);

    const togglePermission = (roleKey, pageKey) => {
        setPermissions((prev) => ({
            ...prev,
            [roleKey]: {
                ...prev[roleKey],
                [pageKey]: !prev[roleKey][pageKey]
            }
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await apiClient.put(API.staffRolePermissions, permissions);
            if (showToast) showToast('Role page permissions updated.', 'success');
        } catch (error) {
            if (showToast) showToast(error.response?.data?.error || 'Failed to save page permissions.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const cardClass = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200';
    const mutedClass = darkMode ? 'text-gray-400' : 'text-slate-500';
    const managerAccessList = PERMISSION_PAGE_LABELS
        .filter((page) => permissions.manager[page.id] === true)
        .map((page) => page.label);
    const cashierAccessList = PERMISSION_PAGE_LABELS
        .filter((page) => permissions.cashier[page.id] === true)
        .map((page) => page.label);

    return (
        <div className="max-w-5xl mx-auto space-y-4">
            <div className={`${cardClass} border rounded-2xl p-4 md:p-6`}>
                <h3 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Manager & Cashier Page Access</h3>
                <p className={`text-xs mt-1 ${mutedClass}`}>Enable or disable each app page for roles in this outlet. Unticked means blocked.</p>
            </div>
            <div className={`${cardClass} border rounded-2xl overflow-hidden`}>
                <div className={`grid grid-cols-12 px-4 py-3 border-b text-[10px] font-black tracking-widest uppercase ${darkMode ? 'border-gray-800 text-gray-400 bg-gray-950/60' : 'border-slate-200 text-slate-500 bg-slate-50'}`}>
                    <div className="col-span-6">Page</div>
                    <div className="col-span-3 text-center">Manager</div>
                    <div className="col-span-3 text-center">Cashier</div>
                </div>
                {isLoading ? (
                    <div className="p-8 text-center">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-500" />
                    </div>
                ) : (
                    PERMISSION_PAGE_LABELS.map((page) => (
                        <div key={page.id} className={`grid grid-cols-12 items-center px-4 py-3 border-b last:border-b-0 ${darkMode ? 'border-gray-800' : 'border-slate-100'}`}>
                            <div className={`col-span-6 text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{page.label}</div>
                            <div className="col-span-3 flex justify-center">
                                <input type="checkbox" checked={permissions.manager[page.id] === true} onChange={() => togglePermission('manager', page.id)} className="h-4 w-4 accent-indigo-600" />
                            </div>
                            <div className="col-span-3 flex justify-center">
                                <input type="checkbox" checked={permissions.cashier[page.id] === true} onChange={() => togglePermission('cashier', page.id)} className="h-4 w-4 accent-indigo-600" />
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className={`${cardClass} border rounded-2xl p-4 md:p-6`}>
                <h4 className={`text-xs font-black tracking-widest uppercase ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Current Access</h4>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className={`rounded-xl border p-3 ${darkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'}`}>
                        <p className={`text-[10px] font-black tracking-widest uppercase ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>Manager</p>
                        <p className={`text-[11px] mt-1 ${mutedClass}`}>
                            {managerAccessList.length > 0 ? managerAccessList.join(', ') : 'No pages allowed.'}
                        </p>
                    </div>
                    <div className={`rounded-xl border p-3 ${darkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'}`}>
                        <p className={`text-[10px] font-black tracking-widest uppercase ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>Cashier</p>
                        <p className={`text-[11px] mt-1 ${mutedClass}`}>
                            {cashierAccessList.length > 0 ? cashierAccessList.join(', ') : 'No pages allowed.'}
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isLoading || isSaving}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black tracking-widest hover:bg-indigo-500 disabled:opacity-50"
                >
                    {isSaving ? 'Saving...' : 'Save Permissions'}
                </button>
            </div>
        </div>
    );
};

function Settings({ apiClient, onLogout, showToast, setCurrentPage, setPageOrigin, darkMode, setDarkMode, currentUser, currentOutletId, onOutletSwitch }) { 
    const [currentView, setCurrentView] = useState(() => {
        const target = localStorage.getItem('settings_target_view');
        if (target) {
            localStorage.removeItem('settings_target_view'); // Clear it so it doesn't persist
            return target;
        }
        return 'main';
    }); 
    const [isNotificationEnabled, setIsNotificationEnabled] = useState(true);
    const [chatSoundEnabled, setChatSoundEnabledState] = useState(() => isChatSoundEnabled());
    const [confirmModal, setConfirmModal] = useState(null); 
    const [cloudUploadStatus, setCloudUploadStatus] = useState('idle');
    const [cloudSelectionModal, setCloudSelectionModal] = useState(null); 

    const [isCloudConnected, setIsCloudConnected] = useState(true); 
    const [connectedAccountEmail, setConnectedAccountEmail] = useState(currentUser?.email); 

    // Premium Store Data
    const [stores] = useState([
        { id: 1, name: "Main Outlet", location: "Downtown", isActive: true },
        { id: 2, name: "North Branch", location: "Suburbs", isActive: true },
    ]);

    const handleToggleNotifications = () => setIsNotificationEnabled(prev => !prev);
    const handleChangePasswordClick = () => {
        setPageOrigin('settings');
        setCurrentPage('passwordChange');
    }
    const handlePlanUpgradeClick = () => {
        setPageOrigin('settings');
        setCurrentPage('planUpgrade');
    }
    
    const handleLogout = () => {
        setConfirmModal({
            message: "This will terminate your secure session. Do you wish to proceed?",
            onConfirm: () => { setConfirmModal(null); if (onLogout) onLogout(); },
            onCancel: () => setConfirmModal(null)
        });
    };
    
    const handleDisconnectCloud = () => {
        setIsCloudConnected(false);
        setConnectedAccountEmail("");
        if (showToast) showToast('Cloud account disconnected.', 'info');
    };
    
    const handleConnectCloud = (email) => {
        setIsCloudConnected(true);
        setConnectedAccountEmail(email);
        if (showToast) showToast('Cloud account connected!', 'success');
    };
    
    const handleUploadToCloud = async (driveType) => {
        setCloudSelectionModal(null); 
        if (cloudUploadStatus === 'loading') return; 
        setCloudUploadStatus('loading');
        
        try {
            const response = await apiClient.post(API.uploadcloud || '/api/data/upload-to-cloud', { driveType });
            if (response.data.success) {
                setCloudUploadStatus('success');
                if (showToast) showToast(`Backup encrypted & uploaded`, 'success');
                setTimeout(() => setCloudUploadStatus('idle'), 3000); 
            } else {
                throw new Error(response.data.message || 'Transmission error');
            }
        } catch (error) {
            setCloudUploadStatus('error');
            if (showToast) showToast(`Sync Failed: ${error.message}`, 'error');
            setTimeout(() => setCloudUploadStatus('idle'), 5000);
        }
    };

    const sectionClass = `${darkMode ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-slate-300 shadow-md'} border rounded-xl overflow-hidden transition-all`;
    const sectionHeaderClass = `px-6 py-4 border-b flex justify-between items-center ${darkMode ? 'bg-gray-900/60 border-gray-800' : 'bg-slate-50 border-slate-200'}`;
    const sectionLabelClass = `text-[10px] font-black  tracking-[0.2em] flex items-center ${darkMode ? 'text-gray-500' : 'text-black'}`;

    const renderSettingsList = () => (
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
            {/* 1. Account Management Section */}
            <section className={sectionClass}>
                <div className={sectionHeaderClass}>
                    <h2 className={sectionLabelClass}>
                        <User className="w-4 h-4 mr-3 text-indigo-500" /> Account Security
                    </h2>
                    <span className="text-[8px] font-black px-2 py-0.5 bg-indigo-600 text-white rounded border border-indigo-700  tracking-widest">Admin</span>
                </div>
                <div className="p-2">
                    {currentUser?.role?.toLowerCase() === 'owner' && (
                        <>
                            {/* NEW: Outlet Management Item (Premium only) */}
                            {currentUser?.plan === 'PREMIUM' && (
                                <SettingItem 
                                    icon={Store} 
                                    title="Outlet Management" 
                                    description="Manage multiple store locations." 
                                    onClick={() => { setPageOrigin('settings'); setCurrentPage('outlets'); }} 
                                    accentColor="text-indigo-500"
                                    darkMode={darkMode}
                                />
                            )}
                            {/* Subscription & Plan Upgrade */}
                            <SettingItem 
                                icon={CreditCard} 
                                title="Subscription & Billing" 
                                description="Upgrade your plan or manage subscription and invoices." 
                                onClick={handlePlanUpgradeClick} 
                                actionComponent={
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePlanUpgradeClick();
                                        }}
                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all hover:scale-105 active:scale-95 ${darkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                    >
                                        Upgrade Now
                                    </button>
                                }
                                accentColor="text-amber-600"
                                darkMode={darkMode}
                            />
                            {ENABLE_ROLE_PERMISSIONS_UI && (
                                <SettingItem
                                    icon={ShieldCheck}
                                    title="Page Access Control"
                                    description="Choose which pages Managers and Cashiers can access."
                                    onClick={() => setCurrentView('rolePermissions')}
                                    accentColor="text-indigo-500"
                                    darkMode={darkMode}
                                />
                            )}
                        </>
                    )}
                    <SettingItem 
                        icon={Lock} 
                        title="Change Password" 
                        description="Rotate terminal login password." 
                        onClick={handleChangePasswordClick} 
                        accentColor="text-rose-600"
                        darkMode={darkMode}
                    />
                    <SettingItem 
                        icon={LogOut} 
                        title="Logout" 
                        description="Safe termination of session." 
                        onClick={handleLogout} 
                        accentColor="text-rose-700" 
                        darkMode={darkMode}
                    />
                </div>
            </section>
            
            <div className="space-y-6">
                {/* 2. Preferences Section */}
                <section className={sectionClass}>
                    <div className={sectionHeaderClass}>
                        <h2 className={sectionLabelClass}>
                            <Globe className="w-4 h-4 mr-3 text-emerald-600" /> System Preferences
                        </h2>
                    </div>
                    <div className="p-2">
                        <SettingItem 
                            icon={Bell} 
                            title="Notifications" 
                            description="Real-time toast notifications." 
                            actionComponent={<ToggleSwitch checked={isNotificationEnabled} onChange={handleToggleNotifications} darkMode={darkMode} />} 
                            accentColor="text-sky-600" 
                            darkMode={darkMode}
                        />
                        {(currentUser?.plan === 'PRO' || currentUser?.plan === 'PREMIUM') && (
                            <SettingItem 
                                icon={MessageCircle} 
                                title="Chat message sound" 
                                description="Play sound when new message arrives. Tap Test to unlock audio on mobile." 
                                actionComponent={
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => { unlockAudio(); setChatSoundEnabled(true); setChatSoundEnabledState(true); playMessageSound(); }}
                                            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold ${darkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white'} hover:opacity-90 active:scale-95 transition-all`}
                                        >
                                            Test
                                        </button>
                                        <ToggleSwitch checked={chatSoundEnabled} onChange={() => { const next = !chatSoundEnabled; setChatSoundEnabled(next); setChatSoundEnabledState(next); }} darkMode={darkMode} />
                                    </div>
                                } 
                                accentColor="text-indigo-500" 
                                darkMode={darkMode}
                            />
                        )}
                        <SettingItem 
                            icon={darkMode ? Sun : Moon} 
                            title="Theme" 
                            description={darkMode ? "Switch to light mode" : "Switch to dark mode"} 
                            actionComponent={<ToggleSwitch checked={darkMode} onChange={() => setDarkMode(!darkMode)} darkMode={darkMode} />} 
                            accentColor={darkMode ? "text-amber-500" : "text-indigo-500"} 
                            darkMode={darkMode}
                        />
                    </div>
                </section>

                {/* 3. Support & Growth Section */}
                <section className={sectionClass}>
                    <div className={sectionHeaderClass}>
                        <h2 className={sectionLabelClass}>
                            <LifeBuoy className="w-4 h-4 mr-3 text-purple-600" /> Infrastructure
                        </h2>
                    </div>
                    <div className="p-2">
                        <SettingItem 
                            icon={LifeBuoy} 
                            title="Help & Support" 
                            description="Documentation and tech support." 
                            onClick={() => { setPageOrigin('settings'); setCurrentPage('support'); }} 
                            accentColor="text-indigo-600" 
                            darkMode={darkMode}
                        />
                        <SettingItem 
                            icon={Gift} 
                            title="Partner Rewards" 
                            description="Affiliate status and commission data." 
                            onClick={() => { setPageOrigin('settings'); setCurrentPage('affiliate'); }} 
                            accentColor="text-emerald-600" 
                            darkMode={darkMode}
                        />
                    </div>
                </section>
            </div>
        </main>
    );

    const renderContent = () => {
        switch (currentView) {
            case 'storeControl':
                return <StoreControl 
                    darkMode={darkMode} 
                    apiClient={apiClient}
                    showToast={showToast} 
                    currentUser={currentUser}
                    onOutletSwitch={onOutletSwitch}
                    currentOutletId={currentOutletId}
                />;
            case 'rolePermissions':
                if (!ENABLE_ROLE_PERMISSIONS_UI || currentUser?.role?.toLowerCase() !== 'owner') return renderSettingsList();
                return <RolePermissionsPanel apiClient={apiClient} showToast={showToast} darkMode={darkMode} />;
            case 'main':
            default:
                return renderSettingsList();
        }
    };

    const headerBase = darkMode ? 'bg-gray-950/90 border-gray-800' : 'bg-white/95 border-slate-300 shadow-sm';

    return (
        <div className={`h-full flex flex-col min-h-0 transition-colors duration-300 ${darkMode ? 'bg-gray-950 text-gray-200' : 'bg-slate-100 text-black'} selection:bg-indigo-500/30`}>
            {/* STICKY HEADER */}
            <header className={`sticky top-0 z-[100] shrink-0 ${headerBase} backdrop-blur-md border-b px-6 py-6 ${darkMode ? 'bg-gray-950/95' : 'bg-white/95'}`}>
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {currentView !== 'main' && (
                            <button 
                                onClick={() => setCurrentView('main')}
                                className={`p-2 rounded-xl transition-all ${darkMode ? 'hover:bg-gray-900 text-gray-400' : 'hover:bg-slate-100 text-slate-600'}`}
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <div>
                            <h1 className={`text-2xl font-black tracking-tight leading-none ${darkMode ? 'text-white' : 'text-black'}`}>
                                {currentView === 'storeControl' ? 'Store' : currentView === 'rolePermissions' ? 'Page' : 'Control'} <span className="text-indigo-600">{currentView === 'storeControl' ? 'Management' : currentView === 'rolePermissions' ? 'Permissions' : 'Center'}</span>
                            </h1>
                            <p className={`text-[9px] font-bold  tracking-[0.25em] mt-1.5 flex items-center gap-1.5 ${darkMode ? 'text-gray-500' : 'text-slate-800'}`}>
                                {currentView === 'storeControl' ? 'ACTIVE NODES: ' + stores.length : currentView === 'rolePermissions' ? 'Role Access Configuration' : 'System Governance Active'}
                            </p>
                        </div>
                    </div>

                    {cloudUploadStatus === 'loading' && (
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full animate-pulse ${darkMode ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-100 border-indigo-200'}`}>
                            <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
                            <span className="text-[9px] font-black text-indigo-600  tracking-widest">Encrypting...</span>
                        </div>
                    )}
                </div>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div className="max-w-7xl mx-auto p-4 md:p-10 pb-32">
                {renderContent()}
            </div>
            </div>
            
            {confirmModal && (
                <ConfirmationModal 
                    message={confirmModal.message}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={confirmModal.onCancel}
                    darkMode={darkMode}
                />
            )}

            {cloudSelectionModal && (
                <CloudUploadConfirmationModal 
                    isConnected={isCloudConnected}
                    accountEmail={connectedAccountEmail}
                    onSelectAndConfirm={handleUploadToCloud}
                    onDisconnect={handleDisconnectCloud}
                    onConnect={handleConnectCloud}
                    onCancel={() => setCloudSelectionModal(null)}
                    darkMode={darkMode}
                />
            )}
        </div>
    );
}

export default Settings;