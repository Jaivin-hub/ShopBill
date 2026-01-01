import React, { useState } from 'react';
import { 
    User, Lock, Globe, Check, Bell, RefreshCw, Users, LogOut, 
    UploadCloud, CheckCircle, XCircle, Link, Mail, Crown, LifeBuoy, Gift
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
        }, 1500);
    };

    return (
        <div 
            role="dialog" 
            aria-modal="true" 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity"
        >
            <div className="bg-gray-900 w-full max-w-sm rounded-xl shadow-2xl border border-gray-800 transform transition-transform duration-300">
                <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-indigo-950/40 rounded-t-xl">
                    <h2 className="text-xl font-bold text-indigo-400 flex items-center">
                        <UploadCloud className="w-5 h-5 mr-2" aria-hidden="true" /> Cloud Backup
                    </h2> 
                </div>
                
                <div className="p-5 space-y-4">
                    {isConnected ? (
                        <>
                            <p className="text-gray-300 font-semibold">
                                Confirm to start the data backup process to your linked cloud account.
                            </p>
                            <div className="p-3 bg-gray-950 rounded-lg border border-gray-800">
                                <p className="font-semibold text-white flex items-center">
                                    <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" /> Connected Account:
                                </p>
                                <p className="text-sm text-gray-400 font-bold mt-1 break-all">{accountEmail}</p>
                                <button 
                                    onClick={onDisconnect} 
                                    className="mt-2 text-red-400 text-sm hover:underline font-bold"
                                >
                                    Disconnect Account
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-gray-300 font-semibold">
                                Cloud account is currently <strong className="text-red-400">disconnected</strong>.
                            </p>
                            <div className="p-3 bg-gray-950 rounded-lg border border-gray-800 space-y-3">
                                <p className="font-semibold text-white flex items-center">
                                    <XCircle className="w-4 h-4 mr-2 text-red-500" /> Status: Disconnected
                                </p>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="email"
                                        placeholder="Enter account email"
                                        value={connectEmail}
                                        onChange={(e) => setConnectEmail(e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                                        disabled={isConnecting}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
                
                <div className="p-5 border-t border-gray-800 flex justify-end space-x-3 bg-gray-900/50 rounded-b-xl">
                    <button 
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-400 hover:text-white transition"
                        disabled={isConnecting}
                    >
                        Cancel
                    </button>
                    {isConnected ? (
                        <button 
                            onClick={() => onSelectAndConfirm('google_drive')}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
                        >
                            Confirm & Upload
                        </button>
                    ) : (
                        <button 
                            onClick={handleConnectClick}
                            disabled={!connectEmail.trim() || isConnecting}
                            className={`px-4 py-2 text-white rounded-lg font-bold transition-all active:scale-95 flex items-center ${
                                connectEmail.trim() && !isConnecting ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-800 text-gray-600'
                            }`}
                        >
                            {isConnecting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Link className="w-4 h-4 mr-2" />}
                            {isConnecting ? 'Connecting...' : 'Connect Account'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- MODAL: Confirmation (Log Out / Wipe) ---
const ConfirmationModal = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 w-full max-w-sm rounded-xl shadow-2xl border border-gray-800 transform transition-all duration-300">
            <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-red-950/30 rounded-t-xl">
                <h2 className="text-xl font-bold text-red-400 flex items-center">
                    <LogOut className="w-5 h-5 mr-2" /> Confirm Action
                </h2> 
            </div>
            <div className="p-5">
                <p className="text-gray-300 leading-relaxed">{message}</p>
            </div>
            <div className="p-5 border-t border-gray-800 flex justify-end space-x-3 bg-gray-950/50 rounded-b-xl">
                <button onClick={onCancel} className="px-4 py-2 text-gray-400 hover:text-white transition">Cancel</button>
                <button 
                    onClick={onConfirm}
                    className={`px-6 py-2 text-white font-bold rounded-lg shadow-lg transition-all active:scale-95 ${
                         message.includes('clear') ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                >
                    {message.includes('clear') ? 'Confirm Wipe' : 'Confirm'}
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
    const [syncStatus, setSyncStatus] = useState('idle');

    const [isCloudConnected, setIsCloudConnected] = useState(true); 
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const [connectedAccountEmail, setConnectedAccountEmail] = useState(currentUser?.email); 

    const handleToggleNotifications = () => setIsNotificationEnabled(prev => !prev);
    const handleStaffPermissionsClick = () => setCurrentView('staff');
    const handleChangePasswordClick = () => setCurrentView('password');
    const handlePlanUpgradeClick = () => setCurrentView('plan');
    
    const handleLogout = () => {
        setConfirmModal({
            message: "Are you sure you want to log out of your owner/admin account?",
            onConfirm: () => { setConfirmModal(null); if (onLogout) onLogout(); },
            onCancel: () => setConfirmModal(null)
        });
    };
    
    const handleDisconnectCloud = () => {
        setIsCloudConnected(false);
        setConnectedAccountEmail("");
        if (showToast) showToast({ message: 'Cloud account disconnected.', type: 'info' });
    };
    
    const handleConnectCloud = (email) => {
        setIsCloudConnected(true);
        setConnectedAccountEmail(email);
        if (showToast) showToast({ message: 'Cloud account connected successfully!', type: 'success' });
    };
    
    const handleUploadToCloud = async (driveType) => {
        setCloudSelectionModal(null); 
        if (cloudUploadStatus === 'loading') return; 
        setCloudUploadStatus('loading');
        
        try {
            const response = await apiClient.post(API.uploadcloud || '/api/data/upload-to-cloud', { driveType });
            if (response.data.success) {
                setCloudUploadStatus('success');
                if (showToast) showToast({ message: `Backup successful to ${connectedAccountEmail}`, type: 'success' });
                setTimeout(() => setCloudUploadStatus('idle'), 3000); 
            } else {
                throw new Error(response.data.message || 'Unknown error');
            }
        } catch (error) {
            setCloudUploadStatus('error');
            if (showToast) showToast({ message: `Upload failed: ${error.message}`, type: 'error' });
            setTimeout(() => setCloudUploadStatus('idle'), 5000);
        }
    };

    const renderSettingsList = () => (
        <main className="space-y-6">
            {/* 1. Account Management Section */}
            <section className="bg-gray-900 rounded-xl shadow-2xl border border-gray-800 overflow-hidden">
                <h2 className="p-4 text-sm font-black uppercase tracking-widest text-gray-500 bg-gray-950/50 flex items-center border-b border-gray-800">
                    <User className="w-5 h-5 mr-2 text-teal-500" aria-hidden="true" /> Account & User Management
                </h2>
                <div className="divide-y divide-gray-800">
                    {currentUser?.role?.toLowerCase() === 'owner' && (
                        <>
                            <SettingItem 
                                icon={Crown} 
                                title="Manage Plan" 
                                description="Upgrade or change your subscription plan." 
                                onClick={handlePlanUpgradeClick} 
                                accentColor="text-amber-500"
                            />
                            <SettingItem 
                                icon={Users} 
                                title="Staff & Permissions" 
                                description="Manage staff access roles and permissions." 
                                onClick={handleStaffPermissionsClick} 
                                accentColor="text-indigo-400" 
                            />
                        </>
                    )}
                    <SettingItem 
                        icon={Lock} 
                        title="Change Password" 
                        description="Update your owner/admin login credentials." 
                        onClick={handleChangePasswordClick} 
                        accentColor="text-red-400"
                    />
                    <SettingItem 
                        icon={LogOut} 
                        title="Log Out" 
                        description="Securely log out of your current session." 
                        onClick={handleLogout} 
                        accentColor="text-red-500" 
                    />
                </div>
            </section>
            
            {/* 2. App Preferences Section */}
            <section className="bg-gray-900 rounded-xl shadow-2xl border border-gray-800 overflow-hidden">
                <h2 className="p-4 text-sm font-black uppercase tracking-widest text-gray-500 bg-gray-950/50 flex items-center border-b border-gray-800">
                    <Globe className="w-5 h-5 mr-2 text-indigo-500" aria-hidden="true" /> App Preferences
                </h2>
                <div className="divide-y divide-gray-800">
                    <SettingItem 
                        icon={Bell} 
                        title="Notifications" 
                        description="Enable or disable in-app toast notifications." 
                        actionComponent={<ToggleSwitch checked={isNotificationEnabled} onChange={handleToggleNotifications} />} 
                        accentColor="text-sky-400" 
                    />
                </div>
            </section>

            {/* 3. Help & Growth Section */}
            <section className="bg-gray-900 rounded-xl shadow-2xl border border-gray-800 overflow-hidden">
                <h2 className="p-4 text-sm font-black uppercase tracking-widest text-gray-500 bg-gray-950/50 flex items-center border-b border-gray-800">
                    <LifeBuoy className="w-5 h-5 mr-2 text-purple-500" aria-hidden="true" /> Help & Growth
                </h2>
                <div className="divide-y divide-gray-800">
                    <SettingItem 
                        icon={LifeBuoy} 
                        title="Help & Support" 
                        description="Contact support for technical issues or queries." 
                        onClick={() => { setPageOrigin('settings'); setCurrentPage('support'); }} 
                        accentColor="text-indigo-400" 
                    />
                    <SettingItem 
                        icon={Gift} 
                        title="Affiliate Program" 
                        description="Refer other businesses and earn commissions." 
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
                return <div className="max-w-4xl mx-auto">{renderSettingsList()}</div>;
        }
    };

    return (
        <main className="h-screen flex flex-col bg-gray-950 text-gray-100 font-sans overflow-hidden" itemScope itemType="https://schema.org/WebPage">
            {currentView === 'main' && (
                <header className="p-4 md:p-8 flex-shrink-0" itemProp="headline">
                    <h1 className="text-3xl font-extrabold text-white">Settings</h1>
                    <p className="text-gray-400 mt-1" itemProp="description">Manage shop config, permissions, and settings.</p>
                </header>
            )}

            <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32">
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

            <div aria-live="polite" className="sr-only">
                {cloudUploadStatus === 'loading' && "Uploading to cloud..."}
                {syncStatus === 'loading' && "Synchronizing with server..."}
            </div>
        </main>
    );
}

export default Settings;