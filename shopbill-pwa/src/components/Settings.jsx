import React, { useState } from 'react';
import { 
    User, Lock, Globe, Check, Bell, RefreshCw, Users, LogOut, 
    UploadCloud, CheckCircle, Link, Mail, Crown, LifeBuoy, 
    Gift, ShieldCheck, Activity, Settings as SettingsIcon,
    ChevronRight, CreditCard, ExternalLink, ShieldAlert
} from 'lucide-react'; 
import SettingItem from './SettingItem';
import ToggleSwitch from './ToggleSwitch';
import StaffPermissionsManager from './StaffPermissionsManager';
import ChangePasswordForm from './ChangePasswordForm';
import PlanUpgrade from './PlanUpgrade';
import API from '../config/api';

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
                    <h2 className={`text-xs font-black uppercase tracking-widest flex items-center ${darkMode ? 'text-white' : 'text-black'}`}>
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
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${darkMode ? 'text-gray-500' : 'text-slate-600'}`}>Authenticated Account</p>
                                <p className={`text-sm font-bold tabular-nums ${darkMode ? 'text-white' : 'text-black'}`}>{accountEmail}</p>
                                <button onClick={onDisconnect} className="text-[10px] font-bold text-rose-600 uppercase tracking-widest hover:text-rose-500 mt-4 transition-colors">
                                    Change Account
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-black'}`}>Setup Connection</p>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="email"
                                    placeholder="Enter backup email"
                                    value={connectEmail}
                                    onChange={(e) => setConnectEmail(e.target.value)}
                                    className={`w-full pl-12 pr-4 py-4 border text-xs font-bold rounded-xl focus:border-indigo-500 outline-none transition-all ${darkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-slate-400 text-black'}`}
                                />
                            </div>
                        </div>
                    )}
                </div>
                
                <div className={`p-6 border-t flex flex-col gap-3 ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-slate-100 border-slate-200'}`}>
                    <button 
                        onClick={isConnected ? () => onSelectAndConfirm('google_drive') : handleConnectClick}
                        disabled={!isConnected && (!connectEmail.trim() || isConnecting)}
                        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-500 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
                    >
                        {isConnecting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : isConnected ? <Check className="w-4 h-4 mr-2" /> : <Link className="w-4 h-4 mr-2" />}
                        {isConnecting ? 'Syncing...' : isConnected ? 'Execute Backup' : 'Link Account'}
                    </button>
                    <button onClick={onCancel} className={`w-full py-2 text-[10px] font-black uppercase tracking-widest transition ${darkMode ? 'text-gray-500 hover:text-white' : 'text-black hover:text-indigo-600'}`}>
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
                <h2 className={`text-md font-black uppercase tracking-widest mb-3 ${darkMode ? 'text-white' : 'text-black'}`}>Authorize Logout</h2>
                <p className={`text-[10px] font-bold leading-relaxed uppercase tracking-tight px-4 ${darkMode ? 'text-gray-500' : 'text-slate-800'}`}>{message}</p>
            </div>
            <div className={`p-6 border-t flex gap-3 ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-slate-100 border-slate-200'}`}>
                <button onClick={onCancel} className={`flex-1 py-4 border rounded-xl font-bold text-[10px] uppercase tracking-widest transition ${darkMode ? 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white' : 'bg-white border-slate-300 text-black hover:bg-slate-50'}`}>Stay</button>
                <button 
                    onClick={onConfirm}
                    className="flex-1 py-4 bg-rose-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-rose-500 active:scale-95 transition-all shadow-lg shadow-rose-900/20"
                >
                    Logout
                </button>
            </div>
        </div>
    </div>
);

function Settings({ apiClient, onLogout, showToast, setCurrentPage, setPageOrigin, darkMode }) { 
    const [currentView, setCurrentView] = useState('main'); 
    const [isNotificationEnabled, setIsNotificationEnabled] = useState(true);
    const [confirmModal, setConfirmModal] = useState(null); 
    const [cloudUploadStatus, setCloudUploadStatus] = useState('idle');
    const [cloudSelectionModal, setCloudSelectionModal] = useState(null); 

    const [isCloudConnected, setIsCloudConnected] = useState(true); 
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const [connectedAccountEmail, setConnectedAccountEmail] = useState(currentUser?.email); 

    const handleToggleNotifications = () => setIsNotificationEnabled(prev => !prev);
    const handleStaffPermissionsClick = () => setCurrentView('staff');
    const handleChangePasswordClick = () => setCurrentView('password');
    const handlePlanUpgradeClick = () => setCurrentView('plan');
    
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
    const sectionLabelClass = `text-[10px] font-black uppercase tracking-[0.2em] flex items-center ${darkMode ? 'text-gray-500' : 'text-black'}`;

    const renderSettingsList = () => (
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
            {/* 1. Account Management Section */}
            <section className={sectionClass}>
                <div className={sectionHeaderClass}>
                    <h2 className={sectionLabelClass}>
                        <User className="w-4 h-4 mr-3 text-indigo-500" /> Account Security
                    </h2>
                    <span className="text-[8px] font-black px-2 py-0.5 bg-indigo-600 text-white rounded border border-indigo-700 uppercase tracking-widest">Admin</span>
                </div>
                <div className="p-2">
                    {currentUser?.role?.toLowerCase() === 'owner' && (
                        <>
                            <SettingItem 
                                icon={CreditCard} 
                                title="Subscription & Billing" 
                                description="Manage enterprise plan and invoices." 
                                onClick={handlePlanUpgradeClick} 
                                accentColor="text-amber-600"
                                darkMode={darkMode}
                            />
                            <SettingItem 
                                icon={Users} 
                                title="Terminal Operators" 
                                description="Manage staff roles and access levels." 
                                onClick={handleStaffPermissionsClick} 
                                accentColor="text-indigo-600" 
                                darkMode={darkMode}
                            />
                        </>
                    )}
                    <SettingItem 
                        icon={Lock} 
                        title="Security Credentials" 
                        description="Rotate terminal login password." 
                        onClick={handleChangePasswordClick} 
                        accentColor="text-rose-600"
                        darkMode={darkMode}
                    />
                    <SettingItem 
                        icon={LogOut} 
                        title="Authorize Logout" 
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
                            title="Visual Alerts" 
                            description="Real-time toast notifications." 
                            actionComponent={<ToggleSwitch checked={isNotificationEnabled} onChange={handleToggleNotifications} darkMode={darkMode} />} 
                            accentColor="text-sky-600" 
                            darkMode={darkMode}
                        />
                        <SettingItem 
                            icon={UploadCloud} 
                            title="Database Mirroring" 
                            description="Encrypt and sync to cloud storage." 
                            onClick={() => setCloudSelectionModal(true)}
                            accentColor="text-indigo-600" 
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
                            title="Help Terminal" 
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
            case 'password':
                return <ChangePasswordForm apiClient={apiClient} onLogout={onLogout} onBack={() => setCurrentView('main')} darkMode={darkMode} />;
            case 'staff':
                return <StaffPermissionsManager onBack={() => setCurrentView('main')} apiClient={apiClient} setConfirmModal={setConfirmModal} darkMode={darkMode} />;
            case 'plan':
                return <PlanUpgrade apiClient={apiClient} showToast={showToast} currentUser={currentUser} onBack={() => setCurrentView('main')} darkMode={darkMode} />;
            case 'main':
            default:
                return renderSettingsList();
        }
    };

    const headerBase = darkMode ? 'bg-gray-950/90 border-gray-800' : 'bg-white/95 border-slate-300 shadow-sm';

    return (
        <main className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-950 text-gray-200' : 'bg-slate-100 text-black'} selection:bg-indigo-500/30`}>
            {/* STICKY HEADER PARTNER */}
            {currentView === 'main' && (
            <header className={`sticky top-0 z-[100] ${headerBase} backdrop-blur-md border-b px-6 py-6`}>
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className={`text-lg font-black tracking-tight uppercase leading-none ${darkMode ? 'text-white' : 'text-black'}`}>
                                Control <span className="text-indigo-600">Center</span>
                            </h1>
                            <p className={`text-[9px] font-bold uppercase tracking-[0.25em] mt-1.5 flex items-center gap-1.5 ${darkMode ? 'text-gray-500' : 'text-slate-800'}`}>
                                System Governance Active
                            </p>
                        </div>
                    </div>

                    {cloudUploadStatus === 'loading' && (
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full animate-pulse ${darkMode ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-100 border-indigo-200'}`}>
                            <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Encrypting...</span>
                        </div>
                    )}
                </div>
            </header>
            )}

            <div className="max-w-7xl mx-auto p-6 md:p-10 pb-32">
                {renderContent()}
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
        </main>
    );
}

export default Settings;