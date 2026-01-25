import React, { useState, useEffect, useRef } from 'react';
import { 
    ArrowLeft, Save, Loader2, Lock, ShieldCheck, 
    Eye, EyeOff, KeyRound, AlertCircle, CheckCircle2 
} from 'lucide-react';
import API from '../config/api'; 

const SWIPE_THRESHOLD = 50; 
const MAX_VERTICAL_DEVIATION = 50; 

const ChangePasswordForm = ({ apiClient, onBack, showToast, onLogout, darkMode }) => { 
    // --- Form State ---
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [showPass, setShowPass] = useState(false); 
    
    // --- Swipe State ---
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [isSwiping, setIsSwiping] = useState(false);
    const containerRef = useRef(null);

    // --- Swipe Logic ---
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
        if (deltaX > SWIPE_THRESHOLD && deltaY < MAX_VERTICAL_DEVIATION) {
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

    // --- Validation Logic ---
    const handleChange = (e) => {
        const { id, value } = e.target;
        if (id === 'current-pass') setCurrentPassword(value);
        if (id === 'new-pass') setNewPassword(value);
        if (id === 'confirm-pass') setConfirmNewPassword(value);

        let currentNewPass = (id === 'new-pass') ? value : newPassword;
        let currentConfirmPass = (id === 'confirm-pass') ? value : confirmNewPassword;
        let newErrors = { ...errors };

        if (id === 'new-pass') {
            if (value.length > 0 && value.length < 8) {
                newErrors.newPassword = 'Minimum 8 characters required.';
            } else {
                delete newErrors.newPassword;
            }
        }
        
        if (currentNewPass && currentConfirmPass && currentNewPass !== currentConfirmPass) {
            newErrors.confirmNewPassword = 'Passwords do not match.';
        } else if (newErrors.confirmNewPassword) {
            delete newErrors.confirmNewPassword;
        }
        
        if (id === 'current-pass' && value && newErrors.currentPassword) {
             delete newErrors.currentPassword;
        }
        setErrors(newErrors);
    };

    const validateForm = () => {
        const vErrors = {};
        if (!currentPassword) vErrors.currentPassword = 'Required.';
        if (!newPassword) vErrors.newPassword = 'Required.';
        if (newPassword.length < 8) vErrors.newPassword = 'Must be ≥ 8 chars.';
        if (!confirmNewPassword) vErrors.confirmNewPassword = 'Required.';
        if (newPassword !== confirmNewPassword) vErrors.confirmNewPassword = 'Mismatch.';
        setErrors(vErrors);
        return Object.keys(vErrors).length === 0;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            showToast("Validation failed.", 'error');
            return;
        }
        setIsLoading(true);
        try {
            const response = await apiClient.put(API.passwordchange, {
                currentPassword,
                newPassword,
            });
            showToast(response.data?.message || "Success", 'success');
            if (onLogout) onLogout(); else onBack();
        } catch (error) {
            setErrors(prev => ({ 
                ...prev, 
                currentPassword: error.response?.data?.error || "Auth failure." 
            }));
        } finally {
            setIsLoading(false);
        }
    };

    // Design adjustments
    const inputBg = darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black';
    const borderColor = darkMode ? 'border-gray-800' : 'border-slate-300';
    const labelColor = darkMode ? 'text-gray-500' : 'text-slate-900';

    return (
        <main ref={containerRef} className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-950 text-gray-200' : 'bg-slate-50 text-black'} selection:bg-indigo-500/30`}>
            {/* --- RESPONSIVE STICKY HEADER (Matches SalesActivityPage) --- */}
            <header className={`sticky top-0 z-[100] backdrop-blur-md border-b px-4 md:px-6 py-4 transition-colors ${darkMode ? 'bg-gray-950/95 border-gray-800/60' : 'bg-white/95 border-slate-200'}`}>
                <div className="mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onBack} 
                            disabled={isLoading}
                            className={`p-2 border rounded-xl transition-all active:scale-95 disabled:opacity-30 ${darkMode ? 'bg-gray-900 border-gray-800 text-gray-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className={`text-2xl md:text-lg font-black tracking-tighter ${darkMode ? 'text-white' : 'text-slate-950'}`}>
                                Update <span className="text-indigo-600">Access</span>
                            </h1>
                            <p className={`text-[9px] font-black tracking-widest leading-none mt-1 ${darkMode ? 'text-gray-600' : 'text-slate-400'}`}>
                                SECURE CREDENTIAL SYNCHRONIZATION
                            </p>
                        </div>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${darkMode ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                        <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    </div>
                </div>
            </header>

            <div className="mx-auto p-4 md:p-8 space-y-8 pb-32">
                {/* SECURITY ALERT BANNER */}
                <div className={`border rounded-2xl p-4 flex gap-4 items-start ${darkMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className={`text-[11px] font-bold leading-relaxed ${darkMode ? 'text-amber-200/70' : 'text-amber-900'}`}>
                        Changing your password will terminate all active sessions. You will be required to log in again with your new credentials.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* CURRENT PASSWORD */}
                    <div className="space-y-2">
                        <label className={`text-[10px] font-black  tracking-widest ml-1 ${labelColor}`} htmlFor="current-pass">
                            Identity Verification
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                id="current-pass"
                                type={showPass ? "text" : "password"}
                                value={currentPassword}
                                onChange={handleChange}
                                required
                                disabled={isLoading}
                                className={`w-full pl-12 pr-12 py-4 border text-sm font-bold rounded-2xl focus:border-indigo-500 outline-none transition-all ${inputBg} ${errors.currentPassword ? 'border-red-500' : borderColor}`}
                                placeholder="Current Password"
                            />
                            {errors.currentPassword && (
                                <p className="text-[10px] font-bold text-red-600  mt-2 ml-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {errors.currentPassword}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* NEW PASSWORD */}
                    <div className="space-y-2">
                        <label className={`text-[10px] font-black  tracking-widest ml-1 ${labelColor}`} htmlFor="new-pass">
                            New Credentials
                        </label>
                        <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                id="new-pass"
                                type={showPass ? "text" : "password"}
                                value={newPassword}
                                onChange={handleChange}
                                required
                                disabled={isLoading}
                                className={`w-full pl-12 pr-12 py-4 border text-sm font-bold rounded-2xl focus:border-indigo-500 outline-none transition-all ${inputBg} ${errors.newPassword ? 'border-red-500' : borderColor}`}
                                placeholder="New Password"
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                            >
                                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {errors.newPassword && (
                            <p className="text-[10px] font-bold text-red-600  mt-2 ml-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {errors.newPassword}
                            </p>
                        )}
                    </div>

                    {/* CONFIRM PASSWORD */}
                    <div className="space-y-2">
                        <label className={`text-[10px] font-black  tracking-widest ml-1 ${labelColor}`} htmlFor="confirm-pass">
                            Confirm New Credentials
                        </label>
                        <div className="relative">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                id="confirm-pass"
                                type={showPass ? "text" : "password"}
                                value={confirmNewPassword}
                                onChange={handleChange}
                                required
                                disabled={isLoading}
                                className={`w-full pl-12 pr-4 py-4 border text-sm font-bold rounded-2xl focus:border-indigo-500 outline-none transition-all ${inputBg} ${errors.confirmNewPassword ? 'border-red-500' : borderColor}`}
                                placeholder="Repeat New Password"
                            />
                            {!errors.confirmNewPassword && confirmNewPassword && confirmNewPassword === newPassword && (
                                <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                            )}
                        </div>
                        {errors.confirmNewPassword && (
                            <p className="text-[10px] font-bold text-red-600  mt-2 ml-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {errors.confirmNewPassword}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs  tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100 flex items-center justify-center gap-3"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Synchronizing...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" /> 
                                Update Credentials
                            </>
                        )}
                    </button>
                </form>
            </div>
        </main>
    );
};

export default ChangePasswordForm;