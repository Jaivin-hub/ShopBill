import React, { useState } from 'react';
import { 
    User, Lock, Globe, Check, Bell, RefreshCw, Users, LogOut, 
    UploadCloud, CheckCircle, Link, Mail, Crown, LifeBuoy, 
    Gift, ShieldCheck, Activity, Settings as SettingsIcon,
    ChevronRight, CreditCard, ExternalLink
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
    onConnect 
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

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
            <div className="bg-gray-950 w-full max-w-sm rounded-3xl shadow-2xl border border-gray-800 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-indigo-500/5">
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center">
                        <UploadCloud className="w-5 h-5 mr-3 text-indigo-500" /> Cloud Backup
                    </h2> 
                </div>
                
                <div className="p-8 space-y-6">
                    {isConnected ? (
                        <div className="space-y-4 text-center">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <ShieldCheck className="w-8 h-8 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Authenticated Account</p>
                                <p className="text-sm font-bold text-white tabular-nums">{accountEmail}</p>
                                <button onClick={onDisconnect} className="text-[10px] font-bold text-rose-500 uppercase tracking-widest hover:text-rose-400 mt-4 transition-colors">
                                    Change Account
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Setup Connection</p>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="email"
                                    placeholder="Enter backup email"
                                    value={connectEmail}
                                    onChange={(e) => setConnectEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-900 border border-gray-800 text-white text-xs font-bold rounded-2xl focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="p-6 bg-gray-900/50 border-t border-gray-800 flex flex-col gap-3">
                    <button 
                        onClick={isConnected ? () => onSelectAndConfirm('google_drive') : handleConnectClick}
                        disabled={!isConnected && (!connectEmail.trim() || isConnecting)}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-500 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
                    >
                        {isConnecting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : isConnected ? <Check className="w-4 h-4 mr-2" /> : <Link className="w-4 h-4 mr-2" />}
                        {isConnecting ? 'Syncing...' : isConnected ? 'Execute Backup' : 'Link Account'}
                    </button>
                    <button onClick={onCancel} className="w-full py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-white transition">
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- MODAL: Confirmation (Log Out / Wipe) ---
const ConfirmationModal = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
        <div className="bg-gray-950 w-full max-w-sm rounded-3xl shadow-2xl border border-gray-800 overflow-hidden transform animate-in zoom-in-95 duration-200">
            <div className="p-10 text-center">
                <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <LogOut className="w-10 h-10 text-rose-500" />
                </div>
                <h2 className="text-lg font-bold text-white uppercase tracking-widest mb-3">Authorize Logout</h2>
                <p className="text-xs font-medium text-gray-500 leading-relaxed uppercase tracking-tight px-4">{message}</p>
            </div>
            <div className="p-6 bg-gray-900/50 border-t border-gray-800 flex gap-4">
                <button onClick={onCancel} className="flex-1 py-4 bg-gray-900 border border-gray-800 text-gray-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:text-white transition">Stay</button>
                <button 
                    onClick={onConfirm}
                    className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-rose-500 active:scale-95 transition-all shadow-lg shadow-rose-900/20"
                >
                    Logout
                </button>
            </div>
        </div>
    </div>
);

function Settings({ apiClient, onLogout, showToast, setCurrentPage, setPageOrigin }) { 
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

    const renderSettingsList = () => (
        <main className="space-y-6 max-w-5xl mx-auto">
            {/* 1. Account Management Section */}
            <section className="bg-gray-900/40 border border-gray-800 rounded-3xl overflow-hidden transition-all hover:border-gray-700/50">
                <div className="px-6 py-5 bg-gray-900/60 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500 flex items-center">
                        <User className="w-4 h-4 mr-3 text-indigo-500" /> Account Security
                    </h2>
                    <span className="text-[8px] font-bold px-2 py-0.5 bg-indigo-500/10 text-indigo-500 rounded border border-indigo-500/20 uppercase">Admin Access</span>
                </div>
                <div className="p-3">
                    {currentUser?.role?.toLowerCase() === 'owner' && (
                        <>
                            <SettingItem 
                                icon={CreditCard} 
                                title="Subscription & Billing" 
                                description="Manage your enterprise plan and invoices." 
                                onClick={handlePlanUpgradeClick} 
                                accentColor="text-amber-500"
                            />
                            <SettingItem 
                                icon={Users} 
                                title="Terminal Operators" 
                                description="Manage staff roles and access levels." 
                                onClick={handleStaffPermissionsClick} 
                                accentColor="text-indigo-400" 
                            />
                        </>
                    )}
                    <SettingItem 
                        icon={Lock} 
                        title="Security Credentials" 
                        description="Rotate your terminal login password." 
                        onClick={handleChangePasswordClick} 
                        accentColor="text-rose-400"
                    />
                    <SettingItem 
                        icon={LogOut} 
                        title="Authorize Logout" 
                        description="Safe termination of active session." 
                        onClick={handleLogout} 
                        accentColor="text-rose-500" 
                    />
                </div>
            </section>
            
            {/* 2. Preferences Section */}
            <section className="bg-gray-900/40 border border-gray-800 rounded-3xl overflow-hidden transition-all hover:border-gray-700/50">
                <div className="px-6 py-5 bg-gray-900/60 border-b border-gray-800">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500 flex items-center">
                        <Globe className="w-4 h-4 mr-3 text-emerald-500" /> System Preferences
                    </h2>
                </div>
                <div className="p-3">
                    <SettingItem 
                        icon={Bell} 
                        title="Visual Alerts" 
                        description="Real-time toast notifications for system events." 
                        actionComponent={<ToggleSwitch checked={isNotificationEnabled} onChange={handleToggleNotifications} />} 
                        accentColor="text-sky-400" 
                    />
                    <SettingItem 
                        icon={UploadCloud} 
                        title="Database Mirroring" 
                        description="Encrypt and sync database to cloud storage." 
                        onClick={() => setCloudSelectionModal(true)}
                        accentColor="text-indigo-500" 
                    />
                </div>
            </section>

            {/* 3. Support & Growth Section */}
            <section className="bg-gray-900/40 border border-gray-800 rounded-3xl overflow-hidden transition-all hover:border-gray-700/50">
                <div className="px-6 py-5 bg-gray-900/60 border-b border-gray-800">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500 flex items-center">
                        <LifeBuoy className="w-4 h-4 mr-3 text-purple-500" /> Infrastructure
                    </h2>
                </div>
                <div className="p-3">
                    <SettingItem 
                        icon={LifeBuoy} 
                        title="Help Terminal" 
                        description="Documentation, FAQ, and technical support." 
                        onClick={() => { setPageOrigin('settings'); setCurrentPage('support'); }} 
                        accentColor="text-indigo-400" 
                    />
                    <SettingItem 
                        icon={Gift} 
                        title="Partner Rewards" 
                        description="View affiliate status and commission data." 
                        onClick={() => { setPageOrigin('settings'); setCurrentPage('affiliate'); }} 
                        accentColor="text-emerald-500" 
                    />
                </div>
            </section>
        </main>
    );

    const renderContent = () => {
        switch (currentView) {
            case 'password':
                return <ChangePasswordForm apiClient={apiClient} onLogout={onLogout} onBack={() => setCurrentView('main')} />;
            case 'staff':
                return <StaffPermissionsManager onBack={() => setCurrentView('main')} apiClient={apiClient} setConfirmModal={setConfirmModal} />;
            case 'plan':
                return <PlanUpgrade apiClient={apiClient} showToast={showToast} currentUser={currentUser} onBack={() => setCurrentView('main')} />;
            case 'main':
            default:
                return renderSettingsList();
        }
    };

    return (
        <main className="min-h-screen bg-gray-950 text-gray-200 selection:bg-indigo-500/30 font-sans">
            {/* STICKY HEADER PARTNER */}
            {currentView === 'main' && (
            <header className="sticky top-0 z-[100] bg-gray-950/90 backdrop-blur-md border-b border-gray-800/60 px-6 py-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-white uppercase leading-none">
                                Control <span className="text-indigo-500">Center</span>
                            </h1>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.25em] mt-1.5 flex items-center gap-1.5">
                                System Governance Active
                            </p>
                        </div>
                    </div>

                    {cloudUploadStatus === 'loading' && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Encrypting...</span>
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
                />
            )}
        </main>
    );
}

export default Settings;