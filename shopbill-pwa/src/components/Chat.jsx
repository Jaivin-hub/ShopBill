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

const Chat = ({ apiClient, API, showToast, darkMode, currentUser, currentOutletId, outlets = [] }) => {
    // Styling Vars matching Dashboard architecture - Using Industrial Black #030712
    const themeBase = darkMode ? 'bg-[#030712] text-slate-100' : 'bg-slate-50 text-slate-900';
    
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
    const [messageInput, setMessageInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [newChatType, setNewChatType] = useState('group');
    const [newChatName, setNewChatName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectedOutlet, setSelectedOutlet] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [staffList, setStaffList] = useState([]);
    const [isLoadingStaff, setIsLoadingStaff] = useState(false);
    
    // Voice recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [playingAudioId, setPlayingAudioId] = useState(null);
    
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
                    const existingIndex = prev.findIndex(m => m._id === data.message._id);
                    if (existingIndex >= 0) return prev;
                    return [...prev, data.message];
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

    // Handle Default Groups
    useEffect(() => {
        if (isLoading || isLoadingStaff || !currentUser || !hasChatAccess) return;
        const commonChatId = `common-staff-all`;
        if (!chats.find(c => c._id === commonChatId)) {
            const defaultGroups = [
                {
                    _id: commonChatId,
                    name: 'All Outlet Staffs',
                    type: 'group',
                    participants: staffList,
                    isDefault: true,
                    description: 'Global transmission channel'
                },
                ...outlets.map(outlet => ({
                    _id: `store-group-${outlet._id}`,
                    name: `${outlet.name} Group`,
                    type: 'group',
                    outletId: outlet,
                    participants: staffList.filter(s => s.outletId === outlet._id),
                    isDefault: true
                }))
            ];
            setChats(prev => [...defaultGroups, ...prev.filter(c => !c.isDefault)]);
        }
    }, [isLoading, isLoadingStaff, outlets, staffList, currentUser, hasChatAccess]);

    useEffect(() => { if (hasChatAccess) fetchChats(); }, [hasChatAccess, fetchChats]);

    useEffect(() => {
        if (selectedChat && !selectedChat.isDefault) {
            fetchMessages(selectedChat._id);
        } else {
            setMessages([]);
        }
    }, [selectedChat, fetchMessages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        try {
            const response = await apiClient.post(API.sendMessage(selectedChat._id), formData);
            if (response.data.success) {
                setMessages(prev => [...prev, response.data.data]);
                cancelRecording();
                scrollToBottom();
            }
        } catch (error) { showToast('Upload failed', 'error'); }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedChat) return;
        const content = messageInput.trim();
        setMessageInput('');
        try {
            const response = await apiClient.post(API.sendMessage(selectedChat._id), { content });
            if (response.data.success) {
                setMessages(prev => [...prev, response.data.data]);
                scrollToBottom();
            }
        } catch (error) { showToast('Send failed', 'error'); setMessageInput(content); }
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
        const other = chat.participants?.find(p => (p._id || p) !== currentUser._id);
        return other?.name || other?.email || 'Unknown';
    };

    if (!hasChatAccess) return (
        <div className={`h-screen flex flex-col items-center justify-center ${themeBase}`}>
            <ShieldCheck className="w-12 h-12 text-slate-700 mb-4 opacity-20" />
            <h2 className="text-xl font-black tracking-tighter uppercase">Access Restricted</h2>
            <p className="text-xs font-bold text-indigo-500/60 uppercase tracking-widest mt-1">Upgrade to PRO or PREMIUM</p>
        </div>
    );

    return (
        <div className={`flex flex-col md:flex-row ${themeBase} h-full relative overflow-hidden`}>
            {/* Sidebar remains standard */}
            <ChatListSidebar
                chats={chats}
                selectedChat={selectedChat}
                onSelectChat={setSelectedChat}
                staffList={staffList}
                onNewGroupClick={() => { setShowNewChatModal(true); setNewChatType('group'); }}
                onQuickMessage={(id) => { /* Quick Message Logic */ }}
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
            <div className={`${selectedChat ? 'flex flex-1' : 'hidden md:flex flex-1'} flex-col h-full relative`}>
                {selectedChat ? (
                    <>
                        <ChatHeader
                            selectedChat={selectedChat}
                            onBack={() => setSelectedChat(null)}
                            getChatDisplayName={getChatDisplayName}
                            darkMode={darkMode}
                        />

                        {/* Increased Bottom Padding to clear the floating footer input */}
                        <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar pb-36 md:pb-28">
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

                        {/* FOOTER POSITIONING: Fixed for mobile, Absolute for desktop */}
                        <div className="fixed md:absolute bottom-[76px] md:bottom-6 left-0 right-0 z-[45] md:z-10 px-3 md:px-6 pointer-events-none">
                            <div className="max-w-4xl mx-auto w-full pointer-events-auto">
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
                        </div>
                    </>
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
                onClose={() => setShowNewChatModal(false)}
                newChatType={newChatType}
                onChatTypeChange={setNewChatType}
                newChatName={newChatName}
                onChatNameChange={setNewChatName}
                selectedUsers={selectedUsers}
                onUserToggle={(id) => setSelectedUsers(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
                selectedOutlet={selectedOutlet}
                onOutletChange={setSelectedOutlet}
                availableUsers={staffList}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                outlets={outlets}
                isPremium={isPremium}
                onCreateChat={() => { /* Create logic */ }}
                darkMode={darkMode}
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