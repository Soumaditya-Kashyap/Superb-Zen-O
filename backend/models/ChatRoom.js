const mongoose = require('mongoose');

/**
 * ChatRoom Schema - Stores chat room between two connected users
 * Created when a connection is accepted
 */
const chatRoomSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    }],
    connectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Connection',
        required: true,
        unique: true
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null
    },
    lastMessageAt: {
        type: Date,
        default: null
    }
}, { 
    timestamps: true 
});

// Index for efficient participant lookups
chatRoomSchema.index({ participants: 1 });
chatRoomSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
