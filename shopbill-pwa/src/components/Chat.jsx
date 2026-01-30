import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Loader2, ShieldCheck } from 'lucide-react';
import { io } from 'socket.io-client';
import API from '../config/api';
import ChatListSidebar from './chat/ChatListSidebar';
import ChatHeader from './chat/ChatHeader';
import ChatMessages from './chat/ChatMessages';
import ChatInput from './chat/ChatInput';
import NewChatModal from './chat/NewChatModal';
import EmptyChatView from './chat/EmptyChatView';

const Chat = ({ apiClient, API, showToast, darkMode, currentUser, currentOutletId, outlets = [], onChatSelectionChange }) => {
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
    
    // Refs
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    const recordingTimerRef = useRef(null);
    const audioRefs = useRef({});

    // Constants
    const isPro = currentUser?.plan?.toUpperCase() === 'PRO';
    const isPremium = currentUser?.plan?.toUpperCase() === 'PREMIUM';
    const hasChatAccess = isPro || isPremium;

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
            if (data.chatId === selectedChat?._id) {
                setMessages(prev => {
                    // Remove any optimistic messages with same content
                    const withoutOptimistic = prev.filter(m => !m.isOptimistic || m._id !== `temp-${Date.now()}`);
                    const existingIndex = withoutOptimistic.findIndex(m => m._id === data.message._id);
                    if (existingIndex >= 0) return withoutOptimistic;
                    return [...withoutOptimistic, data.message];
                });
                setTimeout(() => scrollToBottom(), 50);
            }
            fetchChats();
        });

        return () => { if (socketRef.current) socketRef.current.disconnect(); };
    }, [hasChatAccess, selectedChat]);

    const fetchChats = useCallback(async () => {
        if (!hasChatAccess) { setIsLoading(false); return; }
        try {
            const response = await apiClient.get(API.chatList);
            if (response.data?.success) setChats(response.data.data || []);
        } catch (error) { console.error('Failed to fetch chats:', error); }
        finally { setIsLoading(false); }
    }, [hasChatAccess, apiClient, API]);

    const fetchMessages = useCallback(async (chatId) => {
        setIsLoadingMessages(true);
        try {
            const response = await apiClient.get(API.chatMessages(chatId));
            if (response.data.success) {
                setMessages(response.data.data || []);
                setTimeout(() => scrollToBottom(), 100);
            }
        } catch (error) { showToast('Failed to load messages', 'error'); }
        finally { setIsLoadingMessages(false); }
    }, [apiClient, API, showToast]);

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

    useEffect(() => { if (hasChatAccess) fetchChats(); }, [hasChatAccess, fetchChats]);

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

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
            };
            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
            setRecordingTime(0);
            recordingTimerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
        } catch (error) { showToast('Mic access denied', 'error'); }
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
            clearInterval(recordingTimerRef.current);
        }
    };

    const cancelRecording = () => {
        stopRecording();
        setAudioBlob(null);
        setAudioUrl(null);
    };

    const sendVoiceMessage = async () => {
        if (!audioBlob || !selectedChat) return;
        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice.webm');
        formData.append('messageType', 'audio');
        formData.append('audioDuration', recordingTime.toString());
        
        // Optimistic update - add voice message immediately
        const tempMessageId = `temp-voice-${Date.now()}`;
        const audioUrl = URL.createObjectURL(audioBlob);
        const optimisticMessage = {
            _id: tempMessageId,
            senderId: currentUser._id || currentUser.id,
            senderName: currentUser.name || currentUser.email,
            senderRole: currentUser.role,
            content: '',
            messageType: 'audio',
            audioUrl: audioUrl,
            audioDuration: recordingTime,
            timestamp: new Date(),
            isOptimistic: true
        };
        
        setMessages(prev => [...prev, optimisticMessage]);
        cancelRecording();
        scrollToBottom(true); // Instant scroll for optimistic update
        
        try {
            const response = await apiClient.post(API.sendMessage(selectedChat._id), formData);
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
            }
        } catch (error) { 
            // Remove optimistic message on error
            setMessages(prev => prev.filter(m => m._id !== tempMessageId));
            showToast('Upload failed', 'error'); 
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
            }
        } catch (error) { 
            // Remove optimistic message on error
            setMessages(prev => prev.filter(m => m._id !== tempMessageId));
            showToast('Send failed', 'error'); 
            setMessageInput(content); 
        }
    };

    const toggleAudio = (messageId) => {
        const audio = audioRefs.current[messageId];
        if (!audio) return;
        if (playingAudioId === messageId) {
            audio.pause();
            setPlayingAudioId(null);
        } else {
            if (playingAudioId && audioRefs.current[playingAudioId]) audioRefs.current[playingAudioId].pause();
            audio.play();
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
                darkMode={darkMode}
            />

            {/* Main Chat Interface */}
            <div className={`${selectedChat ? 'flex flex-1' : 'hidden md:flex flex-1'} flex-col w-full h-full overflow-hidden`}>
                {!selectedChat && (
                    <div className={`sticky top-0 z-50 p-6 border-b ${darkMode ? 'border-slate-800 bg-slate-950/95 backdrop-blur-xl' : 'border-slate-200 bg-white/95 backdrop-blur-xl'} shrink-0`}>
                        <h1 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            Network <span className="text-indigo-500">Comms</span>
                        </h1>
                        <p className={`text-[9px] font-black tracking-[0.2em] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Real-time team communication and coordination.
                        </p>
                    </div>
                )}
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
            />

            <style dangerouslySetInnerHTML={{
                __html: `
                    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { 
                        background: ${darkMode ? '#1e293b' : '#cbd5e1'}; 
                        border-radius: 10px; 
                    }
                `
            }} />
        </div>
    );
};

export default Chat;