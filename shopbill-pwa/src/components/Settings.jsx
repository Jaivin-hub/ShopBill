import React, { useState } from 'react';
import { 
    User, Lock, Moon, Sun, Key, Cloud, Globe, Check, Shield, Server, Bell, 
    RefreshCw, Trash2, ChevronRight, Users, Briefcase 
} from 'lucide-react';
import SettingItem from './SettingItem';
import ToggleSwitch from './ToggleSwitch';
import StaffPermissionsManager from './StaffPermissionsManager';
import ChangePasswordForm from './ChangePasswordForm';

function Settings() {
    // 'main', 'password', 'staff'
    const [currentView, setCurrentView] = useState('main'); 
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isNotificationEnabled, setIsNotificationEnabled] = useState(true);
    const [toastMessage, setToastMessage] = useState(null); // Simple local state for Toast
    const [confirmModal, setConfirmModal] = useState(null); // State for custom confirmation modal

    // Mock Toast Function (since this component is isolated)
    const showToast = (message, type = 'info') => {
        setToastMessage({ message, type });
        setTimeout(() => setToastMessage(null), 3000);
    };

    // Placeholder handlers
    const handleToggleDarkMode = () => {
        setIsDarkMode(prev => !prev);
        // Apply dark mode class to root for visual effect
        if (!isDarkMode) {
             document.documentElement.classList.add('dark');
        } else {
             document.documentElement.classList.remove('dark');
        }
    };
    const handleToggleNotifications = () => setIsNotificationEnabled(prev => !prev);
    const handleBackup = () => showToast("Data backup initiated (Mock API call).", 'info');
    
    // Updated navigation handlers
    const handleStaffPermissionsClick = () => setCurrentView('staff');
    const handleChangePasswordClick = () => setCurrentView('password');
    const handleAPIKeyClick = () => showToast('Navigating to API Key Management (Mock)', 'info');

    const handleWipeLocalData = () => { 
        // Replaced window.confirm with custom modal logic
        setConfirmModal({
            message: "Are you sure you want to clear the local cache? This will wipe browser storage and require a full data re-sync from the server.",
            onConfirm: () => {
                showToast('Local cache wiped.', 'success');
                setConfirmModal(null);
            },
            onCancel: () => setConfirmModal(null)
        });
    };
    
    // --- Render Logic ---
    const renderSettingsList = () => (
        <main className="space-y-6 max-w-xl mx-auto">
            
            {/* 1. Account & User Management Section */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                <h2 className="p-4 text-lg font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700/50 flex items-center border-b dark:border-gray-700">
                    <User className="w-5 h-5 mr-2 text-green-500" /> Account & User Management
                </h2>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    
                    {/* FEATURE: Staff & Permissions -> Navigates to sub-view */}
                    <SettingItem 
                        icon={Users}
                        title="Staff & Permissions"
                        description="Add, edit, or remove staff members and define their access roles."
                        onClick={handleStaffPermissionsClick}
                    />
                    
                    {/* FEATURE: Change Password -> Navigates to sub-view */}
                    <SettingItem 
                        icon={Lock}
                        title="Change Password"
                        description="Update your owner/admin login credentials securely."
                        onClick={handleChangePasswordClick}
                    />
                    <SettingItem 
                        icon={Key}
                        title="API Keys Management"
                        description="Manage integration tokens for advanced use."
                        onClick={handleAPIKeyClick}
                    />
                </div>
            </section>
            
            {/* 2. App Preferences Section */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                <h2 className="p-4 text-lg font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700/50 flex items-center border-b dark:border-gray-700">
                    <Globe className="w-5 h-5 mr-2 text-blue-500" /> App Preferences
                </h2>
                <SettingItem
                    icon={isDarkMode ? Moon : Sun}
                    title="Dark Mode"
                    description="Switch between light and dark themes."
                    actionComponent={<ToggleSwitch checked={isDarkMode} onChange={handleToggleDarkMode} />}
                />
                <SettingItem
                    icon={Bell}
                    title="Notifications"
                    description="Enable or disable in-app toast notifications."
                    actionComponent={<ToggleSwitch checked={isNotificationEnabled} onChange={handleToggleNotifications} />}
                />
            </section>

            {/* 3. Data Management Section */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                <h2 className="p-4 text-lg font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700/50 flex items-center border-b dark:border-gray-700">
                    <Server className="w-5 h-5 mr-2 text-purple-500" /> Data Management
                </h2>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    <SettingItem 
                        icon={Cloud}
                        title="Backup Data"
                        description="Download a full backup of your shop data."
                        onClick={handleBackup}
                    />
                    <SettingItem 
                        icon={RefreshCw}
                        title="Force Sync"
                        description="Manually force a synchronization with the MERN server."
                        onClick={() => showToast('Force sync initiated.', 'info')}
                    />
                    <SettingItem 
                        icon={Trash2}
                        title="Clear Cache"
                        description="Wipe local browser storage (requires re-sync)."
                        onClick={handleWipeLocalData} // Uses custom confirmation modal
                    />
                </div>
            </section>
            
        </main>
    );

    const renderContent = () => {
        switch (currentView) {
            case 'password':
                return <ChangePasswordForm onBack={() => setCurrentView('main')} showToast={showToast} />;
            case 'staff':
                return <StaffPermissionsManager onBack={() => setCurrentView('main')} showToast={showToast} />;
            case 'main':
            default:
                return renderSettingsList();
        }
    };

    // --- Main Layout ---
    return (
        <div className="min-h-screen p-4 pb-20 md:p-8 md:pt-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-300 font-sans">
            
            {/* Page Header (Only visible on main view) */}
            {currentView === 'main' && (
                <header className="mb-8 pt-4 md:pt-0 max-w-xl mx-auto">
                    <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white flex items-center">
                        <Shield className="w-7 h-7 mr-2 text-indigo-600 dark:text-indigo-400" /> Settings
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your shop's configuration and app preferences.</p>
                </header>
            )}

            {renderContent()}

            {/* Simple Local Toast Display */}
            {toastMessage && (
                <div 
                    className={`fixed bottom-5 right-5 p-4 rounded-xl shadow-2xl transition-opacity duration-300 z-40 ${
                        toastMessage.type === 'success' ? 'bg-green-500' : 
                        toastMessage.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                    } text-white`}
                >
                    <div className="flex items-center">
                        <Check className="w-5 h-5 mr-2" />
                        <span className="font-medium">{toastMessage.message}</span>
                    </div>
                </div>
            )}
            
            {/* Custom Confirmation Modal */}
            {confirmModal && (
                <ConfirmationModal 
                    message={confirmModal.message}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={confirmModal.onCancel}
                />
            )}
        </div>
    );
}

export default Settings;