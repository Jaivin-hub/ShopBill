import React, { useState } from 'react';
import { 
    User, Lock, Moon, Sun, Cloud, Globe, Check, Server, Bell, 
    RefreshCw, Trash2, Users, LogOut, ArrowLeft, UploadCloud, 
    CheckCircle, XCircle, Link, Slash, Mail, Crown
} from 'lucide-react'; 
// Assuming these are imported from sibling components/files
import SettingItem from './SettingItem';
import ToggleSwitch from './ToggleSwitch';
import StaffPermissionsManager from './StaffPermissionsManager';
import ChangePasswordForm from './ChangePasswordForm';
import PlanUpgrade from './PlanUpgrade';
import API from '../config/api';

// --- UPDATED MODAL: Cloud Upload Confirmation (No changes here) ---
const CloudUploadConfirmationModal = ({ 
    isConnected, 
    accountEmail, 
    onSelectAndConfirm, 
    onCancel, 
    onDisconnect, 
    onConnect 
}) => {
    // Local state to manage the email input for the Connect flow (for simulation)
    const [connectEmail, setConnectEmail] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);

    const handleConnectClick = () => {
        setIsConnecting(true);
        // Simulate the OAuth process starting
        setTimeout(() => {
            onConnect(connectEmail); // Pass the email back to Settings component
            setIsConnecting(false);
        }, 1500);
    };

    return (
        <div className="fixed inset-0 bg-black/60 dark:bg-gray-900/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 transform transition-transform duration-300">
                <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-indigo-100 dark:bg-indigo-900/40 rounded-t-xl">
                    <h2 className="text-xl font-bold text-indigo-700 dark:text-indigo-300 flex items-center"><UploadCloud className="w-5 h-5 mr-2" /> Cloud Backup Confirmation</h2> 
                </div>
                
                <div className="p-5 space-y-4">
                    {isConnected ? (
                        <>
                            <p className="text-gray-700 dark:text-gray-300 font-semibold">
                                Confirm to start the data backup process to your linked cloud account.
                            </p>
                            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-gray-200 dark:border-gray-600">
                                <p className="font-semibold text-gray-900 dark:text-white flex items-center">
                                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> Connected Account:
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 font-bold mt-1">{accountEmail}</p>
                                <button 
                                    onClick={onDisconnect} 
                                    className="mt-2 text-red-600 dark:text-red-400 text-sm hover:underline flex items-center"
                                >
                                    <strong>Disconnect Account</strong>
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-gray-700 dark:text-gray-300 font-semibold">
                                Cloud account is currently <strong>disconnected</strong>. Enter the new account email to begin the connection process.
                            </p>
                            <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-gray-200 dark:border-gray-600 space-y-3">
                                <p className="font-semibold text-gray-900 dark:text-white flex items-center">
                                    <XCircle className="w-4 h-4 mr-2 text-red-600" /> Connection Status: Disconnected
                                </p>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="email"
                                        placeholder="Enter new account email (e.g., new@drive.com)"
                                        value={connectEmail}
                                        onChange={(e) => setConnectEmail(e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                        disabled={isConnecting}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
                
                <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                    <button 
                        onClick={onCancel}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                        disabled={isConnecting}
                    >
                        Cancel
                    </button>
                    {isConnected ? (
                        <button 
                            onClick={() => onSelectAndConfirm('google_drive')} // Ready to upload
                            className={`px-4 py-2 text-white rounded-lg shadow-lg transition flex items-center bg-indigo-600 hover:bg-indigo-700`}
                        >
                            Confirm & Start Upload
                        </button>
                    ) : (
                        <button 
                            onClick={handleConnectClick} // Initiate connection
                            className={`px-4 py-2 text-white rounded-lg shadow-lg transition flex items-center ${
                                connectEmail.trim() && !isConnecting ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400'
                            }`}
                            disabled={!connectEmail.trim() || isConnecting}
                        >
                            {isConnecting ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                <>
                                    <Link className="w-4 h-4 mr-2" /> 
                                    Connect Account
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};


// Placeholder for ConfirmationModal (Log Out / Clear Cache) - Unchanged
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


function Settings({ apiClient, onLogout, isDarkMode, toggleDarkMode, showToast }) { 
    const [currentView, setCurrentView] = useState('main'); 
    const [isNotificationEnabled, setIsNotificationEnabled] = useState(true);
    const [confirmModal, setConfirmModal] = useState(null); 
    
    // Cloud Upload States
    const [cloudUploadStatus, setCloudUploadStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
    const [cloudSelectionModal, setCloudSelectionModal] = useState(null); 
    
    // --- NEW STATE for Force Sync ---
    const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'

    // State for connection and connected account details
    const [isCloudConnected, setIsCloudConnected] = useState(true); 
    const currentUserJSON = localStorage.getItem('currentUser')
    const currentUser = JSON.parse(currentUserJSON);
    console.log('currentUser',currentUser.email)
    const [connectedAccountEmail, setConnectedAccountEmail] = useState(currentUser?.email); 

    // Placeholder handlers (Log out, Password, etc. - Unchanged)
    const handleToggleDarkMode = () => { 
        if (toggleDarkMode) { 
            toggleDarkMode(); 
            showToast({ message: isDarkMode ? 'Switched to light mode' : 'Switched to dark mode', type: 'success' });
        } 
    };
    const handleToggleNotifications = () => setIsNotificationEnabled(prev => !prev);
    const handleBackup = () => console.log("Data backup initiated (Mock API call).");
    const handleStaffPermissionsClick = () => setCurrentView('staff');
    const handleChangePasswordClick = () => setCurrentView('password');
    const handlePlanUpgradeClick = () => setCurrentView('plan');
    
    // 🌟 UPDATED: Fully functional handleWipeLocalData
    const handleWipeLocalData = () => { 
        setConfirmModal({
            message: "Are you sure you want to clear the local cache? This will wipe browser storage (including login status) and require a full data re-sync from the server.",
            onConfirm: () => { 
                // 1. Clear all local storage
                localStorage.clear(); 
                console.log('Local cache wiped successfully.'); 
                setConfirmModal(null);
                // 2. Force logout/reload to enforce the new state (login screen)
                if (onLogout) {
                    onLogout(); 
                } else {
                    window.location.reload();
                }
            },
            onCancel: () => setConfirmModal(null)
        });
    };

    const handleLogout = () => {
        setConfirmModal({
            message: "Are you sure you want to log out of your owner/admin account?",
            onConfirm: () => { setConfirmModal(null); if (onLogout) { onLogout(); } },
            onCancel: () => setConfirmModal(null)
        });
    };
    
    // -------------------------
    
    // UPDATED HANDLER: Disconnects the cloud account, keeps modal open
    const handleDisconnectCloud = () => {
        console.log("Cloud account disconnected.");
        setIsCloudConnected(false); // Only update the state
        setConnectedAccountEmail(""); // Clear the email
        if (showToast) { showToast({ message: 'Cloud account disconnected.', type: 'info' }); }
    };
    
    // UPDATED HANDLER: Simulates connecting the cloud account and updates email
    const handleConnectCloud = (email) => {
        console.log(`Successfully connected new account: ${email}`);
        setIsCloudConnected(true);
        setConnectedAccountEmail(email); // Set the new email
        if (showToast) { showToast({ message: 'Cloud account connected successfully!', type: 'success' }); }
    };
    
    // 🌟 REAL-WORLD CODE IMPROVEMENT: Cloud Upload Handler (Reverting to original API.post for safety)
    const handleUploadToCloud = async (driveType) => {
    console.log('driveType',driveType)
    setCloudSelectionModal(null); 
    if (cloudUploadStatus === 'loading') return; 

    setCloudUploadStatus('loading');
    
    try {
        // NOTE: Using API.uploadcloud as in the original file snippet, 
        // as API.uploadcloud was not defined in the provided backend route list.
        const response = await apiClient.post(API.uploadcloud || '/api/data/upload-to-cloud', { // Added fallback to original path
            driveType 
        });

        const { success, fileId, fileName } = response.data;

        if (success) {
            const fileLink = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
            
            setCloudUploadStatus('success');
            console.log(`Data backup successfully uploaded to ${driveType}. File: ${fileName}`);
            
            if (showToast) { 
                showToast({ message: `Backup complete! Data uploaded to **${connectedAccountEmail}**. [View File on Drive](${fileLink})`, type: 'success' }); 
            } else { 
                alert(`Data successfully uploaded to Cloud/Drive! File: ${fileLink}`); 
            }
            
            setTimeout(() => setCloudUploadStatus('idle'), 3000); 
        } else {
            throw new Error(`Upload to ${driveType} failed on server: ${response.data.message || 'Unknown error'}`);
        }

    } catch (error) {
        setCloudUploadStatus('error');
        console.error("Upload to Cloud Error:", error);
        if (showToast) { 
            showToast({ message: `Upload failed: ${error.message || 'Network error.'}`, type: 'error' }); 
        } else { 
            alert(`Upload failed: ${error.message || 'Network error.'}`); 
        }
        setTimeout(() => setCloudUploadStatus('idle'), 5000);
    }
};

    // 🆕 NEW FUNCTIONALITY: Handle Force Sync
    const handleForceSync = async () => {
        if (syncStatus === 'loading') return;

        setSyncStatus('loading');
        if (showToast) { showToast({ message: 'Initiating synchronization with server...', type: 'info' }); }

        try {
            // Use the API.sync endpoint you added to the backend router
            const response = await apiClient.post(API.sync, { 
                userId: currentUser.id // Sending user ID for targeted sync might be necessary
            });
            
            // Assuming the backend returns a success message and maybe new data count/status
            if (response.data.success) {
                setSyncStatus('success');
                console.log("Data successfully synced from server.");
                
                if (showToast) { 
                    showToast({ message: `Synchronization complete! Data is up to date. (${response.data.recordsUpdated || 0} updated)`, type: 'success' }); 
                }
                
                setTimeout(() => setSyncStatus('idle'), 4000); 
            } else {
                // Handle success response but with a server-side failure flag
                throw new Error(response.data.message || 'Sync process reported an issue on the server.');
            }

        } catch (error) {
            setSyncStatus('error');
            console.error("Force Sync Error:", error);
            if (showToast) { 
                showToast({ message: `Force Sync Failed: ${error.message || 'Network or server error.'}`, type: 'error' }); 
            } else { 
                alert(`Force Sync Failed: ${error.message || 'Network or server error.'}`); 
            }
            setTimeout(() => setSyncStatus('idle'), 5000);
        }
    };

    // NEW HANDLER: Triggers the initial confirmation modal (Unchanged)
    const handleUploadToCloudClick = () => {
        if (cloudUploadStatus !== 'idle') return;
        
        setCloudSelectionModal({
            isConnected: isCloudConnected,
            accountEmail: connectedAccountEmail,
            onSelectAndConfirm: handleUploadToCloud,
            onDisconnect: handleDisconnectCloud,
            onConnect: handleConnectCloud, 
            onCancel: () => setCloudSelectionModal(null)
        });
    };
    // -------------------------
    
    // --- Helper function to determine the action component for Cloud Upload ---
    const getCloudUploadActionComponent = () => {
        // ... (Existing cloud status logic - kept for completeness) ...
        switch (cloudUploadStatus) {
            case 'loading':
                return (
                    <div className="flex items-center text-indigo-600 dark:text-indigo-400">
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                    </div>
                );
            case 'success':
                return (
                    <div className="flex items-center text-green-600 dark:text-green-400">
                        <Check className="w-5 h-5 mr-2" />
                        Complete
                    </div>
                );
            case 'error':
                return (
                    <div className="text-red-600 dark:text-red-400">
                        Failed!
                    </div>
                );
            case 'idle':
            default:
                return null;
        }
    };

    
    // --- Render Logic ---
    const renderSettingsList = () => (
        // 💥 UPDATED: Removed max-w-xl mx-auto from main settings list
        <main className="space-y-6">
            
            {/* 1. Account & User Management Section (Unchanged) */}
            <section className="bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-2xl dark:shadow-indigo-900/10 overflow-hidden border border-gray-200 dark:border-gray-800">
                <h2 className="p-4 text-lg font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 flex items-center border-b border-gray-200 dark:border-gray-700">
                    <User className="w-5 h-5 mr-2 text-teal-600 dark:text-teal-400" /> Account & User Management
                </h2>
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    {currentUser?.role?.toLowerCase() === 'owner' && (
                        <SettingItem 
                            icon={Crown} 
                            title="Upgrade Plan" 
                            description="Upgrade or change your subscription plan to unlock more features." 
                            onClick={handlePlanUpgradeClick} 
                            accentColor="text-yellow-600 dark:text-yellow-400"
                        />
                    )}
                    <SettingItem icon={Users} title="Staff & Permissions" description="Add, edit, or remove staff members and define their access roles." onClick={handleStaffPermissionsClick} accentColor="text-indigo-600 dark:text-indigo-400" />
                    <SettingItem icon={Lock} title="Change Password" description="Update your owner/admin login credentials securely." onClick={handleChangePasswordClick} accentColor="text-red-600 dark:text-red-400"/>
                    <SettingItem icon={LogOut} title="Log Out" description="Securely log out of your current session." onClick={handleLogout} accentColor="text-red-600 dark:text-red-500" />
                </div>
            </section>
            
            {/* 2. App Preferences Section */}
            <section className="bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-2xl dark:shadow-indigo-900/10 overflow-hidden border border-gray-200 dark:border-gray-800">
                <h2 className="p-4 text-lg font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 flex items-center border-b border-gray-200 dark:border-gray-700">
                    <Globe className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" /> App Preferences
                </h2>
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    <SettingItem 
                        icon={isDarkMode ? Moon : Sun} 
                        title="Dark Mode" 
                        description={isDarkMode ? "Switch to light mode for a brighter interface." : "Switch to dark mode for a comfortable viewing experience."} 
                        actionComponent={<ToggleSwitch checked={isDarkMode} onChange={handleToggleDarkMode} />} 
                        accentColor={isDarkMode ? "text-indigo-600 dark:text-indigo-400" : "text-yellow-600 dark:text-yellow-400"} 
                    />
                    <SettingItem 
                        icon={Bell} 
                        title="Notifications" 
                        description="Enable or disable in-app toast notifications." 
                        actionComponent={<ToggleSwitch checked={isNotificationEnabled} onChange={handleToggleNotifications} />} 
                        accentColor="text-blue-600 dark:text-blue-400" 
                    />
                </div>
            </section>

            {/* 3. Data Management Section - NEWLY ADDED */}
            <section className="bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-2xl dark:shadow-indigo-900/10 overflow-hidden border border-gray-200 dark:border-gray-800">
                <h2 className="p-4 text-lg font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 flex items-center border-b border-gray-200 dark:border-gray-700">
                    <Server className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" /> Data & Sync
                </h2>
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    <SettingItem 
                        icon={RefreshCw} 
                        title="Force Sync Data" 
                        description="Manually trigger an immediate synchronization of all local data with the server." 
                        onClick={handleForceSync} 
                        actionComponent={
                            syncStatus === 'loading' ? (
                                <div className="flex items-center text-indigo-600 dark:text-indigo-400">
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Syncing...
                                </div>
                            ) : syncStatus === 'success' ? (
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                            ) : (
                                <RefreshCw className="w-5 h-5 text-indigo-500 hover:text-indigo-700" />
                            )
                        }
                        accentColor="text-indigo-600 dark:text-indigo-400" 
                    />
                    <SettingItem 
                        icon={UploadCloud} 
                        title="Cloud Backup" 
                        description={`Backup all current data to your linked cloud account: ${connectedAccountEmail || 'None Linked'}`}
                        onClick={handleUploadToCloudClick} 
                        actionComponent={getCloudUploadActionComponent() || <Cloud className="w-5 h-5 text-teal-500 hover:text-teal-700" />} 
                        accentColor="text-teal-600 dark:text-teal-400"
                    />
                    <SettingItem 
                        icon={Trash2} 
                        title="Wipe Local Cache" 
                        description="Clear all application data stored locally on this device (requires re-sync)." 
                        onClick={handleWipeLocalData} 
                        accentColor="text-red-600 dark:text-red-400"
                    />
                </div>
            </section>
        </main>
    );

    const renderHeader = () => {
        if (currentView === 'main') {
            return (
                // 💥 UPDATED: Applied max-w-4xl mx-auto to Header
                <header className="mb-8 pt-1 md:pt-0 max-w-4xl mx-auto">
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center">
                        Settings
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage shop configuration and app settings.</p>
                </header>
            );
        }
        // For sub-views, the back button/header is usually handled within the sub-component itself
        return null;
    }

    const renderContent = () => {
        switch (currentView) {
            case 'password':
                // Sub-components usually handle their own width/layout
                return <ChangePasswordForm apiClient={apiClient} onLogout={onLogout} onBack={() => setCurrentView('main')} />;
            case 'staff':
                return <StaffPermissionsManager onBack={() => setCurrentView('main')} apiClient={apiClient} setConfirmModal={setConfirmModal} />;
            case 'plan':
                return <PlanUpgrade apiClient={apiClient} showToast={showToast} currentUser={currentUser} onBack={() => setCurrentView('main')} />;
            case 'main':
            default:
                // 💥 WRAPPER: Applied max-w-4xl mx-auto here to contain the settings list
                return (
                    <div className="max-w-4xl mx-auto"> 
                        {renderSettingsList()}
                    </div>
                );
        }
    };

    // --- Main Layout ---
    return (
        <div className="min-h-screen p-4 pb-20 md:p-8 md:pt-4 bg-gray-100 dark:bg-gray-950 transition-colors duration-300 font-sans">
            
            {renderHeader()}

            {renderContent()}
            
            {/* Custom Confirmation Modal (Log out / Wipe Cache) */}
            {confirmModal && (
                <ConfirmationModal 
                    message={confirmModal.message}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={confirmModal.onCancel}
                />
            )}

            {/* 💥 Cloud Upload Confirmation Modal */}
            {cloudSelectionModal && (
                <CloudUploadConfirmationModal 
                    isConnected={cloudSelectionModal.isConnected}
                    accountEmail={cloudSelectionModal.accountEmail}
                    onSelectAndConfirm={cloudSelectionModal.onSelectAndConfirm}
                    onDisconnect={cloudSelectionModal.onDisconnect}
                    onConnect={cloudSelectionModal.onConnect}
                    onCancel={cloudSelectionModal.onCancel}
                />
            )}
        </div>
    );
}

export default Settings;