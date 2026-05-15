import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Mic, Send, X, Square, Paperclip, File, AtSign } from 'lucide-react';

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
    uploadProgress = 0,
    darkMode,
    groupMentionsEnabled = false,
    mentionCandidates = [],
    onAddMention,
}) => {
    const fileInputRef = useRef(null);
    const mentionWrapRef = useRef(null);
    const [mentionPickerOpen, setMentionPickerOpen] = useState(false);

    /** Phones / tablets: swipe up on mic or hold to record (tap-to-record stays on fine pointers e.g. desktop). */
    const [coarsePointer, setCoarsePointer] = useState(() =>
        typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)')?.matches === true
    );
    const [micGestureHint, setMicGestureHint] = useState(false);
    const micGestureRef = useRef({
        longPressTimer: null,
        pointerId: null,
        x0: 0,
        y0: 0,
        fired: false,
    });
    const micWindowGestureCleanupRef = useRef(null);

    useEffect(() => {
        const mq = window.matchMedia?.('(pointer: coarse)');
        if (!mq) return undefined;
        const fn = () => setCoarsePointer(mq.matches);
        mq.addEventListener('change', fn);
        return () => mq.removeEventListener('change', fn);
    }, []);

    const clearMicLongPress = useCallback(() => {
        const t = micGestureRef.current.longPressTimer;
        if (t) {
            clearTimeout(t);
            micGestureRef.current.longPressTimer = null;
        }
    }, []);

    const cleanupMicWindowGesture = useCallback(() => {
        const fn = micWindowGestureCleanupRef.current;
        if (fn) {
            try {
                fn();
            } catch {
                /* ignore */
            }
            micWindowGestureCleanupRef.current = null;
        }
    }, []);

    const resetMicGesture = useCallback(() => {
        clearMicLongPress();
        cleanupMicWindowGesture();
        micGestureRef.current.pointerId = null;
        micGestureRef.current.fired = false;
        setMicGestureHint(false);
    }, [clearMicLongPress, cleanupMicWindowGesture]);

    useEffect(() => () => resetMicGesture(), [resetMicGesture]);

    const fireMicRecording = useCallback(async () => {
        if (micGestureRef.current.fired) return;
        micGestureRef.current.fired = true;
        clearMicLongPress();
        setMicGestureHint(false);
        if (!onStartRecording) {
            console.error('[ChatInput] onStartRecording is not defined');
            return;
        }
        try {
            await onStartRecording();
        } catch (error) {
            console.error('[ChatInput] onStartRecording:', error);
        }
    }, [clearMicLongPress, onStartRecording]);

    const onMicPointerDown = useCallback(
        (e) => {
            if (e.button !== 0 || !onStartRecording) return;
            const useTouchLikeGesture =
                coarsePointer && (e.pointerType === 'touch' || e.pointerType === 'pen');
            if (!useTouchLikeGesture) return;

            cleanupMicWindowGesture();

            const ptrId = e.pointerId;
            const x0 = e.clientX;
            const y0 = e.clientY;
            micGestureRef.current.x0 = x0;
            micGestureRef.current.y0 = y0;
            micGestureRef.current.pointerId = ptrId;
            micGestureRef.current.fired = false;
            setMicGestureHint(true);

            const docMove = (ev) => {
                if (ev.pointerId !== ptrId || micGestureRef.current.fired) return;
                const dy = y0 - ev.clientY;
                const dx = Math.abs(ev.clientX - x0);
                if (dy > 8 && dy > dx * 0.45) {
                    try {
                        ev.preventDefault();
                    } catch {
                        /* ignore */
                    }
                }
                if (dy > 36 && dy > dx * 0.65) {
                    void fireMicRecording();
                    return;
                }
                const moved = Math.hypot(ev.clientX - x0, ev.clientY - y0);
                if (moved > 16 && dy < 16) {
                    clearMicLongPress();
                }
            };

            const docEnd = (ev) => {
                if (ev.pointerId !== ptrId) return;
                window.removeEventListener('pointermove', docMove);
                window.removeEventListener('pointerup', docEnd);
                window.removeEventListener('pointercancel', docEnd);
                micWindowGestureCleanupRef.current = null;
                clearMicLongPress();
                micGestureRef.current.pointerId = null;
                micGestureRef.current.fired = false;
                setMicGestureHint(false);
            };

            micWindowGestureCleanupRef.current = () => {
                window.removeEventListener('pointermove', docMove);
                window.removeEventListener('pointerup', docEnd);
                window.removeEventListener('pointercancel', docEnd);
            };

            window.addEventListener('pointermove', docMove, { passive: false });
            window.addEventListener('pointerup', docEnd);
            window.addEventListener('pointercancel', docEnd);

            clearMicLongPress();
            micGestureRef.current.longPressTimer = setTimeout(() => {
                void fireMicRecording();
            }, 480);
        },
        [clearMicLongPress, coarsePointer, cleanupMicWindowGesture, fireMicRecording, onStartRecording]
    );

    useEffect(() => {
        if (!groupMentionsEnabled) setMentionPickerOpen(false);
    }, [groupMentionsEnabled]);

    useEffect(() => {
        if (!mentionPickerOpen) return;
        const onDoc = (e) => {
            if (mentionWrapRef.current && !mentionWrapRef.current.contains(e.target)) {
                setMentionPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [mentionPickerOpen]);
    // Theme Colors
    const bgColor = darkMode ? 'bg-slate-900/90' : 'bg-white/95';
    const borderColor = darkMode ? 'border-slate-800' : 'border-slate-200';
    const inputBg = darkMode ? 'bg-gray-950' : 'bg-white';

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
                /* VOICE PREVIEW — one row; upload bar only while sending */
                <div className="flex w-full min-w-0 flex-col gap-1.5 px-1 py-0.5">
                    {uploadProgress > 0 ? (
                        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                            <div className="h-full rounded-full bg-indigo-500 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                        </div>
                    ) : null}
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 sm:gap-3 sm:px-4">
                            <Mic size={14} className="shrink-0 text-indigo-500" />
                            <span className="truncate text-[10px] font-black uppercase tracking-widest text-indigo-500 sm:text-[11px]">
                                Voice ready ({formatRecordingTime(recordingTime)})
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={onCancelRecording}
                            className={`shrink-0 p-2 transition-colors ${darkMode ? 'text-slate-500 hover:text-red-500' : 'text-slate-600 hover:text-red-600'}`}
                            aria-label="Discard voice note"
                        >
                            <X size={18} />
                        </button>
                        <ActionButton onClick={onSendVoiceMessage} icon={Send} />
                    </div>
                </div>
            ) : selectedFile ? (
                /* FILE PREVIEW STATE */
                <div className="flex flex-col gap-2 px-2 py-1">
                    {isUploadingFile && uploadProgress > 0 && (
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                        </div>
                    )}
                    <div className="flex items-center gap-3">
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
                </div>
            ) : (
                /* NORMAL TEXT — single row: attach, @, field+send, mic */
                <div className="flex w-full min-w-0 flex-row items-center gap-1 sm:gap-1.5">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && onFileSelect) {
                                onFileSelect(file);
                            }
                            e.target.value = '';
                        }}
                        className="hidden"
                        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                        multiple={false}
                    />

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`shrink-0 rounded-xl p-2 sm:p-2.5 ${darkMode ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-300' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                        title="Attach file"
                        aria-label="Attach file"
                    >
                        <Paperclip size={18} strokeWidth={2.25} />
                    </button>

                    {groupMentionsEnabled && onAddMention ? (
                        <div className="relative shrink-0" ref={mentionWrapRef}>
                            <button
                                type="button"
                                onClick={() => setMentionPickerOpen((o) => !o)}
                                className={`rounded-xl p-2 sm:p-2.5 ${darkMode ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-300' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                                title="Mention someone"
                                aria-label="Mention someone"
                                aria-expanded={mentionPickerOpen}
                            >
                                <AtSign size={18} strokeWidth={2.25} />
                            </button>
                            {mentionPickerOpen && (
                                <div
                                    className={`absolute bottom-full left-0 z-[100] mb-2 max-h-48 w-[min(16rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border py-1 shadow-xl ${
                                        darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
                                    }`}
                                >
                                    {mentionCandidates.map((p) => (
                                        <button
                                            key={String(p._id)}
                                            type="button"
                                            className={`w-full px-3 py-2 text-left text-sm font-bold transition-colors ${
                                                darkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-800 hover:bg-slate-50'
                                            }`}
                                            onClick={() => {
                                                onAddMention(p._id, p.name);
                                                setMentionPickerOpen(false);
                                            }}
                                        >
                                            @{p.name || 'User'}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : null}

                    <form
                        onSubmit={onSendMessage}
                        className="flex min-w-0 flex-1 items-center gap-1.5"
                    >
                        <input
                            type="text"
                            value={messageInput}
                            onChange={(e) => onMessageChange(e.target.value)}
                            onFocus={(e) => {
                                requestAnimationFrame(() => {
                                    try {
                                        e.target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
                                    } catch {
                                        e.target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                                    }
                                });
                            }}
                            placeholder="Transmission..."
                            className={`min-h-[44px] min-w-0 flex-1 rounded-2xl border-none px-3 py-2 text-[16px] font-bold sm:px-4 sm:py-2.5 sm:text-sm ${inputBg} ${darkMode ? 'text-white' : 'text-slate-900'} focus:ring-2 focus:ring-indigo-500/20 ${darkMode ? 'placeholder:text-slate-500' : 'placeholder:text-slate-400'} transition-all`}
                            enterKeyHint="send"
                            autoComplete="off"
                            autoCorrect="on"
                        />

                        {messageInput.trim() ? (
                            <button
                                type="submit"
                                className="shrink-0 rounded-2xl bg-indigo-600 p-2.5 text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-95 sm:p-3"
                                aria-label="Send message"
                            >
                                <Send size={18} strokeWidth={2.5} />
                            </button>
                        ) : null}
                    </form>

                    {!messageInput.trim() ? (
                        <div className="relative z-50 shrink-0">
                            {coarsePointer && micGestureHint && !isRecording ? (
                                <div
                                    className={`pointer-events-none absolute bottom-full left-1/2 z-[60] mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest shadow-lg ${
                                        darkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-800 text-white'
                                    }`}
                                    aria-hidden
                                >
                                    Swipe up or hold
                                </div>
                            ) : null}
                            <button
                                type="button"
                                onPointerDown={onMicPointerDown}
                                onClick={async (e) => {
                                    if (coarsePointer) {
                                        return;
                                    }
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!onStartRecording) {
                                        console.error('[ChatInput] onStartRecording is not defined');
                                        return;
                                    }
                                    try {
                                        await onStartRecording();
                                    } catch (error) {
                                        console.error('[ChatInput] onStartRecording:', error);
                                    }
                                }}
                                className={`relative shrink-0 rounded-2xl p-2.5 transition-all hover:scale-105 active:scale-95 sm:p-3 touch-manipulation ${
                                    darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                                aria-label={
                                    coarsePointer ? 'Voice: swipe up on the mic or press and hold to record' : 'Start voice recording'
                                }
                                title={coarsePointer ? 'Swipe up or hold to record' : 'Start voice recording'}
                            >
                                <Mic size={18} strokeWidth={2.5} />
                            </button>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
};

export default ChatInput;