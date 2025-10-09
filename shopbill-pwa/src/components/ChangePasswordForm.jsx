import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
// Assuming API is imported from a configuration file
import API from '../config/api'; 

const SWIPE_THRESHOLD = 50; // Minimum horizontal distance in pixels to register a swipe
const MAX_VERTICAL_DEVIATION = 50; // Maximum vertical travel allowed during a horizontal swipe

// Updated to accept onLogout prop
const ChangePasswordForm = ({ apiClient, onBack, showToast, onLogout }) => { 
    
    // --- Form State ---
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({}); // State for validation errors
    
    // --- Swipe State ---
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [isSwiping, setIsSwiping] = useState(false);
    const containerRef = useRef(null);

    // --- Swipe Logic (Unchanged) ---
    const handleTouchStart = (e) => {
        setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
        setTouchEnd(null);
        setIsSwiping(true);
    };

    const handleTouchMove = (e) => {
        if (!touchStart) return;
        setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd || !isSwiping) return;

        const deltaX = touchEnd.x - touchStart.x;
        const deltaY = Math.abs(touchEnd.y - touchStart.y);

        const isRightSwipe = deltaX > SWIPE_THRESHOLD;
        const isMostlyHorizontal = deltaY < MAX_VERTICAL_DEVIATION;

        if (isRightSwipe && isMostlyHorizontal) {
            onBack();
        }

        setTouchStart(null);
        setTouchEnd(null);
        setIsSwiping(false);
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        if ('ontouchstart' in window) {
            container.addEventListener('touchstart', handleTouchStart);
            container.addEventListener('touchmove', handleTouchMove);
            container.addEventListener('touchend', handleTouchEnd);
        }

        return () => {
            if ('ontouchstart' in window) {
                container.removeEventListener('touchstart', handleTouchStart);
                container.removeEventListener('touchmove', handleTouchMove);
                container.removeEventListener('touchend', handleTouchEnd);
            }
        };
    }, [touchStart, touchEnd, isSwiping, onBack]);

    // --- Validation Logic (Unchanged) ---

    const handleChange = (e) => {
        const { id, value } = e.target;
        
        // 1. Update state based on input ID
        if (id === 'current-pass') setCurrentPassword(value);
        if (id === 'new-pass') setNewPassword(value);
        if (id === 'confirm-pass') setConfirmNewPassword(value);

        // 2. Perform instant validation and update errors state
        let currentNewPass = (id === 'new-pass') ? value : newPassword;
        let currentConfirmPass = (id === 'confirm-pass') ? value : confirmNewPassword;
        let newErrors = { ...errors };

        // A. New Password Length check
        if (id === 'new-pass') {
            if (value.length > 0 && value.length < 8) {
                newErrors.newPassword = 'New password must be at least 8 characters.';
            } else {
                delete newErrors.newPassword;
            }
        }
        
        // B. Confirmation Match check (runs when either new or confirm changes)
        if (currentNewPass && currentConfirmPass && currentNewPass !== currentConfirmPass) {
            newErrors.confirmNewPassword = 'New passwords must match.';
        } else if (newErrors.confirmNewPassword) {
             // Clear the confirm password error if the fields are filled and match
            delete newErrors.confirmNewPassword;
        }
        
        // C. Current Password requirement (clears on input, if it was previously set by validateForm or server)
        if (id === 'current-pass' && value && newErrors.currentPassword) {
             delete newErrors.currentPassword;
        }

        setErrors(newErrors);
    };

    /**
     * Runs full form validation, updates the error state, and returns true if valid.
     */
    const validateForm = () => {
        const validationErrors = {};
        
        if (!currentPassword) validationErrors.currentPassword = 'Current password is required.';
        if (!newPassword) validationErrors.newPassword = 'New password is required.';
        if (newPassword.length < 8) validationErrors.newPassword = 'New password must be at least 8 characters long.';
        if (!confirmNewPassword) validationErrors.confirmNewPassword = 'Confirmation is required.';
        
        if (newPassword !== confirmNewPassword) {
            validationErrors.confirmNewPassword = 'New passwords must match.';
        }
        
        setErrors(validationErrors);
        return Object.keys(validationErrors).length === 0;
    }


    // --- Form Submission Logic (API Integration) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Run full validation on submit
        if (!validateForm()) {
            showToast("Please fix the highlighted errors before submitting.", 'error');
            return;
        }

        setIsLoading(true);
        // Clear any previous server errors before submission
        setErrors(prevErrors => {
            const { currentPassword, ...rest } = prevErrors;
            return rest;
        });

        try {
            // Send PUT request to change password endpoint (PUT is semantically correct for updates)
            const response = await apiClient.put(API.passwordchange, {
                currentPassword,
                newPassword,
            });

            if (response.message) {
                 showToast(response.message, 'success');
                 
                 // Clear form
                 setCurrentPassword('');
                 setNewPassword('');
                 setConfirmNewPassword('');
                 
                 // CRITICAL SECURITY STEP: Log the user out after successful password change
                 // This ensures all previous sessions are invalidated.
                 if (onLogout) {
                     onLogout();
                 } else {
                     // Fallback if onLogout isn't provided (should handle navigation back)
                     onBack(); 
                 }
            } else {
                 showToast("Password updated, but response was unexpected.", 'success');
                 // Still navigate back or log out as a safety measure
                 if (onLogout) { onLogout(); } else { onBack(); } 
            }

        } catch (error) {
            console.error("Password change failed:", error);
            
            // Extract error message from API response if available
            const serverErrorMessage = error.response?.data?.error || "Failed to change password. Server error.";
            
            // Update the errors state for the current password field, as this is the common point 
            // of failure (e.g., "Invalid current password") that the server confirms.
            setErrors(prevErrors => ({ 
                ...prevErrors, 
                currentPassword: serverErrorMessage 
            }));

        } finally {
            setIsLoading(false);
        }
    };

    return (
        // Added ref to attach swipe listeners
        <div ref={containerRef} className="p-4 md:p-6 min-h-screen-safe bg-gray-900 rounded-xl">
            <button 
                onClick={onBack} 
                className="flex items-center text-indigo-400 hover:underline mb-6 disabled:opacity-50"
                disabled={isLoading}
            >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Settings
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">Change Password</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="current-pass">Current Password</label>
                    <input
                        id="current-pass"
                        type="password"
                        value={currentPassword}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                        // Highlights red if client-side validation fails OR if server returns an error for this field
                        className={`w-full p-3 border ${errors.currentPassword ? 'border-red-500' : 'border-gray-600'} bg-gray-700 text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500`}
                    />
                    {errors.currentPassword && <p className="text-red-400 text-xs mt-1">{errors.currentPassword}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="new-pass">New Password</label>
                    <input
                        id="new-pass"
                        type="password"
                        value={newPassword}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                        className={`w-full p-3 border ${errors.newPassword ? 'border-red-500' : 'border-gray-600'} bg-gray-700 text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500`}
                    />
                    {errors.newPassword && <p className="text-red-400 text-xs mt-1">{errors.newPassword}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="confirm-pass">Confirm New Password</label>
                    <input
                        id="confirm-pass"
                        type="password"
                        value={confirmNewPassword}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                        className={`w-full p-3 border ${errors.confirmNewPassword ? 'border-red-500' : 'border-gray-600'} bg-gray-700 text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500`}
                    />
                    {errors.confirmNewPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmNewPassword}</p>}
                </div>
                
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition font-semibold shadow-md mt-6 disabled:bg-indigo-800 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Changing Password...
                        </>
                    ) : (
                        <>
                            <Save className="w-5 h-5 mr-2" /> 
                            Update Password
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default ChangePasswordForm;
