import React, { useState } from 'react';
import { 
    User, Lock, Moon, Sun, Key, Cloud, Globe, Check, Shield, Server, Bell, 
    RefreshCw, Trash2, ChevronRight, Users, Briefcase, LogOut 
} from 'lucide-react'; // <-- Added LogOut icon
// Assuming these are imported from sibling components/files
import SettingItem from './SettingItem';
import ToggleSwitch from './ToggleSwitch';
import StaffPermissionsManager from './StaffPermissionsManager';
import ChangePasswordForm from './ChangePasswordForm';
// Assuming ConfirmationModal is also defined/imported elsewhere, I'll provide a dark theme definition for it here for completeness
// const ConfirmationModal = ({ message, onConfirm, onCancel }) => ( ... );

// Placeholder for ConfirmationModal (Dark Theme Styling)
const ConfirmationModal = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-85 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
        <div className="bg-gray-800 w-full max-w-sm rounded-xl shadow-2xl border border-gray-700 transform transition-transform duration-300">
            <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-red-900/40 rounded-t-xl">
                {/* Changed icon and color for general confirmation */}
                <h2 className="text-xl font-bold text-red-300 flex items-center"><LogOut className="w-5 h-5 mr-2" /> Confirm Action</h2> 
            </div>
            <div className="p-5">
                <p className="text-gray-300">
                    {message}
                </p>
            </div>
            <div className="p-5 border-t border-gray-700 flex justify-end space-x-3">
                <button 
                    onClick={onCancel}
                    className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition"
                >
                    Cancel
                </button>
                <button 
                    onClick={onConfirm}
                    // Adjusted button for confirmation, making it red only for 'wipe' or important actions
                    className={`px-4 py-2 text-white rounded-lg shadow-lg transition flex items-center ${
                         message.includes('clear the local cache') ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                >
                    {message.includes('clear the local cache') ? 'Confirm Wipe' : 'Confirm'}
                </button>
            </div>
        </div>
    </div>
);


function Settings({onLogout}) {
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
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        // Apply dark mode class to root for visual effect
        if (newMode) {
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
        // Logic for Clear Cache confirmation
        setConfirmModal({
            message: "Are you sure you want to clear the local cache? This will wipe browser storage and require a full data re-sync from the server.",
            onConfirm: () => {
                showToast('Local cache wiped.', 'success');
                // Execute actual wipe logic here if this were real
                setConfirmModal(null);
            },
            onCancel: () => setConfirmModal(null)
        });
    };
    
    // --- New Logout Handler ---
    const handleLogout = () => {
        setConfirmModal({
            message: "Are you sure you want to log out of your owner/admin account?",
            onConfirm: () => {
                // REMOVED: showToast('Logged out successfully.', 'success');
                setConfirmModal(null);
                
                // NEW: Call the external onLogout function provided as a prop
                if (onLogout) {
                    onLogout();
                }
            },
            onCancel: () => setConfirmModal(null)
        });
    };
    // -------------------------
    
    // --- Render Logic ---
    const renderSettingsList = () => (
        <main className="space-y-6 max-w-xl mx-auto">
            
            {/* 1. Account & User Management Section - UPDATED FOR DARK THEME */}
            <section className="bg-gray-900 rounded-xl shadow-2xl shadow-indigo-900/10 overflow-hidden border border-gray-800">
                <h2 className="p-4 text-lg font-bold text-white bg-gray-800 flex items-center border-b border-gray-700">
                    <User className="w-5 h-5 mr-2 text-teal-400" /> Account & User Management
                </h2>
                <div className="divide-y divide-gray-800">
                    
                    {/* FEATURE: Staff & Permissions -> Navigates to sub-view */}
                    <SettingItem 
                        icon={Users}
                        title="Staff & Permissions"
                        description="Add, edit, or remove staff members and define their access roles."
                        onClick={handleStaffPermissionsClick}
                        accentColor="text-indigo-400" // Custom prop assumption for SettingItem
                    />
                    
                    {/* FEATURE: Change Password -> Navigates to sub-view */}
                    <SettingItem 
                        icon={Lock}
                        title="Change Password"
                        description="Update your owner/admin login credentials securely."
                        onClick={handleChangePasswordClick}
                        accentColor="text-red-400"
                    />
                    <SettingItem 
                        icon={Key}
                        title="API Keys Management"
                        description="Manage integration tokens for advanced use."
                        onClick={handleAPIKeyClick}
                        accentColor="text-yellow-400"
                    />
                    
                    {/* NEW FEATURE: Logout */}
                    <SettingItem 
                        icon={LogOut}
                        title="Log Out"
                        description="Securely log out of your current session."
                        onClick={handleLogout}
                        accentColor="text-red-500" // Highlight logout action
                    />
                </div>
            </section>
            
            {/* 2. App Preferences Section - UPDATED FOR DARK THEME */}
            <section className="bg-gray-900 rounded-xl shadow-2xl shadow-indigo-900/10 overflow-hidden border border-gray-800">
                <h2 className="p-4 text-lg font-bold text-white bg-gray-800 flex items-center border-b border-gray-700">
                    <Globe className="w-5 h-5 mr-2 text-indigo-400" /> App Preferences
                </h2>
                <div className="divide-y divide-gray-800">
                    <SettingItem
                        icon={isDarkMode ? Moon : Sun}
                        title="Dark Mode"
                        description="Switch between light and dark themes."
                        actionComponent={<ToggleSwitch checked={isDarkMode} onChange={handleToggleDarkMode} />}
                        accentColor="text-purple-400"
                    />
                    <SettingItem
                        icon={Bell}
                        title="Notifications"
                        description="Enable or disable in-app toast notifications."
                        actionComponent={<ToggleSwitch checked={isNotificationEnabled} onChange={handleToggleNotifications} />}
                        accentColor="text-blue-400"
                    />
                </div>
            </section>

            {/* 3. Data Management Section - UPDATED FOR DARK THEME */}
            <section className="bg-gray-900 rounded-xl shadow-2xl shadow-indigo-900/10 overflow-hidden border border-gray-800">
                <h2 className="p-4 text-lg font-bold text-white bg-gray-800 flex items-center border-b border-gray-700">
                    <Server className="w-5 h-5 mr-2 text-blue-400" /> Data Management
                </h2>
                <div className="divide-y divide-gray-800">
                    <SettingItem 
                        icon={Cloud}
                        title="Backup Data"
                        description="Download a full backup of your shop data."
                        onClick={handleBackup}
                        accentColor="text-green-400"
                    />
                    <SettingItem 
                        icon={RefreshCw}
                        title="Force Sync"
                        description="Manually force a synchronization with the MERN server."
                        onClick={() => showToast('Force sync initiated.', 'info')}
                        accentColor="text-indigo-400"
                    />
                    <SettingItem 
                        icon={Trash2}
                        title="Clear Cache"
                        description="Wipe local browser storage (requires re-sync)."
                        onClick={handleWipeLocalData} // Uses custom confirmation modal
                        accentColor="text-red-400"
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
        // Main Background updated to bg-gray-950
        <div className="min-h-screen p-4 pb-20 md:p-8 md:pt-4 bg-gray-950 transition-colors duration-300 font-sans">
            
            {/* Page Header (Only visible on main view) - UPDATED FOR DARK THEME */}
            {currentView === 'main' && (
                <header className="mb-8 pt-4 md:pt-0 max-w-xl mx-auto">
                    <h1 className="text-3xl font-extrabold text-white flex items-center">
                        {/* <Shield className="w-7 h-7 mr-2 text-teal-400" />  */}
                        Settings
                    </h1>
                    <p className="text-gray-400 mt-1">Manage shop configuration and app settings.</p>
                </header>
            )}

            {renderContent()}

            {/* Simple Local Toast Display - UPDATED FOR DARK THEME */}
            {toastMessage && (
                <div 
                    className={`fixed bottom-5 right-5 p-4 rounded-xl shadow-2xl transition-opacity duration-300 z-40 ${
                        toastMessage.type === 'success' ? 'bg-teal-600' : 
                        toastMessage.type === 'error' ? 'bg-red-600' : 'bg-indigo-600'
                    } text-white`}
                >
                    <div className="flex items-center">
                        <Check className="w-5 h-5 mr-2" />
                        <span className="font-medium">{toastMessage.message}</span>
                    </div>
                </div>
            )}
            
            {/* Custom Confirmation Modal (Uses the dark-themed placeholder above) */}
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