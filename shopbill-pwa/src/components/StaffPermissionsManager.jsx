import React, { useState, useEffect, useCallback } from 'react';
import { 
    ArrowLeft, Plus, Trash2, Users, UserPlus, X, 
    Loader2, ShieldCheck, Mail, User, Crown, 
    ChevronRight, Power, Info, ShieldAlert, Edit3, AlertCircle, HelpCircle
} from 'lucide-react';
import API from '../config/api';
import AttendanceCalendar from './AttendanceCalendar';

// --- Feature Access Definitions for Display ---
const ROLE_PERMISSIONS = {
    owner: ['Full Dashboard', 'Billing', 'Inventory', 'Khata', 'Reports', 'Settings', 'Staff Management'],
    Manager: ['Standard Dashboard', 'Billing', 'Inventory Management', 'Khata Management'],
    Cashier: ['Limited Dashboard', 'Billing (Point of Sale)', 'Khata Transaction Logging'],
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
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-3 sm:p-4 md:p-6 overflow-y-auto">
            <div className={`${modalBg} w-full max-w-md rounded-xl sm:rounded-2xl border overflow-hidden animate-in zoom-in-95 duration-200 my-auto max-h-[95vh] sm:max-h-[90vh] flex flex-col`}>
                <div className={`p-4 sm:p-5 md:p-6 border-b flex justify-between items-center ${darkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'} flex-shrink-0`}>
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
                
                <div className="p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1 min-h-0">
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
const StaffStatusButton = ({ staff, isActionDisabled, isPendingActivation, onToggleActive, onEdit, onRemove, darkMode, borderStyle, cardBase, apiClient, API, showToast }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [showAttendance, setShowAttendance] = useState(false);

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
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`text-[8px] md:text-[9px] font-black px-2 py-0.5 rounded border tracking-widest uppercase ${getRoleStyles(staff.role, darkMode)}`}>
                                    {staff.role}
                                </span>
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
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white'
                            : isPendingActivation
                            ? (darkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-amber-50 text-amber-700 border border-amber-200')
                            : (darkMode ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-slate-100 text-slate-400 border border-slate-200 hover:border-slate-400')
                        } disabled:opacity-20`}
                    >
                        <Power className="w-3 h-3 md:w-3.5 md:h-3.5" />
                        {staff.active ? 'Active' : isPendingActivation ? 'Pending Activation' : 'Offline'}
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
                        
                        <button
                            onClick={() => onRemove(staff)}
                            disabled={isActionDisabled} 
                            className={`p-2.5 md:p-3.5 rounded-xl md:rounded-2xl transition-all active:scale-95 disabled:opacity-20 ${darkMode ? 'text-red-500 bg-slate-900 border border-slate-800 hover:bg-red-500 hover:text-white' : 'text-red-600 bg-slate-50 border border-slate-200 hover:bg-red-600 hover:text-white'}`}
                        >
                            <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                    </div>
                </div>
                {staff.role !== 'owner' && (
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
const AddStaffModal = ({ isOpen, onClose, onAddStaff, isSubmitting, darkMode, error }) => {
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
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-3 sm:p-4 overflow-y-auto">
            <div className={`${modalBg} w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] rounded-xl sm:rounded-[1.25rem] border overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col my-auto`}>
                <div className={`p-4 sm:p-6 md:p-8 border-b flex justify-between items-center flex-shrink-0 ${darkMode ? 'border-gray-800 bg-indigo-500/5' : 'border-slate-100 bg-slate-50'}`}>
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
                
                <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0">
                    {error && (
                        <div className={`flex gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl border ${darkMode ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-50 border-rose-200'}`}>
                            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 shrink-0 mt-0.5" />
                            <p className={`text-[10px] sm:text-[11px] font-bold leading-relaxed ${darkMode ? 'text-rose-200' : 'text-rose-900'}`}>
                                {error}
                            </p>
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
const StaffPermissionsManager = ({ apiClient, onBack, showToast, setConfirmModal, currentUserRole, darkMode }) => {
    const [staff, setStaff] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);

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

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

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
        try {
            await apiClient.put(API.staffToggle(staffMember._id)); 
            await fetchStaff();
        } catch (error) {
            if (showToast) showToast('Failed to toggle status.', 'error');
        }
    };
    
    const handleRemoveStaff = (staffMember) => {
        if (!hasWriteAccess || staffMember.role === 'owner') return;

        setConfirmModal({
            message: `CRITICAL: Proceed with permanent removal of ${staffMember.name}? This terminates all access credentials immediately.`,
            onConfirm: async () => {
                setConfirmModal(null); 
                try {
                    await apiClient.delete(API.staffDelete(staffMember._id)); 
                    if (showToast) showToast('Staff member removed.', 'success');
                    await fetchStaff();
                } catch (error) {
                    if (showToast) showToast('Removal failed.', 'error');
                }
            },
            onCancel: () => setConfirmModal(null) 
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
                                Staff <span className="text-indigo-500">Directory</span>
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
                {/* Access Level Banner */}
                <div className={`p-4 md:p-5 rounded-xl md:rounded-2xl border flex items-center gap-4 ${hasWriteAccess 
                    ? (darkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100') 
                    : (darkMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-100')}`}>
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 ${hasWriteAccess ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        {hasWriteAccess ? <Crown className="w-5 h-5 md:w-6 md:h-6" /> : <ShieldAlert className="w-5 h-5 md:w-6 md:h-6" />}
                    </div>
                    <div className="min-w-0">
                        <p className={`text-[9px] font-black tracking-[0.2em] uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Security Authorization</p>
                        <p className={`text-xs md:text-sm font-black mt-0.5 ${hasWriteAccess ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') : (darkMode ? 'text-amber-400' : 'text-amber-600')}`}>
                            {hasWriteAccess ? 'Owner Mode: Full Administrative Control Active' : `Restricted Mode: ${effectiveRole} privileges applied.`}
                        </p>
                    </div>
                </div>

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
        </main>
    );
};

export default StaffPermissionsManager;