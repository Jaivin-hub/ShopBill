// routes/chatRoutes.js
const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const Chat = require('../models/Chat');
const User = require('../models/User');
const Store = require('../models/Store');
const Staff = require('../models/Staff');
const router = express.Router();

// Helper: Check if user has required plan
const checkPlan = (user, requiredPlan) => {
    const userPlan = (user.plan || '').toUpperCase();
    return userPlan === requiredPlan || userPlan === 'PREMIUM'; // Premium can access PRO features
};

// Helper: Get user's accessible outlets (for Premium users)
const getUserOutlets = async (userId, userRole) => {
    if (userRole === 'owner') {
        return await Store.find({ ownerId: userId, isActive: true }).select('_id name');
    }
    // For staff, get their assigned outlet
    const staff = await Staff.findOne({ userId }).populate('storeId');
    return staff?.storeId ? [{ _id: staff.storeId._id, name: staff.storeId.name }] : [];
};

/**
 * @route GET /api/chat/chats
 * @desc Get all chats for the current user
 * @access Private (PRO/PREMIUM)
 */
router.get('/chats', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if user has PRO or PREMIUM plan
        if (!checkPlan(user, 'PRO')) {
            return res.status(403).json({ 
                error: 'Chat feature is only available for PRO and PREMIUM plan users' 
            });
        }

        // Find all chats where user is a participant
        const chats = await Chat.find({ participants: req.user.id })
            .populate('participants', 'name email role profileImageUrl')
            .populate('outletId', 'name')
            .populate('createdBy', 'name')
            .sort({ lastMessageAt: -1 });

        // Only send last message for preview, not all messages
        const chatsWithPreview = chats.map(chat => {
            const chatObj = chat.toObject();
            const lastMessage = chat.messages && chat.messages.length > 0 
                ? chat.messages[chat.messages.length - 1] 
                : null;
            return {
                ...chatObj,
                messages: lastMessage ? [lastMessage] : []
            };
        });

        res.json({ success: true, data: chatsWithPreview });
    } catch (error) {
        console.error('Get Chats Error:', error);
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
});

/**
 * @route GET /api/chat/:chatId/messages
 * @desc Get messages for a specific chat
 * @access Private (PRO/PREMIUM)
 */
router.get('/:chatId/messages', protect, async (req, res) => {
    try {
        const { chatId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        // Check if user is a participant
        if (!chat.participants.includes(req.user.id)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Paginate messages (most recent first)
        const skip = (page - 1) * limit;
        const messages = chat.messages
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(skip, skip + parseInt(limit))
            .reverse(); // Reverse to show oldest first

        res.json({ 
            success: true, 
            data: messages,
            total: chat.messages.length,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Get Messages Error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

/**
 * @route POST /api/chat/create
 * @desc Create a new chat (direct or group)
 * @access Private (PRO/PREMIUM)
 */
router.post('/create', protect, async (req, res) => {
    try {
        const { type, name, participantIds, outletId } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check plan
        if (!checkPlan(user, 'PRO')) {
            return res.status(403).json({ 
                error: 'Chat feature is only available for PRO and PREMIUM plan users' 
            });
        }

        // Validate input
        if (!type || !['direct', 'group'].includes(type)) {
            return res.status(400).json({ error: 'Invalid chat type' });
        }

        if (type === 'group' && !name) {
            return res.status(400).json({ error: 'Group name is required' });
        }

        if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
            return res.status(400).json({ error: 'At least one participant is required' });
        }

        // Add creator to participants
        const allParticipants = [...new Set([req.user.id, ...participantIds])];

        // For direct chat, ensure only 2 participants
        if (type === 'direct' && allParticipants.length !== 2) {
            return res.status(400).json({ error: 'Direct chat must have exactly 2 participants' });
        }

        // Validate outlet access (for Premium users)
        let finalOutletId = outletId || null;
        if (user.plan?.toUpperCase() === 'PREMIUM' && outletId) {
            const outlets = await getUserOutlets(req.user.id, user.role);
            const hasAccess = outlets.some(o => o._id.toString() === outletId);
            if (!hasAccess) {
                return res.status(403).json({ error: 'Access denied to this outlet' });
            }
        }

        // For PRO plan: can create cross-outlet chats (outletId = null)
        // For PREMIUM plan: can create outlet-specific or cross-outlet
        const requiredPlan = user.plan?.toUpperCase() === 'PREMIUM' ? 'PREMIUM' : 'PRO';

        // Check if direct chat already exists
        if (type === 'direct') {
            const existingChat = await Chat.findOne({
                type: 'direct',
                participants: { $all: allParticipants, $size: 2 }
            });

            if (existingChat) {
                return res.json({ success: true, data: existingChat });
            }
        }

        // Create new chat
        const newChat = await Chat.create({
            type,
            name: type === 'group' ? name : null,
            participants: allParticipants,
            outletId: finalOutletId,
            createdBy: req.user.id,
            messages: [],
            requiredPlan
        });

        const populatedChat = await Chat.findById(newChat._id)
            .populate('participants', 'name email role profileImageUrl')
            .populate('outletId', 'name')
            .populate('createdBy', 'name');

        res.json({ success: true, data: populatedChat });
    } catch (error) {
        console.error('Create Chat Error:', error);
        res.status(500).json({ error: 'Failed to create chat' });
    }
});

/**
 * @route POST /api/chat/:chatId/message
 * @desc Send a message to a chat
 * @access Private (PRO/PREMIUM)
 */
router.post('/:chatId/message', protect, async (req, res) => {
    try {
        const { chatId } = req.params;
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Message content is required' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        // Check if user is a participant
        if (!chat.participants.includes(req.user.id)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Create message
        const message = {
            senderId: req.user.id,
            senderName: user.name || user.email,
            senderRole: user.role,
            content: content.trim(),
            timestamp: new Date()
        };

        // Add message to chat
        chat.messages.push(message);
        chat.lastMessageAt = new Date();
        await chat.save();

        // Populate sender info for response
        const populatedMessage = {
            ...message,
            _id: chat.messages[chat.messages.length - 1]._id,
            senderId: {
                _id: user._id,
                name: user.name || user.email,
                role: user.role,
                profileImageUrl: user.profileImageUrl
            }
        };

        // Emit to Socket.IO for real-time updates
        const io = req.app.get('socketio');
        if (io) {
            // Emit to chat room
            io.to(`chat_${chat._id}`).emit('new_message', {
                chatId: chat._id,
                message: populatedMessage
            });
            // Also emit to user rooms for notifications
            chat.participants.forEach(participantId => {
                if (participantId.toString() !== req.user.id.toString()) {
                    io.to(`user_${participantId}`).emit('new_message', {
                        chatId: chat._id,
                        message: populatedMessage
                    });
                }
            });
        }

        res.json({ success: true, data: populatedMessage });
    } catch (error) {
        console.error('Send Message Error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

/**
 * @route GET /api/chat/users
 * @desc Get list of users that can be added to chats (based on plan and role)
 * @access Private (PRO/PREMIUM)
 */
router.get('/users', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!checkPlan(user, 'PRO')) {
            return res.status(403).json({ 
                error: 'Chat feature is only available for PRO and PREMIUM plan users' 
            });
        }

        let users = [];

        if (user.role === 'owner') {
            // Owner can chat with all staff in their stores
            if (user.plan?.toUpperCase() === 'PREMIUM') {
                // Premium: Get staff from all outlets or specific outlet
                const { outletId } = req.query;
                const stores = outletId 
                    ? await Store.find({ ownerId: user._id, _id: outletId, isActive: true })
                    : await Store.find({ ownerId: user._id, isActive: true });
                
                const storeIds = stores.map(s => s._id);
                const staffList = await Staff.find({ 
                    storeId: { $in: storeIds },
                    isActive: true 
                }).populate('userId', 'name email role profileImageUrl').populate('storeId', 'name');

                users = staffList.map(s => ({
                    _id: s.userId._id,
                    name: s.userId.name || s.userId.email,
                    email: s.userId.email,
                    role: s.userId.role,
                    profileImageUrl: s.userId.profileImageUrl,
                    outletId: s.storeId?._id,
                    outletName: s.storeId?.name
                }));
            } else {
                // PRO: Get all staff (managers and cashiers) from all stores
                const stores = await Store.find({ ownerId: user._id, isActive: true });
                const storeIds = stores.map(s => s._id);
                const staffList = await Staff.find({ 
                    storeId: { $in: storeIds },
                    isActive: true 
                }).populate('userId', 'name email role profileImageUrl');

                users = staffList.map(s => ({
                    _id: s.userId._id,
                    name: s.userId.name || s.userId.email,
                    email: s.userId.email,
                    role: s.userId.role,
                    profileImageUrl: s.userId.profileImageUrl
                }));
            }
        } else if (user.role === 'Manager') {
            // Manager can chat with owner and other staff in same outlet
            const staff = await Staff.findOne({ userId: user._id }).populate('storeId');
            if (staff?.storeId) {
                const owner = await User.findById(staff.storeId.ownerId);
                if (owner) {
                    users.push({
                        _id: owner._id,
                        name: owner.name || owner.email,
                        email: owner.email,
                        role: owner.role,
                        profileImageUrl: owner.profileImageUrl
                    });
                }

                // Get other staff in same outlet
                const otherStaff = await Staff.find({ 
                    storeId: staff.storeId._id,
                    userId: { $ne: user._id },
                    isActive: true
                }).populate('userId', 'name email role profileImageUrl');

                users.push(...otherStaff.map(s => ({
                    _id: s.userId._id,
                    name: s.userId.name || s.userId.email,
                    email: s.userId.email,
                    role: s.userId.role,
                    profileImageUrl: s.userId.profileImageUrl
                })));
            }
        } else if (user.role === 'Cashier') {
            // Cashier can chat with owner and managers in same outlet
            const staff = await Staff.findOne({ userId: user._id }).populate('storeId');
            if (staff?.storeId) {
                const owner = await User.findById(staff.storeId.ownerId);
                if (owner) {
                    users.push({
                        _id: owner._id,
                        name: owner.name || owner.email,
                        email: owner.email,
                        role: owner.role,
                        profileImageUrl: owner.profileImageUrl
                    });
                }

                // Get managers in same outlet
                const managers = await Staff.find({ 
                    storeId: staff.storeId._id,
                    role: 'Manager',
                    isActive: true
                }).populate('userId', 'name email role profileImageUrl');

                users.push(...managers.map(s => ({
                    _id: s.userId._id,
                    name: s.userId.name || s.userId.email,
                    email: s.userId.email,
                    role: s.userId.role,
                    profileImageUrl: s.userId.profileImageUrl
                })));
            }
        }

        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Get Users Error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

module.exports = router;

