import React from 'react';
import { Mic, Play, Pause, File, Download, Image as ImageIcon } from 'lucide-react';

const MessageBubble = ({
    msg,
    isOwn,
    darkMode,
    playingAudioId,
    onToggleAudio,
    formatRecordingTime,
    audioRefs,
    showSenderInfo = true
}) => {
    const isVoiceMessage = msg.messageType === 'audio' || msg.audioUrl;
    const isFileMessage = msg.messageType === 'file' || msg.fileUrl;
    
    // Logic for Audio Source
    let audioSrc = null;
    if (msg.audioUrl) {
        if (msg.audioUrl.startsWith('http') || msg.audioUrl.startsWith('blob:')) {
            audioSrc = msg.audioUrl;
        } else {
            // Server serves files at /uploads/audio, not /api/uploads/audio
            // So we need to remove /api from the base URL for file access
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://server.pocketpos.io/api';
            const serverBaseUrl = baseUrl.replace('/api', ''); // Remove /api to get server base
            audioSrc = msg.audioUrl.startsWith('/uploads/') ? `${serverBaseUrl}${msg.audioUrl}` : 
                       `${serverBaseUrl}/uploads/audio/${msg.audioUrl}`;
        }
    }

    // Logic for File Source
    let fileSrc = null;
    if (msg.fileUrl) {
        if (msg.fileUrl.startsWith('http') || msg.fileUrl.startsWith('blob:')) {
            fileSrc = msg.fileUrl;
        } else {
            // Server serves files at /uploads/files, not /api/uploads/files
            // So we need to remove /api from the base URL for file access
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://server.pocketpos.io/api';
            const serverBaseUrl = baseUrl.replace('/api', ''); // Remove /api to get server base
            fileSrc = msg.fileUrl.startsWith('/uploads/') ? `${serverBaseUrl}${msg.fileUrl}` : 
                      `${serverBaseUrl}/uploads/files/${msg.fileUrl}`;
        }
    }

    const isImageFile = msg.fileType?.startsWith('image/');
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
                    {/* For owner, only show role label. For staff, show name and role */}
                    {msg.senderRole?.toLowerCase() === 'owner' ? (
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                            {msg.senderRole}
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
                                    el.onerror = (e) => {
                                        console.error('[MessageBubble] Audio error:', e, 'for message:', msg._id);
                                    };
                                    // Add loaded event handler
                                    el.onloadedmetadata = () => {
                                        console.log('[MessageBubble] Audio metadata loaded for message:', msg._id);
                                    };
                                }
                            }}
                            src={audioSrc}
                            onEnded={() => onToggleAudio(null, null)}
                            preload="metadata"
                            crossOrigin="anonymous"
                        />
                    </div>
                ) : isFileMessage && fileSrc ? (
                    <div className="flex flex-col gap-2 min-w-[200px] max-w-[300px]">
                        {isImageFile ? (
                            <a 
                                href={fileSrc} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block rounded-lg overflow-hidden"
                            >
                                <img 
                                    src={fileSrc} 
                                    alt={msg.fileName || 'Image'} 
                                    className="w-full h-auto max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                />
                            </a>
                        ) : null}
                        <div className={`flex items-center gap-3 p-3 rounded-xl ${isOwn ? 'bg-white/10' : darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                            <div className={`p-2 rounded-lg ${isOwn ? 'bg-white/20' : 'bg-slate-600'}`}>
                                {isImageFile ? (
                                    <ImageIcon size={16} className={isOwn ? 'text-white' : 'text-slate-300'} />
                                ) : (
                                    <File size={16} className={isOwn ? 'text-white' : 'text-slate-300'} />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-xs font-black truncate ${isOwn ? 'text-white' : darkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                                    {msg.fileName || msg.content || 'File'}
                                </p>
                                {msg.fileSize && (
                                    <p className={`text-[9px] font-bold ${isOwn ? 'text-white/70' : darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {formatFileSize(msg.fileSize)}
                                    </p>
                                )}
                            </div>
                            <a
                                href={fileSrc}
                                download={msg.fileName || 'file'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`p-2 rounded-lg transition-transform active:scale-95 ${isOwn ? 'bg-white/20 hover:bg-white/30' : 'bg-slate-600 hover:bg-slate-500'}`}
                                title="Download file"
                            >
                                <Download size={14} className={isOwn ? 'text-white' : 'text-slate-200'} />
                            </a>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                )}

                {/* TIMESTAMP */}
                <p className={`text-[8px] mt-2 font-black uppercase opacity-40 ${isOwn ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
};

export default MessageBubble;