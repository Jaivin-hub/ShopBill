import React, { useState } from 'react';
import { 
    Plus, Search, User, Store, Loader2, 
    ShieldCheck, ArrowRight, LayoutGrid, 
    UserSquare2, Users
} from 'lucide-react';

const ChatListSidebar = ({
    chats,
    selectedChat,
    onSelectChat,
    staffList,
    onNewGroupClick,
    onQuickMessage,
    searchTerm,
    onSearchChange,
    isLoading,
    isLoadingStaff,
    getChatDisplayName,
    formatTime,
    currentUser,
    darkMode
}) => {
    const [viewMode, setViewMode] = useState('chats');

    // --- Theme Vars ---
    const sidebarBg = darkMode ? 'bg-slate-950' : 'bg-slate-50';
    const activeTab = 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]';

    return (
        <div 
            className={`w-full md:w-80 ${selectedChat ? 'hidden md:flex' : 'flex'} ${selectedChat ? 'md:border-r' : ''} ${darkMode ? 'border-slate-800' : 'border-slate-200'} flex-col h-full transition-all duration-300 ${sidebarBg} overflow-hidden`}
        >
            {/* Scrollable Container - Required for sticky to work */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Sticky Header Area - Title, Description, Toggle, and Search */}
                <div className={`sticky top-0 z-[100] border-b ${darkMode ? 'border-slate-800/60 bg-slate-950 backdrop-blur-xl' : 'bg-white backdrop-blur-xl'} shadow-lg`}>
                    {/* Title and Description */}
                    <div className="p-4 md:p-6 pb-3 md:pb-4">
                        <div className="flex items-center justify-between mb-3 md:mb-4">
                            <div className="flex-1 min-w-0">
                                <h1 className={`text-xl md:text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                    Network <span className="text-indigo-500">Comms</span>
                                </h1>
                                <p className={`text-[9px] font-black tracking-[0.2em] mt-0.5 md:mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Real-time team communication and coordination.
                                </p>
                            </div>
                            <button
                                onClick={onNewGroupClick}
                                className="p-2 md:p-2.5 rounded-xl bg-indigo-600 text-white hover:scale-110 active:scale-95 transition-all shadow-lg shadow-indigo-500/20 flex-shrink-0 ml-2"
                            >
                                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                        </div>

                        {/* Toggle */}
                        <div className={`flex p-1 rounded-xl gap-1 border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                            <button
                                onClick={() => setViewMode('chats')}
                                className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2 py-2 rounded-lg text-[8px] md:text-[9px] font-black tracking-[0.2em] transition-all ${
                                    viewMode === 'chats' ? activeTab : darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-800'
                                }`}
                            >
                                <LayoutGrid size={11} className="md:w-3 md:h-3" />
                                <span className="hidden sm:inline">GROUPS</span>
                                <span className="sm:hidden">Group</span>
                            </button>
                            <button
                                onClick={() => setViewMode('users')}
                                className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2 py-2 rounded-lg text-[8px] md:text-[9px] font-black tracking-[0.2em] transition-all ${
                                    viewMode === 'users' ? activeTab : darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-800'
                                }`}
                            >
                                <UserSquare2 size={11} className="md:w-3 md:h-3" />
                                <span className="hidden sm:inline">STAFF</span>
                                <span className="sm:hidden">Staff</span>
                            </button>
                        </div>
                    </div>

                    {/* Search - Inside Sticky Header */}
                    <div className={`px-4 md:px-6 pb-3 md:pb-4 ${darkMode ? 'bg-slate-950' : 'bg-white'}`}>
                        <div className="relative group">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${darkMode ? 'text-slate-600' : 'text-slate-400'} group-focus-within:text-indigo-500 transition-colors`} />
                            <input
                                type="text"
                                placeholder={viewMode === 'users' ? "Search workforce..." : "Search frequencies..."}
                                value={searchTerm}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2.5 md:py-3 ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-xl text-[16px] md:text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all ${darkMode ? 'placeholder:text-slate-500' : 'placeholder:text-slate-400'}`}
                            />
                        </div>
                    </div>
                </div>

                {/* Scrollable Content Area - Chat List */}
                <div className="min-h-0">
                    {viewMode === 'users' ? (
                        <StaffListView
                            staffList={staffList}
                            searchTerm={searchTerm}
                            isLoadingStaff={isLoadingStaff}
                            onQuickMessage={onQuickMessage}
                            darkMode={darkMode}
                            currentUser={currentUser}
                        />
                    ) : (
                        <ChatListView
                            chats={chats}
                            selectedChat={selectedChat}
                            onSelectChat={onSelectChat}
                            searchTerm={searchTerm}
                            isLoading={isLoading}
                            getChatDisplayName={getChatDisplayName}
                            formatTime={formatTime}
                            currentUser={currentUser}
                            darkMode={darkMode}
                        />
                    )}
                </div>
            </div>
            
            {/* Floating Add Button - Above Footer (Mobile Only) */}
            <button
                onClick={onNewGroupClick}
                className="md:hidden fixed bottom-24 right-4 z-[60] w-14 h-14 rounded-full bg-indigo-600 text-white shadow-2xl shadow-indigo-500/50 hover:bg-indigo-500 active:scale-95 transition-all flex items-center justify-center hover:shadow-indigo-600/60"
                aria-label="Create new chat"
            >
                <Plus className="w-6 h-6" strokeWidth={2.5} />
            </button>
        </div>
    );
};

const StaffListView = ({ staffList, searchTerm, isLoadingStaff, onQuickMessage, darkMode, currentUser }) => {
    if (isLoadingStaff) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500 mb-3" />
                <p className="text-[9px] font-black text-slate-600 tracking-[0.3em] uppercase">Syncing Node...</p>
            </div>
        );
    }

    const filteredStaff = staffList.filter(staff => {
        if (staff._id === currentUser?._id) return false;
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (staff.name || staff.email || '').toLowerCase().includes(term) ||
               (staff.outletName || '').toLowerCase().includes(term);
    });

    return (
        <div className="flex flex-col">
            {filteredStaff.map(staff => (
                <button
                    key={staff._id}
                    onClick={() => onQuickMessage(staff._id)}
                    className={`w-full px-5 py-4 text-left transition-all border-l-2 border-transparent flex items-center gap-4 group ${darkMode ? 'hover:border-slate-700 hover:bg-white/[0.02]' : 'hover:border-slate-300 hover:bg-slate-100'}`}
                >
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 group-hover:border-indigo-500/30 transition-all group-hover:-rotate-3 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                        <User className={`w-5 h-5 ${darkMode ? 'text-slate-500 group-hover:text-indigo-400' : 'text-slate-600 group-hover:text-indigo-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-black truncate uppercase tracking-tight transition-colors ${darkMode ? 'text-slate-200 group-hover:text-white' : 'text-slate-900 group-hover:text-indigo-600'}`}>
                            {staff.name || staff.email}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[8px] font-black tracking-widest text-indigo-500 uppercase">
                                {staff.role}
                            </span>
                            {staff.outletName && (
                                <span className={`text-[8px] font-bold truncate uppercase ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>
                                    • {staff.outletName}
                                </span>
                            )}
                        </div>
                    </div>
                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-indigo-500" />
                </button>
            ))}
        </div>
    );
};

const ChatListView = ({ chats, selectedChat, onSelectChat, searchTerm, isLoading, getChatDisplayName, formatTime, currentUser, darkMode }) => {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-3" />
                <p className={`text-[9px] font-black tracking-[0.3em] uppercase ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Fetching Frequencies...</p>
            </div>
        );
    }

    const sortedChats = [...chats]
        .filter(c => c.type === 'group' || c.isDefault)
        .sort((a, b) => {
            const timeA = a.messages?.length > 0 ? new Date(a.messages[a.messages.length - 1].timestamp).getTime() : 0;
            const timeB = b.messages?.length > 0 ? new Date(b.messages[b.messages.length - 1].timestamp).getTime() : 0;
            return timeB - timeA;
        });

    return (
        <div className="flex flex-col">
            {sortedChats
                .filter(chat => {
                    if (!searchTerm) return true;
                    return getChatDisplayName(chat).toLowerCase().includes(searchTerm.toLowerCase());
                })
                .map(chat => {
                    const isSelected = selectedChat?._id === chat._id;
                    const isVerified = chat.isDefault;
                    const lastMsg = chat.messages?.[chat.messages.length - 1];
                    
                    return (
                        <button
                            key={chat._id}
                            onClick={() => onSelectChat(chat)}
                            className={`w-full px-5 py-4 flex items-center gap-4 transition-all duration-200 border-l-2 relative group
                                ${isSelected 
                                    ? 'bg-indigo-600/10 border-indigo-500 shadow-[inset_10px_0_20px_-10px_rgba(79,70,229,0.2)]' 
                                    : darkMode 
                                        ? 'border-transparent hover:bg-white/[0.02] hover:border-slate-700'
                                        : 'border-transparent hover:bg-slate-100 hover:border-slate-300'
                                }`}
                        >
                            {/* Avatar Section */}
                            <div className="relative shrink-0">
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-300 ${
                                    isSelected 
                                        ? 'bg-indigo-600 border-indigo-400 text-white rotate-3 shadow-lg shadow-indigo-600/20' 
                                        : darkMode
                                            ? 'bg-slate-900 border-slate-800 text-slate-500 group-hover:border-slate-600 group-hover:-rotate-3'
                                            : 'bg-slate-100 border-slate-200 text-slate-600 group-hover:border-indigo-300 group-hover:-rotate-3'
                                }`}>
                                    <Users size={18} strokeWidth={isSelected ? 2.5 : 2} />
                                </div>
                                {/* Status Badge Overlay */}
                                {isVerified && (
                                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${darkMode ? 'bg-slate-950' : 'bg-white'} rounded-full flex items-center justify-center border ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                                        <ShieldCheck size={10} className="text-indigo-500" />
                                    </div>
                                )}
                            </div>

                            {/* Info Section */}
                            <div className="flex-1 min-w-0 text-left">
                                <div className="flex justify-between items-baseline mb-0.5">
                                    <h3 className={`text-[13px] font-black truncate tracking-wide uppercase transition-colors ${
                                        isSelected 
                                            ? 'text-white' 
                                            : darkMode 
                                                ? 'text-slate-300 group-hover:text-white'
                                                : 'text-slate-700 group-hover:text-indigo-600'
                                    }`}>
                                        {getChatDisplayName(chat)}
                                    </h3>
                                    {lastMsg && (
                                        <span className={`text-[9px] font-bold tracking-tighter shrink-0 ${
                                            isSelected 
                                                ? 'text-indigo-400' 
                                                : darkMode 
                                                    ? 'text-slate-500' 
                                                    : 'text-slate-600'
                                        }`}>
                                            {formatTime(lastMsg.timestamp)}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                    <p className={`text-[11px] truncate font-medium leading-tight ${
                                        isSelected 
                                            ? 'text-indigo-200/70' 
                                            : darkMode 
                                                ? 'text-slate-500 group-hover:text-slate-400'
                                                : 'text-slate-600 group-hover:text-slate-700'
                                    }`}>
                                        {lastMsg ? (
                                            <>
                                                <span className="font-black text-[8px] mr-1.5 opacity-40 text-indigo-500 uppercase">
                                                    {(lastMsg.senderId?._id === currentUser._id || lastMsg.senderId === currentUser._id) ? 'YOU:' : 'INCOMING:'}
                                                </span>
                                                {lastMsg.content}
                                            </>
                                        ) : (
                                            <span className="text-[9px] uppercase tracking-widest opacity-20 italic">Awaiting Signal</span>
                                        )}
                                    </p>
                                    
                                    {/* Action/Meta Indicators */}
                                    <div className="flex items-center gap-2">
                                        {chat.outletId?.name && !isSelected && (
                                            <span className={`text-[7px] font-black px-1 rounded uppercase tracking-tighter ${darkMode ? 'text-slate-400 border-slate-700' : 'text-slate-600 border-slate-300'} border`}>
                                                {chat.outletId.name.split(' ')[0]}
                                            </span>
                                        )}
                                        {chat.unreadCount > 0 && (
                                            <span className={`h-5 w-5 rounded-full ${isSelected ? 'bg-indigo-500' : 'bg-rose-500'} text-white text-[9px] font-black flex items-center justify-center ${isSelected ? 'shadow-[0_0_8px_#6366f1]' : 'animate-pulse'}`}>
                                                {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                                            </span>
                                        )}
                                        {isSelected && chat.unreadCount === 0 && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </button>
                    );
                })}

            {/* End of Frequencies Decorator */}
            {sortedChats.length > 0 && (
                <div className="p-8 flex flex-col items-center opacity-10">
                    <div className="w-px h-8 bg-gradient-to-b from-indigo-500 to-transparent mb-2" />
                    <span className={`text-[8px] font-black tracking-[0.5em] uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Link End</span>
                </div>
            )}
        </div>
    );
};

export default ChatListSidebar;