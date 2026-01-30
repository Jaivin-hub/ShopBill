import React, { useState, useEffect, useCallback } from 'react';
import { 
    ArrowLeft, Plus, Trash2, Users, UserPlus, X, 
    Loader2, ShieldCheck, Mail, User, Crown, 
    ChevronRight, Power, Info, ShieldAlert, Edit3
} from 'lucide-react';
import API from '../config/api';

// --- Feature Access Definitions for Display ---
const ROLE_PERMISSIONS = {
    owner: ['Full Dashboard', 'Billing', 'Inventory', 'Khata', 'Reports', 'Settings', 'Staff Management'],
    Manager: ['Standard Dashboard', 'Billing', 'Inventory Management', 'Khata Management'],
    Cashier: ['Limited Dashboard', 'Billing (Point of Sale)', 'Khata Transaction Logging'],
};

// --- EditRoleModal ---
const EditRoleModal = ({ isOpen, onClose, onUpdateRole, staffMember, isSubmitting, darkMode }) => {
    const [selectedRole, setSelectedRole] = useState('');

    useEffect(() => {
        if (staffMember) setSelectedRole(staffMember.role);
    }, [staffMember]);

    if (!isOpen || !staffMember) return null;

    const modalBg = darkMode ? 'bg-gray-950 border-gray-800' : 'bg-white border-slate-300 shadow-2xl';
    const inputBg = darkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-slate-300 text-black';

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-4">
            <div className={`${modalBg} w-full max-w-md rounded-[1.25rem] border overflow-hidden animate-in zoom-in-95 duration-200`}>
                <div className={`p-6 border-b flex justify-between items-center ${darkMode ? 'border-gray-800 bg-indigo-500/5' : 'border-slate-100 bg-slate-50'}`}>
                    <div>
                        <h2 className={`text-lg font-black tracking-tighter flex items-center ${darkMode ? 'text-white' : 'text-black'}`}>
                            <Edit3 className="w-5 h-5 mr-3 text-indigo-500" />
                            Update Tier
                        </h2>
                        <p className={`text-[9px] font-black tracking-widest mt-1 uppercase ${darkMode ? 'text-gray-500' : 'text-slate-600'}`}>Role Modification</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition p-2" disabled={isSubmitting}>
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-500`}>
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <p className={`text-sm font-black ${darkMode ? 'text-white' : 'text-black'}`}>{staffMember.name}</p>
                            <p className="text-[10px] text-slate-500 font-bold">{staffMember.email}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className={`text-[10px] font-black tracking-widest uppercase ${darkMode ? 'text-gray-500' : 'text-slate-600'}`}>Select New Role</label>
                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className={`w-full px-4 py-4 border text-sm font-bold rounded-2xl focus:border-indigo-500 outline-none appearance-none cursor-pointer ${inputBg}`}
                            disabled={isSubmitting}
                        >
                            <option value="Cashier">Cashier Tier</option>
                            <option value="Manager">Management Tier</option>
                        </select>
                    </div>

                    <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-slate-50 border-slate-200'}`}>
                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2">Tier Permissions:</p>
                        <div className="flex flex-wrap gap-1.5">
                            {ROLE_PERMISSIONS[selectedRole]?.map((perm, idx) => (
                                <span key={idx} className={`text-[8px] font-black px-2 py-0.5 rounded ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-slate-200 text-slate-700'}`}>
                                    {perm}
                                </span>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={() => onUpdateRole(staffMember._id, selectedRole)}
                        className="w-full py-4 bg-indigo-600 text-white font-black text-xs tracking-widest rounded-2xl hover:bg-indigo-500 transition shadow-lg disabled:opacity-50"
                        disabled={isSubmitting || selectedRole === staffMember.role}
                    >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm Role Update'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- AddStaffModal ---
const AddStaffModal = ({ isOpen, onClose, onAddStaff, isSubmitting, darkMode }) => {
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

    if (!isOpen) return null;

    const modalBg = darkMode ? 'bg-gray-950 border-gray-800' : 'bg-white border-slate-300 shadow-2xl';
    const inputBg = darkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-slate-300 text-black';

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-4">
            <div className={`${modalBg} w-full max-w-lg rounded-[1.25rem] border overflow-hidden animate-in zoom-in-95 duration-200`}>
                <div className={`p-8 border-b flex justify-between items-center ${darkMode ? 'border-gray-800 bg-indigo-500/5' : 'border-slate-100 bg-slate-50'}`}>
                    <div>
                        <h2 className={`text-xl font-black  tracking-tighter flex items-center ${darkMode ? 'text-white' : 'text-black'}`}>
                            <UserPlus className="w-6 h-6 mr-3 text-indigo-500" />
                            Provision Staff
                        </h2>
                        <p className={`text-[10px] font-black  tracking-widest mt-1 ${darkMode ? 'text-gray-500' : 'text-slate-600'}`}>Access Credentialing</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition p-2 rounded-full" disabled={isSubmitting}>
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    <div className={`flex gap-3 p-4 rounded-2xl border ${darkMode ? 'bg-indigo-500/5 border-indigo-500/10' : 'bg-indigo-50 border-indigo-100'}`}>
                        <Info className="w-5 h-5 text-indigo-500 shrink-0" />
                        <p className={`text-[11px] font-bold leading-relaxed ${darkMode ? 'text-indigo-200/70' : 'text-indigo-900'}`}>
                            A secure <strong>activation link</strong> will be dispatched to the email provided for identity verification.
                        </p>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className={`w-full pl-12 pr-4 py-4 border text-sm font-bold rounded-2xl focus:border-indigo-500 outline-none transition-all ${inputBg}`}
                                placeholder='Full Legal Name'
                                disabled={isSubmitting}
                            />
                        </div>
                        
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className={`w-full pl-12 pr-4 py-4 border text-sm font-bold rounded-2xl focus:border-indigo-500 outline-none transition-all ${inputBg}`}
                                placeholder='Corporate Email Address'
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="relative group">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className={`w-full pl-12 pr-4 py-4 border text-sm font-bold rounded-2xl focus:border-indigo-500 outline-none appearance-none cursor-pointer ${inputBg}`}
                                disabled={isSubmitting}
                            >
                                <option value="Cashier">Cashier Tier</option>
                                <option value="Manager">Management Tier</option>
                            </select>
                        </div>
                    </div>

                    <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-slate-50 border-slate-200'}`}>
                        <p className={`text-[10px] font-black  tracking-widest mb-3 flex items-center ${darkMode ? 'text-gray-500' : 'text-slate-900'}`}>
                            <ChevronRight className="w-3 h-3 mr-1 text-indigo-500" /> Permissions Manifest: {formData.role}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {ROLE_PERMISSIONS[formData.role].map((perm, idx) => (
                                <span key={idx} className={`text-[9px] font-black px-2 py-1 rounded-md  tracking-tighter ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-slate-200 text-slate-800'}`}>
                                    {perm}
                                </span>
                            ))}
                        </div>
                    </div>
                    
                    <button 
                        type="submit"
                        className="w-full py-4 bg-indigo-600 text-white font-black text-xs  tracking-widest rounded-2xl hover:bg-indigo-500 transition shadow-lg active:scale-95 disabled:opacity-50"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                        {isSubmitting ? 'Provisioning...' : 'Add Member to Team'}
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

    const handleAddStaff = async (formData, resetForm) => {
        if (!hasWriteAccess) return;
        setIsProcessing(true);
        try {
            await apiClient.post(API.staff, formData); 
            if (showToast) showToast('Staff provisioned successfully.', 'success');
            await fetchStaff(); 
            resetForm();
            setIsAddModalOpen(false); 
        } catch (error) {
            if (showToast) showToast(error.response?.data?.error || 'Add failed.', 'error');
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
    
    const getRoleStyles = (role) => {
        switch (role) {
            case 'owner': return darkMode ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' : 'text-purple-700 bg-purple-100 border-purple-200';
            case 'Manager': return darkMode ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' : 'text-indigo-700 bg-indigo-100 border-indigo-200';
            default: return darkMode ? 'text-gray-400 bg-gray-800 border-gray-700' : 'text-slate-600 bg-slate-100 border-slate-200';
        }
    };

    return (
        <main className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-950 text-gray-200' : 'bg-slate-100 text-black'} selection:bg-indigo-500/30`}>
            {/* --- RESPONSIVE STICKY HEADER --- */}
            <header className={`sticky top-0 z-[100] backdrop-blur-md border-b px-4 md:px-6 py-4 transition-colors ${darkMode ? 'bg-gray-950/95 border-gray-800/60' : 'bg-white/95 border-slate-200'}`}>
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className={`p-2 border rounded-xl transition-all active:scale-95 ${darkMode ? 'bg-gray-900 border-gray-800 text-gray-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className={`text-2xl md:text-lg font-black tracking-tighter ${darkMode ? 'text-white' : 'text-slate-950'}`}>
                                Staff <span className="text-indigo-600">Directory</span>
                            </h1>
                            <p className={`text-[9px] font-black tracking-widest leading-none mt-1 ${darkMode ? 'text-gray-600' : 'text-slate-400'}`}>
                                Access control & permissions management
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        disabled={isLoading || !hasWriteAccess}
                        className="hidden sm:flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px]  tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-600/20"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add Member
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 pb-32">
                {/* Access Level Banner */}
                <div className={`p-4 rounded-[1.5rem] border flex items-center gap-4 ${hasWriteAccess 
                    ? (darkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100') 
                    : (darkMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-100')}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasWriteAccess ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        {hasWriteAccess ? <Crown className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                    </div>
                    <div>
                        <p className={`text-[10px] font-black  tracking-widest ${darkMode ? 'text-gray-500' : 'text-slate-600'}`}>Security Authorization</p>
                        <p className={`text-xs font-bold ${hasWriteAccess ? (darkMode ? 'text-emerald-400' : 'text-emerald-700') : (darkMode ? 'text-amber-400' : 'text-amber-700')}`}>
                            {hasWriteAccess ? 'Owner Mode: Full Administrative Control Active' : `Restricted Mode: ${effectiveRole} privileges applied.`}
                        </p>
                    </div>
                </div>

                {/* Staff List */}
                {isLoading ? (
                    <div className={`flex flex-col items-center justify-center p-20 rounded-[1.25rem] border ${darkMode ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-slate-200'}`}>
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                        <p className={`text-[10px] font-black  tracking-[0.2em] ${darkMode ? 'text-gray-500' : 'text-slate-600'}`}>Synchronizing Directory...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {!hasReadAccess ? (
                            <div className={`p-8 text-center rounded-[1.25rem] border ${darkMode ? 'bg-gray-900/40 border-red-500/20' : 'bg-white border-red-100'}`}>
                                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                <p className={`font-black  tracking-tighter ${darkMode ? 'text-white' : 'text-black'}`}>Access Denied</p>
                                <p className={`text-sm font-bold mt-2 ${darkMode ? 'text-gray-500' : 'text-slate-600'}`}>Elevated privileges required to view directory.</p>
                            </div>
                        ) : staff.length === 0 ? (
                            <div className={`p-20 text-center rounded-[1.25rem] border ${darkMode ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-slate-200'}`}>
                                <Users className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-gray-700' : 'text-slate-300'}`} />
                                <p className={`font-bold ${darkMode ? 'text-gray-500' : 'text-slate-500'}`}>No active staff found in directory.</p>
                            </div>
                        ) : (
                            staff.map((s) => {
                                const isActionDisabled = !hasWriteAccess || s.role === 'owner';
                                return (
                                    <div 
                                        key={s._id} 
                                        className={`group flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border rounded-[2rem] transition-all ${darkMode ? 'bg-gray-900/40 border-gray-800 hover:border-gray-700' : 'bg-white border-slate-200 hover:border-indigo-200 shadow-sm'}`}
                                    >
                                        <div className="flex items-center gap-5 flex-1">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${getRoleStyles(s.role)}`}>
                                                {s.role === 'owner' ? <Crown className="w-6 h-6" /> : <User className="w-6 h-6" />}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className={`text-lg font-black  tracking-tighter truncate leading-tight ${darkMode ? 'text-white' : 'text-black'}`}>{s.name}</h3>
                                                <p className={`text-xs font-bold truncate ${darkMode ? 'text-gray-500' : 'text-slate-600'}`}>{s.email}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border  tracking-widest ${getRoleStyles(s.role)}`}>
                                                        {s.role}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className={`flex items-center gap-3 w-full sm:w-auto mt-6 sm:mt-0 pt-6 sm:pt-0 border-t sm:border-0 ${darkMode ? 'border-gray-800' : 'border-slate-100'}`}>
                                            <button
                                                onClick={() => handleToggleActive(s)}
                                                disabled={isActionDisabled} 
                                                className={`flex-1 sm:flex-none px-5 py-3 rounded-2xl font-black text-[10px]  tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${
                                                    s.active 
                                                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white'
                                                    : (darkMode ? 'bg-gray-800 text-gray-400 border border-gray-700' : 'bg-slate-100 text-slate-400 border border-slate-200 hover:border-slate-400')
                                                } disabled:opacity-20`}
                                            >
                                                <Power className="w-3.5 h-3.5" />
                                                {s.active ? 'Active' : 'Offline'}
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setSelectedStaff(s);
                                                    setIsEditModalOpen(true);
                                                }}
                                                disabled={isActionDisabled} 
                                                className={`p-3.5 rounded-2xl transition-all active:scale-95 disabled:opacity-20 ${darkMode ? 'text-indigo-400 bg-gray-900 border border-gray-800 hover:bg-indigo-600 hover:text-white' : 'text-indigo-600 bg-slate-50 border border-slate-200 hover:bg-indigo-600 hover:text-white'}`}
                                            >
                                                <Edit3 className="w-5 h-5" />
                                            </button>
                                            
                                            <button
                                                onClick={() => handleRemoveStaff(s)}
                                                disabled={isActionDisabled} 
                                                className={`p-3.5 rounded-2xl transition-all active:scale-95 disabled:opacity-20 ${darkMode ? 'text-red-500 bg-gray-900 border border-gray-800 hover:bg-red-500 hover:text-white' : 'text-red-600 bg-slate-50 border border-slate-200 hover:bg-red-600 hover:text-white'}`}
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                )}
            </div>

            <button 
                onClick={() => setIsAddModalOpen(true)}
                className="fixed bottom-25 right-6 sm:hidden w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 z-[150]"
            >
                <Plus className="w-8 h-8" />
            </button>
            
            <AddStaffModal 
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAddStaff={handleAddStaff}
                isSubmitting={isProcessing}
                darkMode={darkMode}
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