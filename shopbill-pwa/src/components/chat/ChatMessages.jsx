import React from 'react';
import { MessageCircle, Loader2 } from 'lucide-react';
import MessageBubble from './MessageBubble';

const ChatMessages = ({
    messages,
    isLoadingMessages,
    currentUser,
    darkMode,
    playingAudioId,
    onToggleAudio,
    formatRecordingTime,
    audioRefs,
    messagesEndRef
}) => {
    if (isLoadingMessages) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-3" />
                <p className="text-[10px] font-black text-slate-600 tracking-[0.3em] uppercase">Decrypting Comms...</p>
            </div>
        );
    }

    if (messages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 opacity-30">
                <div className="relative mb-4">
                    <MessageCircle className="w-12 h-12 text-slate-500" />
                    <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20" />
                </div>
                <p className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase">Frequency Clear</p>
                <p className="text-[9px] font-bold text-slate-600 mt-1 uppercase">Awaiting transmission...</p>
            </div>
        );
    }

    return (
        /* px-4 added to prevent bubbles from sticking to the wall */
        <div className="flex flex-col w-full space-y-6 py-6 px-4">
            {messages.map((msg, idx) => {
                const senderId = msg.senderId?._id || msg.senderId;
                const isOwn = senderId === currentUser._id || senderId?.toString() === currentUser._id?.toString();
                
                return (
                    /* The 'items-end' class is critical for pushing YOUR messages to the right */
                    <div 
                        key={msg._id || idx} 
                        className={`flex flex-col w-full ${isOwn ? 'items-end' : 'items-start'}`}
                    >
                        <MessageBubble
                            msg={msg}
                            isOwn={isOwn}
                            currentUser={currentUser}
                            darkMode={darkMode}
                            playingAudioId={playingAudioId}
                            onToggleAudio={onToggleAudio}
                            formatRecordingTime={formatRecordingTime}
                            audioRefs={audioRefs}
                        />
                    </div>
                );
            })}
            <div ref={messagesEndRef} className="h-4" />
        </div>
    );
};

export default ChatMessages;