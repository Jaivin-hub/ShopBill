import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    MessageCircle, Send, Plus, Users, User, Search, X, Loader2,
    Store, Hash, ChevronRight, MoreVertical, Image as ImageIcon, Paperclip
} from 'lucide-react';
import { io } from 'socket.io-client';
import API from '../config/api';

const Chat = ({ apiClient, API, showToast, darkMode, currentUser, currentOutletId, outlets = [] }) => {
    // Safety check
    if (!currentUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
                    <p className="text-slate-600">Loading...</p>
                </div>
            </div>
        );
    }
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [newChatType, setNewChatType] = useState('direct'); // 'direct' or 'group'
    const [newChatName, setNewChatName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectedOutlet, setSelectedOutlet] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showStaffList, setShowStaffList] = useState(false);
    const [staffList, setStaffList] = useState([]);
    const [isLoadingStaff, setIsLoadingStaff] = useState(false);
    
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);

    const isPro = currentUser?.plan?.toUpperCase() === 'PRO';
    const isPremium = currentUser?.plan?.toUpperCase() === 'PREMIUM';
    const hasChatAccess = isPro || isPremium;

    const themeBase = darkMode ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-900';
    const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
    const inputBase = darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900';

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

        socketRef.current.on('connect', () => {
            console.log('Chat socket connected');
        });

        socketRef.current.on('new_message', (data) => {
            if (data.chatId === selectedChat?._id) {
                setMessages(prev => [...prev, data.message]);
                scrollToBottom();
            }
            // Update chat list to show latest message
            fetchChats();
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [hasChatAccess, selectedChat]);

    // Join chat room when chat is selected
    useEffect(() => {
        if (selectedChat && socketRef.current) {
            socketRef.current.emit('join_chat', selectedChat._id);
            return () => {
                if (socketRef.current) {
                    socketRef.current.emit('leave_chat', selectedChat._id);
                }
            };
        }
    }, [selectedChat]);

    // Fetch chats list
    const fetchChats = useCallback(async () => {
        if (!hasChatAccess) {
            setIsLoading(false);
            return;
        }
        try {
            const response = await apiClient.get(API.chatList);
            if (response.data?.success) {
                setChats(response.data.data || []);
            } else {
                setChats([]);
            }
        } catch (error) {
            console.error('Failed to fetch chats:', error);
            setChats([]);
            // Don't show toast on initial load
        } finally {
            setIsLoading(false);
        }
    }, [hasChatAccess, apiClient, API]);

    // Fetch messages for selected chat
    const fetchMessages = useCallback(async (chatId) => {
        setIsLoadingMessages(true);
        try {
            const response = await apiClient.get(API.chatMessages(chatId));
            if (response.data.success) {
                setMessages(response.data.data || []);
                setTimeout(() => scrollToBottom(), 100);
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error);
            showToast('Failed to load messages', 'error');
        } finally {
            setIsLoadingMessages(false);
        }
    }, [apiClient, API, showToast]);

    // Fetch available users
    const fetchAvailableUsers = useCallback(async () => {
        try {
            const params = selectedOutlet ? { outletId: selectedOutlet } : {};
            const response = await apiClient.get(API.chatUsers, { params });
            if (response.data.success) {
                setAvailableUsers(response.data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    }, [apiClient, API, selectedOutlet]);

    useEffect(() => {
        if (hasChatAccess) {
            fetchChats();
        } else {
            setIsLoading(false);
        }
    }, [hasChatAccess, fetchChats]);

    useEffect(() => {
        if (showNewChatModal) {
            fetchAvailableUsers();
        }
    }, [showNewChatModal, fetchAvailableUsers]);

    // Fetch staff list for quick messaging
    useEffect(() => {
        if (!hasChatAccess) {
            setStaffList([]);
            return;
        }
        const fetchStaff = async () => {
            setIsLoadingStaff(true);
            try {
                // For premium users, optionally filter by current outlet
                const params = (isPremium && currentOutletId) ? { outletId: currentOutletId } : {};
                const response = await apiClient.get(API.chatUsers, { params });
                if (response.data?.success) {
                    setStaffList(response.data.data || []);
                }
            } catch (error) {
                console.error('Failed to fetch staff list:', error);
                setStaffList([]);
            } finally {
                setIsLoadingStaff(false);
            }
        };
        fetchStaff();
    }, [hasChatAccess, isPremium, currentOutletId, apiClient, API]);


    const handleQuickMessage = async (userId) => {
        try {
            // Check if direct chat already exists
            const existingChat = chats.find(chat => 
                chat.type === 'direct' && 
                chat.participants.some(p => (p._id || p) === userId)
            );

            if (existingChat) {
                setSelectedChat(existingChat);
                return;
            }

            // Create new direct chat
            const response = await apiClient.post(API.createChat, {
                type: 'direct',
                participantIds: [userId],
                outletId: null
            });

            if (response.data.success) {
                const newChat = response.data.data;
                setChats(prev => [newChat, ...prev]);
                setSelectedChat(newChat);
            }
        } catch (error) {
            console.error('Failed to create quick chat:', error);
            showToast('Failed to start conversation', 'error');
        }
    };

    useEffect(() => {
        if (selectedChat) {
            fetchMessages(selectedChat._id);
        }
    }, [selectedChat, fetchMessages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
                fetchChats(); // Update chat list with latest message
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            showToast('Failed to send message', 'error');
            setMessageInput(content); // Restore message on error
        }
    };

    const handleCreateChat = async () => {
        if (newChatType === 'group' && !newChatName.trim()) {
            showToast('Group name is required', 'error');
            return;
        }

        let finalParticipantIds = selectedUsers;
        
        // If group is for all outlets and no outlet selected, auto-add all staff
        if (newChatType === 'group' && !selectedOutlet && isPremium) {
            finalParticipantIds = staffList.map(s => s._id);
        } else if (newChatType === 'group' && selectedOutlet && isPremium) {
            // If specific outlet selected, add only staff from that outlet
            finalParticipantIds = staffList
                .filter(s => s.outletId === selectedOutlet)
                .map(s => s._id);
        }

        if (newChatType === 'group' && finalParticipantIds.length === 0) {
            showToast('No participants available', 'error');
            return;
        }

        try {
            const response = await apiClient.post(API.createChat, {
                type: 'group',
                name: newChatName.trim(),
                participantIds: finalParticipantIds,
                outletId: selectedOutlet || null
            });

            if (response.data.success) {
                const newChat = response.data.data;
                setChats(prev => [newChat, ...prev]);
                setSelectedChat(newChat);
                setShowNewChatModal(false);
                setNewChatName('');
                setSelectedUsers([]);
                setSelectedOutlet(null);
                setShowStaffList(false);
                setSearchTerm('');
                showToast('Group created successfully', 'success');
            }
        } catch (error) {
            console.error('Failed to create chat:', error);
            showToast(error.response?.data?.error || 'Failed to create chat', 'error');
        }
    };

    const getChatDisplayName = (chat) => {
        if (chat.type === 'group') {
            return chat.name;
        }
        // For direct chat, show the other participant's name
        const otherParticipant = chat.participants?.find(p => p._id !== currentUser._id);
        return otherParticipant?.name || otherParticipant?.email || 'Unknown User';
    };

    const getChatDisplayImage = (chat) => {
        if (chat.type === 'group') {
            return null; // Group icon
        }
        const otherParticipant = chat.participants?.find(p => p._id !== currentUser._id);
        return otherParticipant?.profileImageUrl;
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
        if (minutes < 10080) return `${Math.floor(minutes / 1440)}d ago`;
        return date.toLocaleDateString();
    };

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return availableUsers;
        const term = searchTerm.toLowerCase();
        return availableUsers.filter(u => 
            u.name?.toLowerCase().includes(term) || 
            u.email?.toLowerCase().includes(term)
        );
    }, [availableUsers, searchTerm]);

    if (!hasChatAccess) {
        return (
            <div className={`min-h-screen flex flex-col items-center justify-center ${themeBase} p-8`}>
                <div className={`${cardBase} p-8 rounded-2xl border max-w-md text-center`}>
                    <MessageCircle className="w-16 h-16 text-indigo-500 mx-auto mb-4 opacity-50" />
                    <h2 className={`text-xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        Chat Feature Unavailable
                    </h2>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'} mb-4`}>
                        Real-time chat is available for PRO and PREMIUM plan users only.
                    </p>
                    <button
                        onClick={() => window.location.href = '/#pricing'}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all"
                    >
                        Upgrade Plan
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen flex ${themeBase} transition-colors duration-200`}>
            {/* Chat List Sidebar */}
            <div className={`w-full ${selectedChat ? 'md:w-80' : 'md:w-96'} ${selectedChat ? 'border-r' : ''} ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'} flex flex-col`}>
                {/* Header */}
                <div className={`p-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'} flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-indigo-500" />
                        <h2 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Messages</h2>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setShowStaffList(!showStaffList);
                                setSearchTerm(''); // Reset search when switching views
                            }}
                            className={`p-2 rounded-lg transition-all ${
                                showStaffList 
                                    ? 'bg-indigo-600 text-white' 
                                    : darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                            }`}
                            title="All Staff"
                        >
                            <Users className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => {
                                setShowNewChatModal(true);
                                setNewChatType('group');
                            }}
                            className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-all"
                            title="New Group"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                        {/* Search */}
                <div className="p-3 border-b border-inherit">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder={showStaffList ? "Search staff..." : "Search chats..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-10 pr-4 py-2 ${inputBase} border rounded-xl text-sm focus:outline-none focus:border-indigo-500`}
                        />
                    </div>
                </div>

                {/* Content: Staff List or Chat List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {showStaffList ? (
                        // All Staff List
                        <div>
                            <div className="p-3 border-b border-inherit">
                                <p className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Tap to start a conversation
                                </p>
                            </div>
                            {isLoadingStaff ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                </div>
                            ) : staffList.length === 0 ? (
                                <div className="text-center py-12 px-4">
                                    <Users className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-50" />
                                    <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No staff found</p>
                                </div>
                            ) : (
                                <div>
                                    {staffList
                                        .filter(staff => {
                                            if (!searchTerm) return true;
                                            const term = searchTerm.toLowerCase();
                                            return (staff.name || staff.email || '').toLowerCase().includes(term) ||
                                                   (staff.outletName || '').toLowerCase().includes(term);
                                        })
                                        .map(staff => (
                                            <button
                                                key={staff._id}
                                                onClick={() => handleQuickMessage(staff._id)}
                                                className={`w-full p-4 border-b border-inherit text-left transition-all ${
                                                    darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                                                        <User className="w-6 h-6 text-indigo-500" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                                            {staff.name || staff.email}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                                {staff.role}
                                                            </span>
                                                            {staff.outletName && (
                                                                <>
                                                                    <span className={`text-xs ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>•</span>
                                                                    <div className="flex items-center gap-1">
                                                                        <Store className="w-3 h-3 text-slate-400" />
                                                                        <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                                            {staff.outletName}
                                                                        </span>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <MessageCircle className="w-5 h-5 text-indigo-500 shrink-0" />
                                                </div>
                                            </button>
                                        ))
                                    }
                                </div>
                            )}
                        </div>
                    ) : (
                        // Chat List
                        <>
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                </div>
                            ) : chats.length === 0 ? (
                                <div className="text-center py-12 px-4">
                                    <MessageCircle className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-50" />
                                    <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No chats yet</p>
                                    <button
                                        onClick={() => setShowStaffList(true)}
                                        className="mt-3 text-indigo-500 text-sm font-bold hover:underline"
                                    >
                                        Message a staff member
                                    </button>
                                </div>
                            ) : (
                                chats
                                    .filter(chat => {
                                        if (!searchTerm) return true;
                                        const term = searchTerm.toLowerCase();
                                        const name = getChatDisplayName(chat).toLowerCase();
                                        return name.includes(term);
                                    })
                                    .map(chat => {
                                        const isSelected = selectedChat?._id === chat._id;
                                        const lastMessage = chat.messages && chat.messages.length > 0 
                                            ? chat.messages[chat.messages.length - 1] 
                                            : null;
                                        return (
                                            <button
                                                key={chat._id}
                                                onClick={() => setSelectedChat(chat)}
                                                className={`w-full p-4 border-b border-inherit text-left transition-all ${
                                                    isSelected
                                                        ? darkMode ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'
                                                        : darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                                        chat.type === 'group' 
                                                            ? 'bg-indigo-500/10 text-indigo-500' 
                                                            : 'bg-slate-200 text-slate-600'
                                                    }`}>
                                                        {chat.type === 'group' ? (
                                                            <Users className="w-5 h-5" />
                                                        ) : (
                                                            <User className="w-5 h-5" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                                                {getChatDisplayName(chat)}
                                                            </p>
                                                            {lastMessage && (
                                                                <span className={`text-[10px] shrink-0 ml-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                                    {formatTime(lastMessage.timestamp)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {lastMessage && (
                                                            <p className={`text-xs truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                                {(lastMessage.senderId?._id === currentUser._id || lastMessage.senderId === currentUser._id) ? 'You: ' : ''}
                                                                {lastMessage.content}
                                                            </p>
                                                        )}
                                                        {chat.outletId && (
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <Store className="w-3 h-3 text-slate-400" />
                                                                <span className="text-[10px] text-slate-400">{chat.outletId.name}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Chat View */}
            <div className={`${selectedChat ? 'flex-1' : 'hidden md:flex flex-1'} flex flex-col ${!selectedChat ? (darkMode ? 'bg-slate-950' : 'bg-slate-50') : ''}`}>
                {selectedChat ? (
                    <>
                        {/* Chat Header */}
                        <div className={`p-4 border-b ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'} flex items-center justify-between`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    selectedChat.type === 'group' 
                                        ? 'bg-indigo-500/10 text-indigo-500' 
                                        : 'bg-slate-200 text-slate-600'
                                }`}>
                                    {selectedChat.type === 'group' ? (
                                        <Users className="w-5 h-5" />
                                    ) : (
                                        <User className="w-5 h-5" />
                                    )}
                                </div>
                                <div>
                                    <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {getChatDisplayName(selectedChat)}
                                    </h3>
                                    {selectedChat.type === 'group' && (
                                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {selectedChat.participants?.length || 0} participants
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div 
                            ref={chatContainerRef}
                            className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
                        >
                            {isLoadingMessages ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-12">
                                    <MessageCircle className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-50" />
                                    <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No messages yet</p>
                                    <p className={`text-xs mt-1 ${darkMode ? 'text-slate-600' : 'text-slate-500'}`}>Start the conversation</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isOwn = msg.senderId?._id === currentUser._id || msg.senderId === currentUser._id;
                                    return (
                                        <div
                                            key={msg._id || idx}
                                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                                                {!isOwn && (
                                                    <p className={`text-xs font-bold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        {msg.senderName}
                                                    </p>
                                                )}
                                                <div className={`p-3 rounded-2xl ${
                                                    isOwn
                                                        ? 'bg-indigo-600 text-white'
                                                        : darkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900'
                                                }`}>
                                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                                    <p className={`text-[10px] mt-1 ${isOwn ? 'text-indigo-100' : darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <form onSubmit={handleSendMessage} className={`p-4 border-t ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    placeholder="Type a message..."
                                    className={`flex-1 ${inputBase} px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500`}
                                />
                                <button
                                    type="submit"
                                    disabled={!messageInput.trim()}
                                    className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className={`${cardBase} max-w-md w-full rounded-2xl border p-8 text-center`}>
                            <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
                                darkMode ? 'bg-indigo-500/10' : 'bg-indigo-50'
                            }`}>
                                <MessageCircle className={`w-10 h-10 ${
                                    darkMode ? 'text-indigo-400' : 'text-indigo-600'
                                }`} />
                            </div>
                            <h3 className={`text-xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                {chats.length === 0 ? 'No Conversations Yet' : 'Select a Chat'}
                            </h3>
                            <p className={`text-sm mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                {chats.length === 0 
                                    ? 'Start communicating with your team members. Create your first chat to get started!'
                                    : 'Choose a conversation from the sidebar to view messages or start a new one'
                                }
                            </p>
                            <button
                                onClick={() => setShowNewChatModal(true)}
                                className="w-full py-3.5 px-6 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                <span>Start New Chat</span>
                            </button>
                            {chats.length > 0 && (
                                <p className={`text-xs mt-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Or click on any chat from the sidebar
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* New Chat Modal */}
            {showNewChatModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
                    <div className={`${cardBase} w-full max-w-md rounded-2xl border overflow-hidden shadow-2xl`}>
                        <div className={`p-6 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'} flex justify-between items-center`}>
                            <h3 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>New Group</h3>
                            <button
                                onClick={() => {
                                    setShowNewChatModal(false);
                                    setNewChatName('');
                                    setSelectedUsers([]);
                                    setSelectedOutlet(null);
                                    setSearchTerm('');
                                }}
                                className="p-2 hover:bg-red-500/10 rounded-xl text-slate-500 hover:text-red-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Group Name */}
                            <div>
                                <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Group Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newChatName}
                                    onChange={(e) => setNewChatName(e.target.value)}
                                    placeholder="Enter group name (e.g., All Managers, Store Team)"
                                    className={`w-full ${inputBase} px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500`}
                                />
                            </div>

                            {/* Outlet Selection (Premium only) */}
                            {isPremium && outlets.length > 0 && (
                                <div>
                                    <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Select Outlet
                                    </label>
                                    <select
                                        value={selectedOutlet || ''}
                                        onChange={(e) => {
                                            setSelectedOutlet(e.target.value || null);
                                            setSelectedUsers([]); // Reset selection when outlet changes
                                        }}
                                        className={`w-full ${inputBase} px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500`}
                                    >
                                        <option value="">All Outlets (All Staff)</option>
                                        {outlets.map(outlet => (
                                            <option key={outlet._id} value={outlet._id}>{outlet.name}</option>
                                        ))}
                                    </select>
                                    <p className={`text-[10px] mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                        {selectedOutlet 
                                            ? 'Select participants from this outlet below'
                                            : 'All staff from all outlets will be added automatically'
                                        }
                                    </p>
                                </div>
                            )}

                            {/* User Selection (only if specific outlet selected) */}
                            {(!isPremium || selectedOutlet) && (
                                <div>
                                    <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Select Participants {selectedOutlet && <span className="text-red-500">*</span>}
                                    </label>
                                    <div className="relative mb-2">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Search staff..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className={`w-full pl-10 pr-4 py-2 ${inputBase} border rounded-xl text-sm focus:outline-none focus:border-indigo-500`}
                                        />
                                    </div>
                                    <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                                        {filteredUsers.length === 0 ? (
                                            <p className={`text-xs text-center py-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                No staff found
                                            </p>
                                        ) : (
                                            filteredUsers.map(user => {
                                                const isSelected = selectedUsers.includes(user._id);
                                                return (
                                                    <button
                                                        key={user._id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedUsers(prev =>
                                                                isSelected
                                                                    ? prev.filter(id => id !== user._id)
                                                                    : [...prev, user._id]
                                                            );
                                                        }}
                                                        className={`w-full p-3 rounded-xl text-left transition-all border ${
                                                            isSelected
                                                                ? 'bg-indigo-500/10 border-indigo-500'
                                                                : darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                                                <User className="w-4 h-4 text-slate-600" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                                                    {user.name || user.email}
                                                                </p>
                                                                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                                    {user.role} {user.outletName && `• ${user.outletName}`}
                                                                </p>
                                                            </div>
                                                            {isSelected && (
                                                                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                                                                    <X className="w-3 h-3 text-white" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Info for All Outlets */}
                            {isPremium && !selectedOutlet && (
                                <div className={`p-3 rounded-xl ${darkMode ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-indigo-50 border border-indigo-200'}`}>
                                    <div className="flex items-start gap-2">
                                        <Users className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                                        <div>
                                            <p className={`text-xs font-bold ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>
                                                All Staff Included
                                            </p>
                                            <p className={`text-[10px] mt-1 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                                All staff members from all your outlets will be automatically added to this group.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={`p-6 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'} flex gap-3`}>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowNewChatModal(false);
                                    setNewChatName('');
                                    setSelectedUsers([]);
                                    setSelectedOutlet(null);
                                    setSearchTerm('');
                                }}
                                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                                    darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                                }`}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateChat}
                                disabled={!newChatName.trim()}
                                className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Create Group
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { 
                        background: ${darkMode ? '#475569' : '#cbd5e1'}; 
                        border-radius: 10px; 
                    }
                `
            }} />
        </div>
    );
};

export default Chat;

