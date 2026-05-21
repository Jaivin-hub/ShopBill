import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { MessageCircle, Loader2, ShieldCheck, Plus } from 'lucide-react';
import { io } from 'socket.io-client';
import { SOCKET_URL, SOCKET_IO_CLIENT_BASE } from '../config/api';
import ChatListSidebar from './chat/ChatListSidebar';
import ChatHeader from './chat/ChatHeader';
import ChatMessages from './chat/ChatMessages';
import ChatInput from './chat/ChatInput';
import NewChatModal from './chat/NewChatModal';
import EmptyChatView from './chat/EmptyChatView';
import { ChatInitialSkeleton } from './skeletons/PageSkeletons';
import { participantLabelForViewer } from '../utils/ownerDisplay';
import { isChatGroupCreator, normalizeChatRecord } from '../utils/chatGroup';
import { buildClientReplySnapshot } from '../utils/chatReply';

/** iOS / iPadOS Safari needs different MediaRecorder behavior than Chrome/Android */
function isAppleTouchDevice() {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

const Chat = ({ apiClient, API, showToast, darkMode, currentUser, currentOutletId, outlets = [], onChatSelectionChange, onThreadSwipeConsumed, onUnreadCountChange, onNavigateToStaffPermissions }) => {
    // Styling Vars matching Dashboard architecture
    const themeBase = darkMode ? 'bg-gray-950 text-slate-100' : 'bg-slate-50 text-slate-900';
    
    // Safety check
    if (!currentUser) {
        return (
            <div className={`h-full min-h-0 w-full flex flex-col items-center justify-center ${themeBase}`}>
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                <p className="text-xs font-black opacity-40 tracking-widest uppercase">Initializing Secure Link...</p>
            </div>
        );
    }

    // State
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const selectedChatRef = useRef(null);
    selectedChatRef.current = selectedChat;
    const [messages, setMessages] = useState([]);
    const [staffUnreadMap, setStaffUnreadMap] = useState({});
    
    const [messageInput, setMessageInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [newChatType, setNewChatType] = useState('group');
    const [newChatName, setNewChatName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [staffList, setStaffList] = useState([]);
    const [isLoadingStaff, setIsLoadingStaff] = useState(false);
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const [removingMemberId, setRemovingMemberId] = useState(null);
    /** Sidebar list: Groups vs Staff — controls where “new group” FAB appears */
    const [chatListViewMode, setChatListViewMode] = useState('chats');
    const [replyingTo, setReplyingTo] = useState(null);
    
    // Voice recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [playingAudioId, setPlayingAudioId] = useState(null);
    const [audioProgressMap, setAudioProgressMap] = useState({});
    const [showInfo, setShowInfo] = useState(false);
    
    // File upload state
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const [isSendingVoice, setIsSendingVoice] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    
    // Seen/read receipts
    const [chatLastReadBy, setChatLastReadBy] = useState({});
    const [chatParticipants, setChatParticipants] = useState([]);
    const [mentionUserIds, setMentionUserIds] = useState([]);
    const [remoteTypingUserIds, setRemoteTypingUserIds] = useState([]);
    
    // Refs
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    const recordingTimerRef = useRef(null);
    /** Mirrors recording UI seconds so sendVoiceMessage always reads the latest duration (avoids stale closure on iOS). */
    const recordingTimeRef = useRef(0);
    const audioRefs = useRef({});
    const mediaStreamRef = useRef(null); // Track the media stream for cleanup
    const recordingChunksRef = useRef([]); // Track recording chunks
    /** State updates for MediaRecorder lag on some devices — always stop via ref */
    const mediaRecorderRef = useRef(null);
    const recordingMimeTypeRef = useRef('');
    /** When user cancels, ignore onstop blob (avoids race repopulating preview) */
    const recordingDiscardRef = useRef(false);
    /** Stop requested before MediaRecorder reached "recording" (fast release after hold) */
    const stopWhenRecordingReadyRef = useRef(false);
    const typingLocalActiveRef = useRef(false);
    const typingIdleTimerRef = useRef(null);
    const remoteTypingTimeoutsRef = useRef({});
    /** Last chat id we registered in history (null = list layer) — push once, replace when switching threads */
    const threadHistorySyncedIdRef = useRef(null);
    /** Mobile: swipe from left edge to return to Groups & Staff list (same as header back / OS back). */
    const threadSwipeBackRef = useRef({ active: false, x0: 0, y0: 0, edgeEligible: false });
    const fetchChatsRef = useRef(null);
    const fetchMessagesRef = useRef(null);
    const onUnreadCountChangeRef = useRef(onUnreadCountChange);
    const showToastRef = useRef(showToast);
    const currentUserRef = useRef(currentUser);
    onUnreadCountChangeRef.current = onUnreadCountChange;
    showToastRef.current = showToast;
    currentUserRef.current = currentUser;

    // Constants
    const isPro = currentUser?.plan?.toUpperCase() === 'PRO';
    const isPremium = currentUser?.plan?.toUpperCase() === 'PREMIUM';
    const hasChatAccess = isPro || isPremium;
    const showOutletInfo = isPremium; // Multi-store (outlet labels) only for Premium; Pro has single store

    const canFetchActivePunchedIn = useMemo(() => {
        const r = String(currentUser?.role || '').toLowerCase();
        return r === 'owner' || r === 'manager';
    }, [currentUser?.role]);

    const [activePunchedInUserIds, setActivePunchedInUserIds] = useState([]);

    // Notify parent when chat selection changes (to hide/show main header)
    const notifyChatSelection = useCallback((open) => {
        onChatSelectionChange?.(!!open);
    }, [onChatSelectionChange]);

    useEffect(() => {
        notifyChatSelection(!!selectedChat);
    }, [selectedChat, notifyChatSelection]);

    // Map "open thread" to a history entry so OS / edge back returns to Groups & Staff list (same chat page).
    useEffect(() => {
        if (typeof window === 'undefined' || !window.history) return;
        const id = selectedChat?._id;
        if (!id) {
            threadHistorySyncedIdRef.current = null;
            return;
        }
        try {
            const prev = threadHistorySyncedIdRef.current;
            if (prev === null) {
                window.history.pushState({ pocketposChatThread: true }, '', window.location.href);
            } else if (prev !== id) {
                window.history.replaceState({ pocketposChatThread: true }, '', window.location.href);
            }
            threadHistorySyncedIdRef.current = id;
        } catch {
            /* ignore */
        }
    }, [selectedChat?._id]);

    useEffect(() => {
        const onPopState = () => {
            if (!selectedChatRef.current) return;
            setSelectedChat(null);
            setShowInfo(false);
            notifyChatSelection(false);
            onThreadSwipeConsumed?.();
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, [notifyChatSelection, onThreadSwipeConsumed]);

    const isGroupChatSelected = !!(selectedChat && (selectedChat.type === 'group' || selectedChat.isDefault || selectedChat.isGroupChat));
    const mentionCandidates = useMemo(() => {
        if (!isGroupChatSelected) return [];
        const uid = (currentUser?._id || currentUser?.id)?.toString();
        return chatParticipants
            .filter((p) => {
                const pid = p?._id != null ? String(p._id) : '';
                return pid && pid !== uid;
            })
            .map((p) => ({
                ...p,
                name: participantLabelForViewer(p, currentUser),
            }));
    }, [isGroupChatSelected, chatParticipants, currentUser]);

    const typingBannerText = useMemo(() => {
        if (!remoteTypingUserIds.length) return null;
        const names = remoteTypingUserIds.map((id) => {
            const p = chatParticipants.find((x) => String(x._id) === id);
            return p ? participantLabelForViewer(p, currentUser) : 'Someone';
        });
        const uniq = [...new Set(names)];
        if (uniq.length === 1) return `${uniq[0]} is typing`;
        if (uniq.length === 2) return `${uniq[0]} and ${uniq[1]} are typing`;
        return `${uniq.slice(0, -1).join(', ')}, and ${uniq[uniq.length - 1]} are typing`;
    }, [remoteTypingUserIds, chatParticipants, currentUser]);

    const TYPING_IDLE_MS = 2800;

    const flushLocalTypingStop = useCallback((chatId) => {
        if (typingIdleTimerRef.current) {
            clearTimeout(typingIdleTimerRef.current);
            typingIdleTimerRef.current = null;
        }
        if (!chatId || !typingLocalActiveRef.current) return;
        typingLocalActiveRef.current = false;
        socketRef.current?.emit('chat_typing', { chatId, isTyping: false });
    }, []);

    const scheduleTypingFromText = useCallback((rawValue) => {
        if (!selectedChat?._id || !socketRef.current?.connected) return;
        const cid = selectedChat._id;
        const trimmed = String(rawValue || '').trim();
        if (!trimmed) {
            flushLocalTypingStop(cid);
            return;
        }
        if (!typingLocalActiveRef.current) {
            typingLocalActiveRef.current = true;
            socketRef.current.emit('chat_typing', { chatId: cid, isTyping: true });
        }
        if (typingIdleTimerRef.current) clearTimeout(typingIdleTimerRef.current);
        typingIdleTimerRef.current = setTimeout(() => {
            typingIdleTimerRef.current = null;
            flushLocalTypingStop(cid);
        }, TYPING_IDLE_MS);
    }, [selectedChat?._id, flushLocalTypingStop]);

    const handleComposerTextChange = useCallback((value) => {
        setMessageInput(value);
        scheduleTypingFromText(value);
    }, [scheduleTypingFromText]);

    useEffect(() => {
        setMentionUserIds([]);
    }, [selectedChat?._id]);

    // Initialize Socket.IO connection
    useEffect(() => {
        if (!hasChatAccess) return;

        const token = localStorage.getItem('userToken');
        socketRef.current = io(SOCKET_URL, {
            ...SOCKET_IO_CLIENT_BASE,
            auth: { token },
        });

        socketRef.current.on('chat_read', (data) => {
            if (data.chatId === selectedChat?._id) {
                setChatLastReadBy(prev => ({ ...prev, ...(data.lastReadBy || {}) }));
            }
        });

        socketRef.current.on('chat_typing', (data) => {
            if (!data || !selectedChat?._id) return;
            if (data.chatId !== selectedChat._id) return;
            const uid = String(data.userId);
            const me = String(currentUser._id || currentUser.id || '');
            if (!me || uid === me) return;
            if (data.isTyping) {
                setRemoteTypingUserIds((prev) => (prev.includes(uid) ? prev : [...prev, uid]));
                if (remoteTypingTimeoutsRef.current[uid]) {
                    clearTimeout(remoteTypingTimeoutsRef.current[uid]);
                }
                remoteTypingTimeoutsRef.current[uid] = setTimeout(() => {
                    delete remoteTypingTimeoutsRef.current[uid];
                    setRemoteTypingUserIds((prev) => prev.filter((id) => id !== uid));
                }, 4500);
            } else {
                if (remoteTypingTimeoutsRef.current[uid]) {
                    clearTimeout(remoteTypingTimeoutsRef.current[uid]);
                    delete remoteTypingTimeoutsRef.current[uid];
                }
                setRemoteTypingUserIds((prev) => prev.filter((id) => id !== uid));
            }
        });

        socketRef.current.on('chat_participants_updated', (data) => {
            if (!data?.chatId) return;
            const cid = String(data.chatId);
            if (Array.isArray(data.participants)) {
                setChats((prev) =>
                    prev.map((c) => (String(c._id) === cid ? { ...c, participants: data.participants } : c))
                );
                if (String(selectedChatRef.current?._id) === cid) {
                    setSelectedChat((prev) => (prev ? { ...prev, participants: data.participants } : prev));
                    setChatParticipants(data.participants);
                }
            }
        });

        socketRef.current.on('removed_from_chat', (data) => {
            if (!data?.chatId) return;
            const cid = String(data.chatId);
            setChats((prev) => prev.filter((c) => String(c._id) !== cid));
            if (String(selectedChatRef.current?._id) === cid) {
                selectedChatRef.current = null;
                setSelectedChat(null);
                setMessages([]);
                setChatParticipants([]);
                setShowInfo(false);
                try {
                    if (typeof window !== 'undefined' && window.history?.state?.pocketposChatThread) {
                        window.history.back();
                    }
                } catch {
                    /* ignore */
                }
            }
        });

        socketRef.current.on('new_message', (data) => {
            if (data.chatId === selectedChat?._id) {
                setMessages(prev => {
                    // Remove any optimistic messages
                    const withoutOptimistic = prev.filter(m => !m.isOptimistic);
                    const existingIndex = withoutOptimistic.findIndex(m => m._id === data.message._id);
                    if (existingIndex >= 0) {
                        // Update existing message
                        const updated = [...withoutOptimistic];
                        updated[existingIndex] = data.message;
                        return updated;
                    }
                    return [...withoutOptimistic, data.message];
                });
                setTimeout(() => scrollToBottom(), 50);
            }
            
            // Immediately update the chat list to move the chat with new message to top
            setChats(prevChats => {
                const chatIndex = prevChats.findIndex(c => c._id === data.chatId);
                if (chatIndex >= 0) {
                    const updatedChats = [...prevChats];
                    const updatedChat = {
                        ...updatedChats[chatIndex],
                        lastMessageAt: new Date(data.message.timestamp || Date.now()),
                        messages: [...(updatedChats[chatIndex].messages || []), data.message]
                    };
                    // Remove from current position and add to top
                    updatedChats.splice(chatIndex, 1);
                    updatedChats.unshift(updatedChat);
                    return updatedChats;
                }
                return prevChats;
            });
            
            // Refresh chats from server to get accurate data
            fetchChatsRef.current?.();
        });

        return () => {
            Object.values(remoteTypingTimeoutsRef.current).forEach(clearTimeout);
            remoteTypingTimeoutsRef.current = {};
            setRemoteTypingUserIds([]);
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [hasChatAccess, selectedChat, currentUser]);

    // Join/leave chat room for real-time read receipts
    useEffect(() => {
        if (!socketRef.current?.connected || !selectedChat?._id) return;
        socketRef.current.emit('join_chat', selectedChat._id);
        return () => { socketRef.current?.emit('leave_chat', selectedChat._id); };
    }, [selectedChat?._id]);

    useEffect(() => {
        setRemoteTypingUserIds([]);
        Object.values(remoteTypingTimeoutsRef.current).forEach(clearTimeout);
        remoteTypingTimeoutsRef.current = {};
    }, [selectedChat?._id]);

    useEffect(() => {
        const cid = selectedChat?._id;
        return () => {
            if (cid) flushLocalTypingStop(cid);
        };
    }, [selectedChat?._id, flushLocalTypingStop]);

    // Cleanup media stream on unmount
    useEffect(() => {
        return () => {
            // Clean up any active recording
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
                mediaStreamRef.current = null;
            }
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

    const fetchChats = useCallback(async () => {
        if (!hasChatAccess) { setIsLoading(false); return; }
        try {
            const response = await apiClient.get(API.chatList);
            if (response.data?.success) {
                const raw = response.data.data;
                const fetchedChats = Array.isArray(raw) ? raw : [];
                setChats(fetchedChats);
                const totalUnread = fetchedChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
                const cu = currentUserRef.current;
                const currentUserId = cu?._id || cu?.id;
                const unreadMap = {};
                fetchedChats.forEach(chat => {
                    if (chat.type === 'direct' && Array.isArray(chat.participants)) {
                        const other = chat.participants.find(p => {
                            const pid = typeof p === 'object' && p !== null ? (p._id || p.id || p) : p;
                            return pid && currentUserId && pid.toString() !== currentUserId.toString();
                        });
                        const otherId = other && (other._id || other.id || other);
                        if (otherId) {
                            unreadMap[otherId] = (unreadMap[otherId] || 0) + (chat.unreadCount || 0);
                        }
                    }
                });
                setStaffUnreadMap(unreadMap);
                onUnreadCountChangeRef.current?.(totalUnread);
            }
        } catch (error) {
            console.error('Failed to fetch chats:', error);
            showToastRef.current?.(
                error.response?.data?.error || 'Failed to load message groups. Please try again.',
                'error'
            );
        } finally { setIsLoading(false); }
    }, [hasChatAccess, apiClient, API]);
    fetchChatsRef.current = fetchChats;

    const stickThreadToBottomRef = useRef(true);

    const scrollToBottom = useCallback((instant = false) => {
        const scroll = () => {
            const container = chatContainerRef.current;
            if (!container) return;
            const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
            container.scrollTop = maxScroll;
        };
        scroll();
        if (instant) {
            requestAnimationFrame(() => {
                scroll();
                requestAnimationFrame(scroll);
            });
            [0, 50, 120, 280, 500, 800].forEach((ms) => setTimeout(scroll, ms));
        } else {
            requestAnimationFrame(() => setTimeout(scroll, 0));
        }
    }, []);

    const fetchMessages = useCallback(async (chatId) => {
        setIsLoadingMessages(true);
        try {
            const response = await apiClient.get(API.chatMessages(chatId));
            if (response.data.success) {
                const payload = response.data.data;
                const msgList = Array.isArray(payload?.messages) ? payload.messages : (Array.isArray(payload) ? payload : []);
                setMessages(msgList);
                setChatLastReadBy(payload && typeof payload.lastReadBy === 'object' && !Array.isArray(payload.lastReadBy) ? payload.lastReadBy : {});
                setChatParticipants(Array.isArray(payload?.participants) ? payload.participants : []);
                if (payload?.chat && typeof payload.chat === 'object') {
                    setSelectedChat((prev) =>
                        prev && String(prev._id) === String(chatId)
                            ? normalizeChatRecord({ ...prev, ...payload.chat })
                            : prev
                    );
                }
                fetchChatsRef.current?.();
            }
        } catch (error) { showToastRef.current?.('Failed to load messages', 'error'); }
        finally { setIsLoadingMessages(false); }
    }, [apiClient, API]);
    fetchMessagesRef.current = fetchMessages;

    useEffect(() => {
        if (!hasChatAccess) return;
        const fetchStaff = async () => {
            setIsLoadingStaff(true);
            try {
                const response = await apiClient.get(API.chatUsers);
                if (response.data?.success) setStaffList(response.data.data || []);
            } catch (error) { console.error(error); }
            finally { setIsLoadingStaff(false); }
        };
        fetchStaff();
    }, [hasChatAccess, apiClient, API]);

    useEffect(() => {
        if (!hasChatAccess || !canFetchActivePunchedIn || !apiClient || !API?.attendanceActiveStatus) {
            setActivePunchedInUserIds([]);
            return;
        }
        let cancelled = false;
        const load = async () => {
            try {
                const response = await apiClient.get(API.attendanceActiveStatus);
                if (cancelled) return;
                const ids = response.data?.activePunchedInUserIds;
                if (response.data?.success && Array.isArray(ids)) {
                    setActivePunchedInUserIds(ids.map((id) => String(id)));
                } else {
                    setActivePunchedInUserIds([]);
                }
            } catch {
                if (!cancelled) setActivePunchedInUserIds([]);
            }
        };
        load();
        const interval = setInterval(load, 60000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [hasChatAccess, canFetchActivePunchedIn, apiClient, API, currentOutletId, selectedChat?._id]);

    const hasFetchedChatsRef = useRef(false);
    useEffect(() => {
        if (!hasChatAccess) {
            hasFetchedChatsRef.current = false;
            return;
        }
        if (!hasFetchedChatsRef.current) {
            hasFetchedChatsRef.current = true;
            fetchChatsRef.current?.();
        }
    }, [hasChatAccess]);

    useEffect(() => {
        const chatId = selectedChat?._id;
        setReplyingTo(null);
        if (!chatId) {
            setMessages([]);
            setChatLastReadBy({});
            setChatParticipants([]);
            return;
        }
        stickThreadToBottomRef.current = true;
        fetchMessagesRef.current?.(chatId);
    }, [selectedChat?._id]);

    const handleReplyToMessage = useCallback((msg) => {
        if (!msg?._id || msg.isOptimistic) return;
        setReplyingTo(buildClientReplySnapshot(msg));
    }, []);

    const lastMessageAnchorId =
        messages.length > 0 ? messages[messages.length - 1]?._id : null;

    // Anchor to latest message when thread opens / messages finish loading
    useLayoutEffect(() => {
        if (!selectedChat?._id || isLoadingMessages || !lastMessageAnchorId) return;
        stickThreadToBottomRef.current = true;
        scrollToBottom(true);
    }, [selectedChat?._id, isLoadingMessages, lastMessageAnchorId, scrollToBottom]);

    // Keep bottom pinned while layout settles (images, bubbles) after opening a thread
    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container || !selectedChat?._id) return;

        const onUserScroll = () => {
            const nearBottom =
                container.scrollHeight - container.scrollTop - container.clientHeight < 96;
            if (!nearBottom) stickThreadToBottomRef.current = false;
        };
        container.addEventListener('scroll', onUserScroll, { passive: true });

        const ro = new ResizeObserver(() => {
            if (!stickThreadToBottomRef.current || isLoadingMessages) return;
            const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
            container.scrollTop = maxScroll;
        });
        ro.observe(container);
        const inner = container.firstElementChild;
        if (inner) ro.observe(inner);

        return () => {
            container.removeEventListener('scroll', onUserScroll);
            ro.disconnect();
        };
    }, [selectedChat?._id, isLoadingMessages]);

    const formatRecordingTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
        return date.toLocaleDateString();
    };

    const startRecording = useCallback(async () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            showToast('Recording already in progress', 'info');
            return;
        }

        try {
            // Check if MediaRecorder is supported
            if (typeof MediaRecorder === 'undefined') {
                console.error('[startRecording] MediaRecorder not supported');
                showToast('Voice recording not supported in this browser', 'error');
                return;
            }

            // Check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error('[startRecording] getUserMedia not supported');
                showToast('Microphone access not available in this browser', 'error');
                return;
            }

            // Clean up any existing stream first
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
                mediaStreamRef.current = null;
            }

            const prevRec = mediaRecorderRef.current;
            if (prevRec && prevRec.state !== 'inactive') {
                try {
                    prevRec.ondataavailable = null;
                    prevRec.onstop = null;
                    prevRec.onerror = null;
                    prevRec.stop();
                } catch (e) {
                    console.warn('Error stopping existing recorder:', e);
                }
                mediaRecorderRef.current = null;
                setMediaRecorder(null);
            }

            recordingDiscardRef.current = false;

            // Request microphone access
            let stream;
            try {
                const audioConstraints = isAppleTouchDevice()
                    ? { audio: true }
                    : {
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true
                        }
                    };
                
                stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
            } catch (getUserMediaError) {
                console.error('[startRecording] getUserMedia error:', getUserMediaError);
                
                // Provide user-friendly error messages
                let errorMessage = 'Failed to access microphone. ';
                if (getUserMediaError.name === 'NotAllowedError' || getUserMediaError.name === 'PermissionDeniedError') {
                    errorMessage += 'Please allow microphone access in your browser settings and try again.';
                } else if (getUserMediaError.name === 'NotFoundError' || getUserMediaError.name === 'DevicesNotFoundError') {
                    errorMessage += 'No microphone found. Please connect a microphone and try again.';
                } else if (getUserMediaError.name === 'NotReadableError' || getUserMediaError.name === 'TrackStartError') {
                    errorMessage += 'Microphone is being used by another application. Please close other apps and try again.';
                } else {
                    errorMessage += 'Please check your device settings and try again.';
                }
                
                showToast(errorMessage, 'error');
                throw getUserMediaError;
            }
            mediaStreamRef.current = stream; // Store stream reference for cleanup
            
            // Determine best mimeType - prioritize iOS-compatible formats
            // iOS Safari requires AAC/MP4, Android supports WebM
            let mimeType = null;
            const supportedTypes = [
                // iOS-compatible formats (check first for iOS devices)
                'audio/mp4', // AAC in MP4 container (iOS preferred)
                'audio/m4a', // Alternative iOS format
                'audio/aac', // Direct AAC
                // Android/Chrome formats
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg;codecs=opus',
                // Fallback formats
                'audio/mpeg',
                'audio/wav'
            ];
            
            const isIOS = isAppleTouchDevice();

            // For iOS, prioritize MP4/AAC formats
            const typesToCheck = isIOS
                ? ['audio/mp4', 'audio/m4a', 'audio/aac', ...supportedTypes]
                : supportedTypes;
            
            for (const type of typesToCheck) {
                if (MediaRecorder.isTypeSupported(type)) {
                    mimeType = type;
                    break;
                }
            }
            
            // Fallback if no type is supported
            if (!mimeType) {
                console.warn('[startRecording] No supported mimeType found, using default');
                mimeType = isIOS ? 'audio/mp4' : 'audio/webm';
            }

            const options = { mimeType };
            let recorder;
            try {
                recorder = new MediaRecorder(stream, options);
            } catch (recorderError) {
                console.error('[startRecording] Error creating MediaRecorder with options:', recorderError);
                // Try without options as fallback
                try {
                    recorder = new MediaRecorder(stream);
                    // Update mimeType to match what MediaRecorder actually supports
                    if (recorder.mimeType) {
                        mimeType = recorder.mimeType;
                    }
                } catch (fallbackError) {
                    console.error('[startRecording] Fallback MediaRecorder creation also failed:', fallbackError);
                    throw new Error('MediaRecorder is not supported on this device. Please use a different browser or device.');
                }
            }

            recordingMimeTypeRef.current = mimeType || '';

            // Reset chunks array
            recordingChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data) {
                    recordingChunksRef.current.push(e.data);
                }
            };

            recorder.onstop = () => {
                const finalize = () => {
                    mediaRecorderRef.current = null;
                    setMediaRecorder(null);

                    if (mediaStreamRef.current) {
                        mediaStreamRef.current.getTracks().forEach(track => track.stop());
                        mediaStreamRef.current = null;
                    }

                    if (recordingDiscardRef.current) {
                        recordingDiscardRef.current = false;
                        recordingChunksRef.current = [];
                        recordingTimeRef.current = 0;
                        setIsRecording(false);
                        return;
                    }

                    const chunks = recordingChunksRef.current;
                    recordingChunksRef.current = [];
                    const validChunks = chunks.filter((c) => c && c.size > 0);
                    const finalMimeType =
                        recorder.mimeType || recordingMimeTypeRef.current || (isIOS ? 'audio/mp4' : 'audio/webm');

                    if (validChunks.length === 0) {
                        console.warn('[recording] onstop: no audio chunks');
                        showToast('Recording failed: No audio captured. Try again.', 'error');
                        setIsRecording(false);
                        setRecordingTime(0);
                        recordingTimeRef.current = 0;
                        return;
                    }

                    const blob = new Blob(validChunks, { type: finalMimeType });
                    if (!blob.size) {
                        showToast('Recording failed: empty audio file', 'error');
                        setIsRecording(false);
                        setRecordingTime(0);
                        recordingTimeRef.current = 0;
                        return;
                    }

                    setAudioBlob(blob);
                    setAudioUrl(URL.createObjectURL(blob));
                    setIsRecording(false);
                    setRecordingTime((t) => {
                        recordingTimeRef.current = t;
                        return t;
                    });
                };
                // Allow final timeslice to arrive on slow Android / iOS WebViews
                setTimeout(finalize, isIOS ? 280 : 180);
            };

            recorder.onerror = (e) => {
                console.error('MediaRecorder error:', e);
                showToast('Recording error occurred', 'error');
                mediaRecorderRef.current = null;
                setMediaRecorder(null);
                setIsRecording(false);
                setRecordingTime(0);
                recordingTimeRef.current = 0;
                if (recordingTimerRef.current) {
                    clearInterval(recordingTimerRef.current);
                    recordingTimerRef.current = null;
                }
                if (mediaStreamRef.current) {
                    mediaStreamRef.current.getTracks().forEach(track => track.stop());
                    mediaStreamRef.current = null;
                }
                recordingChunksRef.current = [];
                recordingTimeRef.current = 0;
            };

            try {
                mediaRecorderRef.current = recorder;
                setMediaRecorder(recorder);

                // iOS Safari often emits no (or empty) data with start() — timesliced start matches Chrome/Android behavior.
                try {
                    recorder.start(250);
                } catch (startSliceErr) {
                    console.warn('[startRecording] start(250) failed, retrying plain start:', startSliceErr);
                    recorder.start();
                }

                await new Promise((resolve) => setTimeout(resolve, isIOS ? 0 : 50));
                
                // Verify recording started
                if (recorder.state === 'recording') {
                    setIsRecording(true);
                    setRecordingTime(0);
                    recordingTimeRef.current = 0;
                    
                    if (recordingTimerRef.current) {
                        clearInterval(recordingTimerRef.current);
                    }
                    recordingTimerRef.current = setInterval(() => {
                        setRecordingTime((prev) => {
                            const next = prev + 1;
                            recordingTimeRef.current = next;
                            return next;
                        });
                    }, 1000);

                    if (stopWhenRecordingReadyRef.current) {
                        stopWhenRecordingReadyRef.current = false;
                        try {
                            if (typeof recorder.requestData === 'function') recorder.requestData();
                        } catch {
                            /* ignore */
                        }
                        recorder.stop();
                        if (recordingTimerRef.current) {
                            clearInterval(recordingTimerRef.current);
                            recordingTimerRef.current = null;
                        }
                    }
                } else {
                    console.error('[startRecording] MediaRecorder state is not recording:', recorder.state);
                    throw new Error(`MediaRecorder failed to start. State: ${recorder.state}`);
                }
            } catch (startError) {
                console.error('[startRecording] Error starting MediaRecorder:', startError);
                showToast('Failed to start recording. Please try again.', 'error');
                setIsRecording(false);
                mediaRecorderRef.current = null;
                setMediaRecorder(null);
                if (mediaStreamRef.current) {
                    mediaStreamRef.current.getTracks().forEach(track => track.stop());
                    mediaStreamRef.current = null;
                }
            }
        } catch (error) {
            console.error('[startRecording] Recording error:', error);
            setIsRecording(false);
            setRecordingTime(0);
            recordingTimeRef.current = 0;
            mediaRecorderRef.current = null;
            setMediaRecorder(null);
            
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                showToast('Microphone access denied. Please allow microphone access in browser settings.', 'error');
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                showToast('No microphone found. Please connect a microphone.', 'error');
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                showToast('Microphone is being used by another application.', 'error');
            } else {
                showToast(`Failed to start recording: ${error.message || 'Unknown error'}`, 'error');
            }
            
            // Clean up stream if it was created
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
                mediaStreamRef.current = null;
            }
        }
    }, [showToast]);

    const stopRecording = () => {
        const rec = mediaRecorderRef.current;
        if (rec && (rec.state === 'recording' || rec.state === 'paused')) {
            try {
                if (typeof rec.requestData === 'function') {
                    try {
                        rec.requestData();
                    } catch (rdErr) {
                        console.warn('[stopRecording] requestData failed (ok on some browsers):', rdErr);
                    }
                }
                rec.stop();
            } catch (error) {
                console.error('Error stopping recording:', error);
                try {
                    if (rec.state !== 'inactive') rec.stop();
                } catch (e2) {
                    console.warn('[stopRecording] second stop attempt:', e2);
                }
            }
        } else {
            // Recorder still starting (getUserMedia / start()) — stop once it is active
            stopWhenRecordingReadyRef.current = true;
        }

        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
    };

    const cancelRecording = () => {
        recordingDiscardRef.current = true;
        stopWhenRecordingReadyRef.current = false;

        const rec = mediaRecorderRef.current;
        if (rec) {
            try {
                if (rec.state !== 'inactive') {
                    rec.stop();
                }
            } catch (error) {
                console.error('Error canceling recording:', error);
            }
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
        }

        mediaRecorderRef.current = null;
        setMediaRecorder(null);

        setIsRecording(false);
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }

        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }

        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingTime(0);
        recordingTimeRef.current = 0;
        recordingChunksRef.current = [];
    };

    const handleFileSelect = (file) => {
        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            showToast('File size too large. Maximum size is 10MB', 'error');
            return;
        }

        // Validate file type
        const allowedTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain', 'text/csv'
        ];

        if (!allowedTypes.includes(file.type)) {
            showToast('File type not supported. Please select an image, PDF, or document file.', 'error');
            return;
        }

        setSelectedFile(file);
        
        // Create preview for images
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setFilePreview(e.target.result);
            reader.readAsDataURL(file);
        } else {
            setFilePreview(null);
        }
    };

    const cancelFileSelection = () => {
        if (filePreview && String(filePreview).startsWith('blob:')) {
            URL.revokeObjectURL(filePreview);
        }
        setSelectedFile(null);
        setFilePreview(null);
    };

    const compressImageIfNeeded = (file) => {
        if (!file.type.startsWith('image/') || file.size < 500 * 1024) return Promise.resolve(file);
        return new Promise((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                const maxDim = 1920;
                let w = img.width, h = img.height;
                if (w > maxDim || h > maxDim) {
                    if (w > h) { h = (h / w) * maxDim; w = maxDim; }
                    else { w = (w / h) * maxDim; h = maxDim; }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                canvas.toBlob((blob) => {
                    if (blob && blob.size < file.size) {
                        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                    } else resolve(file);
                }, 'image/jpeg', 0.82);
            };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
            img.src = url;
        });
    };

    const sendFileMessage = async () => {
        if (!selectedFile || !selectedChat) {
            showToast('No file selected to send', 'error');
            return;
        }

        setIsUploadingFile(true);
        const fileToUpload = await compressImageIfNeeded(selectedFile);
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('messageType', 'file');
        formData.append('content', fileToUpload.name);
        formData.append('fileName', fileToUpload.name);
        formData.append('fileType', fileToUpload.type);
        formData.append('fileSize', fileToUpload.size.toString());
        const replyId = replyingTo?.messageId || replyingTo?._id;
        if (replyId) formData.append('replyToMessageId', String(replyId));
        const replySnapshot = replyingTo ? { ...replyingTo } : null;
        if (replyId) setReplyingTo(null);

        // Synchronous preview URL for images — FileReader data URL is async and often null at send time,
        // which made optimistic bubbles show no image until (sometimes) the server URL loaded.
        const optimisticImageBlobUrl = selectedFile.type.startsWith('image/')
            ? URL.createObjectURL(selectedFile)
            : null;

        // Optimistic update
        const tempMessageId = `temp-file-${Date.now()}`;
        const optimisticMessage = {
            _id: tempMessageId,
            senderId: currentUser._id || currentUser.id,
            senderName: currentUser.name || currentUser.email,
            senderRole: currentUser.role,
            content: selectedFile.name,
            messageType: 'file',
            fileUrl: optimisticImageBlobUrl || filePreview || null,
            fileName: selectedFile.name,
            fileType: fileToUpload.type,
            fileSize: fileToUpload.size,
            timestamp: new Date(),
            isOptimistic: true,
            ...(replySnapshot ? { replyTo: replySnapshot } : {}),
        };

        setMessages(prev => [...prev, optimisticMessage]);
        const previewToRevoke = filePreview;
        cancelFileSelection();
        scrollToBottom(true);

        const revokeOptimisticBlob = () => {
            if (optimisticImageBlobUrl) URL.revokeObjectURL(optimisticImageBlobUrl);
        };

        try {
            setUploadProgress(0);
            const response = await apiClient.post(API.sendMessage(selectedChat._id), formData, {
                timeout: 60000,
                onUploadProgress: (e) => setUploadProgress(e.loaded && e.total ? Math.round((e.loaded / e.total) * 100) : 0)
            });

            if (response.data.success) {
                revokeOptimisticBlob();
                if (previewToRevoke && String(previewToRevoke).startsWith('blob:')) {
                    URL.revokeObjectURL(previewToRevoke);
                }

                // Replace optimistic message with real one
                setMessages(prev => {
                    const filtered = prev.filter(m => m._id !== tempMessageId);
                    const exists = filtered.some(m => m._id === response.data.data._id);
                    if (!exists) {
                        return [...filtered, response.data.data];
                    }
                    return filtered;
                });
                scrollToBottom();
                // Refresh chat list to move chat to top
                fetchChats();
            } else {
                revokeOptimisticBlob();
                setMessages(prev => prev.filter(m => m._id !== tempMessageId));
                showToast(response.data?.error || response.data?.message || 'Upload failed', 'error');
            }
        } catch (error) {
            revokeOptimisticBlob();
            console.error('File upload error:', error);
            setMessages(prev => prev.filter(m => m._id !== tempMessageId));
            
            if (error.response) {
                const errorMsg = error.response.data?.error || error.response.data?.message || 'Upload failed';
                showToast(errorMsg, 'error');
            } else if (error.request) {
                showToast('Network error. Please check your connection.', 'error');
            } else {
                showToast('Failed to send file', 'error');
            }
        } finally {
            setIsUploadingFile(false);
            setUploadProgress(0);
        }
    };

    const sendVoiceMessage = async () => {
        if (!audioBlob || !selectedChat) {
            showToast('No audio recording to send', 'error');
            return;
        }
        if (isSendingVoice) return;

        // Validate blob size (max 10MB)
        if (audioBlob.size > 10 * 1024 * 1024) {
            showToast('Audio file too large. Maximum size is 10MB', 'error');
            cancelRecording();
            return;
        }

        const durationSeconds = Math.max(1, Math.round(recordingTimeRef.current || recordingTime || 1));

        const formData = new FormData();
        // Determine file extension and MIME type (some devices send empty blob.type)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        let fileExtension = 'webm';
        let mimeType = audioBlob.type || '';
        
        if (mimeType.includes('mp4') || mimeType.includes('m4a') || mimeType.includes('x-m4a') || mimeType.includes('video/mp4')) {
            fileExtension = 'm4a';
        } else if (mimeType.includes('aac')) {
            fileExtension = 'aac';
        } else if (mimeType.includes('ogg')) {
            fileExtension = 'ogg';
        } else if (mimeType.includes('webm')) {
            fileExtension = 'webm';
        } else if (isIOS) {
            fileExtension = 'm4a';
        }
        if (!mimeType) {
            mimeType = fileExtension === 'm4a' ? 'audio/mp4' : 'audio/webm';
        }
        
        // Wrap with explicit type when device sends empty blob.type (fixes some Android/WebView)
        const blobToAppend = audioBlob.type
            ? audioBlob
            : new Blob([audioBlob], { type: mimeType });
        
        formData.append('audio', blobToAppend, `voice.${fileExtension}`);
        formData.append('messageType', 'audio');
        formData.append('audioDuration', String(durationSeconds));
        const replyId = replyingTo?.messageId || replyingTo?._id;
        if (replyId) formData.append('replyToMessageId', String(replyId));

        const replySnapshot = replyingTo ? { ...replyingTo } : null;
        if (replyId) setReplyingTo(null);

        // Optimistic update - add voice message immediately
        const tempMessageId = `temp-voice-${Date.now()}`;
        const audioUrlForPreview = URL.createObjectURL(audioBlob);
        const optimisticMessage = {
            _id: tempMessageId,
            senderId: currentUser._id || currentUser.id,
            senderName: currentUser.name || currentUser.email,
            senderRole: currentUser.role,
            content: '',
            messageType: 'audio',
            audioUrl: audioUrlForPreview,
            audioDuration: durationSeconds,
            timestamp: new Date(),
            isOptimistic: true,
            ...(replySnapshot ? { replyTo: replySnapshot } : {}),
        };
        
        setMessages(prev => [...prev, optimisticMessage]);
        
        // Clean up recording state but keep blob for retry if needed
        const blobToSend = audioBlob;
        const timeToSend = durationSeconds;
        
        // Reset recording state
        setIsRecording(false);
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
        setRecordingTime(0);
        setAudioBlob(null);
        setAudioUrl(null);
        recordingTimeRef.current = 0;
        
        scrollToBottom(true); // Instant scroll for optimistic update
        
        try {
            setIsSendingVoice(true);
            setUploadProgress(0);
            const response = await apiClient.post(API.sendMessage(selectedChat._id), formData, {
                timeout: 60000,
                onUploadProgress: (e) => setUploadProgress(e.loaded && e.total ? Math.round((e.loaded / e.total) * 100) : 0)
            });
            
            if (response.data.success) {
                setUploadProgress(0);
                URL.revokeObjectURL(audioUrlForPreview);
                setMessages(prev => {
                    const filtered = prev.filter(m => m._id !== tempMessageId);
                    // Check if message already exists (from socket)
                    const exists = filtered.some(m => m._id === response.data.data._id);
                    if (!exists) {
                        return [...filtered, response.data.data];
                    }
                    return filtered;
                });
                scrollToBottom();
                // Refresh chat list to move chat to top
                fetchChats();
            } else {
                throw new Error('Server returned unsuccessful response');
            }
        } catch (error) {
            console.error('Voice message send error:', error);
            setUploadProgress(0);
            // Revoke the optimistic blob URL
            URL.revokeObjectURL(audioUrlForPreview);
            
            // Remove optimistic message on error
            setMessages(prev => prev.filter(m => m._id !== tempMessageId));

            // Restore preview so user can retry send
            setAudioBlob(blobToSend);
            setAudioUrl(URL.createObjectURL(blobToSend));
            setRecordingTime(timeToSend);
            recordingTimeRef.current = timeToSend;
            
            // Show specific error message
            if (error.response) {
                const errorMsg = error.response.data?.error || error.response.data?.message || 'Upload failed';
                showToast(errorMsg, 'error');
            } else if (error.request) {
                showToast('Network error. Please check your connection.', 'error');
            } else {
                showToast('Failed to send voice message', 'error');
            }
        } finally {
            setIsSendingVoice(false);
            setUploadProgress(0);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedChat) return;
        flushLocalTypingStop(selectedChat._id);
        const content = messageInput.trim();
        const idsToSend = isGroupChatSelected ? [...mentionUserIds] : [];
        const replyId = replyingTo?.messageId || replyingTo?._id;
        const replySnapshot = replyingTo ? { ...replyingTo } : null;
        setMessageInput('');
        setMentionUserIds([]);
        setReplyingTo(null);
        
        // Optimistic update - add message immediately
        const tempMessageId = `temp-${Date.now()}`;
        const optimisticMessage = {
            _id: tempMessageId,
            senderId: currentUser._id || currentUser.id,
            senderName: currentUser.name || currentUser.email,
            senderRole: currentUser.role,
            content: content,
            messageType: 'text',
            timestamp: new Date(),
            isOptimistic: true,
            ...(replySnapshot ? { replyTo: replySnapshot } : {}),
            ...(idsToSend.length ? {
                mentions: idsToSend.map(id => String(id)),
                mentionsDetail: idsToSend.map(id => {
                    const c = mentionCandidates.find(x => String(x._id) === String(id));
                    return { _id: String(id), name: c?.name || 'User' };
                }),
            } : {}),
        };
        
        setMessages(prev => [...prev, optimisticMessage]);
        scrollToBottom(true); // Instant scroll for optimistic update
        
        // Optimistically move chat to top
        setChats(prevChats => {
            const chatIndex = prevChats.findIndex(c => c._id === selectedChat._id);
            if (chatIndex > 0) {
                const updatedChats = [...prevChats];
                const updatedChat = {
                    ...updatedChats[chatIndex],
                    lastMessageAt: new Date(),
                    messages: [...(updatedChats[chatIndex].messages || []), optimisticMessage]
                };
                updatedChats.splice(chatIndex, 1);
                updatedChats.unshift(updatedChat);
                return updatedChats;
            }
            return prevChats;
        });
        
        try {
            const payload = { content };
            if (idsToSend.length) payload.mentions = idsToSend;
            if (replyId) payload.replyToMessageId = String(replyId);
            const response = await apiClient.post(API.sendMessage(selectedChat._id), payload);
            if (response.data.success) {
                // Replace optimistic message with real one
                setMessages(prev => {
                    const filtered = prev.filter(m => m._id !== tempMessageId);
                    // Check if message already exists (from socket)
                    const exists = filtered.some(m => m._id === response.data.data._id);
                    if (!exists) {
                        return [...filtered, response.data.data];
                    }
                    return filtered;
                });
                scrollToBottom();
                // Refresh chat list to get updated lastMessageAt from server
                fetchChats();
            }
        } catch (error) { 
            // Remove optimistic message on error
            setMessages(prev => prev.filter(m => m._id !== tempMessageId));
            // Revert chat list change on error
            fetchChats();
            showToast('Send failed', 'error'); 
            setMessageInput(content);
            if (idsToSend.length) setMentionUserIds(idsToSend);
        }
    };

    const detachChatAudioListeners = useCallback((el) => {
        if (!el) return;
        if (el._chatOnTimeUpdate) {
            el.removeEventListener('timeupdate', el._chatOnTimeUpdate);
            el._chatOnTimeUpdate = null;
        }
        if (el._chatOnEnded) {
            el.removeEventListener('ended', el._chatOnEnded);
            el._chatOnEnded = null;
        }
        if (el._chatOnPlaying) {
            el.removeEventListener('playing', el._chatOnPlaying);
            el._chatOnPlaying = null;
        }
    }, []);

    const registerChatAudioRef = useCallback(
        (messageId, el) => {
            const prev = audioRefs.current[messageId];
            if (prev && prev !== el) detachChatAudioListeners(prev);

            if (!el) {
                delete audioRefs.current[messageId];
                return;
            }

            audioRefs.current[messageId] = el;
            el.preload = 'metadata';
            el.playsInline = true;
            el.setAttribute('playsinline', '');
            el.setAttribute('webkit-playsinline', '');

            const syncProgress = () => {
                const dur = el.duration;
                if (!dur || !Number.isFinite(dur) || dur <= 0) return;
                const pct = Math.min(1, Math.max(0, el.currentTime / dur));
                setAudioProgressMap((map) => {
                    if (map[messageId] === pct) return map;
                    return { ...map, [messageId]: pct };
                });
            };

            const onTimeUpdate = () => syncProgress();

            const onEnded = () => {
                try {
                    el.currentTime = 0;
                } catch {
                    /* ignore */
                }
                setAudioProgressMap((map) => ({ ...map, [messageId]: 0 }));
                setPlayingAudioId((current) => (current === messageId ? null : current));
            };

            const onPlaying = () => syncProgress();

            detachChatAudioListeners(el);
            el._chatOnTimeUpdate = onTimeUpdate;
            el._chatOnEnded = onEnded;
            el._chatOnPlaying = onPlaying;
            el.addEventListener('timeupdate', onTimeUpdate);
            el.addEventListener('ended', onEnded);
            el.addEventListener('playing', onPlaying);
        },
        [detachChatAudioListeners]
    );

    const toggleAudio = (messageId, audioSrc) => {
        if (!messageId || !audioSrc) {
            setPlayingAudioId(null);
            return;
        }
        const audio = audioRefs.current[messageId];
        if (!audio) return;

        const applySrc = () => {
            if (audio.getAttribute('data-chat-audio-src') !== audioSrc) {
                try {
                    audio.pause();
                    audio.currentTime = 0;
                    setAudioProgressMap((map) => ({ ...map, [messageId]: 0 }));
                    audio.setAttribute('data-chat-audio-src', audioSrc);
                    audio.src = audioSrc;
                    audio.load();
                } catch {
                    /* ignore */
                }
            }
            audio.setAttribute('playsinline', '');
            audio.setAttribute('webkit-playsinline', '');
            audio.playsInline = true;
        };

        if (playingAudioId === messageId) {
            audio.pause();
            setPlayingAudioId(null);
            return;
        }

        if (playingAudioId && audioRefs.current[playingAudioId]) {
            const prev = audioRefs.current[playingAudioId];
            prev.pause();
        }

        applySrc();

        const dur = audio.duration;
        if (
            audio.ended ||
            (Number.isFinite(dur) && dur > 0 && audio.currentTime >= dur - 0.05)
        ) {
            try {
                audio.currentTime = 0;
            } catch {
                /* ignore */
            }
            setAudioProgressMap((map) => ({ ...map, [messageId]: 0 }));
        }

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    setPlayingAudioId(messageId);
                    const dur = audio.duration;
                    if (dur && Number.isFinite(dur) && dur > 0) {
                        setAudioProgressMap((map) => ({
                            ...map,
                            [messageId]: Math.min(1, Math.max(0, audio.currentTime / dur)),
                        }));
                    }
                })
                .catch((error) => {
                    if (error?.name === 'NotAllowedError') {
                        showToast('Tap play again to hear the voice note.', 'info');
                    } else {
                        showToast('Unable to play audio on this device.', 'error');
                    }
                    setPlayingAudioId(null);
                });
        } else {
            setPlayingAudioId(messageId);
        }
    };

    const getChatDisplayName = (chat) => {
        if (chat.name) return chat.name;
        // For direct chats, find the other participant (not current user)
        const other = chat.participants?.find(p => {
            const participantId = typeof p === 'object' && p !== null ? (p._id || p.id || p) : p;
            const currentUserId = currentUser?._id || currentUser?.id;
            return participantId && currentUserId && participantId.toString() !== currentUserId.toString();
        });
        if (!other || typeof other !== 'object') return 'Unknown';
        return participantLabelForViewer(other, currentUser);
    };

    const openChat = useCallback((chat) => {
        const normalized = normalizeChatRecord(chat);
        const nextId = normalized?._id != null ? String(normalized._id) : null;
        const prevId =
            selectedChatRef.current?._id != null ? String(selectedChatRef.current._id) : null;
        if (nextId && nextId !== prevId) {
            setMessages([]);
            setChatLastReadBy({});
            setChatParticipants([]);
            setIsLoadingMessages(true);
            stickThreadToBottomRef.current = true;
        }
        setSelectedChat(normalized);
        notifyChatSelection(!!normalized);
    }, [notifyChatSelection]);

    const selectChat = openChat;

    const handleThreadRendered = useCallback(() => {
        scrollToBottom(true);
    }, [scrollToBottom]);

    const exitChatThread = useCallback(() => {
        try {
            if (typeof window !== 'undefined' && window.history?.state?.pocketposChatThread) {
                onThreadSwipeConsumed?.();
                window.history.back();
                return;
            }
        } catch {
            /* ignore */
        }
        setSelectedChat(null);
        setShowInfo(false);
        notifyChatSelection(false);
        onThreadSwipeConsumed?.();
    }, [notifyChatSelection, onThreadSwipeConsumed]);

    const isMobileChatThreadLayout = useCallback(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth < 768;
    }, []);

    const resetThreadSwipeBack = useCallback(() => {
        threadSwipeBackRef.current = { active: false, x0: 0, y0: 0, edgeEligible: false };
    }, []);

    const onThreadPanelTouchStart = useCallback((e) => {
        if (!isMobileChatThreadLayout() || !selectedChatRef.current) return;
        e.stopPropagation();
        const t = e.touches?.[0];
        if (!t) return;
        const edgePx = 44;
        threadSwipeBackRef.current = {
            active: true,
            x0: t.clientX,
            y0: t.clientY,
            edgeEligible: t.clientX <= edgePx,
        };
    }, [isMobileChatThreadLayout]);

    const onThreadPanelTouchEnd = useCallback((e) => {
        e.stopPropagation();
        const s = threadSwipeBackRef.current;
        resetThreadSwipeBack();
        if (!s.active || !s.edgeEligible) return;
        if (!isMobileChatThreadLayout() || !selectedChatRef.current) return;
        const t = e.changedTouches?.[0];
        if (!t) return;
        const dx = t.clientX - s.x0;
        const dy = Math.abs(t.clientY - s.y0);
        const minDx = 72;
        const maxDy = 110;
        if (dx >= minDx && dy <= maxDy && dx > dy) {
            exitChatThread();
        }
    }, [exitChatThread, isMobileChatThreadLayout, resetThreadSwipeBack]);

    const onThreadPanelTouchCancel = useCallback((e) => {
        e.stopPropagation();
        resetThreadSwipeBack();
    }, [resetThreadSwipeBack]);

    const handleCreateChat = async () => {
        if (newChatType === 'group' && (!newChatName.trim() || selectedUsers.length === 0)) {
            showToast('Please provide a group name and select at least one staff member', 'error');
            return;
        }
        if (newChatType === 'direct' && selectedUsers.length !== 1) {
            showToast('Please select exactly one person for direct chat', 'error');
            return;
        }

        setIsCreatingChat(true);
        try {
            const response = await apiClient.post(API.createChat, {
                type: newChatType,
                name: newChatType === 'group' ? newChatName.trim() : null,
                participantIds: selectedUsers,
                outletId: null // Custom groups are cross-outlet by default
            });

            if (response.data?.success) {
                const newChat = response.data.data;
                // Refresh chats list
                await fetchChats();
                // Find the newly created chat
                const refreshedChats = await apiClient.get(API.chatList);
                if (refreshedChats.data?.success) {
                    const updatedChats = refreshedChats.data.data || [];
                    setChats(updatedChats);
                    const createdChat = normalizeChatRecord(
                        updatedChats.find(c => c._id === newChat._id) || newChat
                    );
                    openChat(createdChat);
                } else {
                    setChats(prev => {
                        const exists = prev.some(c => c._id === newChat._id);
                        if (exists) return prev;
                        return [newChat, ...prev];
                    });
                    openChat(newChat);
                }
                
                // Reset form
                setNewChatName('');
                setSelectedUsers([]);
                setSearchTerm('');
                setShowNewChatModal(false);
                showToast(newChatType === 'group' ? 'Custom group created successfully' : 'Chat created successfully', 'success');
            }
        } catch (error) {
            console.error('Failed to create chat:', error);
            showToast(error.response?.data?.error || 'Failed to create chat', 'error');
        } finally {
            setIsCreatingChat(false);
        }
    };

    const handleRemoveMember = async (memberUserId) => {
        const chatId = selectedChat?._id;
        if (!chatId || !memberUserId) return;

        if (selectedChat?.isDefault) {
            showToast('Members cannot be removed from default outlet groups', 'error');
            return;
        }

        if (!isChatGroupCreator(selectedChat, currentUser)) {
            showToast('Only the group creator can remove members', 'error');
            return;
        }

        const memberParticipant = selectedChat.participants?.find((p) => {
            const pid = p?._id || p?.id || p;
            return pid && String(pid) === String(memberUserId);
        });
        const memberLabel = memberParticipant
            ? participantLabelForViewer(memberParticipant, currentUser)
            : 'this member';

        const confirmed = window.confirm(`Remove ${memberLabel} from the group?`);
        if (!confirmed) return;

        setRemovingMemberId(String(memberUserId));
        try {
            const response = await apiClient.delete(API.removeChatParticipant(chatId, memberUserId));
            if (response.data?.success) {
                const nextParticipants = response.data?.data?.participants;
                if (Array.isArray(nextParticipants)) {
                    setSelectedChat((prev) => (prev ? { ...prev, participants: nextParticipants } : prev));
                    setChatParticipants(nextParticipants);
                    setChats((prev) =>
                        prev.map((c) => (String(c._id) === String(chatId) ? { ...c, participants: nextParticipants } : c))
                    );
                } else {
                    await fetchChats();
                    if (selectedChat?._id === chatId) {
                        fetchMessages(chatId);
                    }
                }
                showToast('Member removed from group', 'success');
            }
        } catch (error) {
            console.error('Failed to remove member:', error);
            showToast(error.response?.data?.error || 'Failed to remove member', 'error');
        } finally {
            setRemovingMemberId(null);
        }
    };

    const handleDeleteChat = async (chatId) => {
        if (!chatId) {
            showToast('Invalid chat ID', 'error');
            return;
        }

        // Find the chat to check if it's a custom group
        const chatToDelete = chats.find(c => c._id === chatId);
        if (!chatToDelete) {
            showToast('Chat not found', 'error');
            return;
        }

        if (chatToDelete.isDefault) {
            showToast('Default outlet groups cannot be deleted', 'error');
            return;
        }

        const confirmed = window.confirm('Are you sure you want to delete this group? This action cannot be undone.');
        if (!confirmed) {
            return;
        }

        try {
            const response = await apiClient.delete(API.deleteChat(chatId));
            
            if (response.data?.success) {
                showToast('Group deleted successfully', 'success');
                
                // If the deleted chat was selected, clear selection
                if (selectedChat?._id === chatId) {
                    selectedChatRef.current = null;
                    setSelectedChat(null);
                    setMessages([]);
                    setShowInfo(false);
                    try {
                        if (typeof window !== 'undefined' && window.history?.state?.pocketposChatThread) {
                            window.history.back();
                        }
                    } catch {
                        /* ignore */
                    }
                }
                
                // Refresh chats list
                await fetchChats();
            }
        } catch (error) {
            console.error('Failed to delete chat:', error);
            const errorMsg = error.response?.data?.error || 'Failed to delete group';
            showToast(errorMsg, 'error');
        }
    };

    const handleQuickMessage = async (userId) => {
        if (!userId || !currentUser) {
            console.error('Missing userId or currentUser:', { userId, currentUser });
            return;
        }
        const targetUserId = String(userId);
        const currentUserId = String(currentUser._id || currentUser.id || '');
        if (!currentUserId) {
            showToast('Unable to open chat right now. Please try again.', 'error');
            return;
        }
        
        try {
            const toId = (value) => {
                if (value == null) return '';
                if (typeof value === 'object') return String(value._id || value.id || value);
                return String(value);
            };
            // Check if a direct chat already exists with this user
            const existingChat = chats.find(chat => {
                if (chat.type !== 'direct') return false;
                const participantIds = (chat.participants || []).map(toId).filter(Boolean);
                return participantIds.includes(currentUserId) && 
                       participantIds.includes(String(targetUserId)) &&
                       participantIds.length === 2;
            });

            if (existingChat) {
                openChat(existingChat);
                return;
            }

            // Create a new direct chat
            showToast('Creating chat...', 'info');
            const response = await apiClient.post(API.createChat, {
                type: 'direct',
                participantIds: [targetUserId]
            });

            if (response.data?.success) {
                const newChat = response.data.data;
                // Select immediately to avoid intermittent "not opening" race.
                if (newChat?._id) {
                    openChat(newChat);
                }
                // Refresh sidebar ordering/unread in background.
                fetchChats();
                showToast('Chat created', 'success');
            }
        } catch (error) {
            console.error('Failed to create/open chat:', error);
            showToast(error.response?.data?.error || 'Failed to create chat', 'error');
        }
    };

    if (!hasChatAccess) return (
        <div className={`h-full min-h-0 w-full flex flex-col items-center justify-center ${themeBase}`}>
            <ShieldCheck className={`w-12 h-12 mb-4 opacity-20 ${darkMode ? 'text-slate-400' : 'text-slate-700'}`} />
            <h2 className={`text-xl font-black tracking-tighter uppercase ${darkMode ? 'text-white' : 'text-slate-900'}`}>Access Restricted</h2>
            <p className="text-xs font-bold text-indigo-500/60 uppercase tracking-widest mt-1">Upgrade to PRO or PREMIUM</p>
        </div>
    );

    if (isLoading && chats.length === 0 && !selectedChat) {
        return <ChatInitialSkeleton darkMode={darkMode} />;
    }

    return (
        <div className={`flex flex-col md:flex-row ${themeBase} h-full min-h-0 w-full overflow-hidden overscroll-none`}>
            {/* Sidebar remains standard */}
            <ChatListSidebar
                chats={chats}
                selectedChat={selectedChat}
                onSelectChat={selectChat}
                staffList={staffList}
                onQuickMessage={handleQuickMessage}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                isLoading={isLoading}
                isLoadingStaff={isLoadingStaff}
                getChatDisplayName={getChatDisplayName}
                formatTime={formatTime}
                currentUser={currentUser}
                staffUnreadMap={staffUnreadMap}
                darkMode={darkMode}
                showOutletInfo={showOutletInfo}
                viewMode={chatListViewMode}
                onViewModeChange={setChatListViewMode}
            />

            {/* Main Chat Interface */}
            <div className={`${selectedChat ? 'flex flex-1' : 'hidden md:flex flex-1'} flex-col w-full h-full min-h-0 overflow-hidden relative`}>
                {selectedChat ? (
                    <div
                        className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden md:touch-auto"
                        onTouchStart={onThreadPanelTouchStart}
                        onTouchEnd={onThreadPanelTouchEnd}
                        onTouchCancel={onThreadPanelTouchCancel}
                    >
                        {/* Fixed Header */}
                        <div className="shrink-0 z-50">
                            <ChatHeader
                                selectedChat={selectedChat}
                                onBack={exitChatThread}
                                getChatDisplayName={getChatDisplayName}
                                darkMode={darkMode}
                                showInfo={showInfo}
                                onShowInfoChange={setShowInfo}
                                currentUser={currentUser}
                                staffList={staffList}
                                onNavigateToStaffPermissions={onNavigateToStaffPermissions}
                                onDeleteChat={handleDeleteChat}
                                onRemoveMember={handleRemoveMember}
                                removingMemberId={removingMemberId}
                                showOutletInfo={showOutletInfo}
                                activePunchedInUserIds={activePunchedInUserIds}
                            />
                        </div>

                        {/* Messages area - scrollable; overscroll contained so mic swipe-up does not move the shell */}
                        <div
                            ref={chatContainerRef}
                            className="chat-scroll custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-3 pb-4"
                        >
                            <ChatMessages
                                messages={messages}
                                isLoadingMessages={isLoadingMessages}
                                currentUser={currentUser}
                                darkMode={darkMode}
                                playingAudioId={playingAudioId}
                                onToggleAudio={toggleAudio}
                                formatRecordingTime={formatRecordingTime}
                                audioRefs={audioRefs}
                                registerChatAudioRef={registerChatAudioRef}
                                audioProgressMap={audioProgressMap}
                                messagesEndRef={messagesEndRef}
                                lastReadBy={chatLastReadBy}
                                participants={chatParticipants}
                                onThreadRendered={handleThreadRendered}
                                onReply={handleReplyToMessage}
                            />
                        </div>

                        {/* Fixed Input section - Footer position (hidden when info page is open) */}
                        {!showInfo && (
                            <div
                                className={`shrink-0 overflow-visible border-t z-[60] ${darkMode ? 'border-slate-800 bg-gray-950' : 'border-slate-200 bg-white'} sticky bottom-0 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom,0px))] sm:px-4 sm:pt-3 sm:pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]`}
                            >
                                {typingBannerText ? (
                                    <div
                                        className={`mb-1 flex min-h-[1rem] items-center gap-1.5 px-0.5 sm:mb-2 sm:min-h-[1.25rem] sm:gap-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
                                        role="status"
                                        aria-live="polite"
                                    >
                                        <span className="flex items-center gap-0.5" aria-hidden>
                                            <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-duration:1s]" style={{ animationDelay: '0ms' }} />
                                            <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-duration:1s]" style={{ animationDelay: '150ms' }} />
                                            <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-duration:1s]" style={{ animationDelay: '300ms' }} />
                                        </span>
                                        <span className="text-[10px] font-bold tracking-tight sm:text-[11px]">{typingBannerText}</span>
                                    </div>
                                ) : null}
                                <ChatInput
                                    messageInput={messageInput}
                                    onMessageChange={handleComposerTextChange}
                                    onSendMessage={handleSendMessage}
                                    groupMentionsEnabled={isGroupChatSelected && mentionCandidates.length > 0}
                                    mentionCandidates={mentionCandidates}
                                    onAddMention={(userId, displayName) => {
                                        const idStr = String(userId);
                                        setMentionUserIds(prev => (prev.includes(idStr) ? prev : [...prev, idStr]));
                                        const name = (displayName || 'User').trim() || 'User';
                                        setMessageInput((prev) => {
                                            const next = `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}@${name} `;
                                            Promise.resolve().then(() => scheduleTypingFromText(next));
                                            return next;
                                        });
                                    }}
                                    isRecording={isRecording}
                                    recordingTime={recordingTime}
                                    audioUrl={audioUrl}
                                    onStartRecording={startRecording}
                                    onStopRecording={stopRecording}
                                    onSendVoiceMessage={sendVoiceMessage}
                                    onCancelRecording={cancelRecording}
                                    formatRecordingTime={formatRecordingTime}
                                    onFileSelect={handleFileSelect}
                                    selectedFile={selectedFile}
                                    filePreview={filePreview}
                                    onSendFile={sendFileMessage}
                                    onCancelFile={cancelFileSelection}
                                    isUploadingFile={isUploadingFile}
                                    isSendingVoice={isSendingVoice}
                                    uploadProgress={uploadProgress}
                                    darkMode={darkMode}
                                    replyingTo={replyingTo}
                                    onCancelReply={() => setReplyingTo(null)}
                                    currentUser={currentUser}
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <EmptyChatView
                        chats={chats}
                        onNewChat={() => { setShowNewChatModal(true); setNewChatType('group'); }}
                        darkMode={darkMode}
                        showStartChatButton={chatListViewMode === 'chats'}
                    />
                )}
            </div>

            {/* Floating add (new group) — only on Groups tab, not Staff */}
            {!selectedChat && chatListViewMode === 'chats' && (
                <button
                    onClick={() => { setShowNewChatModal(true); setNewChatType('group'); }}
                    className="fixed bottom-[calc(var(--app-mobile-footer-offset)+0.75rem)] right-4 md:bottom-6 md:right-6 z-50 p-4 rounded-full bg-indigo-600 text-white hover:scale-110 active:scale-95 transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50"
                    aria-label="New chat"
                >
                    <Plus className="w-6 h-6" />
                </button>
            )}

            <NewChatModal
                show={showNewChatModal}
                onClose={() => {
                    setShowNewChatModal(false);
                    setNewChatName('');
                    setSelectedUsers([]);
                    setSearchTerm('');
                }}
                newChatType={newChatType}
                onChatTypeChange={setNewChatType}
                newChatName={newChatName}
                onChatNameChange={setNewChatName}
                selectedUsers={selectedUsers}
                onUserToggle={(id) => setSelectedUsers(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
                availableUsers={staffList}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onCreateChat={handleCreateChat}
                darkMode={darkMode}
                setSelectedUsers={setSelectedUsers}
                isCreatingChat={isCreatingChat}
                showOutletInfo={showOutletInfo}
                currentUser={currentUser}
            />

            <style dangerouslySetInnerHTML={{
                __html: ``
            }} />
        </div>
    );
};

export default Chat;