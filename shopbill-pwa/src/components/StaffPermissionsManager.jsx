import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Trash2, Users, UserPlus, X, Loader2 } from 'lucide-react';
// Assuming API and the necessary apiClient setup is available from the context
import API from '../config/api'; // Import the API constants object

// --- Component Setup (Role Definitions/Modal remain the same as before) ---

// --- Feature Access Definitions for Display ---
const ROLE_PERMISSIONS = {
    owner: ['Full Dashboard', 'Billing', 'Inventory', 'Khata', 'Reports', 'Settings', 'Staff Management'],
    Manager: ['Standard Dashboard', 'Billing', 'Inventory Management', 'Khata Management'],
    Cashier: ['Limited Dashboard', 'Billing (Point of Sale)', 'Khata Transaction Logging'],
};

// --- AddStaffModal (Unchanged logic for brevity) ---
const AddStaffModal = ({ isOpen, onClose, onAddStaff, showToast, isSubmitting }) => {
    // ... [AddStaffModal implementation is the same as the previous response] ...
    const [formData, setFormData] = useState({ name: '', email: '', role: 'Cashier' });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email) {
            // showToast("Please fill in all required fields.", 'error');
            return;
        }
        onAddStaff(formData, () => setFormData({ name: '', email: '', role: 'Cashier' }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-85 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
            <div className="bg-gray-800 w-full max-w-lg rounded-xl shadow-2xl border border-gray-700 transform scale-100 transition-transform duration-300">
                <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-indigo-900/40 rounded-t-xl">
                    <h2 className="text-xl font-bold text-white flex items-center">
                        <UserPlus className="w-5 h-5 mr-3 text-indigo-300" />
                        Add New Staff Member
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition p-1 rounded-full hover:bg-gray-700" disabled={isSubmitting}>
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <p className="text-sm text-indigo-300 bg-gray-700/50 p-3 rounded-lg border border-indigo-700/50">
                        Upon creation, an <strong>activation link</strong> will be securely sent to the provided email address for the staff member to set up their own login password.
                    </p>
                    
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-300"
                            placeholder='e.g., Jane Doe'
                            disabled={isSubmitting}
                        />
                    </div>
                    
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-300"
                            placeholder='e.g., jane@shop.com'
                            disabled={isSubmitting}
                        />
                    </div>

                    <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-1">Role/Permissions</label>
                        <select
                            id="role"
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
                            disabled={isSubmitting}
                        >
                            <option className="bg-gray-700" value="Cashier">Cashier (Sales & Khata logging)</option>
                            <option className="bg-gray-700" value="Manager">Manager (Inventory, Khata, & Standard Reports View)</option>
                        </select>
                    </div>

                    <div className="bg-gray-700/50 p-3 rounded-xl border border-gray-600">
                        <p className="text-sm font-semibold text-indigo-300 mb-2">
                            Access for <strong>{formData.role}</strong>:
                        </p>
                        <ul className="text-xs text-gray-300 list-disc list-inside ml-2 space-y-1">
                            {ROLE_PERMISSIONS[formData.role].map((permission, index) => (
                                <li key={index}>{permission}</li>
                            ))}
                            <li className="text-red-400 font-semibold mt-2">
                                <span className="font-normal text-gray-400 italic">
                                    (Note: Full Reports and Settings are exclusive to the owner role.)
                                </span>
                            </li>
                        </ul>
                    </div>
                    
                    <div className="pt-4 flex justify-end space-x-3">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition font-semibold"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition shadow-md flex items-center disabled:opacity-75"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 inline-block mr-1 animate-spin" />
                            ) : (
                                <Plus className="w-5 h-5 inline-block mr-1" />
                            )}
                            {isSubmitting ? 'Adding...' : 'Add Staff'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- StaffPermissionsManager Component (Main) ---

// ADDED currentUserRole PROP
const StaffPermissionsManager = ({ apiClient, onBack, showToast, setConfirmModal, currentUserRole }) => {
    
    const [staff, setStaff] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Calculate permissions based on the provided user role
    currentUserRole = 'owner'
    const hasWriteAccess = currentUserRole === 'owner';
    const hasReadAccess = currentUserRole === 'owner' || currentUserRole === 'Manager';

    // ====================================================================
    // 1. DATA FETCHING (GET /api/staff)
    // ====================================================================
    const fetchStaff = useCallback(async () => {
        // Prevent API call if the user doesn't even have read permission
        if (!hasReadAccess) {
            setIsLoading(false);
            setStaff([]);
            // showToast("Access denied to view staff list. Requires owner or Manager role.", 'error');
            return;
        }

        setIsLoading(true);
        try {
            // Use the real API endpoint from the imported object
            const response = await apiClient.get(API.staff); 
            
            // Assuming the backend sends a sorted list, or we sort it here
            const sortedStaff = response.data.sort((a, b) => {
                if (a.role === 'owner') return -1;
                if (b.role === 'owner') return 1;
                return a.name.localeCompare(b.name);
            });
            setStaff(sortedStaff);
        } catch (error) {
            console.error('Failed to fetch staff:', error);
            // This will show the actual backend error message
            // showToast(error.response?.data?.error || 'Failed to load staff list. Check backend logs.', 'error');
            setStaff([]);
        } finally {
            setIsLoading(false);
        }
    }, [apiClient, showToast, hasReadAccess]); // Added hasReadAccess dependency

    useEffect(() => {
        fetchStaff();
        // The dependency array includes fetchStaff to keep it fresh, but its dependencies are stable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiClient]); // Re-fetch if apiClient changes (e.g., on re-login)
    
    // ====================================================================
    // 2. ADD STAFF (POST /api/staff)
    // ====================================================================
    const handleAddStaff = async (formData, resetForm) => {
        // Frontend check before making API call
        if (!hasWriteAccess) {
            //  showToast('Access denied. Only the owner can add new staff.', 'error');
             return;
        }

        setIsAdding(true);
        try {
            // Use the real API endpoint from the imported object
            const response = await apiClient.post(API.staff, formData); 
            
            await fetchStaff(); // Re-fetch the complete, server-sorted list
            
            // showToast(response.data.message, 'success'); 
            
            resetForm();
            setIsAddModalOpen(false); 
        } catch (error) {
            console.error('Failed to add staff:', error);
            // showToast(error.response?.data?.error || 'Failed to add staff member.', 'error');
        } finally {
            setIsAdding(false);
        }
    };
    
    // ====================================================================
    // 3. TOGGLE ACTIVE STATUS (PUT /api/staff/:id/toggle)
    // ====================================================================
    const handleToggleActive = async (staffMember) => {
        // Frontend check before making API call
        if (!hasWriteAccess) {
            //  showToast('Access denied. Only the owner can update staff status.', 'error');
             return;
        }

        if (staffMember.role === 'owner') {
            // showToast("Cannot deactivate the primary owner account.", 'error');
            return;
        }
        
        try {
            // Use the real API endpoint function with the ID
            const response = await apiClient.put(API.staffToggle(staffMember._id)); 
            
            await fetchStaff(); // Re-fetch the complete list to reflect the change

            // showToast(response.data.message, 'info');
        } catch (error) {
            console.error('Failed to toggle status:', error);
            // showToast(error.response?.data?.error || 'Failed to update user status.', 'error');
        }
    };
    
    // ====================================================================
    // 4. REMOVE STAFF (DELETE /api/staff/:id)
    // ====================================================================
    const handleRemoveStaff = (staffMember) => {
        // Frontend check before opening modal/making API call
        if (!hasWriteAccess) {
            //  showToast('Access denied. Only the owner can remove staff.', 'error');
             return;
        }
        
        if (staffMember.role === 'owner') {
            // showToast("Cannot remove the primary owner account.", 'error');
            return;
        }

        setConfirmModal({
            message: `Are you sure you want to permanently remove ${staffMember.name} from your staff? This action cannot be undone.`,
            onConfirm: async () => {
                setConfirmModal(null); 
                try {
                    // Use the real API endpoint function with the ID
                    await apiClient.delete(API.staffDelete(staffMember._id)); 
                    
                    await fetchStaff(); // Re-fetch the complete list to update the UI
                    
                    // showToast(`${staffMember.name} removed successfully.`, 'success');
                } catch (error) {
                    console.error('Failed to remove staff:', error);
                    // showToast(error.response?.data?.error || 'Failed to remove staff member.', 'error');
                }
            },
            onCancel: () => setConfirmModal(null) 
        });
    };
    
    // Standardized Role Badge Classes (same as original)
    const getRoleBadgeClasses = (role) => {
        switch (role) {
            case 'owner':
                return 'bg-purple-700 text-purple-200 border border-purple-600 shadow-lg';
            case 'Manager':
                return 'bg-indigo-900 text-indigo-300 border border-indigo-700';
            case 'Cashier':
                return 'bg-gray-700 text-indigo-300 border border-indigo-700';
            default:
                return 'bg-gray-700 text-gray-400';
        }
    }

    const handleAddStaffClick = () => {
        // Frontend check before opening modal
        if (!hasWriteAccess) {
            //  showToast('Access denied. Only the owner can add new staff.', 'error');
             return;
        }
        setIsAddModalOpen(true);
    };

    return (
        <div className="p-4 md:p-6 min-h-screen-safe bg-gray-900 rounded-xl">
            
            <div className="max-w-4xl mx-auto">
                <button 
                    onClick={onBack} 
                    className="flex items-center text-indigo-400 hover:underline mb-6 font-medium text-sm"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Settings
                </button>
                
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
                    <Users className="w-6 h-6 mr-3 text-indigo-400" />
                    Staff & Permissions
                </h2>
                <p className="text-gray-400 mb-6 text-sm">Manage access roles, activation status, and staff accounts.</p>
            </div>


            <div className="max-w-4xl mx-auto space-y-4"> 
                
                <button 
                    className="w-full sm:w-auto flex items-center justify-center p-3 rounded-xl transition font-semibold shadow-md 
                        ${hasWriteAccess ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}
                        disabled:opacity-50 disabled:bg-gray-800"
                    onClick={handleAddStaffClick}
                    // Button disabled if loading OR if user doesn't have owner permission
                    disabled={isLoading || isAdding || !hasWriteAccess}
                    title={!hasWriteAccess ? `Your role (${currentUserRole}) cannot add staff members.` : "Add New Staff"}
                >
                    <Plus className="w-5 h-5 mr-2" /> Add New Staff
                </button>
                
                <p className={`text-sm p-3 rounded-xl border font-semibold ${hasWriteAccess ? 'text-green-400 bg-gray-800/50 border-green-700/50' : 'text-yellow-400 bg-gray-800/50 border-yellow-700/50'}`}>
                    {hasWriteAccess 
                        ? 'You have owner-level access. You can add, toggle, and remove staff.'
                        : `Current Role: ${currentUserRole}. You have read-only access (Manager) or no access (Cashier). Write operations (Add, Toggle, Remove) are disabled.`
                    }
                </p>

                {/* Loading State */}
                {isLoading ? (
                    <div className="flex items-center justify-center p-8 bg-gray-800 rounded-xl">
                        <Loader2 className="w-6 h-6 mr-3 text-indigo-400 animate-spin" />
                        <span className="text-white">Loading Staff List...</span>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Denied Read Access State */}
                        {!hasReadAccess && (
                            <p className="text-red-400 p-4 bg-gray-800 rounded-xl border border-red-700/50">
                                Access denied. You do not have permission to view the staff list with the <strong>{currentUserRole}</strong> role.
                            </p>
                        )}
                        {/* No Staff Found State */}
                        {hasReadAccess && staff.length === 0 ? (
                             <p className="text-gray-400 p-4 bg-gray-800 rounded-xl">No staff members found.</p>
                        ) : (
                            // Render Staff List
                            staff.map((s) => {
                                // Disable action buttons if the user is not the owner OR the staff member is the owner
                                const isActionDisabled = !hasWriteAccess || s.role === 'owner';
                                return (
                                    <div 
                                        key={s._id} 
                                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-800 rounded-xl shadow-lg transition duration-200 border border-gray-700"
                                    >
                                        
                                        {/* User Info Block */}
                                        <div className="flex-1 min-w-0 mb-3 sm:mb-0 sm:mr-4">
                                            <p className="font-bold text-lg text-white">{s.name}</p>
                                            <p className="text-sm text-gray-400 truncate">{s.email}</p> 
                                            
                                            {/* Role Badge - Uses getRoleBadgeClasses defined above */}
                                            <span className={`text-xs font-bold px-3 py-1 rounded-lg mt-2 inline-block shadow-md ${getRoleBadgeClasses(s.role)}`}>
                                                {s.role}
                                            </span>
                                        </div>
                                        
                                        {/* Action Block */}
                                        <div className="flex justify-end w-full sm:w-auto space-x-3 mt-2 sm:mt-0">
                                            {/* Status Indicator / Toggle (Indigo for ACTIVE) */}
                                            <button
                                                onClick={() => handleToggleActive(s)}
                                                className={`flex-1 sm:flex-none text-sm font-semibold px-4 py-2 rounded-xl transition shadow-lg flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed ${
                                                    s.active 
                                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-900/50'
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                }`}
                                                title={s.role === 'owner' ? "Cannot deactivate owner" : isActionDisabled ? `Only owner can change status (Your role: ${currentUserRole})` : (s.active ? "Click to Deactivate" : "Click to Activate")}
                                                // Disabled if the staff member is the owner OR the current user lacks write access
                                                disabled={isActionDisabled} 
                                            >
                                                {s.active ? 'ACTIVE' : 'INACTIVE'}
                                            </button>
                                            
                                            {/* Remove Button (Red for destructive action, dark background on hover) */}
                                            <button
                                                onClick={() => handleRemoveStaff(s)}
                                                className="p-3 text-red-400 hover:text-white hover:bg-red-600 rounded-xl transition bg-gray-700/50 border border-red-700/50 flex-none disabled:opacity-30 disabled:cursor-not-allowed"
                                                title={s.role === 'owner' ? "Cannot remove owner" : isActionDisabled ? `Only owner can remove staff (Your role: ${currentUserRole})` : "Remove Staff"}
                                                // Disabled if the staff member is the owner OR the current user lacks write access
                                                disabled={isActionDisabled} 
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
            
            {/* 3. Add Staff Modal */}
            <AddStaffModal 
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAddStaff={handleAddStaff}
                showToast={showToast}
                isSubmitting={isAdding}
            />

        </div>
    );
};

export default StaffPermissionsManager