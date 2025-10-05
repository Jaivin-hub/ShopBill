import React, {useState} from 'react'
import {ArrowLeft, Plus, Trash2} from 'lucide-react'

const StaffPermissionsManager = ({ onBack, showToast, setConfirmModal }) => {
    // Mock Staff Data
    const [staff, setStaff] = useState([
        { id: 1, name: 'Priya Cashier', email: 'priya@shop.com', role: 'Cashier', active: true },
        { id: 2, name: 'Ravi Manager', email: 'ravi@shop.com', role: 'Manager', active: true },
        { id: 3, name: 'Guest User', email: 'guest@shop.com', role: 'Cashier', active: false },
        { id: 4, name: 'Admin Owner', email: 'owner@shop.com', role: 'Owner', active: true },
    ]);

    const handleToggleActive = (id) => {
        setStaff(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
        showToast(`User status updated.`, 'info');
    };
    
    // Updated to use ConfirmationModal from parent component
    const handleRemoveStaff = (id, name) => {
        setConfirmModal({
            message: `Are you sure you want to permanently remove ${name} from your staff? This action cannot be undone.`,
            onConfirm: () => {
                setStaff(prev => prev.filter(s => s.id !== id));
                showToast(`${name} removed. (Mocked)`, 'success');
                setConfirmModal(null); // Close modal on success
            },
            onCancel: () => setConfirmModal(null) // Close modal on cancel
        });
    };

    return (
        <div className="p-4 md:p-6">
            <button onClick={onBack} className="flex items-center text-indigo-600 dark:text-indigo-400 hover:underline mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Settings
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Staff & Permissions</h2>

            <button 
                className="w-full sm:w-auto flex items-center justify-center bg-green-600 text-white p-3 rounded-xl hover:bg-green-700 transition font-semibold shadow-md mb-6"
                onClick={() => showToast('New staff creation form opened (Mock)', 'info')}
            >
                <Plus className="w-5 h-5 mr-2" /> Add New Staff
            </button>

            <div className="divide-y divide-gray-200 dark:divide-gray-700 space-y-2">
                {staff.map((s) => (
                    <div key={s.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition duration-200 border border-gray-100 dark:border-gray-700">
                        
                        {/* User Info Block - Increased bottom margin on mobile */}
                        <div className="flex-1 min-w-0 mb-3 sm:mb-0 sm:mr-4">
                            <p className="font-semibold text-lg text-gray-900 dark:text-white">{s.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{s.email}</p>
                            
                            {/* Role Badge */}
                            <span className={`text-xs font-bold px-3 py-1 rounded-full mt-2 inline-block shadow-sm ${
                                s.role === 'Owner' ? 'bg-indigo-600 text-white' : 
                                s.role === 'Manager' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                            }`}>
                                {s.role}
                            </span>
                        </div>
                        
                        {/* Action Block - Now spans full width on mobile, right-aligned */}
                        <div className="flex justify-end w-full sm:w-auto space-x-3 mt-2 sm:mt-0">
                             {/* Status Indicator / Toggle */}
                            <button
                                onClick={() => handleToggleActive(s.id)}
                                className={`flex-1 sm:flex-none text-sm font-medium px-3 py-2 rounded-xl transition shadow-inner flex items-center justify-center ${
                                    s.active 
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300' 
                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-400'
                                }`}
                                title={s.active ? "Click to Deactivate" : "Click to Activate"}
                            >
                                {s.active ? 'Active' : 'Inactive'}
                            </button>
                            
                            {/* Remove Button */}
                            <button
                                onClick={() => handleRemoveStaff(s.id, s.name)}
                                className="p-3 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-xl transition ring-1 ring-red-500/30 flex-none"
                                title="Remove Staff"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StaffPermissionsManager