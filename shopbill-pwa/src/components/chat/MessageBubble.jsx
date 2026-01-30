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
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://server.pocketpos.io';
            audioSrc = msg.audioUrl.startsWith('/api/') ? `${baseUrl}${msg.audioUrl}` : 
                       msg.audioUrl.startsWith('/uploads/') ? `${baseUrl}/api${msg.audioUrl}` : 
                       `${baseUrl}/api/uploads/audio/${msg.audioUrl}`;
        }
    }

    return (
        /* - ml-auto: Forces YOUR messages to the right
           - mr-auto: Forces OTHERS to the left 
        */
        <div className={`flex flex-col mb-4 w-full ${isOwn ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                
                {/* SENDER LABEL */}
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
                    className={`relative px-4 py-3 shadow-xl ${
                        isOwn 
                        ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none' 
                        : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl rounded-tl-none'
                    }`}
                >
                    {isVoiceMessage && audioSrc ? (
                        <div className="flex items-center gap-4 min-w-[200px]">
                            <button
                                onClick={() => onToggleAudio(msg._id, audioSrc)}
                                className={`p-2 rounded-xl ${isOwn ? 'bg-white/20' : 'bg-slate-800'}`}
                            >
                                {playingAudioId === msg._id ? <Pause size={16} /> : <Play size={16} />}
                            </button>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <Mic size={12} className="opacity-50" />
                                    <span className="text-[10px] font-bold">
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
        </div>
    );
};

export default MessageBubble;