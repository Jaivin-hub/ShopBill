// routes/chatRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, authorize } = require('../middleware/authMiddleware');
const Chat = require('../models/Chat');
const User = require('../models/User');
const Store = require('../models/Store');
const Staff = require('../models/Staff');
const router = express.Router();

// Configure multer for audio file uploads
const audioStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/audio');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `voice-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const audioUpload = multer({
    storage: audioStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/aac', 'audio/m4a'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only audio files are allowed.'), false);
        }
    }
});

// Configure multer for general file uploads
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/files');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `file-${uniqueSuffix}-${sanitizedName}`);
    }
});

const fileUpload = multer({
    storage: fileStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain', 'text/csv'
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'), false);
        }
    }
});

// Helper: Get the effective plan for a user (owner's plan for staff, user's plan for owners)
const getEffectivePlan = async (user) => {
    if (user.role === 'owner' || user.role === 'superadmin') {
        return (user.plan || '').toUpperCase();
    }
    
    // For staff members, get the owner's plan
    if (user.activeStoreId) {
        const store = await Store.findById(user.activeStoreId);
        if (store && store.ownerId) {
            const owner = await User.findById(store.ownerId);
            if (owner) {
                return (owner.plan || '').toUpperCase();
            }
        }
    }
    
    // Fallback: try shopId
    if (user.shopId) {
        const owner = await User.findById(user.shopId);
        if (owner) {
            return (owner.plan || '').toUpperCase();
        }
    }
    
    return '';
};

// Helper: Check if user has required plan (checks owner's plan for staff)
const checkPlan = async (user, requiredPlan) => {
    const userPlan = await getEffectivePlan(user);
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

        // Check if user has PRO or PREMIUM plan (checks owner's plan for staff)
        if (!(await checkPlan(user, 'PRO'))) {
            return res.status(403).json({ 
                error: 'Chat feature is only available for PRO and PREMIUM plan users' 
            });
        }

        // Auto-create default groups for owners if they don't exist
        if (user.role === 'owner') {
            const stores = await Store.find({ ownerId: user._id, isActive: true });

            // Create individual store groups for each outlet
            for (const store of stores) {
                const storeGroupName = `${store.name} Group`;
                let storeGroup = await Chat.findOne({ 
                    name: storeGroupName, 
                    type: 'group',
                    createdBy: user._id,
                    isDefault: true,
                    outletId: store._id
                });

                if (!storeGroup) {
                    // Get staff for this specific outlet
                    const storeStaff = await Staff.find({ 
                        storeId: store._id, 
                        active: true 
                    }).populate('userId', '_id');
                    
                    const storeStaffUserIds = storeStaff
                        .map(s => s.userId?._id)
                        .filter(id => id && id.toString() !== user._id.toString());

                    storeGroup = await Chat.create({
                        type: 'group',
                        name: storeGroupName,
                        isGroupChat: true,
                        participants: [user._id, ...storeStaffUserIds],
                        createdBy: user._id,
                        isDefault: true,
                        outletId: store._id, // Specific outlet group
                        requiredPlan: user.plan?.toUpperCase() === 'PREMIUM' ? 'PREMIUM' : 'PRO'
                    });
                }
            }
        }

        // Auto-create default groups for managers and cashiers if they don't exist
        if (user.role === 'manager' || user.role === 'cashier') {
            // Find the owner for this staff member
            let owner = null;
            let ownerStores = [];
            
            if (user.activeStoreId) {
                const store = await Store.findById(user.activeStoreId);
                if (store && store.ownerId) {
                    owner = await User.findById(store.ownerId);
                    if (owner) {
                        ownerStores = await Store.find({ ownerId: owner._id, isActive: true });
                    }
                }
            }
            
            // Fallback: try shopId
            if (!owner && user.shopId) {
                owner = await User.findById(user.shopId);
                if (owner) {
                    ownerStores = await Store.find({ ownerId: owner._id, isActive: true });
                }
            }

            if (owner && ownerStores.length > 0) {
                const storeIds = ownerStores.map(s => s._id);
                const allStaff = await Staff.find({ 
                    storeId: { $in: storeIds }, 
                    active: true 
                }).populate('userId', '_id');
                
                const allStaffUserIds = allStaff
                    .map(s => s.userId?._id)
                    .filter(id => id && id.toString() !== owner._id.toString() && id.toString() !== user._id.toString());

                // Get owner's plan for requiredPlan
                const ownerPlan = owner.plan?.toUpperCase() || 'PRO';
                const requiredPlan = ownerPlan === 'PREMIUM' ? 'PREMIUM' : 'PRO';

                // 1. Create "All Outlet Staffs" group if it doesn't exist (with owner as creator)
                const defaultGroupName = 'All Outlet Staffs';
                let allOutletsGroup = await Chat.findOne({ 
                    name: defaultGroupName, 
                    type: 'group',
                    createdBy: owner._id,
                    isDefault: true,
                    outletId: null
                });

                if (!allOutletsGroup) {
                    allOutletsGroup = await Chat.create({
                        type: 'group',
                        name: defaultGroupName,
                        isGroupChat: true,
                        participants: [owner._id, user._id, ...allStaffUserIds],
                        createdBy: owner._id,
                        isDefault: true,
                        outletId: null, // All outlets group
                        requiredPlan: requiredPlan
                    });
                } else {
                    // Ensure current user is a participant
                    if (!allOutletsGroup.participants.includes(user._id)) {
                        allOutletsGroup.participants.push(user._id);
                        await allOutletsGroup.save();
                    }
                }

                // 2. Create group for the specific outlet the manager/cashier belongs to
                if (user.activeStoreId) {
                    const userStore = ownerStores.find(s => s._id.toString() === user.activeStoreId.toString());
                    if (userStore) {
                        const storeGroupName = `${userStore.name} Group`;
                        let storeGroup = await Chat.findOne({ 
                            name: storeGroupName, 
                            type: 'group',
                            createdBy: owner._id,
                            isDefault: true,
                            outletId: userStore._id
                        });

                        if (!storeGroup) {
                            // Get staff for this specific outlet
                            const storeStaff = await Staff.find({ 
                                storeId: userStore._id, 
                                active: true 
                            }).populate('userId', '_id');
                            
                            const storeStaffUserIds = storeStaff
                                .map(s => s.userId?._id)
                                .filter(id => id && id.toString() !== owner._id.toString() && id.toString() !== user._id.toString());

                            storeGroup = await Chat.create({
                                type: 'group',
                                name: storeGroupName,
                                isGroupChat: true,
                                participants: [owner._id, user._id, ...storeStaffUserIds],
                                createdBy: owner._id,
                                isDefault: true,
                                outletId: userStore._id, // Specific outlet group
                                requiredPlan: requiredPlan
                            });
                        } else {
                            // Ensure current user is a participant
                            if (!storeGroup.participants.includes(user._id)) {
                                storeGroup.participants.push(user._id);
                                await storeGroup.save();
                            }
                        }
                    }
                }
            }
        }

        // Find all chats where user is a participant - Optimized with lean and projections
        const chats = await Chat.find({ participants: req.user.id })
            .select('type name participants outletId createdBy messages lastMessageAt lastReadBy isDefault')
            .populate('participants', 'name email role profileImageUrl')
            .populate('outletId', 'name')
            .populate('createdBy', 'name')
            .lean()
            .sort({ lastMessageAt: -1 });

        // Enrich participants with Staff model data (name, outletName)
        const enrichedChats = await Promise.all(chats.map(async (chat) => {
            // Note: .lean() returns plain objects, so no need for .toObject()
            const chatObj = chat;
            const enrichedParticipants = await Promise.all((chatObj.participants || []).map(async (participant) => {
                // Check if this participant is a staff member
                const staffRecord = await Staff.findOne({ userId: participant._id, active: true })
                    .populate('storeId', 'name');
                
                if (staffRecord) {
                    // Use Staff name if available, fallback to User name
                    return {
                        ...participant,
                        name: staffRecord.name || participant.name || participant.email,
                        email: staffRecord.email || participant.email,
                        role: staffRecord.role || participant.role,
                        outletId: staffRecord.storeId?._id,
                        outletName: staffRecord.storeId?.name
                    };
                }
                // For owners or non-staff, return as is
                return {
                    ...participant,
                    name: participant.name || participant.email
                };
            }));

            const messages = Array.isArray(chat.messages) ? chat.messages : [];
            const lastMessage = messages.length > 0 
                ? messages[messages.length - 1] 
                : null;
            
            // Calculate unread count for current user
            // Handle both Map and plain object (Mongoose converts Map to object when serializing)
            let lastReadAt = null;
            if (chat.lastReadBy) {
                if (chat.lastReadBy instanceof Map) {
                    lastReadAt = chat.lastReadBy.get(req.user.id.toString()) || null;
                } else if (typeof chat.lastReadBy === 'object') {
                    lastReadAt = chat.lastReadBy[req.user.id.toString()] || null;
                }
            }
            let unreadCount = 0;
            if (lastReadAt) {
                unreadCount = messages.filter(msg => {
                    if (!msg || !msg.timestamp) return false;
                    const msgTime = new Date(msg.timestamp);
                    const readTime = new Date(lastReadAt);
                    return msgTime > readTime && msg.senderId && msg.senderId.toString() !== req.user.id.toString();
                }).length;
            } else if (messages.length > 0) {
                // If user has never read, count all messages not sent by them
                unreadCount = messages.filter(msg => 
                    msg && msg.senderId && msg.senderId.toString() !== req.user.id.toString()
                ).length;
            }
            
            return {
                ...chatObj,
                participants: enrichedParticipants,
                messages: lastMessage ? [lastMessage] : [],
                unreadCount: unreadCount
            };
        }));

        res.json({ success: true, data: enrichedChats });
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

        // Mark messages as read for this user
        if (!chat.lastReadBy) {
            chat.lastReadBy = new Map();
        }
        chat.lastReadBy.set(req.user.id.toString(), new Date());
        await chat.save();

        // Paginate messages (most recent first)
        const skip = (page - 1) * limit;
        const messages = chat.messages
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(skip, skip + parseInt(limit))
            .reverse() // Reverse to show oldest first
            .map(msg => {
                // Convert Mongoose subdocument to plain object with all fields
                const msgObj = msg.toObject ? msg.toObject() : msg;
                return {
                    _id: msgObj._id,
                    senderId: msgObj.senderId,
                    senderName: msgObj.senderName,
                    senderRole: msgObj.senderRole,
                    senderStoreName: msgObj.senderStoreName || null,
                    content: msgObj.content || '',
                    messageType: msgObj.messageType || 'text',
                    timestamp: msgObj.timestamp,
                    audioUrl: msgObj.audioUrl || null,
                    audioDuration: msgObj.audioDuration || null,
                    fileUrl: msgObj.fileUrl || null,
                    fileName: msgObj.fileName || null,
                    fileType: msgObj.fileType || null,
                    fileSize: msgObj.fileSize || null
                };
            });

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
        if (!(await checkPlan(user, 'PRO'))) {
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
 * @desc Send a message to a chat (text, voice, or file)
 * @access Private (PRO/PREMIUM)
 */
router.post('/:chatId/message', protect, (req, res, next) => {
    // Use multer.any() to accept any file field, then we'll check the fieldname in the handler
    // This avoids the issue of req.body not being available before multer processes the form
    const contentType = req.headers['content-type'] || '';
    
    if (contentType.includes('multipart/form-data')) {
        // Create a combined middleware that handles both audio and file uploads
        // We'll use multer.fields to accept both field names
        const combinedUpload = multer({
            storage: multer.diskStorage({
                destination: (req, file, cb) => {
                    // Determine destination based on fieldname
                    let uploadDir;
                    if (file.fieldname === 'audio') {
                        uploadDir = path.join(__dirname, '../uploads/audio');
                    } else if (file.fieldname === 'file') {
                        uploadDir = path.join(__dirname, '../uploads/files');
                    } else {
                        return cb(new Error('Invalid field name'), null);
                    }
                    
                    if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true });
                    }
                    cb(null, uploadDir);
                },
                filename: (req, file, cb) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    if (file.fieldname === 'audio') {
                        cb(null, `voice-${uniqueSuffix}${path.extname(file.originalname)}`);
                    } else {
                        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
                        cb(null, `file-${uniqueSuffix}-${sanitizedName}`);
                    }
                }
            }),
            limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
            fileFilter: (req, file, cb) => {
                if (file.fieldname === 'audio') {
                    const allowedMimes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/aac', 'audio/m4a'];
                    if (allowedMimes.includes(file.mimetype)) {
                        cb(null, true);
                    } else {
                        cb(new Error('Invalid file type. Only audio files are allowed.'), false);
                    }
                } else if (file.fieldname === 'file') {
                    const allowedMimes = [
                        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
                        'application/pdf',
                        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        'text/plain', 'text/csv'
                    ];
                    if (allowedMimes.includes(file.mimetype)) {
                        cb(null, true);
                    } else {
                        cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'), false);
                    }
                } else {
                    cb(new Error('Invalid field name'), false);
                }
            }
        }).fields([
            { name: 'audio', maxCount: 1 },
            { name: 'file', maxCount: 1 }
        ]);
        
        return combinedUpload(req, res, (err) => {
            if (err) {
                return res.status(400).json({ error: err.message });
            }
            // Convert req.files to req.file format for compatibility
            if (req.files) {
                if (req.files['audio'] && req.files['audio'][0]) {
                    req.file = req.files['audio'][0];
                } else if (req.files['file'] && req.files['file'][0]) {
                    req.file = req.files['file'][0];
                }
            }
            next();
        });
    } else {
        // Not multipart, must be text message
        next();
    }
}, async (req, res) => {
    try {
        const { chatId } = req.params;
        // Parse body - multer should have parsed it by now
        const { content, audioDuration, messageType, fileName, fileType, fileSize } = req.body || {};

        // Validate: must have either content, audio file, or file
        if (!content?.trim() && !req.file) {
            return res.status(400).json({ error: 'Message content, audio file, or file is required' });
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

        // Get store name for the sender
        let senderStoreName = null;
        if (user.role === 'Manager' || user.role === 'Cashier') {
            // For staff, get their assigned store
            const staffRecord = await Staff.findOne({ userId: user._id }).populate('storeId');
            if (staffRecord && staffRecord.storeId) {
                senderStoreName = staffRecord.storeId.name;
            }
        } else if (user.role === 'owner') {
            // For owner, check if chat is for a specific outlet or all outlets
            if (chat.outletId) {
                // Specific outlet chat - get the outlet name
                const outlet = await Store.findById(chat.outletId);
                if (outlet) {
                    senderStoreName = outlet.name;
                }
            }
            // If outletId is null, it's an "all outlets" chat, so don't show store name
        }

        // Build message object
        // Determine message type from file fieldname or explicit messageType
        let detectedMessageType = 'text';
        if (req.file) {
            detectedMessageType = req.file.fieldname === 'audio' ? 'audio' : 'file';
        } else if (messageType) {
            detectedMessageType = messageType;
        }
        
        const message = {
            senderId: req.user.id,
            senderName: user.name || user.email,
            senderRole: user.role,
            senderStoreName: senderStoreName,
            content: content?.trim() || '',
            messageType: detectedMessageType,
            timestamp: new Date()
        };

        // Handle audio file
        if (req.file && req.file.fieldname === 'audio') {
            message.audioUrl = `/uploads/audio/${req.file.filename}`;
            message.audioDuration = audioDuration ? parseFloat(audioDuration) : null;
            console.log('[Server] Audio message saved:', { audioUrl: message.audioUrl, audioDuration: message.audioDuration });
        }

        // Handle file upload
        if (req.file && req.file.fieldname === 'file') {
            message.fileUrl = `/uploads/files/${req.file.filename}`;
            message.fileName = fileName || req.file.originalname;
            message.fileType = fileType || req.file.mimetype;
            message.fileSize = fileSize ? parseInt(fileSize) : req.file.size;
            console.log('[Server] File message saved:', { fileUrl: message.fileUrl, fileName: message.fileName, fileType: message.fileType });
        }

        // Add message to chat
        chat.messages.push(message);
        chat.lastMessageAt = new Date();
        await chat.save();

        // Reload chat to get the saved message with all fields
        const updatedChat = await Chat.findById(chatId);
        const savedMessage = updatedChat.messages[updatedChat.messages.length - 1];
        
        // Convert Mongoose subdocument to plain object
        const savedMessageObj = savedMessage.toObject ? savedMessage.toObject() : savedMessage;
        
        // Populate sender info for response - ensure all fields are included
        const populatedMessage = {
            _id: savedMessageObj._id,
            senderId: {
                _id: user._id,
                name: user.name || user.email,
                role: user.role,
                profileImageUrl: user.profileImageUrl
            },
            senderName: savedMessageObj.senderName,
            senderRole: savedMessageObj.senderRole,
            senderStoreName: savedMessageObj.senderStoreName || null,
            content: savedMessageObj.content || '',
            messageType: savedMessageObj.messageType || 'text',
            timestamp: savedMessageObj.timestamp,
            // Include audio fields if present
            audioUrl: savedMessageObj.audioUrl || null,
            audioDuration: savedMessageObj.audioDuration || null,
            // Include file fields if present
            fileUrl: savedMessageObj.fileUrl || null,
            fileName: savedMessageObj.fileName || null,
            fileType: savedMessageObj.fileType || null,
            fileSize: savedMessageObj.fileSize || null
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
        // Clean up uploaded file if there was an error
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Failed to delete uploaded file:', unlinkError);
            }
        }
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

        if (!(await checkPlan(user, 'PRO'))) {
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
                
                // Find all active staff in these stores
                const staffList = await Staff.find({ 
                    storeId: { $in: storeIds },
                    active: true 
                }).populate('userId', 'name email role profileImageUrl').populate('storeId', 'name');

                console.log(`[Chat] Found ${staffList.length} staff for owner ${user._id} in ${storeIds.length} stores`);

                users = staffList.map(s => {
                    if (!s.userId) {
                        console.warn(`[Chat] Staff ${s._id} has no userId populated`);
                        return null;
                    }
                    return {
                        _id: s.userId._id,
                        name: s.name || s.userId.name || s.email || s.userId.email,
                        email: s.email || s.userId.email,
                        role: s.role || s.userId.role,
                        profileImageUrl: s.userId.profileImageUrl,
                        outletId: s.storeId?._id,
                        outletName: s.storeId?.name
                    };
                }).filter(u => u !== null);
            } else {
                // PRO: Get all staff (managers and cashiers) from all stores
                const stores = await Store.find({ ownerId: user._id, isActive: true });
                const storeIds = stores.map(s => s._id);
                const staffList = await Staff.find({ 
                    storeId: { $in: storeIds },
                    active: true 
                }).populate('userId', 'name email role profileImageUrl').populate('storeId', 'name');

                console.log(`[Chat] Found ${staffList.length} staff for PRO owner ${user._id} in ${storeIds.length} stores`);

                users = staffList.map(s => {
                    if (!s.userId) {
                        console.warn(`[Chat] Staff ${s._id} has no userId populated`);
                        return null;
                    }
                    return {
                        _id: s.userId._id,
                        name: s.name || s.userId.name || s.email || s.userId.email,
                        email: s.email || s.userId.email,
                        role: s.role || s.userId.role,
                        profileImageUrl: s.userId.profileImageUrl,
                        outletId: s.storeId?._id,
                        outletName: s.storeId?.name
                    };
                }).filter(u => u !== null);
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
                    active: true
                }).populate('userId', 'name email role profileImageUrl').populate('storeId', 'name');

                users.push(...otherStaff.map(s => ({
                    _id: s.userId._id,
                    name: s.name || s.userId.name || s.email || s.userId.email,
                    email: s.email || s.userId.email,
                    role: s.role,
                    profileImageUrl: s.userId.profileImageUrl,
                    outletId: s.storeId?._id,
                    outletName: s.storeId?.name
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
                    active: true
                }).populate('userId', 'name email role profileImageUrl').populate('storeId', 'name');

                users.push(...managers.map(s => ({
                    _id: s.userId._id,
                    name: s.name || s.userId.name || s.email || s.userId.email,
                    email: s.email || s.userId.email,
                    role: s.role,
                    profileImageUrl: s.userId.profileImageUrl,
                    outletId: s.storeId?._id,
                    outletName: s.storeId?.name
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

