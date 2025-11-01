import React, { useState } from 'react';
import { 
    User, Lock, Moon, Sun, Cloud, Globe, Check, Server, Bell, 
    RefreshCw, Trash2, Users, LogOut, ArrowLeft, UploadCloud, 
    CheckCircle, XCircle, Link, Slash, Mail
} from 'lucide-react'; 
// Assuming these are imported from sibling components/files
import SettingItem from './SettingItem';
import ToggleSwitch from './ToggleSwitch';
import StaffPermissionsManager from './StaffPermissionsManager';
import ChangePasswordForm from './ChangePasswordForm';

// --- UPDATED MODAL: Cloud Upload Confirmation (Disconnect button is now functional) ---
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
        <div className="fixed inset-0 bg-gray-900 bg-opacity-85 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
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
    
    // State for connection and connected account details
    const [isCloudConnected, setIsCloudConnected] = useState(true); 
    const [connectedAccountEmail, setConnectedAccountEmail] = useState("user@example.com"); 

    // Placeholder handlers (Log out, Password, etc. - Unchanged)
    const handleToggleDarkMode = () => { if (toggleDarkMode) { toggleDarkMode(); } };
    const handleToggleNotifications = () => setIsNotificationEnabled(prev => !prev);
    const handleBackup = () => console.log("Data backup initiated (Mock API call).");
    const handleStaffPermissionsClick = () => setCurrentView('staff');
    const handleChangePasswordClick = () => setCurrentView('password');
    const handleWipeLocalData = () => { 
        setConfirmModal({
            message: "Are you sure you want to clear the local cache? This will wipe browser storage and require a full data re-sync from the server.",
            onConfirm: () => { console.log('Local cache wiped.'); setConfirmModal(null); },
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
        if (showToast) { showToast('Cloud account disconnected.', 'info'); }
    };
    
    // UPDATED HANDLER: Simulates connecting the cloud account and updates email
    const handleConnectCloud = (email) => {
        console.log(`Successfully connected new account: ${email}`);
        setIsCloudConnected(true);
        setConnectedAccountEmail(email); // Set the new email
        if (showToast) { showToast('Cloud account connected successfully!', 'success'); }
    };
    
    // 🌟 REAL-WORLD CODE IMPROVEMENT: Cloud Upload Handler now returns and uses the file link
    // Function within the Settings component
const handleUploadToCloud = async (driveType) => {
    console.log('driveType',driveType)
    setCloudSelectionModal(null); 
    if (cloudUploadStatus === 'loading') return; 

    setCloudUploadStatus('loading');
    
    try {
        // 🚀 REAL API CALL: Your front-end sends a request to your MERN backend.
        // The MERN backend handles the connection to Google Drive API.
        const response = await apiClient.post('/api/data/upload-to-cloud', { 
            driveType 
        });

        // 💡 The backend response must include the success status and file details.
        const { success, fileId, fileName } = response.data;

        if (success) {
            // Construct the real file link using the file ID returned by the server
            // (Note: The server typically returns the full URL, but we'll construct a mock one here 
            // based on the ID to show the structure).
            const fileLink = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
            
            setCloudUploadStatus('success');
            console.log(`Data backup successfully uploaded to ${driveType}. File: ${fileName}`);
            
            if (showToast) { 
                // Display the real link to the user
                showToast(`Backup complete! Data uploaded to **${connectedAccountEmail}**. [View File on Drive](${fileLink})`, 'success'); 
            } else { 
                alert(`Data successfully uploaded to Cloud/Drive! File: ${fileLink}`); 
            }
            
            setTimeout(() => setCloudUploadStatus('idle'), 3000); 
        } else {
            // Handle server-side failure response (e.g., Google Drive API returned an error)
            throw new Error(`Upload to ${driveType} failed on server: ${response.data.message || 'Unknown error'}`);
        }

    } catch (error) {
        // Handle network error or unexpected server response
        setCloudUploadStatus('error');
        console.error("Upload to Cloud Error:", error);
        if (showToast) { 
            showToast(`Upload failed: ${error.message || 'Network error.'}`, 'error'); 
        } else { 
            alert(`Upload failed: ${error.message || 'Network error.'}`); 
        }
        setTimeout(() => setCloudUploadStatus('idle'), 5000);
    }
};
// The rest of the Settings component code remains the same.
    
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
    
    // --- Helper function to determine the action component for Cloud Upload (Unchanged) ---
    const getCloudUploadActionComponent = () => {
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
        <main className="space-y-6 max-w-xl mx-auto">
            
            {/* 1. Account & User Management Section (Unchanged) */}
            <section className="bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-2xl dark:shadow-indigo-900/10 overflow-hidden border border-gray-200 dark:border-gray-800">
                <h2 className="p-4 text-lg font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 flex items-center border-b border-gray-200 dark:border-gray-700">
                    <User className="w-5 h-5 mr-2 text-teal-600 dark:text-teal-400" /> Account & User Management
                </h2>
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    <SettingItem icon={Users} title="Staff & Permissions" description="Add, edit, or remove staff members and define their access roles." onClick={handleStaffPermissionsClick} accentColor="text-indigo-600 dark:text-indigo-400" />
                    <SettingItem icon={Lock} title="Change Password" description="Update your owner/admin login credentials securely." onClick={handleChangePasswordClick} accentColor="text-red-600 dark:text-red-400"/>
                    <SettingItem icon={LogOut} title="Log Out" description="Securely log out of your current session." onClick={handleLogout} accentColor="text-red-600 dark:text-red-500" />
                </div>
            </section>
            
            {/* 2. App Preferences Section (Unchanged) */}
            <section className="bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-2xl dark:shadow-indigo-900/10 overflow-hidden border border-gray-200 dark:border-gray-800">
                <h2 className="p-4 text-lg font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 flex items-center border-b border-gray-200 dark:border-gray-700">
                    <Globe className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" /> App Preferences
                </h2>
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    <SettingItem icon={Bell} title="Notifications" description="Enable or disable in-app toast notifications." actionComponent={<ToggleSwitch checked={isNotificationEnabled} onChange={handleToggleNotifications} />} accentColor="text-blue-600 dark:text-blue-400" />
                </div>
            </section>

            {/* 3. Data Management Section */}
            <section className="bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-2xl dark:shadow-indigo-900/10 overflow-hidden border border-gray-200 dark:border-gray-800">
                <h2 className="p-4 text-lg font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 flex items-center border-b border-gray-200 dark:border-gray-700">
                    <Server className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" /> Data Management
                </h2>
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    
                    <SettingItem icon={Cloud} title="Backup Data (Download)" description="Download a full backup of your shop data." onClick={handleBackup} accentColor="text-green-600 dark:text-green-400"/>
                    
                    {/* 🚀 UPDATED FEATURE: Upload to Cloud/Drive */}
                    <SettingItem 
                        icon={UploadCloud}
                        title="Upload to Cloud/Drive"
                        description={
                            cloudUploadStatus === 'success' ? 
                            "Backup complete. Your data is secure in the cloud." :
                            cloudUploadStatus === 'error' ?
                            "Upload failed. Click to confirm account and try again." :
                            isCloudConnected ? `Connected to: ${connectedAccountEmail}. Click to upload.` : "Cloud account not linked. Click to link and upload."
                        }
                        onClick={handleUploadToCloudClick} 
                        actionComponent={getCloudUploadActionComponent()} 
                        accentColor={
                            cloudUploadStatus === 'loading' ? 'text-indigo-600 dark:text-indigo-400' :
                            cloudUploadStatus === 'success' ? 'text-green-600 dark:text-green-400' :
                            cloudUploadStatus === 'error' ? 'text-red-600 dark:text-red-400' :
                            isCloudConnected ? "text-purple-600 dark:text-purple-400" : "text-gray-500 dark:text-gray-400"
                        }
                    />
                    
                    <SettingItem icon={RefreshCw} title="Force Sync" description="Manually force a synchronization with the MERN server." onClick={() => console.log('Force sync initiated.')} accentColor="text-indigo-600 dark:text-indigo-400"/>
                    <SettingItem icon={Trash2} title="Clear Cache" description="Wipe local browser storage (requires re-sync)." onClick={handleWipeLocalData} accentColor="text-red-600 dark:text-red-400"/>
                </div>
            </section>
            
        </main>
    );

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
    }

    const renderContent = () => {
        switch (currentView) {
            case 'password':
                return <ChangePasswordForm apiClient={apiClient} onLogout={onLogout} onBack={() => setCurrentView('main')} />;
            case 'staff':
                return <StaffPermissionsManager onBack={() => setCurrentView('main')} apiClient={apiClient} setConfirmModal={setConfirmModal} />;
            case 'main':
            default:
                return renderSettingsList();
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