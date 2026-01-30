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
    darkMode
}) => {
    const [showInfo, setShowInfo] = useState(false);

    const participants = selectedChat?.participants || [];
    const isGroup = selectedChat?.type === 'group' || selectedChat?.isDefault;
    const displayName = getChatDisplayName(selectedChat);

    // Deep Industrial Theme Colors
    const deepBg = '#030712';
    const borderStyle = darkMode ? 'border-slate-800/60' : 'border-slate-200';

    return (
        /* STICKY CONTAINER: Ensures the header stays at the top of the chat view */
        <div className="sticky top-0 z-40 w-full shrink-0" style={{ backgroundColor: `${deepBg}cc` }}>
            {/* --- NAV BAR --- */}
            <div className={`p-3 md:p-4 border-b ${borderStyle} flex items-center justify-between backdrop-blur-xl`}>
                <div 
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer group"
                    onClick={() => setShowInfo(true)}
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); onBack(); }}
                        className="md:hidden p-2 -ml-2 hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </button>

                    <div className="relative">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all group-hover:border-indigo-500/50 ${
                            isGroup ? 'bg-indigo-600/10 text-indigo-500 border-indigo-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                            {isGroup ? <Users size={18} /> : <User size={18} />}
                        </div>
                        {/* Status Glow */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#030712] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                        <h3 className={`text-[13px] font-black truncate tracking-tight uppercase ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {displayName}
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                                {isGroup ? `${participants.length} STAFF CONNECTED` : 'SECURE LINE'}
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-1">
                    <button className="hidden md:flex p-2 text-slate-500 hover:text-white transition-colors">
                        <Bell size={18} />
                    </button>
                    <button 
                        onClick={() => setShowInfo(true)}
                        className="p-2 text-slate-500 hover:text-white transition-colors"
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
                        className="relative w-full md:w-[400px] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 border-l border-slate-800/50"
                        style={{ backgroundColor: deepBg }}
                    >
                        {/* Drawer Header */}
                        <div className={`p-5 flex items-center gap-4 border-b ${borderStyle} bg-slate-900/20`}>
                            <button onClick={() => setShowInfo(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-all">
                                <X size={20} className="text-slate-500" />
                            </button>
                            <span className="text-[10px] font-black tracking-[0.3em] uppercase text-slate-400">Node Information</span>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
                            {/* Profile Hero Section */}
                            <div className="flex flex-col items-center p-10 text-center border-b border-slate-800/40">
                                <div className="relative group mb-6">
                                    <div className="w-32 h-32 rounded-[2.5rem] flex items-center justify-center border border-slate-800 bg-slate-900/50 shadow-2xl group-hover:border-indigo-500/50 transition-all duration-500">
                                        {isGroup ? <Users size={48} className="text-indigo-500" /> : <User size={48} className="text-slate-500" />}
                                    </div>
                                    <button className="absolute bottom-0 right-0 p-2.5 bg-indigo-600 rounded-2xl border-4 border-[#030712] text-white hover:scale-110 transition-transform shadow-lg shadow-indigo-600/30">
                                        <Camera size={16} />
                                    </button>
                                </div>
                                <h2 className="text-2xl font-black tracking-tight text-white mb-1 uppercase">{displayName}</h2>
                                <p className="text-[9px] font-black tracking-[0.2em] text-slate-600 uppercase">
                                    COMMS ID: {selectedChat?._id?.slice(-8).toUpperCase() || 'SYS-NULL'}
                                </p>
                            </div>

                            {/* Privacy Notice */}
                            <div className="px-6 py-4 flex items-start gap-4 bg-indigo-500/5 border-b border-slate-800/40">
                                <Lock size={16} className="text-indigo-500 mt-1 shrink-0" />
                                <div>
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">Transmission Encrypted</p>
                                    <p className="text-[10px] text-slate-500 font-medium leading-tight">All packets sent in this session are restricted to your merchant network.</p>
                                </div>
                            </div>

                            {/* Actions Area */}
                            <div className="p-4 grid grid-cols-2 gap-3 border-b border-slate-800/40">
                                <button 
                                    onClick={() => { setShowInfo(false); onAddMember?.(); }}
                                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-900/20 border border-slate-800 hover:border-indigo-500/50 transition-all group"
                                >
                                    <UserPlus size={20} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                                    <span className="text-[8px] font-black tracking-widest uppercase text-slate-500">Add Staff</span>
                                </button>
                                <button className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-900/20 border border-slate-800 hover:border-indigo-500/50 transition-all group">
                                    <Bell size={20} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
                                    <span className="text-[8px] font-black tracking-widest uppercase text-slate-500">Mute Node</span>
                                </button>
                            </div>

                            {/* Members List */}
                            <div className="p-6">
                                <p className="text-[10px] font-black tracking-[0.3em] text-indigo-500 uppercase mb-6">
                                    Active Directory ({participants.length})
                                </p>

                                <div className="space-y-1">
                                    {participants.map((member) => (
                                        <button
                                            key={member._id}
                                            onClick={() => {
                                                setShowInfo(false);
                                                onQuickMessage(member._id);
                                            }}
                                            className="w-full flex items-center gap-4 p-3 rounded-2xl border border-transparent hover:border-slate-800/50 hover:bg-white/[0.02] transition-all group"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover:-rotate-3 transition-transform">
                                                <User size={18} className="text-slate-600 group-hover:text-indigo-400" />
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[13px] font-black text-slate-200 truncate uppercase">{member.name || member.email}</p>
                                                    {member.role === 'owner' && <ShieldCheck size={12} className="text-amber-500" />}
                                                </div>
                                                <div className="flex items-center gap-2 opacity-50">
                                                    <Store size={10} className="text-indigo-500" />
                                                    <p className="text-[9px] font-black uppercase tracking-tighter truncate">
                                                        {member.outletName || 'HQ'} • {member.role || 'Personnel'}
                                                    </p>
                                                </div>
                                            </div>
                                            <MessageSquare size={14} className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    ))}
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