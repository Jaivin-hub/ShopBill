import React from 'react';
import { X, Search, User, Store } from 'lucide-react';

const NewChatModal = ({
    show,
    onClose,
    newChatType,
    onChatTypeChange,
    newChatName,
    onChatNameChange,
    selectedUsers,
    onUserToggle,
    selectedOutlet,
    onOutletChange,
    availableUsers,
    searchTerm,
    onSearchChange,
    outlets,
    isPremium,
    onCreateChat,
    darkMode
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
            <div className={`${cardBase} w-full max-w-md rounded-2xl border overflow-hidden shadow-2xl`}>
                <div className={`p-6 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'} flex justify-between items-center`}>
                    <h3 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>New Chat</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-red-500/10 rounded-xl text-slate-500 hover:text-red-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
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

                    {/* Outlet Selection (Premium only) */}
                    {isPremium && (
                        <div>
                            <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                Outlet (Optional - leave empty for all outlets)
                            </label>
                            <select
                                value={selectedOutlet || ''}
                                onChange={(e) => onOutletChange(e.target.value || null)}
                                className={`w-full ${inputBase} px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20`}
                            >
                                <option value="">All Outlets</option>
                                {outlets.map(outlet => (
                                    <option key={outlet._id} value={outlet._id}>{outlet.name}</option>
                                ))}
                            </select>
                            {newChatType === 'group' && !selectedOutlet && isPremium && (
                                <p className="text-[10px] text-indigo-500 mt-2">
                                    All staff from all your outlets will be added to this group.
                                </p>
                            )}
                        </div>
                    )}

                    {/* User Selection */}
                    {!(newChatType === 'group' && !selectedOutlet && isPremium) && (
                        <div>
                            <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                {newChatType === 'direct' ? 'Select Person' : 'Select Participants'}
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
                            <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                                {filteredUsers.map(user => {
                                    const isSelected = selectedUsers.includes(user._id);
                                    return (
                                        <button
                                            key={user._id}
                                            type="button"
                                            onClick={() => onUserToggle(user._id, newChatType === 'direct')}
                                            className={`w-full p-3 rounded-xl text-left transition-all border ${
                                                isSelected
                                                    ? 'bg-indigo-500/10 border-indigo-500'
                                                    : darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                                    <User className="w-4 h-4 text-slate-600" />
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
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className={`p-6 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'} flex gap-3`}>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                            darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onCreateChat}
                        disabled={newChatType === 'group' && !newChatName.trim()}
                        className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {newChatType === 'group' ? 'Create Group' : 'Create Chat'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewChatModal;


