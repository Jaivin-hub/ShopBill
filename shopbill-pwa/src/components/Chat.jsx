import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Loader2, ShieldCheck, Plus } from 'lucide-react';
import { io } from 'socket.io-client';
import API from '../config/api';
import ChatListSidebar from './chat/ChatListSidebar';
import ChatHeader from './chat/ChatHeader';
import ChatMessages from './chat/ChatMessages';
import ChatInput from './chat/ChatInput';
import NewChatModal from './chat/NewChatModal';
import EmptyChatView from './chat/EmptyChatView';

const Chat = ({ apiClient, API, showToast, darkMode, currentUser, currentOutletId, outlets = [], onChatSelectionChange, onUnreadCountChange, onNavigateToStaffPermissions }) => {
    // Styling Vars matching Dashboard architecture
    const themeBase = darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
    
    // Safety check
    if (!currentUser) {
        return (
            <div className={`h-screen flex flex-col items-center justify-center ${themeBase}`}>
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                <p className="text-xs font-black opacity-40 tracking-widest uppercase">Initializing Secure Link...</p>
            </div>
        );
    }

    // State
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [staffUnreadMap, setStaffUnreadMap] = useState({});
    
    // Notify parent when chat selection changes (to hide/show main header)
    useEffect(() => {
        if (onChatSelectionChange) {
            onChatSelectionChange(!!selectedChat);
        }
    }, [selectedChat, onChatSelectionChange]);
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
    
    // Voice recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [playingAudioId, setPlayingAudioId] = useState(null);
    const [showInfo, setShowInfo] = useState(false);
    
    // File upload state
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    
    // Refs
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    const recordingTimerRef = useRef(null);
    const audioRefs = useRef({});
    const mediaStreamRef = useRef(null); // Track the media stream for cleanup
    const recordingChunksRef = useRef([]); // Track recording chunks

    // Constants
    const isPro = currentUser?.plan?.toUpperCase() === 'PRO';
    const isPremium = currentUser?.plan?.toUpperCase() === 'PREMIUM';
    const hasChatAccess = isPro || isPremium;
    const showOutletInfo = isPremium; // Multi-store (outlet labels) only for Premium; Pro has single store

    // Initialize Socket.IO connection
    useEffect(() => {
        if (!hasChatAccess) return;

        const token = localStorage.getItem('userToken');
        socketRef.current = io("https://shopbill-3le1.onrender.com", {
            auth: { token },
            transports: ['polling', 'websocket'],
            withCredentials: true,
            reconnection: true
        });

        socketRef.current.on('new_message', (data) => {
            // Update messages if this is the selected chat
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
            fetchChats();
        });

        return () => { if (socketRef.current) socketRef.current.disconnect(); };
    }, [hasChatAccess, selectedChat]);

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
                const fetchedChats = response.data.data || [];
                setChats(fetchedChats);
                // Calculate total unread count
                const totalUnread = fetchedChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
                // Map unread counts for direct chats by staff user id
                const currentUserId = currentUser?._id || currentUser?.id;
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
                if (onUnreadCountChange) {
                    onUnreadCountChange(totalUnread);
                }
            }
        } catch (error) { console.error('Failed to fetch chats:', error); }
        finally { setIsLoading(false); }
    }, [hasChatAccess, apiClient, API, onUnreadCountChange, currentUser]);

    const fetchMessages = useCallback(async (chatId) => {
        setIsLoadingMessages(true);
        try {
            const response = await apiClient.get(API.chatMessages(chatId));
            if (response.data.success) {
                setMessages(response.data.data || []);
                setTimeout(() => scrollToBottom(), 100);
                // Refresh chats list to update unread counts after marking messages as read
                fetchChats();
            }
        } catch (error) { showToast('Failed to load messages', 'error'); }
        finally { setIsLoadingMessages(false); }
    }, [apiClient, API, showToast, fetchChats]);

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

    // Note: Default "All Outlet Staffs" group is automatically created by the server for owners
    // Store-specific groups are no longer created

    // Only fetch on mount or when access changes
    const hasFetchedChatsRef = useRef(false);
    useEffect(() => {
        if (hasChatAccess && !hasFetchedChatsRef.current) {
            hasFetchedChatsRef.current = true;
            fetchChats();
        } else if (!hasChatAccess) {
            hasFetchedChatsRef.current = false;
        }
    }, [hasChatAccess]);

    useEffect(() => {
        if (selectedChat) {
            // Fetch messages for all chats (groups, direct chats, default groups)
            fetchMessages(selectedChat._id);
        } else {
            setMessages([]);
        }
    }, [selectedChat, fetchMessages]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messages.length > 0 && selectedChat) {
            const timer = setTimeout(() => scrollToBottom(), 100);
            return () => clearTimeout(timer);
        }
    }, [messages.length, selectedChat?._id]);

    const scrollToBottom = (instant = false) => {
        setTimeout(() => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ 
                    behavior: instant ? 'auto' : 'smooth',
                    block: 'end'
                });
            } else if (chatContainerRef.current) {
                chatContainerRef.current.scrollTo({
                    top: chatContainerRef.current.scrollHeight,
                    behavior: instant ? 'auto' : 'smooth'
                });
            }
        }, 100);
    };

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
        console.log('[startRecording] ========== FUNCTION CALLED ==========');
        console.log('[startRecording] Current isRecording state:', isRecording);
        
        // Don't allow recording if already recording
        if (isRecording) {
            console.log('[startRecording] Already recording, aborting');
            showToast('Recording already in progress', 'info');
            return;
        }

        try {
            console.log('[startRecording] Checking browser support...');
            
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

            console.log('[startRecording] Browser support OK, proceeding...');

            // Clean up any existing stream first
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
                mediaStreamRef.current = null;
            }

            // Stop any existing recording
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                try {
                    mediaRecorder.stop();
                } catch (e) {
                    console.warn('Error stopping existing recorder:', e);
                }
            }

            // Request microphone access
            console.log('[startRecording] Requesting microphone access...');
            let stream;
            try {
                // iOS Safari requires simpler audio constraints
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                             (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                
                const audioConstraints = isIOS 
                    ? { audio: true } // iOS prefers simple constraints
                    : {
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true
                        }
                    };
                
                stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
                console.log('[startRecording] Microphone access granted, stream:', stream);
                console.log('[startRecording] Stream tracks:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));
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
            
            // Detect iOS
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            
            // For iOS, prioritize MP4/AAC formats
            const typesToCheck = isIOS 
                ? ['audio/mp4', 'audio/m4a', 'audio/aac', ...supportedTypes]
                : supportedTypes;
            
            for (const type of typesToCheck) {
                if (MediaRecorder.isTypeSupported(type)) {
                    mimeType = type;
                    console.log('[startRecording] Selected mimeType:', mimeType, 'for device:', isIOS ? 'iOS' : 'Android/Other');
                    break;
                }
            }
            
            // Fallback if no type is supported
            if (!mimeType) {
                console.warn('[startRecording] No supported mimeType found, using default');
                mimeType = isIOS ? 'audio/mp4' : 'audio/webm';
            }

            const options = { mimeType };
            console.log('[startRecording] Creating MediaRecorder with options:', options);
            let recorder;
            try {
                recorder = new MediaRecorder(stream, options);
                console.log('[startRecording] MediaRecorder created successfully');
                console.log('[startRecording] MediaRecorder state:', recorder.state);
                console.log('[startRecording] MediaRecorder mimeType:', recorder.mimeType);
            } catch (recorderError) {
                console.error('[startRecording] Error creating MediaRecorder with options:', recorderError);
                // Try without options as fallback
                console.log('[startRecording] Trying without options as fallback...');
                try {
                    recorder = new MediaRecorder(stream);
                    console.log('[startRecording] MediaRecorder created with fallback, mimeType:', recorder.mimeType);
                    // Update mimeType to match what MediaRecorder actually supports
                    if (recorder.mimeType) {
                        mimeType = recorder.mimeType;
                    }
                } catch (fallbackError) {
                    console.error('[startRecording] Fallback MediaRecorder creation also failed:', fallbackError);
                    throw new Error('MediaRecorder is not supported on this device. Please use a different browser or device.');
                }
            }
            
            // Reset chunks array
            recordingChunksRef.current = [];
            console.log('[startRecording] Chunks array reset');
            
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    recordingChunksRef.current.push(e.data);
                    console.log('[startRecording] Data chunk received, size:', e.data.size);
                }
            };
            
            recorder.onstop = () => {
                // Stop all tracks to release microphone
                if (mediaStreamRef.current) {
                    mediaStreamRef.current.getTracks().forEach(track => track.stop());
                    mediaStreamRef.current = null;
                }
                
                const chunks = recordingChunksRef.current;
                console.log('[startRecording] Recording stopped, chunks count:', chunks.length);
                if (chunks.length > 0) {
                    // Use the actual mimeType from recorder if available, otherwise use detected one
                    const finalMimeType = recorder.mimeType || mimeType || 'audio/webm';
                    const blob = new Blob(chunks, { type: finalMimeType });
                    console.log('[startRecording] Blob created, type:', blob.type, 'size:', blob.size);
                    setAudioBlob(blob);
                    const url = URL.createObjectURL(blob);
                    setAudioUrl(url);
                } else {
                    showToast('Recording failed: No audio data captured', 'error');
                    setIsRecording(false);
                    setRecordingTime(0);
                }
                // Clear chunks after processing
                recordingChunksRef.current = [];
            };

            recorder.onerror = (e) => {
                console.error('MediaRecorder error:', e);
                showToast('Recording error occurred', 'error');
                setIsRecording(false);
                if (recordingTimerRef.current) {
                    clearInterval(recordingTimerRef.current);
                    recordingTimerRef.current = null;
                }
                if (mediaStreamRef.current) {
                    mediaStreamRef.current.getTracks().forEach(track => track.stop());
                    mediaStreamRef.current = null;
                }
            };

            // Start recording with timeslice to ensure data is collected
            try {
                console.log('[startRecording] Setting MediaRecorder state...');
                // Set the recorder first
                setMediaRecorder(recorder);
                
                console.log('[startRecording] Starting MediaRecorder...');
                // Start recording
                recorder.start(100); // Collect data every 100ms
                
                // Small delay to ensure state is updated
                await new Promise(resolve => setTimeout(resolve, 50));
                
                console.log('[startRecording] MediaRecorder state after start:', recorder.state);
                
                // Verify recording started
                if (recorder.state === 'recording') {
                    console.log('[startRecording] Recording started successfully!');
                    setIsRecording(true);
                    setRecordingTime(0);
                    
                    if (recordingTimerRef.current) {
                        clearInterval(recordingTimerRef.current);
                    }
                    recordingTimerRef.current = setInterval(() => {
                        setRecordingTime(prev => prev + 1);
                    }, 1000);
                    console.log('[startRecording] Timer started, UI should update now');
                } else {
                    console.error('[startRecording] MediaRecorder state is not recording:', recorder.state);
                    throw new Error(`MediaRecorder failed to start. State: ${recorder.state}`);
                }
            } catch (startError) {
                console.error('[startRecording] Error starting MediaRecorder:', startError);
                showToast('Failed to start recording. Please try again.', 'error');
                setIsRecording(false);
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
    }, [isRecording, showToast]);

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            try {
                // Request final data chunk before stopping
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.requestData();
                }
                mediaRecorder.stop();
                setIsRecording(false);
                if (recordingTimerRef.current) {
                    clearInterval(recordingTimerRef.current);
                    recordingTimerRef.current = null;
                }
            } catch (error) {
                console.error('Error stopping recording:', error);
                setIsRecording(false);
                if (recordingTimerRef.current) {
                    clearInterval(recordingTimerRef.current);
                    recordingTimerRef.current = null;
                }
            }
        }
    };

    const cancelRecording = () => {
        // Stop recording first
        if (mediaRecorder && isRecording) {
            try {
                if (mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop();
                }
            } catch (error) {
                console.error('Error canceling recording:', error);
            }
        }
        
        // Clean up stream
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        
        setIsRecording(false);
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
        
        // Clean up blob URLs to prevent memory leaks
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingTime(0);
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
        if (filePreview) {
            URL.revokeObjectURL(filePreview);
        }
        setSelectedFile(null);
        setFilePreview(null);
    };

    const sendFileMessage = async () => {
        if (!selectedFile || !selectedChat) {
            showToast('No file selected to send', 'error');
            return;
        }

        setIsUploadingFile(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('messageType', 'file');
        formData.append('content', selectedFile.name);
        formData.append('fileName', selectedFile.name);
        formData.append('fileType', selectedFile.type);
        formData.append('fileSize', selectedFile.size.toString());

        // Optimistic update
        const tempMessageId = `temp-file-${Date.now()}`;
        const optimisticMessage = {
            _id: tempMessageId,
            senderId: currentUser._id || currentUser.id,
            senderName: currentUser.name || currentUser.email,
            senderRole: currentUser.role,
            content: selectedFile.name,
            messageType: 'file',
            fileUrl: filePreview || null,
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            fileSize: selectedFile.size,
            timestamp: new Date(),
            isOptimistic: true
        };

        setMessages(prev => [...prev, optimisticMessage]);
        const fileToSend = selectedFile;
        const previewToRevoke = filePreview;
        cancelFileSelection();
        scrollToBottom(true);

        try {
            const response = await apiClient.post(API.sendMessage(selectedChat._id), formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                timeout: 60000,
            });

            if (response.data.success) {
                // Revoke preview URL
                if (previewToRevoke && previewToRevoke.startsWith('blob:')) {
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
            }
        } catch (error) {
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
        }
    };

    const sendVoiceMessage = async () => {
        if (!audioBlob || !selectedChat) {
            showToast('No audio recording to send', 'error');
            return;
        }

        // Validate blob size (max 10MB)
        if (audioBlob.size > 10 * 1024 * 1024) {
            showToast('Audio file too large. Maximum size is 10MB', 'error');
            cancelRecording();
            return;
        }

        const formData = new FormData();
        // Determine file extension and MIME type (some devices send empty blob.type)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        let fileExtension = 'webm';
        let mimeType = audioBlob.type || '';
        
        if (mimeType.includes('mp4') || mimeType.includes('m4a') || mimeType.includes('x-m4a')) {
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
        formData.append('audioDuration', recordingTime.toString());
        
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
            audioDuration: recordingTime,
            timestamp: new Date(),
            isOptimistic: true
        };
        
        setMessages(prev => [...prev, optimisticMessage]);
        
        // Clean up recording state but keep blob for retry if needed
        const blobToSend = audioBlob;
        const timeToSend = recordingTime;
        
        // Reset recording state
        setIsRecording(false);
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
        setRecordingTime(0);
        setAudioBlob(null);
        setAudioUrl(null);
        
        scrollToBottom(true); // Instant scroll for optimistic update
        
        try {
            const response = await apiClient.post(API.sendMessage(selectedChat._id), formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                timeout: 60000, // 60 second timeout for file upload
            });
            
            if (response.data.success) {
                // Revoke the optimistic blob URL
                URL.revokeObjectURL(audioUrlForPreview);
                
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
                // Refresh chat list to move chat to top
                fetchChats();
            } else {
                throw new Error('Server returned unsuccessful response');
            }
        } catch (error) {
            console.error('Voice message send error:', error);
            
            // Revoke the optimistic blob URL
            URL.revokeObjectURL(audioUrlForPreview);
            
            // Remove optimistic message on error
            setMessages(prev => prev.filter(m => m._id !== tempMessageId));
            
            // Show specific error message
            if (error.response) {
                const errorMsg = error.response.data?.error || error.response.data?.message || 'Upload failed';
                showToast(errorMsg, 'error');
            } else if (error.request) {
                showToast('Network error. Please check your connection.', 'error');
            } else {
                showToast('Failed to send voice message', 'error');
            }
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedChat) return;
        const content = messageInput.trim();
        setMessageInput('');
        
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
            isOptimistic: true
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
            const response = await apiClient.post(API.sendMessage(selectedChat._id), { content });
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
        }
    };

    const toggleAudio = (messageId, audioSrc) => {
        const audio = audioRefs.current[messageId];
        if (!audio) {
            console.error('[toggleAudio] Audio element not found for message:', messageId);
            return;
        }
        
        // Ensure audio source is set
        if (audioSrc && audio.src !== audioSrc) {
            // Reset audio element for better compatibility
            audio.pause();
            audio.currentTime = 0;
            audio.src = audioSrc;
            // Force reload for iOS
            audio.load();
        }
        
        if (playingAudioId === messageId) {
            // Pause current audio
            audio.pause();
            setPlayingAudioId(null);
        } else {
            // Pause any currently playing audio
            if (playingAudioId && audioRefs.current[playingAudioId]) {
                const prevAudio = audioRefs.current[playingAudioId];
                prevAudio.pause();
                prevAudio.currentTime = 0;
            }
            
            // Play the selected audio with better error handling
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('[toggleAudio] Audio playback started successfully');
                        setPlayingAudioId(messageId);
                    })
                    .catch(error => {
                        console.error('[toggleAudio] Error playing audio:', error);
                        // Try to provide more specific error messages
                        if (error.name === 'NotAllowedError') {
                            showToast('Audio playback blocked. Please allow audio in your browser settings.', 'error');
                        } else if (error.name === 'NotSupportedError') {
                            showToast('Audio format not supported. Please try a different device.', 'error');
                        } else {
                            showToast('Failed to play audio. Please check your connection and try again.', 'error');
                        }
                        setPlayingAudioId(null);
                    });
            } else {
                // Fallback for older browsers
                setPlayingAudioId(messageId);
            }
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
        return other?.name || other?.email || 'Unknown';
    };

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
                    const createdChat = updatedChats.find(c => c._id === newChat._id) || newChat;
                    setSelectedChat(createdChat);
                    fetchMessages(createdChat._id);
                } else {
                    setChats(prev => {
                        const exists = prev.some(c => c._id === newChat._id);
                        if (exists) return prev;
                        return [newChat, ...prev];
                    });
                    setSelectedChat(newChat);
                    fetchMessages(newChat._id);
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

        // Only allow deletion of custom groups (not default groups)
        if (chatToDelete.isDefault) {
            showToast('Default groups cannot be deleted', 'error');
            return;
        }

        // Confirm deletion
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
                    setSelectedChat(null);
                    setMessages([]);
                    setShowInfo(false);
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
        
        try {
            // Check if a direct chat already exists with this user
            const existingChat = chats.find(chat => {
                if (chat.type !== 'direct') return false;
                const participantIds = chat.participants?.map(p => {
                    // Handle both populated and non-populated participants
                    if (typeof p === 'object' && p !== null) {
                        return (p._id || p.id || p).toString();
                    }
                    return p.toString();
                }) || [];
                const currentUserId = (currentUser._id || currentUser.id).toString();
                const targetUserId = userId.toString();
                return participantIds.includes(currentUserId) && 
                       participantIds.includes(targetUserId) &&
                       participantIds.length === 2;
            });

            if (existingChat) {
                // Chat exists, just select it and fetch messages
                setSelectedChat(existingChat);
                fetchMessages(existingChat._id);
                return;
            }

            // Create a new direct chat
            showToast('Creating chat...', 'info');
            const response = await apiClient.post(API.createChat, {
                type: 'direct',
                participantIds: [userId]
            });

            if (response.data?.success) {
                const newChat = response.data.data;
                // Refresh chats list to get the latest data
                await fetchChats();
                // Find the newly created chat in the refreshed list
                const refreshedChats = await apiClient.get(API.chatList);
                if (refreshedChats.data?.success) {
                    const updatedChats = refreshedChats.data.data || [];
                    setChats(updatedChats);
                    // Find and select the new chat
                    const createdChat = updatedChats.find(c => c._id === newChat._id) || newChat;
                    setSelectedChat(createdChat);
                    // Fetch messages for the new chat
                    fetchMessages(createdChat._id);
                } else {
                    // Fallback: use the response data
                    setChats(prev => {
                        const exists = prev.some(c => c._id === newChat._id);
                        if (exists) return prev;
                        return [newChat, ...prev];
                    });
                    setSelectedChat(newChat);
                    fetchMessages(newChat._id);
                }
                showToast('Chat created', 'success');
            }
        } catch (error) {
            console.error('Failed to create/open chat:', error);
            showToast(error.response?.data?.error || 'Failed to create chat', 'error');
        }
    };

    if (!hasChatAccess) return (
        <div className={`h-screen flex flex-col items-center justify-center ${themeBase}`}>
            <ShieldCheck className={`w-12 h-12 mb-4 opacity-20 ${darkMode ? 'text-slate-400' : 'text-slate-700'}`} />
            <h2 className={`text-xl font-black tracking-tighter uppercase ${darkMode ? 'text-white' : 'text-slate-900'}`}>Access Restricted</h2>
            <p className="text-xs font-bold text-indigo-500/60 uppercase tracking-widest mt-1">Upgrade to PRO or PREMIUM</p>
        </div>
    );

    return (
        <div className={`flex flex-col md:flex-row ${themeBase} w-full h-full overflow-hidden`}>
            {/* Sidebar remains standard */}
            <ChatListSidebar
                chats={chats}
                selectedChat={selectedChat}
                onSelectChat={setSelectedChat}
                staffList={staffList}
                onNewGroupClick={() => { setShowNewChatModal(true); setNewChatType('group'); }}
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
            />

            {/* Main Chat Interface */}
            <div className={`${selectedChat ? 'flex flex-1' : 'hidden md:flex flex-1'} flex-col w-full h-full overflow-hidden relative`}>
                {selectedChat ? (
                    <div className="flex flex-col h-full overflow-hidden">
                        {/* Fixed Header */}
                        <div className="shrink-0 z-50">
                            <ChatHeader
                                selectedChat={selectedChat}
                                onBack={() => setSelectedChat(null)}
                                getChatDisplayName={getChatDisplayName}
                                darkMode={darkMode}
                                showInfo={showInfo}
                                onShowInfoChange={setShowInfo}
                                currentUser={currentUser}
                                staffList={staffList}
                                onNavigateToStaffPermissions={onNavigateToStaffPermissions}
                                onDeleteChat={handleDeleteChat}
                                showOutletInfo={showOutletInfo}
                            />
                        </div>

                        {/* Messages area - scrollable */}
                        <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-3 pb-4 custom-scrollbar min-h-0">
                            <ChatMessages
                                messages={messages}
                                isLoadingMessages={isLoadingMessages}
                                currentUser={currentUser}
                                darkMode={darkMode}
                                playingAudioId={playingAudioId}
                                onToggleAudio={toggleAudio}
                                formatRecordingTime={formatRecordingTime}
                                audioRefs={audioRefs}
                                messagesEndRef={messagesEndRef}
                            />
                        </div>

                        {/* Fixed Input section - Footer position (hidden when info page is open) */}
                        {!showInfo && (
                            <div className={`shrink-0 z-50 ${darkMode ? 'bg-slate-950 border-t border-slate-800' : 'bg-white border-t border-slate-200'} p-4`}>
                                <ChatInput
                                    messageInput={messageInput}
                                    onMessageChange={setMessageInput}
                                    onSendMessage={handleSendMessage}
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
                                    darkMode={darkMode}
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <EmptyChatView
                        chats={chats}
                        onNewChat={() => { setShowNewChatModal(true); setNewChatType('group'); }}
                        darkMode={darkMode}
                    />
                )}
            </div>

            {/* Floating Add button - only on groups list, not when inside a chat */}
            {!selectedChat && (
                <button
                    onClick={() => { setShowNewChatModal(true); setNewChatType('group'); }}
                    className="fixed bottom-24 right-4 md:right-6 z-50 p-4 rounded-full bg-indigo-600 text-white hover:scale-110 active:scale-95 transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50"
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
            />

            <style dangerouslySetInnerHTML={{
                __html: ``
            }} />
        </div>
    );
};

export default Chat;