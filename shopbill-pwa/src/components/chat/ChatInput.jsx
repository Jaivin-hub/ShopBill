import React, { useRef } from 'react';
import { Mic, Send, X, Square, Paperclip, File, Image } from 'lucide-react';

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
    onFileSelect,
    selectedFile,
    filePreview,
    onSendFile,
    onCancelFile,
    isUploadingFile,
    darkMode
}) => {
    const fileInputRef = useRef(null);
    // Theme Colors
    const bgColor = darkMode ? 'bg-slate-900/90' : 'bg-white/95';
    const borderColor = darkMode ? 'border-slate-800' : 'border-slate-200';
    const inputBg = darkMode ? 'bg-slate-950' : 'bg-white';

    const ActionButton = ({ onClick, icon: Icon, color = "indigo", disabled = false }) => (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`p-3 rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
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
                /* VOICE PREVIEW STATE */
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
            ) : selectedFile ? (
                /* FILE PREVIEW STATE */
                <div className="flex items-center gap-3 px-2 py-1">
                    <div className="flex-1 flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-2 min-w-0">
                        {filePreview ? (
                            <img src={filePreview} alt="Preview" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        ) : (
                            <File size={14} className="text-emerald-500 shrink-0" />
                        )}
                        <span className="text-[11px] font-black tracking-widest text-emerald-500 uppercase truncate">
                            {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)}KB)
                        </span>
                    </div>
                    <button 
                        onClick={onCancelFile} 
                        disabled={isUploadingFile}
                        className={`p-2 transition-colors ${darkMode ? 'text-slate-500 hover:text-red-500' : 'text-slate-600 hover:text-red-600'} disabled:opacity-50`}
                    >
                        <X size={18} />
                    </button>
                    <ActionButton 
                        onClick={onSendFile} 
                        icon={Send}
                        disabled={isUploadingFile}
                    />
                </div>
            ) : (
                /* NORMAL TEXT STATE */
                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && onFileSelect) {
                                onFileSelect(file);
                            }
                            // Reset input to allow selecting same file again
                            e.target.value = '';
                        }}
                        className="hidden"
                        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                        multiple={false}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-2.5 rounded-xl transition-colors ${darkMode ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-300' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                        title="Attach file"
                        aria-label="Attach file"
                    >
                        <Paperclip size={20} />
                    </button>

                    <form 
                        onSubmit={onSendMessage}
                        className="flex-1 flex items-center gap-2"
                    >
                        <input
                            type="text"
                            value={messageInput}
                            onChange={(e) => onMessageChange(e.target.value)}
                            placeholder="Transmission..."
                            className={`flex-1 ${inputBg} ${darkMode ? 'text-white' : 'text-slate-900'} border-none rounded-2xl px-4 py-2.5 text-[16px] md:text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 ${darkMode ? 'placeholder:text-slate-500' : 'placeholder:text-slate-400'} transition-all`}
                        />

                        {messageInput.trim() ? (
                            <button
                                type="submit"
                                className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/30 active:scale-95 transition-all"
                            >
                                <Send size={18} strokeWidth={2.5} />
                            </button>
                        ) : null}
                    </form>

                    {!messageInput.trim() && (
                        <button
                            type="button"
                            onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.nativeEvent.stopImmediatePropagation();
                                
                                console.log('[ChatInput] ========== MIC BUTTON CLICKED ==========');
                                console.log('[ChatInput] onStartRecording exists:', !!onStartRecording);
                                console.log('[ChatInput] onStartRecording type:', typeof onStartRecording);
                                
                                if (!onStartRecording) {
                                    console.error('[ChatInput] ERROR: onStartRecording is not defined!');
                                    alert('Recording function not available. Please refresh the page.');
                                    return;
                                }
                                
                                console.log('[ChatInput] Calling onStartRecording function...');
                                try {
                                    await onStartRecording();
                                    console.log('[ChatInput] onStartRecording call completed');
                                } catch (error) {
                                    console.error('[ChatInput] ERROR in onStartRecording:', error);
                                    alert('Error starting recording: ' + error.message);
                                }
                            }}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            className={`p-3 rounded-2xl transition-all active:scale-95 hover:scale-105 relative z-50 ${
                                darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            aria-label="Start voice recording"
                            title="Start voice recording"
                            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                        >
                            <Mic size={18} strokeWidth={2.5} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default ChatInput;