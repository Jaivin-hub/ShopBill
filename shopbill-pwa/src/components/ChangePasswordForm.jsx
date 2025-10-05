import React, {useState} from 'react'
import {ArrowLeft, Save} from 'lucide-react'

const ChangePasswordForm = ({ onBack, showToast }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newPassword !== confirmNewPassword) {
            showToast("New passwords do not match.", 'error');
            return;
        }
        if (newPassword.length < 8) {
            showToast("New password must be at least 8 characters.", 'error');
            return;
        }

        // Mock API call to change password
        showToast("Password updated successfully! (Mocked API call)", 'success');
        
        // Clear form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
    };

    return (
        <div className="p-4 md:p-6">
            <button onClick={onBack} className="flex items-center text-indigo-600 dark:text-indigo-400 hover:underline mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Settings
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Change Password</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="current-pass">Current Password</label>
                    <input
                        id="current-pass"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="new-pass">New Password</label>
                    <input
                        id="new-pass"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="confirm-pass">Confirm New Password</label>
                    <input
                        id="confirm-pass"
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        required
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                
                <button
                    type="submit"
                    className="w-full flex items-center justify-center bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition font-semibold shadow-md mt-6"
                >
                    <Save className="w-5 h-5 mr-2" /> Update Password
                </button>
            </form>
        </div>
    );
};

export default ChangePasswordForm