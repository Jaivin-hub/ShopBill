import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Mic, Send, X, Square, Paperclip, File, AtSign, Lock, ChevronLeft, ChevronUp } from 'lucide-react';
import ReplyQuote from './ReplyQuote';
import { playMicLockSound, unlockAudio } from '../../utils/notificationSound';

const TAP_MAX_MS = 400;
const HOLD_START_MS = 380;
const TAP_MOVE_MAX_PX = 14;
const SWIPE_UP_PX = 28;
const SWIPE_UP_MAX_PX = 72;
const SWIPE_LEFT_CANCEL_PX = 72;
const LOCK_RAIL_TRAVEL_PX = 52;
/** Matches normal text row — input bar never grows when recording */
const INPUT_ROW_MIN_H = 'min-h-[36px] sm:min-h-[44px]';

/** Lock track floats above the mic — does not affect input bar height */
const MicLockRail = ({ darkMode, swipeUpProgress, recordingLocked, showRail }) => {
    if (!showRail) return null;
    const locked = recordingLocked || swipeUpProgress >= 0.85;
    return (
        <div
            className="pointer-events-none absolute bottom-full right-0 z-[80] mb-1 flex w-11 flex-col items-center sm:w-12"
            aria-hidden
        >
            <div
                className={`mic-lock-rail-enter flex w-10 flex-col items-center justify-between rounded-full py-2 sm:w-11 ${
                    darkMode ? 'bg-slate-800/95 shadow-lg shadow-black/30' : 'bg-slate-200/95 shadow-md'
                }`}
                style={{ height: '5.5rem' }}
            >
                <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 sm:h-9 sm:w-9 ${
                        locked
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 mic-lock-icon-pop'
                            : darkMode
                              ? 'bg-slate-700/90 text-slate-400'
                              : 'bg-white text-slate-500'
                    }`}
                >
                    <Lock size={16} className={locked ? 'opacity-100' : 'opacity-70'} />
                </div>
                {!locked ? (
                    <ChevronUp
                        size={18}
                        strokeWidth={2.5}
                        className={`mic-lock-chevron-bounce shrink-0 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
                    />
                ) : (
                    <span className="h-4 w-4 shrink-0" />
                )}
                <span className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
            </div>
        </div>
    );
};

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
    isSendingVoice = false,
    uploadProgress = 0,
    darkMode,
    groupMentionsEnabled = false,
    mentionCandidates = [],
    onAddMention,
    replyingTo = null,
    onCancelReply,
    currentUser,
}) => {
    const fileInputRef = useRef(null);
    const mentionWrapRef = useRef(null);
    const [mentionPickerOpen, setMentionPickerOpen] = useState(false);

    const [recordingLocked, setRecordingLocked] = useState(false);
    const [micPressActive, setMicPressActive] = useState(false);
    const [swipeUpProgress, setSwipeUpProgress] = useState(0);
    const micGestureRef = useRef({
        pointerId: null,
        holdTimer: null,
        x0: 0,
        y0: 0,
        downAt: 0,
        mode: null,
        startedThisGesture: false,
        tapHandled: false,
        lockSoundPlayed: false,
        pendingTapLock: false,
    });
    const micCleanupRef = useRef(null);
    const micButtonRef = useRef(null);

    const clearHoldTimer = useCallback(() => {
        const t = micGestureRef.current.holdTimer;
        if (t) {
            clearTimeout(t);
            micGestureRef.current.holdTimer = null;
        }
    }, []);

    const cleanupMicListeners = useCallback(() => {
        const fn = micCleanupRef.current;
        if (fn) {
            try {
                fn();
            } catch {
                /* ignore */
            }
            micCleanupRef.current = null;
        }
    }, []);

    const resetMicGesture = useCallback(() => {
        clearHoldTimer();
        cleanupMicListeners();
        micGestureRef.current.pointerId = null;
        micGestureRef.current.mode = null;
        micGestureRef.current.startedThisGesture = false;
        micGestureRef.current.tapHandled = false;
        setRecordingLocked(false);
        setMicPressActive(false);
        setSwipeUpProgress(0);
        micGestureRef.current.lockSoundPlayed = false;
        micGestureRef.current.pendingTapLock = false;
    }, [clearHoldTimer, cleanupMicListeners]);

    useEffect(() => () => resetMicGesture(), [resetMicGesture]);

    useEffect(() => {
        if (audioUrl) {
            setRecordingLocked(false);
            setMicPressActive(false);
            setSwipeUpProgress(0);
            micGestureRef.current.pendingTapLock = false;
        }
    }, [audioUrl]);

    const beginRecording = useCallback(async () => {
        const g = micGestureRef.current;
        if (g.startedThisGesture || !onStartRecording) return;
        g.startedThisGesture = true;
        clearHoldTimer();
        try {
            await onStartRecording();
            if (g.pendingTapLock) {
                g.pendingTapLock = false;
                setRecordingLocked(true);
                setMicPressActive(false);
                setSwipeUpProgress(1);
            }
        } catch (err) {
            console.error('[ChatInput] onStartRecording:', err);
            g.startedThisGesture = false;
            g.pendingTapLock = false;
            setRecordingLocked(false);
        }
    }, [clearHoldTimer, onStartRecording]);

    const endRecordingFromGesture = useCallback(() => {
        onStopRecording?.();
    }, [onStopRecording]);

    const triggerLockFromSwipe = useCallback(() => {
        const g = micGestureRef.current;
        if (g.mode === 'lock') return;
        g.mode = 'lock';
        clearHoldTimer();
        setRecordingLocked(true);
        setSwipeUpProgress(1);
        if (!g.lockSoundPlayed) {
            g.lockSoundPlayed = true;
            playMicLockSound();
        }
        void beginRecording();
    }, [beginRecording, clearHoldTimer]);

    const cancelGestureRecording = useCallback(() => {
        cleanupMicListeners();
        clearHoldTimer();
        const g = micGestureRef.current;
        if (g.startedThisGesture || isRecording) {
            onCancelRecording?.();
        }
        resetMicGesture();
    }, [cleanupMicListeners, clearHoldTimer, isRecording, onCancelRecording, resetMicGesture]);

    const onMicPointerDown = useCallback(
        (e) => {
            if (e.button !== 0 || !onStartRecording) return;

            // Tap mic again while locked → stop recording
            if (recordingLocked && isRecording) {
                endRecordingFromGesture();
                resetMicGesture();
                return;
            }

            resetMicGesture();
            unlockAudio();

            const ptrId = e.pointerId;
            const x0 = e.clientX;
            const y0 = e.clientY;
            const downAt = Date.now();
            const captureEl = e.currentTarget;

            setMicPressActive(true);
            setSwipeUpProgress(0);

            micGestureRef.current = {
                ...micGestureRef.current,
                pointerId: ptrId,
                x0,
                y0,
                downAt,
                mode: null,
                startedThisGesture: false,
                tapHandled: false,
                lockSoundPlayed: false,
                pendingTapLock: false,
            };

            try {
                captureEl.setPointerCapture(ptrId);
            } catch {
                /* ignore */
            }

            const onMove = (ev) => {
                if (ev.pointerId !== ptrId) return;
                const dy = y0 - ev.clientY;
                const dx = ev.clientX - x0;
                const absDx = Math.abs(dx);

                if (dx < -SWIPE_LEFT_CANCEL_PX && absDx > dy * 0.6) {
                    cancelGestureRecording();
                    return;
                }

                if (dy > 4 && dy >= absDx * 0.35) {
                    const progress = Math.min(1, dy / SWIPE_UP_MAX_PX);
                    setSwipeUpProgress(progress);
                    if (dy > SWIPE_UP_PX && dy > absDx * 0.5) {
                        triggerLockFromSwipe();
                    }
                } else if (micGestureRef.current.mode !== 'lock') {
                    setSwipeUpProgress(0);
                }
            };

            const onUp = (ev) => {
                if (ev.pointerId !== ptrId) return;
                cleanupMicListeners();
                clearHoldTimer();

                const g = micGestureRef.current;
                const elapsed = Date.now() - downAt;
                const moved = Math.hypot(ev.clientX - x0, ev.clientY - y0);
                const locked = g.mode === 'lock';

                if (locked) {
                    setMicPressActive(false);
                    g.pointerId = null;
                    setSwipeUpProgress(1);
                    return;
                }

                const isQuickTap =
                    !g.startedThisGesture &&
                    elapsed < TAP_MAX_MS &&
                    moved < TAP_MOVE_MAX_PX;

                if (isQuickTap) {
                    g.mode = 'tap-lock';
                    g.pendingTapLock = true;
                    g.tapHandled = true;
                    setRecordingLocked(true);
                    setSwipeUpProgress(1);
                    void beginRecording();
                    setMicPressActive(false);
                    g.pointerId = null;
                    return;
                }

                setMicPressActive(false);
                setSwipeUpProgress(0);

                if (g.mode === 'hold') {
                    endRecordingFromGesture();
                }

                g.pointerId = null;
                g.mode = null;
                g.startedThisGesture = false;
                g.tapHandled = false;
            };

            micCleanupRef.current = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                window.removeEventListener('pointercancel', onUp);
            };

            window.addEventListener('pointermove', onMove, { passive: true });
            window.addEventListener('pointerup', onUp);
            window.addEventListener('pointercancel', onUp);

            clearHoldTimer();
            micGestureRef.current.holdTimer = setTimeout(() => {
                const g2 = micGestureRef.current;
                if (g2.pointerId !== ptrId || g2.mode === 'lock' || g2.mode === 'tap-lock' || g2.startedThisGesture) {
                    return;
                }
                g2.mode = 'hold';
                void beginRecording();
            }, HOLD_START_MS);
        },
        [
            beginRecording,
            cancelGestureRecording,
            cleanupMicListeners,
            clearHoldTimer,
            endRecordingFromGesture,
            isRecording,
            recordingLocked,
            onStartRecording,
            resetMicGesture,
            triggerLockFromSwipe,
        ]
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
            className={`p-2 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed sm:p-3 sm:rounded-2xl ${
                color === "red" 
                ? "bg-red-500 text-white shadow-lg shadow-red-500/20" 
                : "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
            }`}
        >
            <Icon size={16} strokeWidth={2.5} className="sm:w-[18px] sm:h-[18px]" />
        </button>
    );

    const showVoiceGestureBar =
        micPressActive || (isRecording && !recordingLocked);

    const micButtonClass = `relative shrink-0 rounded-xl p-2 transition-all touch-manipulation select-none sm:rounded-2xl sm:p-2.5 ${
        showVoiceGestureBar
            ? darkMode
                ? 'bg-slate-700 text-slate-100 ring-2 ring-slate-600 shadow-lg'
                : 'bg-white text-slate-700 ring-2 ring-slate-300 shadow-md'
            : darkMode
              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:scale-105 active:scale-95'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:scale-105 active:scale-95'
    }`;

    return (
        <div className={`relative overflow-visible backdrop-blur-xl border ${borderColor} ${bgColor} rounded-xl p-1.5 shadow-lg sm:rounded-2xl sm:p-2 sm:shadow-2xl`}>
            {replyingTo ? (
                <div
                    className={`mb-1.5 flex items-start gap-1.5 rounded-lg border px-1.5 py-1 sm:mb-2 sm:gap-2 sm:rounded-xl sm:px-2 sm:py-2 ${
                        darkMode ? 'border-slate-700 bg-slate-900/80' : 'border-slate-200 bg-slate-50'
                    }`}
                >
                    <div className="min-w-0 flex-1">
                        <ReplyQuote replyTo={replyingTo} currentUser={currentUser} isOwn={false} darkMode={darkMode} compact />
                    </div>
                    <button
                        type="button"
                        onClick={onCancelReply}
                        className={`shrink-0 rounded-lg p-1 sm:p-1.5 ${darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-200'}`}
                        aria-label="Cancel reply"
                    >
                        <X size={16} />
                    </button>
                </div>
            ) : null}
            {audioUrl ? (
                /* VOICE PREVIEW — one row; upload bar only while sending */
                <div className="flex w-full min-w-0 flex-col gap-1 px-0.5 py-0 sm:gap-1.5 sm:px-1 sm:py-0.5">
                    {uploadProgress > 0 || isSendingVoice ? (
                        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                            <div className="h-full rounded-full bg-indigo-500 transition-all duration-200" style={{ width: `${uploadProgress > 0 ? uploadProgress : 12}%` }} />
                        </div>
                    ) : null}
                    <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1.5 sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-2">
                            <Mic size={13} className="shrink-0 text-indigo-500 sm:w-3.5 sm:h-3.5" />
                            <span className="truncate text-[9px] font-black uppercase tracking-widest text-indigo-500 sm:text-[11px]">
                                {isSendingVoice ? 'Sending…' : `Voice ready (${formatRecordingTime(recordingTime)})`}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={onCancelRecording}
                            disabled={isSendingVoice}
                            className={`shrink-0 p-1.5 transition-colors sm:p-2 ${darkMode ? 'text-slate-500 hover:text-red-500' : 'text-slate-600 hover:text-red-600'} disabled:opacity-50`}
                            aria-label="Discard voice note"
                        >
                            <X size={18} />
                        </button>
                        <ActionButton onClick={onSendVoiceMessage} icon={Send} disabled={isSendingVoice} />
                    </div>
                </div>
            ) : isRecording && recordingLocked ? (
                /* Locked recording — tap stop */
                <div className={`flex items-center gap-2 px-1 py-0.5 sm:gap-3 sm:px-2 sm:py-1 ${INPUT_ROW_MIN_H}`}>
                    <div className="flex flex-1 items-center gap-2 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-3 py-1.5 sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-2">
                        <div className="h-2 w-2 rounded-full bg-indigo-500 mic-rec-dot-pulse" />
                        <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-indigo-500">
                            <Lock size={10} className="shrink-0" />
                            Locked · {formatRecordingTime(recordingTime)}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            resetMicGesture();
                            onCancelRecording?.();
                        }}
                        className={`px-2 text-[10px] font-black uppercase transition-colors ${darkMode ? 'text-slate-500 hover:text-red-500' : 'text-slate-600 hover:text-red-600'}`}
                    >
                        Cancel
                    </button>
                    <ActionButton
                        onClick={() => {
                            resetMicGesture();
                            onStopRecording?.();
                        }}
                        icon={Square}
                        color="red"
                    />
                </div>
            ) : selectedFile ? (
                /* FILE PREVIEW STATE */
                <div className="flex flex-col gap-1.5 px-1 py-0 sm:gap-2 sm:px-2 sm:py-1">
                    {isUploadingFile && uploadProgress > 0 && (
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                        </div>
                    )}
                    <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex-1 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 min-w-0 sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-2">
                        {filePreview ? (
                            <img src={filePreview} alt="Preview" className="w-7 h-7 rounded-lg object-cover shrink-0 sm:w-8 sm:h-8" />
                        ) : (
                            <File size={13} className="text-emerald-500 shrink-0 sm:w-3.5 sm:h-3.5" />
                        )}
                        <span className="text-[10px] font-black tracking-widest text-emerald-500 uppercase truncate sm:text-[11px]">
                            {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)}KB)
                        </span>
                    </div>
                    <button 
                        onClick={onCancelFile} 
                        disabled={isUploadingFile}
                        className={`p-1.5 transition-colors sm:p-2 ${darkMode ? 'text-slate-500 hover:text-red-500' : 'text-slate-600 hover:text-red-600'} disabled:opacity-50`}
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
                /* Text / voice — single fixed-height row */
                <div className={`flex w-full min-w-0 flex-row items-center gap-0.5 sm:gap-1.5 ${INPUT_ROW_MIN_H}`}>
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

                    {!showVoiceGestureBar ? (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`shrink-0 rounded-lg p-1.5 sm:rounded-xl sm:p-2.5 ${darkMode ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-300' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                        title="Attach file"
                        aria-label="Attach file"
                    >
                        <Paperclip size={16} strokeWidth={2.25} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                    ) : null}

                    {showVoiceGestureBar ? (
                        <div
                            className={`flex min-w-0 flex-1 items-center gap-2 px-1 sm:gap-2.5 sm:px-2 ${
                                darkMode ? 'text-slate-200' : 'text-slate-700'
                            }`}
                        >
                            <span className="mic-rec-dot-pulse h-2 w-2 shrink-0 rounded-full bg-red-500 sm:h-2.5 sm:w-2.5" />
                            <span className="shrink-0 text-sm font-bold tabular-nums text-red-500">
                                {formatRecordingTime(isRecording ? recordingTime : 0)}
                            </span>
                            <div
                                className={`mic-slide-cancel-shimmer flex min-w-0 flex-1 items-center justify-end gap-1 text-xs font-medium sm:text-sm ${
                                    darkMode ? 'text-slate-400' : 'text-slate-500'
                                }`}
                            >
                                <span className="truncate">slide to cancel</span>
                                <ChevronLeft size={16} strokeWidth={2.5} className="shrink-0 opacity-80 sm:w-[18px] sm:h-[18px]" />
                            </div>
                        </div>
                    ) : null}

                    {groupMentionsEnabled && onAddMention && !showVoiceGestureBar ? (
                        <div className="relative shrink-0" ref={mentionWrapRef}>
                            <button
                                type="button"
                                onClick={() => setMentionPickerOpen((o) => !o)}
                                className={`rounded-lg p-1.5 sm:rounded-xl sm:p-2.5 ${darkMode ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-300' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                                title="Mention someone"
                                aria-label="Mention someone"
                                aria-expanded={mentionPickerOpen}
                            >
                                <AtSign size={16} strokeWidth={2.25} className="sm:w-[18px] sm:h-[18px]" />
                            </button>
                            {mentionPickerOpen && (
                                <div
                                    className={`absolute bottom-full left-0 z-[100] mb-2 max-h-48 w-[min(16rem,calc(100vw-2rem))] overflow-y-auto chat-scroll custom-scrollbar rounded-xl border py-1 shadow-xl ${
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

                    {!showVoiceGestureBar ? (
                    <form
                        onSubmit={onSendMessage}
                        className="flex min-w-0 flex-1 items-center gap-1 sm:gap-1.5"
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
                            className={`min-h-[36px] min-w-0 flex-1 rounded-xl border-none px-2.5 py-1.5 text-[16px] font-bold sm:min-h-[44px] sm:rounded-2xl sm:px-4 sm:py-2.5 sm:text-sm ${inputBg} ${darkMode ? 'text-white' : 'text-slate-900'} focus:ring-2 focus:ring-indigo-500/20 ${darkMode ? 'placeholder:text-slate-500' : 'placeholder:text-slate-400'} transition-all`}
                            enterKeyHint="send"
                            autoComplete="off"
                            autoCorrect="on"
                        />

                        {messageInput.trim() ? (
                            <button
                                type="submit"
                                className="shrink-0 rounded-xl bg-indigo-600 p-2 text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-95 sm:rounded-2xl sm:p-2.5"
                                aria-label="Send message"
                            >
                                <Send size={16} strokeWidth={2.5} className="sm:w-[18px] sm:h-[18px]" />
                            </button>
                        ) : null}
                    </form>
                    ) : null}

                    {!messageInput.trim() || showVoiceGestureBar ? (
                        <div className="relative z-50 shrink-0 overflow-visible">
                            <MicLockRail
                                darkMode={darkMode}
                                swipeUpProgress={swipeUpProgress}
                                recordingLocked={recordingLocked}
                                showRail={showVoiceGestureBar}
                            />
                            <button
                                ref={micButtonRef}
                                type="button"
                                onPointerDown={onMicPointerDown}
                                onContextMenu={(e) => e.preventDefault()}
                                style={
                                    showVoiceGestureBar
                                        ? { transform: `translateY(-${swipeUpProgress * LOCK_RAIL_TRAVEL_PX}px)` }
                                        : undefined
                                }
                                className={`${micButtonClass} ${showVoiceGestureBar ? 'relative z-[90] duration-75' : ''}`}
                                aria-label={
                                    recordingLocked && isRecording
                                        ? 'Tap to stop recording'
                                        : showVoiceGestureBar
                                          ? 'Hold — release to send, swipe up to lock'
                                          : 'Tap to start recording, hold to record while pressed'
                                }
                                title={
                                    recordingLocked && isRecording
                                        ? 'Tap to stop'
                                        : 'Tap to record · hold while pressed · swipe up to lock'
                                }
                            >
                                <Mic size={16} strokeWidth={2.5} className="sm:w-[18px] sm:h-[18px]" />
                            </button>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
};

export default ChatInput;