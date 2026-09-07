const mongoose = require('mongoose');

/**
 * Connection Schema - Stores friend/handshake requests between users
 * Status: 'pending' (request sent), 'accepted' (friends)
 */
const connectionSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        index: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted'],
        default: 'pending',
        index: true
    }
}, { 
    timestamps: true 
});

// Compound index for efficient querying
connectionSchema.index({ sender: 1, receiver: 1 }, { unique: true });
connectionSchema.index({ receiver: 1, status: 1 });

module.exports = mongoose.model('Connection', connectionSchema);
