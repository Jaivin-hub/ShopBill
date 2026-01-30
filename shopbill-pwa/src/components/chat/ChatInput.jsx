import React from 'react';
import { Mic, Send, X, Square, Paperclip } from 'lucide-react';

const ChatInput = ({
    messageInput,
    onMessageChange,
    onSendMessage,
    isRecording,
    recordingTime,
    audioUrl,
    onStartRecording,
    onStopRecording,
    onSendVoiceMessage,
    onCancelRecording,
    formatRecordingTime,
    darkMode
}) => {
    // Theme Colors
    const bgColor = darkMode ? 'bg-slate-900/90' : 'bg-white/95';
    const borderColor = darkMode ? 'border-slate-800' : 'border-slate-200';
    const inputBg = darkMode ? 'bg-slate-950' : 'bg-white';

    const ActionButton = ({ onClick, icon: Icon, color = "indigo" }) => (
        <button
            type="button"
            onClick={onClick}
            className={`p-3 rounded-2xl transition-all active:scale-95 ${
                color === "red" 
                ? "bg-red-500 text-white shadow-lg shadow-red-500/20" 
                : "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
            }`}
        >
            <Icon size={18} strokeWidth={2.5} />
        </button>
    );

    return (
        <div className={`backdrop-blur-xl border ${borderColor} ${bgColor} rounded-2xl p-2 shadow-2xl`}>
            {isRecording ? (
                /* RECORDING STATE */
                <div className="flex items-center gap-3 px-2 py-1">
                    <div className="flex-1 flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-[11px] font-black tracking-widest text-red-500 uppercase">
                            LIVE RECORDING: {formatRecordingTime(recordingTime)}
                        </span>
                    </div>
                    <button 
                        onClick={onCancelRecording}
                        className={`text-[10px] font-black uppercase px-2 transition-colors ${darkMode ? 'text-slate-500 hover:text-red-500' : 'text-slate-600 hover:text-red-600'}`}
                    >
                        Cancel
                    </button>
                    <ActionButton onClick={onStopRecording} icon={Square} color="red" />
                </div>
            ) : audioUrl ? (
                /* PREVIEW STATE */
                <div className="flex items-center gap-3 px-2 py-1">
                    <div className="flex-1 flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl px-4 py-2">
                        <Mic size={14} className="text-indigo-500" />
                        <span className="text-[11px] font-black tracking-widest text-indigo-500 uppercase">
                            VOICE NOTE READY ({formatRecordingTime(recordingTime)})
                        </span>
                    </div>
                    <button onClick={onCancelRecording} className={`p-2 transition-colors ${darkMode ? 'text-slate-500 hover:text-red-500' : 'text-slate-600 hover:text-red-600'}`}>
                        <X size={18} />
                    </button>
                    <ActionButton onClick={onSendVoiceMessage} icon={Send} />
                </div>
            ) : (
                /* NORMAL TEXT STATE */
                <form 
                    onSubmit={onSendMessage}
                    className="flex items-center gap-2"
                >
                    <button
                        type="button"
                        className={`p-2.5 rounded-xl transition-colors ${darkMode ? 'text-slate-500 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}
                    >
                        <Paperclip size={20} />
                    </button>

                    <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => onMessageChange(e.target.value)}
                        placeholder="Transmission..."
                        className={`flex-1 ${inputBg} ${darkMode ? 'text-white' : 'text-slate-900'} border-none rounded-2xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 ${darkMode ? 'placeholder:text-slate-500' : 'placeholder:text-slate-400'} transition-all`}
                    />

                    {messageInput.trim() ? (
                        <button
                            type="submit"
                            className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/30 active:scale-95 transition-all"
                        >
                            <Send size={18} strokeWidth={2.5} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onStartRecording}
                            className={`p-3 rounded-2xl transition-all active:scale-95 ${
                                darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                            }`}
                        >
                            <Mic size={18} strokeWidth={2.5} />
                        </button>
                    )}
                </form>
            )}
        </div>
    );
};

export default ChatInput;