import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import API from '../config/api'; // Import the API configuration file

// --- AXIOS INSTANCE ---
// No interceptor needed as this route is public and does not require a JWT.
const apiClient = axios.create();


// Helper function to extract the token from the URL path for staff activation.
const getTokenFromPath = () => {
    // Expected path format: /staff-setup/TOKEN_STRING
    const path = window.location.pathname;
    // Regex specifically for the staff-setup path
    const match = path.match(/\/staff-setup\/([a-fA-F0-9]{64,})/); 
    return match ? match[1] : null;
};


const StaffSetPassword = () => {
    const [token, setToken] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(true); // Start as loading to check token validity
    const [status, setStatus] = useState({ 
        message: 'Verifying activation link...', 
        type: 'info' // 'info', 'success', 'error'
    });
    const [showPassword, setShowPassword] = useState(false);
    
    // State for client-side and backend validation errors
    const [passwordError, setPasswordError] = useState(''); 

    useEffect(() => {
        // On mount, extract the token from the URL
        const urlToken = getTokenFromPath();
        if (urlToken) {
            setToken(urlToken);
            setStatus({ message: 'Ready to set your new password.', type: 'info' });
        } else {
            setStatus({ message: 'Error: Invalid activation link or missing token in the URL.', type: 'error' });
        }
        setLoading(false);
    }, []);

    // Handle password setup submission
    const handleSetPassword = async (e) => {
        e.preventDefault();
        
        // --- CLIENT-SIDE VALIDATION ---
        setPasswordError(''); // Clear previous error
        setStatus(null); // Clear API status message
        
        if (!token) {
            setStatus({ message: 'Cannot set password: Activation token is missing from the URL. Please ensure you clicked the full link.', type: 'error' });
            return;
        }

        // 1. Password Length Check
        if (newPassword.length < 8) {
            setPasswordError('Password must be at least 8 characters long.');
            return;
        }
        
        // 2. Password Match Check
        if (newPassword !== confirmPassword) {
            setPasswordError('The new password and confirmation password do not match.');
            return;
        }
        // --- END CLIENT-SIDE VALIDATION ---


        // --- API URL CONSTRUCTION ---
        // NEW ENDPOINT for staff activation
        const endpoint = `${API.activateStaff}/${token}`; 
        // ----------------------------
        
        setLoading(true);

        try {
            // PUT request to the backend with the new password
            const response = await apiClient.put(endpoint, { 
                newPassword // Backend expects 'newPassword'
            }); 
            const data = response.data;
            
            setStatus({ 
                message: data.message || 'Your account has been successfully activated and password set. You can now log in.', 
                type: 'success' 
            });
            // Clear inputs after successful setup
            setNewPassword('');
            setConfirmPassword('');
            // Set token to null to disable form
            setToken(null); 

        } catch (error) {
            console.error('Staff Account Activation Error:', error);
            
            const apiErrorMessage = error.response?.data?.error 
                || error.response?.data?.message;
            
            // Handle errors returned by the API (e.g., token expired, or backend validation)
            if (apiErrorMessage) {
                // If it's a specific validation error from the backend, show it as password error
                if (apiErrorMessage.toLowerCase().includes('password')) {
                    setPasswordError(apiErrorMessage);
                    setStatus(null);
                } else {
                    // Generic API/Token error
                    setStatus({ 
                        message: apiErrorMessage || 'The activation link is invalid or has expired. Please ask your shop owner to resend the link.', 
                        type: 'error' 
                    });
                    setToken(null); 
                }
            } else {
                // Network or unexpected error
                setStatus({ 
                    message: 'A connection error occurred. Please try again.', 
                    type: 'error' 
                });
                setToken(null);
            }
        } finally {
            setLoading(false);
        }
    };

    // Determine the styling based on the status type
    const getStatusClasses = (type) => {
        switch (type) {
            case 'success':
                return 'bg-green-800 text-green-100';
            case 'error':
                return 'bg-red-800 text-red-100';
            case 'info':
            default:
                return 'bg-blue-800 text-blue-100';
        }
    };

    // If there is no token (or it's been cleared due to an error) and we are not loading, show the final message
    const showFinalMessage = (!token && !loading && status?.type !== 'info') || status?.type === 'success';

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-950 p-4 font-inter">
            <section className="w-full max-w-md bg-gray-800 p-8 md:p-10 rounded-2xl shadow-2xl shadow-indigo-900/50">

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-white">Set Your Password</h1>
                    <p className="text-gray-400 mt-2">Create a secure password to activate your staff account.</p>
                </div>
                
                {/* Status Message (for API/Token errors) */}
                {status && status.message && (
                    <div className={`p-3 mb-4 text-sm rounded-lg text-center ${getStatusClasses(status.type)}`} role="alert">
                        {status.message}
                    </div>
                )}
                
                {/* Password Error Message (for client or backend validation errors) */}
                {passwordError && (
                    <div className="p-3 mb-4 text-sm text-red-100 bg-red-800 rounded-lg text-center" role="alert">
                        {passwordError}
                    </div>
                )}

                {/* Form: Show only if token is present and not success/error state */}
                {!showFinalMessage && token && (
                    <form className="space-y-4" onSubmit={handleSetPassword}>
                        
                        {/* New Password Input */}
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="New Password (min 8 chars)"
                                className={`w-full pr-12 px-4 py-3 bg-gray-700 border text-gray-200 rounded-lg placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ${passwordError ? 'border-red-500' : 'border-gray-600'}`}
                                onChange={(e) => setNewPassword(e.target.value)}
                                value={newPassword}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-400 transition duration-150"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>

                        {/* Confirm Password Input */}
                        <input
                            type="password"
                            placeholder="Confirm New Password"
                            className={`w-full px-4 py-3 bg-gray-700 border text-gray-200 rounded-lg placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ${passwordError ? 'border-red-500' : 'border-gray-600'}`}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            value={confirmPassword}
                            required
                        />

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="w-full mt-6 py-3 bg-indigo-600 text-white text-lg font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition transform hover:scale-[1.01] duration-300 ease-in-out disabled:bg-indigo-400"
                            disabled={loading} 
                        >
                            {loading ? 'Processing...' : 'Activate Account'}
                        </button>
                    </form>
                )}
                
                {/* Back to Login Link */}
                <div className="text-center text-sm mt-8 pt-4 border-t border-gray-700/50">
                    <a
                        href="/" 
                        className="text-gray-500 hover:text-indigo-400 transition duration-150 flex items-center mx-auto justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></svg>
                        Go to Log In Page
                    </a>
                </div>
            </section>
        </main>
    );
};

export default StaffSetPassword;