import React, {useState} from 'react'
import {ArrowLeft, Plus, Trash2, Users, UserPlus, X} from 'lucide-react'

// --- Feature Access Definitions for Display ---
const ROLE_PERMISSIONS = {
    Owner: ['Full Dashboard', 'Billing', 'Inventory', 'Khata', 'Reports', 'Settings', 'Staff Management'],
    Manager: ['Standard Dashboard', 'Billing', 'Inventory Management', 'Khata Management'],
    Cashier: ['Limited Dashboard', 'Billing (Point of Sale)', 'Khata Transaction Logging'],
};

// --- Updated Modal Component: AddStaffModal ---

const AddStaffModal = ({ isOpen, onClose, onAddStaff, showToast, nextId }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'Cashier' // Default role
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email) {
            showToast("Please fill in all required fields.", 'error');
            return;
        }
        
        // Mock validation for email uniqueness
        if (formData.email.includes('ravi@')) {
             showToast("Email address already exists.", 'error');
             return;
        }

        // Call the parent function to add the new staff member
        onAddStaff({
            id: nextId, // Pass the calculated next ID
            ...formData,
            active: true // New staff members are active by default
        });
        
        // Reset form and close modal
        setFormData({ name: '', email: '', role: 'Cashier' });
        onClose();
    };
    
    // Do not render if not open
    if (!isOpen) return null;

    return (
        // Modal Backdrop
        <div className="fixed inset-0 bg-gray-900 bg-opacity-85 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
            
            {/* Modal Content - Retains bg-gray-800 for contrast */}
            <div className="bg-gray-800 w-full max-w-lg rounded-xl shadow-2xl border border-gray-700 transform scale-100 transition-transform duration-300">
                
                {/* Header - Used bg-indigo-900/40 for a themed header color */}
                <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-indigo-900/40 rounded-t-xl">
                    <h2 className="text-xl font-bold text-white flex items-center">
                        <UserPlus className="w-5 h-5 mr-3 text-indigo-300" /> 
                        Add New Staff Member
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition p-1 rounded-full hover:bg-gray-700">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4"> {/* Adjusted space-y to 4 for consistency */}
                    
                    {/* INFO ALERT - Updated styling for dark theme compliance with indigo accent */}
                    <p className="text-sm text-indigo-300 bg-gray-700/50 p-3 rounded-lg border border-indigo-700/50">
                        Upon creation, an <strong>activation link</strong> will be securely sent to the provided email address for the staff member to set up their own login password.
                    </p>
                    
                    {/* Name Input */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder='e.g., Jane Doe'
                        />
                    </div>
                    
                    {/* Email Input */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder='e.g., jane@shop.com'
                        />
                    </div>

                    {/* Role Select */}
                    <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-1">Role/Permissions</label>
                        <select
                            id="role"
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="w-full p-3 border border-gray-600 bg-gray-700 text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
                        >
                            <option className="bg-gray-700" value="Cashier">Cashier (Sales & Khata logging)</option>
                            <option className="bg-gray-700" value="Manager">Manager (Inventory, Khata, & Standard Reports View)</option>
                        </select>
                    </div>

                    {/* NEW: Role Permissions Display */}
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
                                    (Note: Full Reports and Settings are exclusive to the Owner role.)
                                </span>
                            </li>
                        </ul>
                    </div>
                    
                    {/* Footer / Action Buttons */}
                    <div className="pt-4 flex justify-end space-x-3">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition font-semibold"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition shadow-md flex items-center"
                        >
                            <Plus className="w-5 h-5 inline-block mr-1" /> Add Staff
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Updated StaffPermissionsManager Component (Main) ---

const StaffPermissionsManager = ({ onBack, showToast, setConfirmModal }) => {
    // Mock Staff Data
    const [staff, setStaff] = useState([
        { id: 1, name: 'Priya Cashier', email: 'priya@shop.com', role: 'Cashier', active: true },
        { id: 2, name: 'Ravi Manager', email: 'ravi@shop.com', role: 'Manager', active: true },
        { id: 3, name: 'Guest User', email: 'guest@shop.com', role: 'Cashier', active: false },
        { id: 4, name: 'Admin Owner', email: 'owner@shop.com', role: 'Owner', active: true },
    ]);
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Handler to open the modal
    const handleAddStaffClick = () => {
        setIsAddModalOpen(true);
    };

    // Handler to add the staff member to the list
    const handleAddStaff = (newStaff) => {
        setStaff(prev => [...prev, newStaff]);
        // Updated success message to reflect the new process
        showToast(`Staff member ${newStaff.name} added. Setup link sent to ${newStaff.email}.`, 'success'); 
        setIsAddModalOpen(false); // Close the modal
    };
    
    const handleToggleActive = (id) => {
        if (staff.find(s => s.id === id)?.role === 'Owner') {
            showToast("Cannot deactivate the primary Owner account.", 'error');
            return;
        }
        setStaff(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
        showToast(`User status updated. (Mocked)`, 'info');
    };
    
    const handleRemoveStaff = (id, name) => {
        if (staff.find(s => s.id === id)?.role === 'Owner') {
            showToast("Cannot remove the primary Owner account.", 'error');
            return;
        }

        // NOTE: setConfirmModal is assumed to be passed from the parent Settings component
        setConfirmModal({
            message: `Are you sure you want to permanently remove ${name} from your staff? This action cannot be undone.`,
            onConfirm: () => {
                setStaff(prev => prev.filter(s => s.id !== id));
                showToast(`${name} removed. (Mocked)`, 'success');
                setConfirmModal(null); 
            },
            onCancel: () => setConfirmModal(null) 
        });
    };
    
    // Standardized Role Badge Classes based on the dark theme's indigo/teal accents
    const getRoleBadgeClasses = (role) => {
        switch (role) {
            case 'Owner':
                // Retaining a slightly different color (teal/purple mix) for Owner status
                return 'bg-purple-700 text-purple-200 border border-purple-600 shadow-lg';
            case 'Manager':
                // Manager role using a distinct indigo variant
                return 'bg-indigo-900 text-indigo-300 border border-indigo-700';
            case 'Cashier':
                // Cashier role using the dark gray background with indigo text
                return 'bg-gray-700 text-indigo-300 border border-indigo-700';
            default:
                return 'bg-gray-700 text-gray-400';
        }
    }

    // Calculate the next ID for the new staff member
    const nextStaffId = staff.length > 0 ? Math.max(...staff.map(s => s.id)) + 1 : 1;

    return (
        // Applied consistent background and padding from ChangePasswordForm
        <div className="p-4 md:p-6 min-h-screen-safe bg-gray-900 rounded-xl">
            
            <div className="max-w-4xl mx-auto">
                <button 
                    onClick={onBack} 
                    // Back button styling uses indigo accent
                    className="flex items-center text-indigo-400 hover:underline mb-6 font-medium text-sm"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Settings
                </button>
                
                {/* Heading style matched to ChangePasswordForm's h2 */}
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
                    <Users className="w-6 h-6 mr-3 text-indigo-400" />
                    Staff & Permissions
                </h2>
                <p className="text-gray-400 mb-6 text-sm">Manage access roles, activation status, and staff accounts.</p>
            </div>


            <div className="max-w-4xl mx-auto space-y-4"> {/* Adjusted space-y to 4 */}
                
                {/* Add Staff Button - Primary Action (Indigo) */}
                <button 
                    className="w-full sm:w-auto flex items-center justify-center bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition font-semibold shadow-md"
                    onClick={handleAddStaffClick}
                >
                    <Plus className="w-5 h-5 mr-2" /> Add New Staff
                </button>

                {/* Staff List */}
                <div className="space-y-3">
                    {staff.map((s) => (
                        <div 
                            key={s.id} 
                            // Card background updated to bg-gray-800 for slightly better list contrast
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
                                    onClick={() => handleToggleActive(s.id)}
                                    className={`flex-1 sm:flex-none text-sm font-semibold px-4 py-2 rounded-xl transition shadow-lg flex items-center justify-center disabled:opacity-50 ${
                                        s.active 
                                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-900/50' // Primary accent
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                                    title={s.active ? "Click to Deactivate" : "Click to Activate"}
                                    disabled={s.role === 'Owner'} 
                                >
                                    {s.active ? 'ACTIVE' : 'INACTIVE'}
                                </button>
                                
                                {/* Remove Button (Red for destructive action, dark background on hover) */}
                                <button
                                    onClick={() => handleRemoveStaff(s.id, s.name)}
                                    className="p-3 text-red-400 hover:text-white hover:bg-red-600 rounded-xl transition bg-gray-700/50 border border-red-700/50 flex-none disabled:opacity-50"
                                    title="Remove Staff"
                                    disabled={s.role === 'Owner'} 
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* 3. Add Staff Modal */}
            <AddStaffModal 
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAddStaff={handleAddStaff}
                showToast={showToast}
                nextId={nextStaffId}
            />

        </div>
    );
};

export default StaffPermissionsManager