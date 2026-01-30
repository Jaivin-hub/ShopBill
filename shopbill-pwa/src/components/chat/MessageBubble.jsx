import React from 'react';
import { Mic, Play, Pause, Store } from 'lucide-react';

const MessageBubble = ({
    msg,
    isOwn,
    darkMode,
    playingAudioId,
    onToggleAudio,
    formatRecordingTime,
    audioRefs
}) => {
    const isVoiceMessage = msg.messageType === 'audio' || msg.audioUrl;
    
    // Logic for Audio Source
    let audioSrc = null;
    if (msg.audioUrl) {
        if (msg.audioUrl.startsWith('http') || msg.audioUrl.startsWith('blob:')) {
            audioSrc = msg.audioUrl;
        } else {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
            audioSrc = msg.audioUrl.startsWith('/api/') ? `${baseUrl}${msg.audioUrl}` : 
                       msg.audioUrl.startsWith('/uploads/') ? `${baseUrl}/api${msg.audioUrl}` : 
                       `${baseUrl}/api/uploads/audio/${msg.audioUrl}`;
        }
    }

    return (
        <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
            {/* SENDER LABEL: Only show for other members */}
            {!isOwn && (
                <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                        {msg.senderRole || 'Staff'}
                    </span>
                    {msg.senderStoreName && (
                        <div className="flex items-center gap-1 opacity-50">
                            <span className="text-[10px]">•</span>
                            <Store size={10} />
                            <span className="text-[9px] font-bold uppercase">{msg.senderStoreName}</span>
                        </div>
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
                            ref={el => { if (el) audioRefs.current[msg._id] = el; }}
                            src={audioSrc}
                            onEnded={() => onToggleAudio(null, null)}
                        />
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