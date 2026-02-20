import React, { useState, useEffect, useCallback } from 'react';
import { 
    ArrowLeft, Plus, Trash2, Users, UserPlus, X, 
    Loader2, ShieldCheck, Mail, User, Crown, 
    ChevronRight, Power, Info, ShieldAlert, Edit3, AlertCircle, HelpCircle, Clock, CheckCircle2, XCircle
} from 'lucide-react';
import API from '../config/api';
import AttendanceCalendar from './AttendanceCalendar';
import ConfirmationModal from './ConfirmationModal';

// --- Feature Access Definitions for Display ---
const ROLE_PERMISSIONS = {
    owner: [
        'Full Dashboard Access',
        'Billing & POS',
        'Inventory Management',
        'Ledger (Khata)',
        'Supply Chain Management',
        'Reports & Analytics',
        'Team Management',
        'Store Network (Outlets)'
    ],
    Manager: [
        'Dashboard Access',
        'Billing & POS',
        'Inventory Management',
        'Ledger (Khata)',
        'Supply Chain Management'
    ],
    Cashier: [
        'Dashboard Access',
        'Billing & POS',
        'Ledger (Khata)'
    ],
};

// Helper function for role styles
const getRoleStyles = (role, darkMode) => {
    switch (role) {
        case 'owner': return darkMode ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' : 'text-purple-700 bg-purple-100 border-purple-200';
        case 'Manager': return darkMode ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' : 'text-indigo-700 bg-indigo-100 border-indigo-200';
        default: return darkMode ? 'text-slate-400 bg-slate-800 border-slate-700' : 'text-slate-600 bg-slate-100 border-slate-200';
    }
};

// --- EditRoleModal ---
const EditRoleModal = ({ isOpen, onClose, onUpdateRole, staffMember, isSubmitting, darkMode }) => {
    const [selectedRole, setSelectedRole] = useState('');

    useEffect(() => {
        if (staffMember) setSelectedRole(staffMember.role);
    }, [staffMember]);

    if (!isOpen || !staffMember) return null;

    const modalBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xl';
    const inputBg = darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900';
    const cardBase = darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200';

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-3 sm:p-4">
            <div className={`${modalBg} w-full max-w-md h-[85vh] sm:h-[80vh] max-h-[550px] rounded-xl sm:rounded-2xl border overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col`}>
                <div className={`p-3 sm:p-4 border-b flex justify-between items-center ${darkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'} flex-shrink-0`}>
                    <div>
                        <h2 className={`text-lg md:text-xl font-black tracking-tight flex items-center ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            <Edit3 className="w-5 h-5 mr-3 text-indigo-500 shrink-0" />
                            Update Tier
                        </h2>
                        <p className={`text-[9px] font-black tracking-[0.2em] mt-0.5 uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Role Modification</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition p-2 shrink-0" disabled={isSubmitting}>
                        <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>
                
                <div className="p-4 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-500 shrink-0`}>
                            <User className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <p className={`text-sm font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{staffMember.name}</p>
                            <p className={`text-[10px] font-bold mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{staffMember.email}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className={`text-[9px] font-black tracking-[0.2em] uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Select New Role</label>
                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className={`w-full px-4 py-3 sm:py-4 border text-sm font-bold rounded-xl sm:rounded-2xl focus:border-indigo-500 outline-none appearance-none cursor-pointer transition-all ${inputBg}`}
                            disabled={isSubmitting}
                        >
                            <option value="Cashier">Cashier Tier</option>
                            <option value="Manager">Management Tier</option>
                        </select>
                    </div>

                    <div className={`p-4 rounded-xl md:rounded-2xl border ${cardBase}`}>
                        <p className={`text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Tier Permissions:</p>
                        <div className="flex flex-wrap gap-1.5">
                            {ROLE_PERMISSIONS[selectedRole]?.map((perm, idx) => (
                                <span key={idx} className={`text-[8px] font-black px-2 py-0.5 rounded ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'}`}>
                                    {perm}
                                </span>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={() => onUpdateRole(staffMember._id, selectedRole)}
                        className="w-full py-3 sm:py-4 bg-indigo-600 text-white font-black text-xs tracking-widest rounded-xl sm:rounded-2xl hover:bg-indigo-500 transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                        disabled={isSubmitting || selectedRole === staffMember.role}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                                <span>Updating...</span>
                            </>
                        ) : (
                            <span>Confirm Role Update</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- StaffStatusButton Component ---
const StaffStatusButton = ({ staff, isActionDisabled, isPendingActivation, onToggleActive, onEdit, onRemove, darkMode, borderStyle, cardBase, apiClient, API, showToast, isCurrentlyActive, punchInTime, isOnBreak }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [showAttendance, setShowAttendance] = useState(false);

    // Format punch in time
    const formatPunchInTime = (punchIn) => {
        if (!punchIn) return '';
        const date = new Date(punchIn);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m ago`;
        
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    return (
        <div className="space-y-3">
            <div 
                className={`group flex flex-col p-4 md:p-6 border rounded-xl md:rounded-2xl transition-all ${cardBase} ${darkMode ? 'hover:border-slate-700' : 'hover:border-indigo-200'}`}
            >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                    <div className="flex items-center gap-4 md:gap-5 flex-1 min-w-0">
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center border shrink-0 ${getRoleStyles(staff.role, darkMode)}`}>
                            {staff.role === 'owner' ? <Crown className="w-5 h-5 md:w-6 md:h-6" /> : <User className="w-5 h-5 md:w-6 md:h-6" />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className={`text-base md:text-lg font-black tracking-tight truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{staff.name}</h3>
                            <p className={`text-[11px] md:text-xs font-bold truncate mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{staff.email}</p>
                            {staff.role !== 'owner' && !isPendingActivation && (
                                <div className="flex items-center gap-2 mt-2">
                                    <div className={`flex items-center gap-1.5 ${isCurrentlyActive 
                                        ? (isOnBreak 
                                            ? (darkMode ? 'text-amber-400' : 'text-amber-600')
                                            : (darkMode ? 'text-emerald-400' : 'text-emerald-600'))
                                        : (darkMode ? 'text-slate-500' : 'text-slate-400')
                                    }`}>
                                        <div className={`w-2 h-2 rounded-full ${isCurrentlyActive 
                                            ? (isOnBreak 
                                                ? (darkMode ? 'bg-amber-500' : 'bg-amber-500')
                                                : (darkMode ? 'bg-emerald-500' : 'bg-emerald-500'))
                                            : (darkMode ? 'bg-slate-600' : 'bg-slate-400')
                                        } ${isCurrentlyActive ? 'animate-pulse' : ''}`} />
                                        <span className={`text-[10px] md:text-[11px] font-bold ${isCurrentlyActive 
                                            ? (isOnBreak 
                                                ? 'text-amber-600 dark:text-amber-400'
                                                : 'text-emerald-600 dark:text-emerald-400')
                                            : 'text-slate-500 dark:text-slate-400'
                                        }`}>
                                            {isCurrentlyActive 
                                                ? (isOnBreak ? 'On Break' : 'Currently Working')
                                                : 'Not Working'}
                                        </span>
                                    </div>
                                    {isCurrentlyActive && punchInTime && (
                                        <span className={`text-[9px] md:text-[10px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            • {formatPunchInTime(punchInTime)}
                                        </span>
                                    )}
                                </div>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className={`text-[8px] md:text-[9px] font-black px-2 py-0.5 rounded border tracking-widest uppercase ${getRoleStyles(staff.role, darkMode)}`}>
                                    {staff.role}
                                </span>
                                {staff.active && !isPendingActivation && (
                                    <span className={`text-[8px] md:text-[9px] font-black px-2 py-0.5 rounded border tracking-widest uppercase flex items-center gap-1 ${darkMode ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-emerald-100 text-emerald-700 border-emerald-300'}`}>
                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                        Account Active
                                    </span>
                                )}
                                {!staff.active && !isPendingActivation && (
                                    <span className={`text-[8px] md:text-[9px] font-black px-2 py-0.5 rounded border tracking-widest uppercase flex items-center gap-1 ${darkMode ? 'bg-slate-700/50 text-slate-400 border-slate-600' : 'bg-slate-200 text-slate-600 border-slate-300'}`}>
                                        <XCircle className="w-2.5 h-2.5" />
                                        Account Deactivated
                                    </span>
                                )}
                                {isPendingActivation && (
                                    <span className={`text-[8px] md:text-[9px] font-black px-2 py-0.5 rounded border tracking-widest uppercase flex items-center gap-1 ${darkMode ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-amber-100 text-amber-700 border-amber-300'}`}>
                                        <AlertCircle className="w-2.5 h-2.5" />
                                        Pending Setup
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className={`flex items-center gap-2 md:gap-3 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 ${borderStyle}`}>
                        <div className="relative flex-1 sm:flex-none">
                    <button
                        onClick={() => onToggleActive(staff)}
                        disabled={isActionDisabled || isPendingActivation} 
                        className={`w-full sm:w-auto px-4 md:px-5 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${
                            staff.active 
                            ? (darkMode ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-600 hover:text-white' : 'bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-600 hover:text-white')
                            : isPendingActivation
                            ? (darkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-amber-50 text-amber-700 border border-amber-200')
                            : (darkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white')
                        } disabled:opacity-20`}
                    >
                        <Power className="w-3 h-3 md:w-3.5 md:h-3.5" />
                        {staff.active ? 'Deactivate Account' : isPendingActivation ? 'Pending Activation' : 'Activate Account'}
                    </button>
                    {isPendingActivation && (
                        <>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowTooltip(!showTooltip);
                                }}
                                className="absolute -top-1 -right-1 p-1 rounded-full bg-amber-500 text-white hover:bg-amber-600 transition-colors z-10"
                                title="Activation Status"
                            >
                                <HelpCircle className="w-3 h-3" />
                            </button>
                            {showTooltip && (
                                <div className={`absolute bottom-full right-0 mb-2 w-64 p-3 rounded-xl border shadow-lg z-20 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                                    <div className="flex gap-2">
                                        <Info className={`w-4 h-4 shrink-0 mt-0.5 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                                        <p className={`text-[10px] sm:text-[11px] font-bold leading-relaxed ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                                            An activation email with a password setup link has been sent to <strong>{staff.email}</strong>. The staff member needs to click the link and set their password to activate their account.
                                        </p>
                                    </div>
                                    <div className={`absolute bottom-0 right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${darkMode ? 'border-t-slate-800' : 'border-t-white'}`} style={{ transform: 'translateY(100%)' }}></div>
                                </div>
                            )}
                        </>
                    )}
                        </div>

                        <button
                            onClick={() => onEdit(staff)}
                            disabled={isActionDisabled} 
                            className={`p-2.5 md:p-3.5 rounded-xl md:rounded-2xl transition-all active:scale-95 disabled:opacity-20 ${darkMode ? 'text-indigo-400 bg-slate-900 border border-slate-800 hover:bg-indigo-600 hover:text-white' : 'text-indigo-600 bg-slate-50 border border-slate-200 hover:bg-indigo-600 hover:text-white'}`}
                        >
                            <Edit3 className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        
                        {/* Only show delete button for deactivated staff */}
                        {!staff.active && (
                            <button
                                onClick={() => onRemove(staff)}
                                disabled={isActionDisabled} 
                                className={`p-2.5 md:p-3.5 rounded-xl md:rounded-2xl transition-all active:scale-95 disabled:opacity-20 ${darkMode ? 'text-red-500 bg-slate-900 border border-slate-800 hover:bg-red-500 hover:text-white' : 'text-red-600 bg-slate-50 border border-slate-200 hover:bg-red-600 hover:text-white'}`}
                            >
                                <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                        )}
                    </div>
                </div>
                {staff.role !== 'owner' && !isPendingActivation && (
                    <button
                        onClick={() => setShowAttendance(!showAttendance)}
                        className={`w-full mt-4 py-2 px-4 rounded-lg text-xs font-black transition-all ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                    >
                        {showAttendance ? 'Hide' : 'View'} Attendance
                    </button>
                )}
            </div>
            {showAttendance && staff.role !== 'owner' && apiClient && API && showToast && (
                <AttendanceCalendar
                    apiClient={apiClient}
                    API={API}
                    showToast={showToast}
                    darkMode={darkMode}
                    staffId={staff._id}
                    staffName={staff.name}
                />
            )}
        </div>
    );
};

// --- AddStaffModal ---
const AddStaffModal = ({ isOpen, onClose, onAddStaff, isSubmitting, darkMode, error, onUpgradePlan }) => {
    const [formData, setFormData] = useState({ name: '', email: '', role: 'Cashier' });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validate fields
        const errors = {};
        if (!formData.name || !formData.name.trim()) {
            errors.name = 'Name is required.';
        } else if (formData.name.trim().length < 2) {
            errors.name = 'Name must be at least 2 characters.';
        }
        
        if (!formData.email || !formData.email.trim()) {
            errors.email = 'Email is required.';
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const trimmedEmail = formData.email.trim().toLowerCase();
            if (/\s/.test(trimmedEmail)) {
                errors.email = 'Email cannot contain spaces.';
            } else if (!emailRegex.test(trimmedEmail)) {
                errors.email = 'Please enter a valid email address.';
            }
        }
        
        if (Object.keys(errors).length > 0) {
            // Show errors (you can add error state if needed)
            return;
        }
        
        onAddStaff(formData, () => setFormData({ name: '', email: '', role: 'Cashier' }));
    };

    // Clear form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setFormData({ name: '', email: '', role: 'Cashier' });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const modalBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xl';
    const inputBg = darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900';
    const cardBase = darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200';

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-3 sm:p-4">
            <div className={`${modalBg} w-full max-w-lg h-[85vh] sm:h-[80vh] max-h-[600px] rounded-xl sm:rounded-[1.25rem] border overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col`}>
                <div className={`p-3 sm:p-4 border-b flex justify-between items-center flex-shrink-0 ${darkMode ? 'border-gray-800 bg-indigo-500/5' : 'border-slate-100 bg-slate-50'}`}>
                    <div>
                        <h2 className={`text-lg sm:text-xl font-black tracking-tighter flex items-center ${darkMode ? 'text-white' : 'text-black'}`}>
                            <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-indigo-500 shrink-0" />
                            Provision Staff
                        </h2>
                        <p className={`text-[9px] sm:text-[10px] font-black tracking-widest mt-1 ${darkMode ? 'text-gray-500' : 'text-slate-600'}`}>Access Credentialing</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition p-2 rounded-full shrink-0" disabled={isSubmitting}>
                        <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
                    {error && (
                        <div className={`flex flex-col gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl border ${darkMode ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-50 border-rose-200'}`}>
                            <div className="flex gap-2 sm:gap-3">
                                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 shrink-0 mt-0.5" />
                                <p className={`text-[10px] sm:text-[11px] font-bold leading-relaxed flex-1 ${darkMode ? 'text-rose-200' : 'text-rose-900'}`}>
                                    {error}
                                </p>
                            </div>
                            {error.includes('Plan Limit Reached') && onUpgradePlan && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onClose();
                                        onUpgradePlan();
                                    }}
                                    className={`w-full mt-2 px-4 py-2.5 rounded-lg text-[10px] sm:text-[11px] font-black tracking-widest transition-all hover:scale-105 active:scale-95 ${darkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                >
                                    Upgrade Now
                                </button>
                            )}
                        </div>
                    )}
                    <div className={`flex gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl border ${darkMode ? 'bg-indigo-500/5 border-indigo-500/10' : 'bg-indigo-50 border-indigo-100'}`}>
                        <Info className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 shrink-0 mt-0.5" />
                        <p className={`text-[10px] sm:text-[11px] font-bold leading-relaxed ${darkMode ? 'text-indigo-200/70' : 'text-indigo-900'}`}>
                            A secure <strong>activation link</strong> will be dispatched to the email provided for identity verification.
                        </p>
                    </div>
                    
                    <div className="space-y-3 sm:space-y-4">
                        <div className="relative group">
                            <User className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className={`w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 border text-sm font-bold rounded-xl sm:rounded-2xl focus:border-indigo-500 outline-none transition-all ${inputBg}`}
                                placeholder='Full Legal Name'
                                disabled={isSubmitting}
                            />
                        </div>
                        
                        <div className="relative group">
                            <Mail className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className={`w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 border text-sm font-bold rounded-xl sm:rounded-2xl focus:border-indigo-500 outline-none transition-all ${inputBg}`}
                                placeholder='Corporate Email Address'
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="relative group">
                            <ShieldCheck className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className={`w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 border text-sm font-bold rounded-xl sm:rounded-2xl focus:border-indigo-500 outline-none appearance-none cursor-pointer ${inputBg}`}
                                disabled={isSubmitting}
                            >
                                <option value="Cashier">Cashier Tier</option>
                                <option value="Manager">Management Tier</option>
                            </select>
                        </div>
                    </div>

                    <div className={`p-4 sm:p-5 rounded-xl sm:rounded-2xl border ${cardBase}`}>
                        <p className={`text-[9px] font-black tracking-[0.2em] mb-2 sm:mb-3 flex items-center uppercase ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                            <ChevronRight className="w-3 h-3 mr-1 text-indigo-500" /> Permissions Manifest: {formData.role}
                        </p>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {ROLE_PERMISSIONS[formData.role].map((perm, idx) => (
                                <span key={idx} className={`text-[8px] sm:text-[9px] font-black px-2 py-1 rounded-md tracking-tighter ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-800'}`}>
                                    {perm}
                                </span>
                            ))}
                        </div>
                    </div>
                    
                    <button 
                        type="submit"
                        className="w-full py-3 sm:py-4 bg-indigo-600 text-white font-black text-xs tracking-widest rounded-xl sm:rounded-2xl hover:bg-indigo-500 transition shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                                <span>Provisioning...</span>
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span>Add Member to Team</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- StaffPermissionsManager Main ---
const StaffPermissionsManager = ({ apiClient, onBack, showToast, setConfirmModal: externalSetConfirmModal, currentUserRole, darkMode, onUpgradePlan }) => {
    const [staff, setStaff] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [activeStaffIds, setActiveStaffIds] = useState(new Set());
    const [activeStaffMap, setActiveStaffMap] = useState({}); // Map of staffId -> { punchIn: Date }
    const [confirmModal, setConfirmModal] = useState(null); // Internal confirmation modal state

    // Ensure we have write/read access
    const effectiveRole = currentUserRole || 'owner'; 
    const hasWriteAccess = effectiveRole === 'owner';
    const hasReadAccess = effectiveRole === 'owner' || effectiveRole === 'Manager';

    const fetchStaff = useCallback(async () => {
        if (!hasReadAccess || !apiClient) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const response = await apiClient.get(API.staff); 
            const sortedStaff = response.data.sort((a, b) => {
                if (a.role === 'owner') return -1;
                if (b.role === 'owner') return 1;
                return a.name.localeCompare(b.name);
            });
            setStaff(sortedStaff);
        } catch (error) {
            console.error('Fetch failed:', error);
            if (showToast) showToast('Failed to sync directory.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [apiClient, hasReadAccess, showToast]);

    const fetchActiveStatus = useCallback(async () => {
        if (!hasReadAccess || !apiClient) return;
        try {
            const response = await apiClient.get(API.attendanceActiveStatus);
            if (response.data?.success) {
                if (response.data?.activeStaffIds) {
                    setActiveStaffIds(new Set(response.data.activeStaffIds));
                }
                // Store punch in times and break status for display
                if (response.data?.activeAttendance) {
                    const map = {};
                    response.data.activeAttendance.forEach(item => {
                        if (item.staffId && item.punchIn) {
                            map[item.staffId] = { 
                                punchIn: item.punchIn,
                                onBreak: item.onBreak || false
                            };
                        }
                    });
                    setActiveStaffMap(map);
                }
            }
        } catch (error) {
            // Silently fail - active status is not critical
            console.error('Failed to fetch active status:', error);
        }
    }, [apiClient, hasReadAccess]);

    useEffect(() => {
        fetchStaff();
        fetchActiveStatus();
        
        // Refresh active status every 30 seconds
        const interval = setInterval(() => {
            fetchActiveStatus();
        }, 30000);
        
        return () => clearInterval(interval);
    }, [fetchStaff, fetchActiveStatus]);

    const [addStaffError, setAddStaffError] = useState(null);

    const handleAddStaff = async (formData, resetForm) => {
        if (!hasWriteAccess) return;
        setAddStaffError(null); // Clear previous error
        setIsProcessing(true);
        try {
            await apiClient.post(API.staff, formData); 
            if (showToast) showToast('Staff provisioned successfully.', 'success');
            await fetchStaff(); 
            resetForm();
            setAddStaffError(null); // Clear error on success
            setIsAddModalOpen(false); 
        } catch (error) {
            const errorMessage = error.response?.data?.error || 'Add failed.';
            setAddStaffError(errorMessage); // Set error to display in modal
            if (showToast) showToast(errorMessage, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdateRole = async (id, newRole) => {
        setIsProcessing(true);
        try {
            // Using the newly defined staffRoleUpdate endpoint
            await apiClient.put(API.staffRoleUpdate(id), { role: newRole });
            if (showToast) showToast('Permissions updated.', 'success');
            await fetchStaff();
            setIsEditModalOpen(false);
            setSelectedStaff(null);
        } catch (error) {
            if (showToast) showToast(error.response?.data?.error || 'Update failed.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleToggleActive = async (staffMember) => {
        if (!hasWriteAccess || staffMember.role === 'owner') return;
        
        // If activating, do it directly without confirmation
        if (!staffMember.active) {
            try {
                await apiClient.put(API.staffToggle(staffMember._id)); 
                if (showToast) showToast('Staff account activated successfully.', 'success');
                await fetchStaff();
            } catch (error) {
                if (showToast) showToast('Failed to activate account.', 'error');
            }
            return;
        }
        
        // If deactivating, show confirmation modal
        const showModal = externalSetConfirmModal || setConfirmModal;
        showModal({
            message: `Are you sure you want to deactivate ${staffMember.name}? The staff member will not be able to access your store. The staff's store account will be deactivated.`,
            confirmText: 'Deactivate Account',
            cancelText: 'Cancel',
            onConfirm: async () => {
                if (externalSetConfirmModal) {
                    externalSetConfirmModal(null);
                } else {
                    setConfirmModal(null);
                }
                try {
                    await apiClient.put(API.staffToggle(staffMember._id)); 
                    if (showToast) showToast('Staff account deactivated successfully.', 'success');
                    await fetchStaff();
                } catch (error) {
                    if (showToast) showToast('Failed to deactivate account.', 'error');
                }
            },
            onCancel: () => {
                if (externalSetConfirmModal) {
                    externalSetConfirmModal(null);
                } else {
                    setConfirmModal(null);
                }
            }
        });
    };
    
    const handleRemoveStaff = (staffMember) => {
        if (!hasWriteAccess || staffMember.role === 'owner') return;

        const showModal = externalSetConfirmModal || setConfirmModal;
        showModal({
            message: `CRITICAL: Proceed with permanent removal of ${staffMember.name}? This terminates all access credentials immediately.`,
            onConfirm: async () => {
                if (externalSetConfirmModal) {
                    externalSetConfirmModal(null);
                } else {
                    setConfirmModal(null);
                }
                try {
                    await apiClient.delete(API.staffDelete(staffMember._id)); 
                    if (showToast) showToast('Staff member removed.', 'success');
                    await fetchStaff();
                } catch (error) {
                    if (showToast) showToast('Removal failed.', 'error');
                }
            },
            onCancel: () => {
                if (externalSetConfirmModal) {
                    externalSetConfirmModal(null);
                } else {
                    setConfirmModal(null);
                }
            }
        });
    };
    

    const themeBase = darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
    const cardBase = darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
    const headerBg = darkMode ? 'bg-slate-950' : 'bg-white';
    const borderStyle = darkMode ? 'border-slate-800/60' : 'border-slate-200';

    return (
        <main className={`min-h-screen transition-colors duration-300 ${themeBase}`}>
            {/* --- RESPONSIVE STICKY HEADER --- */}
            <header className={`sticky top-0 z-[100] backdrop-blur-xl border-b px-4 md:px-6 py-4 transition-colors ${headerBg} ${borderStyle} shadow-lg`}>
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className={`p-2 md:p-2.5 rounded-xl transition-all active:scale-95 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}>
                            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        <div>
                            <h1 className={`text-xl md:text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                Team <span className="text-indigo-500">Management</span>
                            </h1>
                            <p className={`text-[9px] font-black tracking-[0.2em] mt-0.5 md:mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Access control & permissions management.
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        disabled={isLoading || !hasWriteAccess}
                        className="hidden sm:flex items-center px-4 md:px-6 py-2 md:py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add Member
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6 pb-24 md:pb-32">
                {/* Staff List */}
                {isLoading ? (
                    <div className={`flex flex-col items-center justify-center p-12 md:p-20 rounded-xl md:rounded-2xl border ${cardBase}`}>
                        <Loader2 className="w-8 h-8 md:w-10 md:h-10 text-indigo-500 animate-spin mb-4" />
                        <p className={`text-[9px] font-black tracking-[0.2em] uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Synchronizing Directory...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 md:gap-4">
                        {!hasReadAccess ? (
                            <div className={`p-6 md:p-8 text-center rounded-xl md:rounded-2xl border ${cardBase}`}>
                                <ShieldAlert className="w-10 h-10 md:w-12 md:h-12 text-red-500 mx-auto mb-4" />
                                <p className={`text-base md:text-lg font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Access Denied</p>
                                <p className={`text-xs md:text-sm font-bold mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Elevated privileges required to view directory.</p>
                            </div>
                        ) : staff.length === 0 ? (
                            <div className={`p-12 md:p-20 text-center rounded-xl md:rounded-2xl border ${cardBase}`}>
                                <Users className={`w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                                <p className={`text-sm md:text-base font-black ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No active staff found in directory.</p>
                            </div>
                        ) : (
                            staff.map((s) => {
                                const isActionDisabled = !hasWriteAccess || s.role === 'owner';
                                const isPendingActivation = s.passwordSetupStatus === 'pending' && !s.active;
                                const isCurrentlyActive = activeStaffIds.has(s._id);
                                const punchInTime = activeStaffMap[s._id]?.punchIn;
                                const isOnBreak = activeStaffMap[s._id]?.onBreak || false;
                                return (
                                    <StaffStatusButton
                                        key={s._id}
                                        staff={s}
                                        isActionDisabled={isActionDisabled}
                                        isPendingActivation={isPendingActivation}
                                        onToggleActive={handleToggleActive}
                                        onEdit={(staff) => {
                                            setSelectedStaff(staff);
                                            setIsEditModalOpen(true);
                                        }}
                                        onRemove={handleRemoveStaff}
                                        darkMode={darkMode}
                                        borderStyle={borderStyle}
                                        cardBase={cardBase}
                                        apiClient={apiClient}
                                        API={API}
                                        showToast={showToast}
                                        isCurrentlyActive={isCurrentlyActive}
                                        punchInTime={punchInTime}
                                        isOnBreak={isOnBreak}
                                    />
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            <button 
                onClick={() => setIsAddModalOpen(true)}
                disabled={isLoading || !hasWriteAccess}
                className="sm:hidden fixed bottom-24 right-4 z-[60] w-14 h-14 rounded-full bg-indigo-600 text-white shadow-2xl shadow-indigo-500/50 hover:bg-indigo-500 active:scale-95 transition-all flex items-center justify-center hover:shadow-indigo-600/60 disabled:opacity-50"
                aria-label="Add new staff member"
            >
                <Plus className="w-6 h-6" strokeWidth={2.5} />
            </button>
            
            <AddStaffModal 
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setAddStaffError(null); // Clear error when closing modal
                }}
                onAddStaff={handleAddStaff}
                isSubmitting={isProcessing}
                darkMode={darkMode}
                error={addStaffError}
                onUpgradePlan={onUpgradePlan}
            />

            <EditRoleModal 
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedStaff(null);
                }}
                staffMember={selectedStaff}
                onUpdateRole={handleUpdateRole}
                isSubmitting={isProcessing}
                darkMode={darkMode}
            />

            {/* Confirmation Modal for Deactivation and Deletion */}
            {confirmModal && !externalSetConfirmModal && (
                <ConfirmationModal 
                    message={confirmModal.message}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={confirmModal.onCancel}
                    darkMode={darkMode}
                    confirmText={confirmModal.confirmText || 'Confirm'}
                    cancelText={confirmModal.cancelText || 'Cancel'}
                />
            )}
        </main>
    );
};

export default StaffPermissionsManager;