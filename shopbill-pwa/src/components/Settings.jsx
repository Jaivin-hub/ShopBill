import React, { useState } from 'react';
import { 
    User, Lock, Moon, Sun, Cloud, Globe, Check, Server, Bell, 
    RefreshCw, Trash2, Users, LogOut, ArrowLeft
} from 'lucide-react'; 
// Assuming these are imported from sibling components/files
import SettingItem from './SettingItem';
import ToggleSwitch from './ToggleSwitch';
import StaffPermissionsManager from './StaffPermissionsManager';
import ChangePasswordForm from './ChangePasswordForm';

// Placeholder for ConfirmationModal (UPDATED for Light/Dark Theme)
const ConfirmationModal = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-85 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
        <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 transform transition-transform duration-300">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-red-100 dark:bg-red-900/40 rounded-t-xl">
                <h2 className="text-xl font-bold text-red-700 dark:text-red-300 flex items-center"><LogOut className="w-5 h-5 mr-2" /> Confirm Action</h2> 
            </div>
            <div className="p-5">
                <p className="text-gray-700 dark:text-gray-300">
                    {message}
                </p>
            </div>
            <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                <button 
                    onClick={onCancel}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                    Cancel
                </button>
                <button 
                    onClick={onConfirm}
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


// 🌟 UPDATED: Accept isDarkMode and toggleDarkMode (from App.jsx) as props
function Settings({ apiClient, onLogout, isDarkMode, toggleDarkMode }) {
    // 'main', 'password', 'staff'
    const [currentView, setCurrentView] = useState('main'); 
    
    const [isNotificationEnabled, setIsNotificationEnabled] = useState(true);
    const [toastMessage, setToastMessage] = useState(null); 
    const [confirmModal, setConfirmModal] = useState(null); 

    // Mock Toast Function (since this component is isolated)
    const showToast = (message, type = 'info') => {
        setToastMessage({ message, type });
        setTimeout(() => setToastMessage(null), 3000);
    };

    // Placeholder handlers
    const handleToggleDarkMode = () => {
        // Just call the prop function. DOM manipulation is in App.jsx.
        if (toggleDarkMode) {
            toggleDarkMode();
        }
    };
    const handleToggleNotifications = () => setIsNotificationEnabled(prev => !prev);
    const handleBackup = () => showToast("Data backup initiated (Mock API call).", 'info');
    
    // Updated navigation handlers
    const handleStaffPermissionsClick = () => setCurrentView('staff');
    const handleChangePasswordClick = () => setCurrentView('password');

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
                setConfirmModal(null);
                
                // Call the external onLogout function provided as a prop
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
            
            {/* 1. Account & User Management Section - 💥 UPDATED THEME COLORS */}
            <section className="bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-2xl dark:shadow-indigo-900/10 overflow-hidden border border-gray-200 dark:border-gray-800">
                <h2 className="p-4 text-lg font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 flex items-center border-b border-gray-200 dark:border-gray-700">
                    <User className="w-5 h-5 mr-2 text-teal-600 dark:text-teal-400" /> Account & User Management
                </h2>
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    
                    {/* FEATURE: Staff & Permissions -> Navigates to sub-view */}
                    <SettingItem 
                        icon={Users}
                        title="Staff & Permissions"
                        description="Add, edit, or remove staff members and define their access roles."
                        onClick={handleStaffPermissionsClick}
                        accentColor="text-indigo-600 dark:text-indigo-400" 
                    />
                    
                    {/* FEATURE: Change Password -> Navigates to sub-view */}
                    <SettingItem 
                        icon={Lock}
                        title="Change Password"
                        description="Update your owner/admin login credentials securely."
                        onClick={handleChangePasswordClick}
                        accentColor="text-red-600 dark:text-red-400"
                    />
                    
                    {/* NEW FEATURE: Logout */}
                    <SettingItem 
                        icon={LogOut}
                        title="Log Out"
                        description="Securely log out of your current session."
                        onClick={handleLogout}
                        accentColor="text-red-600 dark:text-red-500" 
                    />
                </div>
            </section>
            
            {/* 2. App Preferences Section - 💥 UPDATED THEME COLORS */}
            <section className="bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-2xl dark:shadow-indigo-900/10 overflow-hidden border border-gray-200 dark:border-gray-800">
                <h2 className="p-4 text-lg font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 flex items-center border-b border-gray-200 dark:border-gray-700">
                    <Globe className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" /> App Preferences
                </h2>
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    {/* 🌟 USES PROP: isDarkMode from App.jsx */}
                    {/* <SettingItem
                        icon={isDarkMode ? Moon : Sun}
                        title="Dark Mode"
                        description="Switch between light and dark themes."
                        actionComponent={<ToggleSwitch checked={isDarkMode} onChange={handleToggleDarkMode} />}
                        accentColor="text-purple-600 dark:text-purple-400"
                    /> */}
                    <SettingItem
                        icon={Bell}
                        title="Notifications"
                        description="Enable or disable in-app toast notifications."
                        actionComponent={<ToggleSwitch checked={isNotificationEnabled} onChange={handleToggleNotifications} />}
                        accentColor="text-blue-600 dark:text-blue-400"
                    />
                </div>
            </section>

            {/* 3. Data Management Section - 💥 UPDATED THEME COLORS */}
            <section className="bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-2xl dark:shadow-indigo-900/10 overflow-hidden border border-gray-200 dark:border-gray-800">
                <h2 className="p-4 text-lg font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 flex items-center border-b border-gray-200 dark:border-gray-700">
                    <Server className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" /> Data Management
                </h2>
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    <SettingItem 
                        icon={Cloud}
                        title="Backup Data"
                        description="Download a full backup of your shop data."
                        onClick={handleBackup}
                        accentColor="text-green-600 dark:text-green-400"
                    />
                    <SettingItem 
                        icon={RefreshCw}
                        title="Force Sync"
                        description="Manually force a synchronization with the MERN server."
                        onClick={() => showToast('Force sync initiated.', 'info')}
                        accentColor="text-indigo-600 dark:text-indigo-400"
                    />
                    <SettingItem 
                        icon={Trash2}
                        title="Clear Cache"
                        description="Wipe local browser storage (requires re-sync)."
                        onClick={handleWipeLocalData} // Uses custom confirmation modal
                        accentColor="text-red-600 dark:text-red-400"
                    />
                </div>
            </section>
            
        </main>
    );

    // Render back button for sub-views
    const renderHeader = () => {
        if (currentView === 'main') {
            return (
                <header className="mb-8 pt-1 md:pt-0 max-w-xl mx-auto">
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center">
                        Settings
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage shop configuration and app settings.</p>
                </header>
            );
        }

        // const viewTitle = currentView === 'password' ? 'Change Password' : 'Staff Permissions';

        // return (
        //      <header className="mb-8 pt-4 md:pt-0 max-w-xl mx-auto">
        //         <button 
        //             onClick={() => setCurrentView('main')} 
        //             className="flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-4 transition"
        //         >
        //             <ArrowLeft className="w-5 h-5 mr-2" />
        //             Back to Main Settings
        //         </button>
        //         <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
        //             {viewTitle}
        //         </h1>
        //     </header>
        // );
    }

    const renderContent = () => {
        switch (currentView) {
            case 'password':
                return <ChangePasswordForm apiClient={apiClient} onLogout={onLogout} onBack={() => setCurrentView('main')} showToast={showToast} />;
            case 'staff':
                return <StaffPermissionsManager onBack={() => setCurrentView('main')} apiClient={apiClient} showToast={showToast} setConfirmModal={setConfirmModal} />;
            case 'main':
            default:
                return renderSettingsList();
        }
    };

    // --- Main Layout ---
    return (
        // 💥 UPDATED: Main Background - Uses a light default (it will be overridden by App.jsx's bg-gray-100)
        <div className="min-h-screen p-4 pb-20 md:p-8 md:pt-4 bg-gray-100 dark:bg-gray-950 transition-colors duration-300 font-sans">
            
            {renderHeader()}

            {renderContent()}

            {/* Simple Local Toast Display - 💥 UPDATED FOR DARK THEME */}
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