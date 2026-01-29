// models/Chat.js
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    senderName: { type: String, required: true },
    senderRole: { type: String, required: true },
    content: { type: String, required: true, trim: true },
    timestamp: { type: Date, default: Date.now }
}, { _id: true });

const ChatSchema = new mongoose.Schema({
    // Chat type: 'direct' (one-on-one) or 'group'
    type: {
        type: String,
        enum: ['direct', 'group'],
        required: true
    },
    
    // Chat name (for groups) or null for direct chats
    name: {
        type: String,
        trim: true,
        default: null
    },
    
    // Participants: array of user IDs
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    
    // For Premium: specific outlet (null means cross-outlet/all outlets)
    // For Pro: can be null (all staff) or specific outlet
    outletId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        default: null
    },
    
    // Created by (owner/manager who created the chat)
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Messages array
    messages: [MessageSchema],
    
    // Last message timestamp for sorting
    lastMessageAt: {
        type: Date,
        default: Date.now
    },
    
    // Plan requirement: 'PRO' or 'PREMIUM'
    requiredPlan: {
        type: String,
        enum: ['PRO', 'PREMIUM'],
        required: true
    }
}, { timestamps: true });

// Indexes for efficient queries
ChatSchema.index({ participants: 1, lastMessageAt: -1 });
ChatSchema.index({ outletId: 1, lastMessageAt: -1 });
ChatSchema.index({ type: 1, outletId: 1 });

module.exports = mongoose.model('Chat', ChatSchema);

