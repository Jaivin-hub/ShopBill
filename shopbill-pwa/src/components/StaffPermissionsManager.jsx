import React, { useState, useEffect, useCallback } from 'react';
import { 
    ArrowLeft, Plus, Trash2, Users, UserPlus, X, 
    Loader2, ShieldCheck, Mail, User, Crown, 
    ChevronRight, Power, Info, ShieldAlert 
} from 'lucide-react';
import API from '../config/api';

// --- Feature Access Definitions for Display ---
const ROLE_PERMISSIONS = {
    owner: ['Full Dashboard', 'Billing', 'Inventory', 'Khata', 'Reports', 'Settings', 'Staff Management'],
    Manager: ['Standard Dashboard', 'Billing', 'Inventory Management', 'Khata Management'],
    Cashier: ['Limited Dashboard', 'Billing (Point of Sale)', 'Khata Transaction Logging'],
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
        if (!formData.name || !formData.email) return;
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
                        <h2 className={`text-xl font-black uppercase tracking-tighter flex items-center ${darkMode ? 'text-white' : 'text-black'}`}>
                            <UserPlus className="w-6 h-6 mr-3 text-indigo-500" />
                            Provision Staff
                        </h2>
                        <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${darkMode ? 'text-gray-500' : 'text-slate-600'}`}>Access Credentialing</p>
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
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-3 flex items-center ${darkMode ? 'text-gray-500' : 'text-slate-900'}`}>
                            <ChevronRight className="w-3 h-3 mr-1 text-indigo-500" /> Permissions Manifest: {formData.role}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {ROLE_PERMISSIONS[formData.role].map((perm, idx) => (
                                <span key={idx} className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-tighter ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-slate-200 text-slate-800'}`}>
                                    {perm}
                                </span>
                            ))}
                        </div>
                    </div>
                    
                    <button 
                        type="submit"
                        className="w-full py-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-indigo-500 transition shadow-lg active:scale-95 disabled:opacity-50"
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
    const [isAdding, setIsAdding] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    currentUserRole = 'owner'; // Mocking role as requested
    const hasWriteAccess = currentUserRole === 'owner';
    const hasReadAccess = currentUserRole === 'owner' || currentUserRole === 'Manager';

    const fetchStaff = useCallback(async () => {
        if (!hasReadAccess) {
            setIsLoading(false);
            setStaff([]);
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
            setStaff([]);
        } finally {
            setIsLoading(false);
        }
    }, [apiClient, hasReadAccess]);

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    const handleAddStaff = async (formData, resetForm) => {
        if (!hasWriteAccess) return;
        setIsAdding(true);
        try {
            await apiClient.post(API.staff, formData); 
            await fetchStaff(); 
            resetForm();
            setIsAddModalOpen(false); 
        } catch (error) {
            console.error('Add failed:', error);
        } finally {
            setIsAdding(false);
        }
    };
    
    const handleToggleActive = async (staffMember) => {
        if (!hasWriteAccess || staffMember.role === 'owner') return;
        try {
            await apiClient.put(API.staffToggle(staffMember._id)); 
            await fetchStaff();
        } catch (error) {
            console.error('Toggle failed:', error);
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
                    await fetchStaff();
                } catch (error) {
                    console.error('Delete failed:', error);
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
            {/* STICKY HEADER PARTNER */}
            <header className={`sticky top-0 z-[100] border-b backdrop-blur-xl ${darkMode ? 'bg-gray-950/80 border-gray-800/50' : 'bg-white/90 border-slate-200 shadow-sm'}`}>
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
                    <div>
                        <button onClick={onBack} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 mb-1 hover:text-indigo-500 transition-colors">
                            <ArrowLeft className="w-3 h-3" /> Settings
                        </button>
                        <h1 className={`text-xl md:text-2xl font-black tracking-tighter uppercase flex items-center gap-2 ${darkMode ? 'text-white' : 'text-black'}`}>
                            Staff <span className="text-indigo-600 not-italic">Directory</span>
                        </h1>
                    </div>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        disabled={isLoading || !hasWriteAccess}
                        className="hidden sm:flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add Staff
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
                        <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-slate-600'}`}>Security Authorization</p>
                        <p className={`text-xs font-bold ${hasWriteAccess ? (darkMode ? 'text-emerald-400' : 'text-emerald-700') : (darkMode ? 'text-amber-400' : 'text-amber-700')}`}>
                            {hasWriteAccess ? 'Owner Mode: Full Administrative Control Active' : `Restricted Mode: ${currentUserRole} privileges applied.`}
                        </p>
                    </div>
                </div>

                {/* Staff List */}
                {isLoading ? (
                    <div className={`flex flex-col items-center justify-center p-20 rounded-[1.25rem] border ${darkMode ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-slate-200'}`}>
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${darkMode ? 'text-gray-500' : 'text-slate-600'}`}>Synchronizing Directory...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {!hasReadAccess ? (
                            <div className={`p-8 text-center rounded-[1.25rem] border ${darkMode ? 'bg-gray-900/40 border-red-500/20' : 'bg-white border-red-100'}`}>
                                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                <p className={`font-black uppercase tracking-tighter ${darkMode ? 'text-white' : 'text-black'}`}>Access Denied</p>
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
                                                <h3 className={`text-lg font-black uppercase tracking-tighter truncate leading-tight ${darkMode ? 'text-white' : 'text-black'}`}>{s.name}</h3>
                                                <p className={`text-xs font-bold truncate ${darkMode ? 'text-gray-500' : 'text-slate-600'}`}>{s.email}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${getRoleStyles(s.role)}`}>
                                                        {s.role}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className={`flex items-center gap-3 w-full sm:w-auto mt-6 sm:mt-0 pt-6 sm:pt-0 border-t sm:border-0 ${darkMode ? 'border-gray-800' : 'border-slate-100'}`}>
                                            <button
                                                onClick={() => handleToggleActive(s)}
                                                disabled={isActionDisabled} 
                                                className={`flex-1 sm:flex-none px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${
                                                    s.active 
                                                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white'
                                                    : (darkMode ? 'bg-gray-800 text-gray-400 border border-gray-700' : 'bg-slate-100 text-slate-400 border border-slate-200 hover:border-slate-400')
                                                } disabled:opacity-20`}
                                            >
                                                <Power className="w-3.5 h-3.5" />
                                                {s.active ? 'Active' : 'Offline'}
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
                className="fixed bottom-6 right-6 sm:hidden w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 z-[150]"
            >
                <Plus className="w-8 h-8" />
            </button>
            
            <AddStaffModal 
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAddStaff={handleAddStaff}
                isSubmitting={isAdding}
                darkMode={darkMode}
            />
        </main>
    );
};

export default StaffPermissionsManager;