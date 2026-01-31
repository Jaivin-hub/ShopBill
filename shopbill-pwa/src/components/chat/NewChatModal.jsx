import React from 'react';
import { X, Search, User, Store, Loader2 } from 'lucide-react';

const NewChatModal = ({
    show,
    onClose,
    newChatType,
    onChatTypeChange,
    newChatName,
    onChatNameChange,
    selectedUsers,
    onUserToggle,
    availableUsers,
    searchTerm,
    onSearchChange,
    onCreateChat,
    darkMode,
    setSelectedUsers,
    isCreatingChat = false
}) => {
    if (!show) return null;

    const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
    const inputBase = darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900';

    const filteredUsers = availableUsers.filter(u => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return u.name?.toLowerCase().includes(term) ||
               u.email?.toLowerCase().includes(term) ||
               u.role?.toLowerCase().includes(term) ||
               u.outletName?.toLowerCase().includes(term);
    });

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-3 sm:p-4 md:p-6 overflow-y-auto">
            <div className={`${cardBase} w-full max-w-md rounded-xl sm:rounded-2xl border overflow-hidden shadow-2xl my-auto max-h-[95vh] sm:max-h-[90vh] flex flex-col`}>
                <div className={`p-4 sm:p-5 md:p-6 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'} flex justify-between items-center flex-shrink-0`}>
                    <h3 className={`text-base sm:text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {newChatType === 'group' ? 'Create Custom Group' : 'New Direct Chat'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 sm:p-2 hover:bg-red-500/10 rounded-xl text-slate-500 hover:text-red-500 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                </div>

                <div className="p-4 sm:p-5 md:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                    {/* Group Name */}
                    {newChatType === 'group' && (
                        <div>
                            <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                Group Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={newChatName}
                                onChange={(e) => onChatNameChange(e.target.value)}
                                placeholder="Enter group name"
                                className={`w-full ${inputBase} px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20`}
                                required
                            />
                        </div>
                    )}

                    {/* Quick Selection Buttons (Groups only) */}
                    {newChatType === 'group' && (
                        <div>
                            <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                Quick Select
                            </label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (setSelectedUsers) {
                                            const allManagers = availableUsers.filter(u => u.role === 'Manager').map(u => u._id);
                                            setSelectedUsers(prev => {
                                                // Check if all managers are already selected
                                                const allManagersSelected = allManagers.every(managerId => prev.includes(managerId));
                                                if (allManagersSelected) {
                                                    // Deselect all managers
                                                    return prev.filter(id => !allManagers.includes(id));
                                                } else {
                                                    // Select all managers (add to existing)
                                                    return [...new Set([...prev, ...allManagers])];
                                                }
                                            });
                                        }
                                    }}
                                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                                        (() => {
                                            const allManagers = availableUsers.filter(u => u.role === 'Manager').map(u => u._id);
                                            const allSelected = allManagers.length > 0 && allManagers.every(id => selectedUsers.includes(id));
                                            return allSelected
                                                ? 'bg-indigo-600 text-white border border-indigo-500'
                                                : darkMode 
                                                    ? 'bg-slate-800 border border-slate-700 text-slate-300 hover:border-indigo-500' 
                                                    : 'bg-slate-100 border border-slate-200 text-slate-700 hover:border-indigo-500';
                                        })()
                                    }`}
                                >
                                    All Managers
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (setSelectedUsers) {
                                            const allCashiers = availableUsers.filter(u => u.role === 'Cashier').map(u => u._id);
                                            setSelectedUsers(prev => {
                                                // Check if all cashiers are already selected
                                                const allCashiersSelected = allCashiers.every(cashierId => prev.includes(cashierId));
                                                if (allCashiersSelected) {
                                                    // Deselect all cashiers
                                                    return prev.filter(id => !allCashiers.includes(id));
                                                } else {
                                                    // Select all cashiers (add to existing)
                                                    return [...new Set([...prev, ...allCashiers])];
                                                }
                                            });
                                        }
                                    }}
                                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                                        (() => {
                                            const allCashiers = availableUsers.filter(u => u.role === 'Cashier').map(u => u._id);
                                            const allSelected = allCashiers.length > 0 && allCashiers.every(id => selectedUsers.includes(id));
                                            return allSelected
                                                ? 'bg-indigo-600 text-white border border-indigo-500'
                                                : darkMode 
                                                    ? 'bg-slate-800 border border-slate-700 text-slate-300 hover:border-indigo-500' 
                                                    : 'bg-slate-100 border border-slate-200 text-slate-700 hover:border-indigo-500';
                                        })()
                                    }`}
                                >
                                    All Cashiers
                                </button>
                            </div>
                        </div>
                    )}

                    {/* User Selection */}
                    <div>
                        <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {newChatType === 'direct' ? 'Select Person' : 'Select Staff Members *'}
                        </label>
                            <div className="relative mb-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={searchTerm}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                    className={`w-full pl-10 pr-4 py-2 ${inputBase} border rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20`}
                                />
                            </div>
                            <div className="max-h-40 sm:max-h-48 md:max-h-56 overflow-y-auto custom-scrollbar space-y-2">
                                {filteredUsers.length === 0 ? (
                                    <div className={`p-4 text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        <p className="text-sm">No staff members found</p>
                                    </div>
                                ) : (
                                    filteredUsers.map(user => {
                                        const isSelected = selectedUsers.includes(user._id);
                                        return (
                                            <button
                                                key={user._id}
                                                type="button"
                                                onClick={() => onUserToggle(user._id, newChatType === 'direct')}
                                                className={`w-full p-3 rounded-xl text-left transition-all border ${
                                                    isSelected
                                                        ? 'bg-indigo-500/10 border-indigo-500'
                                                        : darkMode ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                        isSelected ? 'bg-indigo-600' : darkMode ? 'bg-slate-700' : 'bg-slate-200'
                                                    }`}>
                                                        <User className={`w-4 h-4 ${isSelected ? 'text-white' : darkMode ? 'text-slate-400' : 'text-slate-600'}`} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                                            {user.name || user.email}
                                                        </p>
                                                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                            {user.role} {user.outletName && `• ${user.outletName}`}
                                                        </p>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                                                            <X className="w-3 h-3 text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                            {newChatType === 'group' && selectedUsers.length > 0 && (
                                <p className="text-[10px] text-indigo-500 mt-2">
                                    {selectedUsers.length} selected
                                </p>
                            )}
                        </div>
                </div>

                <div className={`p-4 sm:p-5 md:p-6 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'} flex flex-col sm:flex-row gap-2 sm:gap-3 flex-shrink-0`}>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`flex-1 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                            darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onCreateChat}
                        disabled={
                            isCreatingChat ||
                            (newChatType === 'group' && (!newChatName.trim() || selectedUsers.length === 0)) ||
                            (newChatType === 'direct' && selectedUsers.length !== 1)
                        }
                        className="flex-1 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isCreatingChat ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="hidden sm:inline">Creating...</span>
                                <span className="sm:hidden">Creating</span>
                            </>
                        ) : (
                            <>
                                <span className="hidden sm:inline">{newChatType === 'group' ? 'Create Custom Group' : 'Create Chat'}</span>
                                <span className="sm:hidden">{newChatType === 'group' ? 'Create Group' : 'Create'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewChatModal;


