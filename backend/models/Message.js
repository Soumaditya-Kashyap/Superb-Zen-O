const mongoose = require('mongoose');

/**
 * Message Schema - Stores individual chat messages
 * Text and emoji only (no media)
 */
const messageSchema = new mongoose.Schema({
    chatRoomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatRoom',
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    content: {
        type: String,
        required: true,
        maxlength: 2000 // Limit message length
    },
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }]
}, { 
    timestamps: true 
});

// Compound index for efficient message retrieval
messageSchema.index({ chatRoomId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
