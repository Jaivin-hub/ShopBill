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
                <p className={`text-[10px] font-black tracking-[0.3em] uppercase ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Decrypting Comms...</p>
            </div>
        );
    }

    if (messages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 opacity-30">
                <div className="relative mb-4">
                    <MessageCircle className={`w-12 h-12 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                    <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20" />
                </div>
                <p className={`text-[10px] font-black tracking-[0.2em] uppercase ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>Frequency Clear</p>
                <p className={`text-[9px] font-bold mt-1 uppercase ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>Awaiting transmission...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full space-y-2 py-4 px-2 md:px-4">
            {messages.map((msg, idx) => {
                // Check if message is from current user - handle multiple possible structures
                let senderId = null;
                if (msg.senderId) {
                    if (typeof msg.senderId === 'object' && msg.senderId !== null) {
                        senderId = msg.senderId._id || msg.senderId.id;
                    } else {
                        senderId = msg.senderId;
                    }
                }
                
                const currentUserId = currentUser?._id || currentUser?.id;
                const isOwn = Boolean(senderId && currentUserId && String(senderId) === String(currentUserId));
                const isOptimistic = msg.isOptimistic;
                
                return (
                    <div 
                        key={msg._id || idx} 
                        className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'} ${isOptimistic ? 'opacity-70 animate-pulse' : 'animate-in fade-in slide-in-from-bottom-2 duration-300'}`}
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
            <div ref={messagesEndRef} />
        </div>
    );
};

export default ChatMessages;