import React from 'react';
import { Mic, Play, Pause, File, Download } from 'lucide-react';
import {
    isStaffViewer,
    messageContentForStaffViewer,
    mentionsDetailForStaffViewer,
    participantLabelForViewer,
} from '../../utils/ownerDisplay';

function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function TextWithMentions({ content, mentionsDetail, isOwn, darkMode }) {
    if (!content) return null;
    const detail = Array.isArray(mentionsDetail) ? mentionsDetail.filter((m) => m && (m.name || '').trim()) : [];
    if (!detail.length) {
        return <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{content}</p>;
    }
    const sorted = [...detail].sort((a, b) => (b.name || '').length - (a.name || '').length);
    const pattern = sorted.map((m) => '@' + escapeRegex(m.name)).join('|');
    if (!pattern) {
        return <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{content}</p>;
    }
    const re = new RegExp(`(${pattern})`, 'g');
    const parts = content.split(re);
    const mentionClass = isOwn
        ? 'font-bold text-white underline decoration-white/50 underline-offset-2'
        : darkMode
            ? 'font-bold text-indigo-300'
            : 'font-bold text-indigo-600';
    return (
        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
            {parts.map((part, i) => {
                const isMention = sorted.some((m) => part === `@${m.name}`);
                return isMention ? (
                    <span key={i} className={mentionClass}>{part}</span>
                ) : (
                    <React.Fragment key={i}>{part}</React.Fragment>
                );
            })}
        </p>
    );
}

const MessageBubble = ({
    msg,
    isOwn,
    darkMode,
    playingAudioId,
    onToggleAudio,
    formatRecordingTime,
    audioRefs,
    showSenderInfo = true,
    seenBy = [],
    currentUser,
    participants = [],
}) => {
    const [audioError, setAudioError] = React.useState(false);
    const isVoiceMessage = msg.messageType === 'audio' || msg.audioUrl;
    const isFileMessage = msg.messageType === 'file' || msg.fileUrl;
    const safeSeenBy = Array.isArray(seenBy) ? seenBy : [];
    const safeParticipants = Array.isArray(participants) ? participants : [];
    const displayContent = messageContentForStaffViewer(msg.content, safeParticipants, currentUser);
    const displayMentions = mentionsDetailForStaffViewer(msg.mentionsDetail, safeParticipants, currentUser);
    const senderIsOwner = msg.senderRole?.toLowerCase() === 'owner';
    const staffViewer = isStaffViewer(currentUser);
    
    // Logic for Audio Source
    let audioSrc = null;
    if (msg.audioUrl) {
        if (msg.audioUrl.startsWith('http') || msg.audioUrl.startsWith('blob:')) {
            audioSrc = msg.audioUrl;
        } else {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://server.pocketpos.io/api';
            const pathPart = msg.audioUrl.startsWith('/uploads/') ? msg.audioUrl : `/uploads/audio/${msg.audioUrl}`;
            audioSrc = `${baseUrl.replace(/\/api\/?$/, '')}/api${pathPart}`;
        }
    }

    // Logic for File Source
    let fileSrc = null;
        if (msg.fileUrl) {
        if (msg.fileUrl.startsWith('http') || msg.fileUrl.startsWith('blob:')) {
            fileSrc = msg.fileUrl;
        } else {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://server.pocketpos.io/api';
            const pathPart = msg.fileUrl.startsWith('/uploads/') ? msg.fileUrl : `/uploads/files/${msg.fileUrl}`;
            fileSrc = `${baseUrl.replace(/\/api\/?$/, '')}/api${pathPart}`;
        }
    }

    const isImageFile =
        msg.fileType?.startsWith('image/') ||
        /\.(jpe?g|png|gif|webp|bmp)$/i.test(String(msg.fileName || msg.content || ''));
    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    };

    return (
        <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
            {/* SENDER LABEL: Only show for other members and when showSenderInfo is true */}
            {!isOwn && showSenderInfo && (
                <div className="flex items-center gap-1.5 mb-1 px-1">
                    {/* Staff viewers see the store owner only as "Owner" */}
                    {senderIsOwner ? (
                        <span className={`text-[10px] font-black tracking-widest text-indigo-500 ${staffViewer ? 'normal-case' : 'uppercase'}`}>
                            {staffViewer ? 'Owner' : msg.senderRole}
                        </span>
                    ) : (
                        <>
                            {msg.senderName && (
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    {msg.senderName}
                                </span>
                            )}
                            {msg.senderName && msg.senderRole && (
                                <span className="text-[10px] opacity-50">•</span>
                            )}
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                                {msg.senderRole || 'Staff'}
                            </span>
                        </>
                    )}
                </div>
            )}

            {/* MESSAGE BUBBLE */}
            <div 
                className={`relative px-4 py-3 shadow-xl transition-all duration-200 ${
                    isOwn 
                    ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none shadow-lg shadow-indigo-600/20' // Your Message: Blue (matching send button) + Right-corner flat
                    : darkMode ? 'bg-slate-800 border border-slate-700 text-slate-100 rounded-2xl rounded-tl-none' : 'bg-white border border-slate-200 text-slate-900 rounded-2xl rounded-tl-none' // Their Message: Left-corner flat
                }`}
            >
                {isVoiceMessage && audioSrc ? (
                    <div className="flex items-center gap-4 min-w-[200px]">
                        {audioError ? (
                            <div className={`flex items-center gap-2 py-2 px-3 rounded-xl text-[10px] font-bold ${isOwn ? 'bg-white/10 text-white/80' : 'bg-slate-700/50 text-slate-400'}`}>
                                <Mic size={14} className="opacity-60" />
                                <span>Audio unavailable</span>
                            </div>
                        ) : (
                        <>
                        <button
                            onClick={() => onToggleAudio(msg._id, audioSrc)}
                            className={`p-2 rounded-xl transition-transform active:scale-95 ${isOwn ? 'bg-white/20' : 'bg-slate-800'}`}
                        >
                            {playingAudioId === msg._id ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                        </button>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Mic size={12} className="opacity-50" />
                                <span className="text-[10px] font-black uppercase tracking-tighter">
                                    {msg.audioDuration ? formatRecordingTime(Math.floor(msg.audioDuration)) : 'Voice'}
                                </span>
                            </div>
                            <div className={`w-full h-1 rounded-full ${isOwn ? 'bg-white/20' : 'bg-slate-700'}`}>
                                <div 
                                    className={`h-full rounded-full transition-all ${isOwn ? 'bg-white' : 'bg-indigo-500'}`} 
                                    style={{ width: playingAudioId === msg._id ? '100%' : '0%' }} 
                                />
                            </div>
                        </div>
                        <audio
                            ref={el => { 
                                if (el) {
                                    audioRefs.current[msg._id] = el;
                                    // Set audio attributes for better compatibility
                                    el.preload = 'metadata';
                                    el.crossOrigin = 'anonymous';
                                    // Add error handler
                                    el.onerror = () => setAudioError(true);
                                    // Add loaded event handler
                                    el.onloadedmetadata = () => {};
                                }
                            }}
                            src={audioSrc}
                            onEnded={() => onToggleAudio(null, null)}
                            preload="metadata"
                            crossOrigin="anonymous"
                        />
                        </>
                        )}
                    </div>
                ) : isFileMessage && fileSrc ? (
                    isImageFile ? (
                        <div className="min-w-[120px] max-w-[300px]">
                            <a
                                href={fileSrc}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block overflow-hidden rounded-lg"
                            >
                                <img
                                    src={fileSrc}
                                    alt="Image attachment"
                                    className="h-auto max-h-[300px] w-full cursor-pointer object-cover transition-opacity hover:opacity-90"
                                />
                            </a>
                        </div>
                    ) : (
                        <div className="flex min-w-[200px] max-w-[300px] flex-col gap-2">
                            <div className={`flex items-center gap-3 rounded-xl p-3 ${isOwn ? 'bg-white/10' : darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                <div className={`rounded-lg p-2 ${isOwn ? 'bg-white/20' : 'bg-slate-600'}`}>
                                    <File size={16} className={isOwn ? 'text-white' : 'text-slate-300'} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className={`truncate text-xs font-black ${isOwn ? 'text-white' : darkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                                        {msg.fileName || msg.content || 'File'}
                                    </p>
                                    {msg.fileSize ? (
                                        <p className={`text-[9px] font-bold ${isOwn ? 'text-white/70' : darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {formatFileSize(msg.fileSize)}
                                        </p>
                                    ) : null}
                                </div>
                                <a
                                    href={fileSrc}
                                    download={msg.fileName || 'file'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`rounded-lg p-2 transition-transform active:scale-95 ${isOwn ? 'bg-white/20 hover:bg-white/30' : 'bg-slate-600 hover:bg-slate-500'}`}
                                    title="Download file"
                                >
                                    <Download size={14} className={isOwn ? 'text-white' : 'text-slate-200'} />
                                </a>
                            </div>
                        </div>
                    )
                ) : (
                    <TextWithMentions
                        content={displayContent}
                        mentionsDetail={displayMentions}
                        isOwn={isOwn}
                        darkMode={darkMode}
                    />
                )}

                {/* TIMESTAMP */}
                <p className={`text-[8px] mt-2 font-black uppercase opacity-40 ${isOwn ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
            {/* Seen by - one row below the last message that user saw, with falling animation */}
            {isOwn && safeSeenBy.length > 0 && (
                <div 
                    className="flex items-center justify-end gap-0.5 mt-1 px-1 animate-in slide-in-from-top-2 fade-in duration-300"
                    title={`Seen by ${safeSeenBy.map((p) => participantLabelForViewer(p, currentUser) || '?').join(', ')}`}
                >
                    {safeSeenBy.slice(0, 5).map((p, i) => {
                        const label = participantLabelForViewer(p, currentUser) || '?';
                        return (
                        <div
                            key={p?._id || p?.id || `seen-${i}`}
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border-2 ${darkMode ? 'bg-slate-800 border-slate-700 text-indigo-300' : 'bg-indigo-100 border-indigo-200 text-indigo-600'}`}
                            title={label}
                        >
                            {label[0].toUpperCase()}
                        </div>
                        );
                    })}
                    {safeSeenBy.length > 5 && (
                        <span className="text-[9px] font-bold text-slate-500">+{safeSeenBy.length - 5}</span>
                    )}
                </div>
            )}
        </div>
    );
};

export default MessageBubble;