import React, { useState } from 'react';
import { 
    ArrowLeft, Users, User, X, ShieldCheck, 
    Store, UserPlus, MessageSquare, 
    MoreVertical, Camera, Bell, Lock
} from 'lucide-react';

const ChatHeader = ({
    selectedChat,
    onBack,
    getChatDisplayName,
    onQuickMessage,
    onAddMember,
    darkMode,
    showInfo: externalShowInfo,
    onShowInfoChange,
    currentUser,
    staffList = [],
    onNavigateToStaffPermissions
}) => {
    const [internalShowInfo, setInternalShowInfo] = useState(false);
    const showInfo = externalShowInfo !== undefined ? externalShowInfo : internalShowInfo;
    const setShowInfo = onShowInfoChange || setInternalShowInfo;

    const participants = selectedChat?.participants || [];
    const isGroup = selectedChat?.type === 'group' || selectedChat?.isDefault;
    const displayName = getChatDisplayName(selectedChat);
    
    // Check if user is owner
    const isOwner = currentUser?.role?.toLowerCase() === 'owner';
    
    // Count all participants in the group (total members)
    const memberCount = participants.length;
    
    // Get outlet ID from selected chat
    const chatOutletId = selectedChat?.outletId?._id || selectedChat?.outletId;
    
    // Check if outlet has any staff (excluding owner)
    // staffList contains users with outletId field (can be object with _id or string)
    const outletHasStaff = chatOutletId && staffList.some(staff => {
        const staffOutletId = staff.outletId?._id || staff.outletId;
        const staffRole = staff.role?.toLowerCase();
        // Check if staff belongs to this outlet and is not an owner
        return staffOutletId && 
               String(staffOutletId) === String(chatOutletId) && 
               staffRole !== 'owner';
    });
    
    // Handle Add Staff button click
    // For outlet groups, always redirect to staff permissions page to add new staff
    const handleAddStaff = () => {
        setShowInfo(false);
        // Check if this is an outlet group (has outletId)
        if (chatOutletId && onNavigateToStaffPermissions) {
            // For outlet groups, navigate to staff permissions page
            onNavigateToStaffPermissions();
        } else if (onAddMember) {
            // For non-outlet groups, use the existing add member functionality
            onAddMember();
        }
    };

    // Theme Colors
    const drawerBg = darkMode ? 'bg-slate-950' : 'bg-white';
    const borderStyle = darkMode ? 'border-slate-800/60' : 'border-slate-200';

    return (
        /* HEADER: Will be sticky via parent container */
        <div className={`w-full ${darkMode ? 'bg-slate-950' : 'bg-white'} border-b ${borderStyle} shadow-sm`}>
            {/* --- NAV BAR --- */}
            <div className={`p-3 md:p-4 flex items-center justify-between`}>
                <div 
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer group"
                    onClick={() => setShowInfo(true)}
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); onBack(); }}
                        className={`md:hidden p-2 -ml-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                    >
                        <ArrowLeft className={`w-5 h-5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`} />
                    </button>

                    <div className="relative">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all group-hover:border-indigo-500/50 ${
                            isGroup 
                                ? 'bg-indigo-600/10 text-indigo-500 border-indigo-500/20' 
                                : darkMode 
                                    ? 'bg-slate-800 text-slate-400 border-slate-700'
                                    : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}>
                            {isGroup ? <Users size={18} /> : <User size={18} />}
                        </div>
                        {/* Status Glow */}
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 ${darkMode ? 'border-slate-950' : 'border-white'} rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]`} />
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                        <h3 className={`text-[13px] font-black truncate tracking-tight uppercase ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {displayName}
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                                {isGroup ? (
                                    memberCount > 0 
                                        ? `${memberCount} ${memberCount === 1 ? 'MEMBER' : 'MEMBERS'}` 
                                        : 'NO MEMBERS'
                                ) : 'SECURE LINE'}
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-1">
                    <button className={`hidden md:flex p-2 transition-colors ${darkMode ? 'text-slate-500 hover:text-white' : 'text-slate-600 hover:text-indigo-600'}`}>
                        <Bell size={18} />
                    </button>
                    <button 
                        onClick={() => setShowInfo(true)}
                        className={`p-2 transition-colors ${darkMode ? 'text-slate-500 hover:text-white' : 'text-slate-600 hover:text-indigo-600'}`}
                    >
                        <MoreVertical size={18} />
                    </button>
                </div>
            </div>

            {/* --- PROFILE DRAWER (WHATSAPP STYLE) --- */}
            {showInfo && (
                <div className="fixed inset-0 z-[200] flex justify-end">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowInfo(false)} />
                    
                    <div 
                        className={`relative w-full md:w-[400px] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 border-l ${darkMode ? 'border-slate-800/50' : 'border-slate-200'} ${drawerBg}`}
                    >
                        {/* Drawer Header */}
                        <div className={`p-5 flex items-center gap-4 border-b ${borderStyle} ${darkMode ? 'bg-slate-900/20' : 'bg-slate-50'}`}>
                            <button onClick={() => setShowInfo(false)} className={`p-2 rounded-xl transition-all ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                <X size={20} className={darkMode ? 'text-slate-500' : 'text-slate-600'} />
                            </button>
                            <span className={`text-[10px] font-black tracking-[0.3em] uppercase ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                {isGroup ? 'Group Information' : 'Chat Information'}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
                            {/* Profile Hero Section */}
                            <div className={`flex flex-col items-center p-10 text-center border-b ${darkMode ? 'border-slate-800/40' : 'border-slate-200'}`}>
                                <div className="relative group mb-6">
                                    <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center border shadow-2xl group-hover:border-indigo-500/50 transition-all duration-500 ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
                                        {isGroup ? <Users size={48} className="text-indigo-500" /> : <User size={48} className={darkMode ? 'text-slate-500' : 'text-slate-600'} />}
                                    </div>
                                    <button className={`absolute bottom-0 right-0 p-2.5 bg-indigo-600 rounded-2xl border-4 ${darkMode ? 'border-slate-950' : 'border-white'} text-white hover:scale-110 transition-transform shadow-lg shadow-indigo-600/30`}>
                                        <Camera size={16} />
                                    </button>
                                </div>
                                <h2 className={`text-2xl font-black tracking-tight mb-1 uppercase ${darkMode ? 'text-white' : 'text-slate-900'}`}>{displayName}</h2>
                                <p className={`text-[9px] font-black tracking-[0.2em] uppercase ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>
                                    COMMS ID: {selectedChat?._id?.slice(-8).toUpperCase() || 'SYS-NULL'}
                                </p>
                            </div>

                            {/* Privacy Notice */}
                            <div className={`px-6 py-4 flex items-start gap-4 bg-indigo-500/5 border-b ${darkMode ? 'border-slate-800/40' : 'border-slate-200'}`}>
                                <Lock size={16} className="text-indigo-500 mt-1 shrink-0" />
                                <div>
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">Transmission Encrypted</p>
                                    <p className={`text-[10px] font-medium leading-tight ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>All packets sent in this session are restricted to your merchant network.</p>
                                </div>
                            </div>

                            {/* Actions Area - Only show for groups and owners */}
                            {isGroup && isOwner && (
                                <div className={`p-4 grid grid-cols-2 gap-3 border-b ${darkMode ? 'border-slate-800/40' : 'border-slate-200'}`}>
                                    <button 
                                        onClick={handleAddStaff}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border hover:border-indigo-500/50 transition-all group ${darkMode ? 'bg-slate-900/20 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                                    >
                                        <UserPlus size={20} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                                        <span className={`text-[8px] font-black tracking-widest uppercase ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>Add Staff</span>
                                    </button>
                                    <button className={`flex flex-col items-center gap-2 p-4 rounded-2xl border hover:border-indigo-500/50 transition-all group ${darkMode ? 'bg-slate-900/20 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                        <Bell size={20} className={`${darkMode ? 'text-slate-600 group-hover:text-indigo-400' : 'text-slate-600 group-hover:text-indigo-600'} transition-colors`} />
                                        <span className={`text-[8px] font-black tracking-widest uppercase ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>Mute Node</span>
                                    </button>
                                </div>
                            )}

                            {/* Members List */}
                            <div className="p-6">
                                <p className="text-[10px] font-black tracking-[0.3em] text-indigo-500 uppercase mb-6">
                                    {isGroup ? (
                                        memberCount > 0 
                                            ? `Active Directory (${memberCount} ${memberCount === 1 ? 'Member' : 'Members'})` 
                                            : 'Active Directory (Empty)'
                                    ) : 'Contact Information'}
                                </p>

                                <div className="space-y-1">
                                    {participants
                                        .filter(member => {
                                            // For direct chats, filter out current user
                                            if (!isGroup) {
                                                const memberId = typeof member === 'object' && member !== null 
                                                    ? (member._id || member.id || member) 
                                                    : member;
                                                const currentUserId = currentUser?._id || currentUser?.id;
                                                return memberId && currentUserId && memberId.toString() !== currentUserId.toString();
                                            }
                                            // For groups, show all participants
                                            return true;
                                        })
                                        .map((member) => {
                                            const memberId = typeof member === 'object' && member !== null 
                                                ? (member._id || member.id || member) 
                                                : member;
                                            return (
                                                <button
                                                    key={memberId}
                                                    onClick={() => {
                                                        if (isGroup) {
                                                            setShowInfo(false);
                                                            onQuickMessage?.(memberId);
                                                        }
                                                    }}
                                                    className={`w-full flex items-center gap-4 p-3 rounded-2xl border border-transparent ${isGroup ? darkMode ? 'hover:border-slate-800/50 hover:bg-white/[0.02]' : 'hover:border-slate-300 hover:bg-slate-50' : ''} transition-all group ${isGroup ? 'cursor-pointer' : 'cursor-default'}`}
                                                >
                                                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 group-hover:-rotate-3 transition-transform ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                                                        <User size={18} className={darkMode ? 'text-slate-600 group-hover:text-indigo-400' : 'text-slate-600 group-hover:text-indigo-600'} />
                                                    </div>
                                                    <div className="flex-1 min-w-0 text-left">
                                                        <div className="flex items-center gap-2">
                                                            <p className={`text-[13px] font-black truncate uppercase ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                                                                {member.name || member.email || 'Unknown'}
                                                            </p>
                                                            {member.role === 'owner' && <ShieldCheck size={12} className="text-amber-500" />}
                                                        </div>
                                                        {member.email && (
                                                            <div className="flex items-center gap-2 opacity-50">
                                                                <p className={`text-[10px] font-bold truncate ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                                    {member.email}
                                                                </p>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2 opacity-50 mt-0.5">
                                                            <Store size={10} className="text-indigo-500" />
                                                            <p className={`text-[9px] font-black uppercase tracking-tighter truncate ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                                {member.outletName || 'HQ'} • {member.role || 'Personnel'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {isGroup && (
                                                        <MessageSquare size={14} className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatHeader;