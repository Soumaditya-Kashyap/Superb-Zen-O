const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

/**
 * WatchRoom Schema - Stores watch party rooms for Watch Together feature
 * Separate from ChatRoom to avoid conflicts with 1-on-1 chat functionality
 */
const watchRoomSchema = new mongoose.Schema({
    // Room name (auto-generated or custom)
    name: {
        type: String,
        default: function() {
            return `Watch Party ${nanoid(6)}`;
        }
    },
    
    // Host who created the room
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        index: true
    },
    
    // Movie being watched
    movie: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Movie',
        required: true
    },
    
    // All participants (invited friends)
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }],
    
    // Track everyone who actually joined (even if they leave)
    attendees: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        leftAt: {
            type: Date,
            default: null
        }
    }],
    
    // Room status
    status: {
        type: String,
        enum: ['active', 'ended'],
        default: 'active',
        index: true
    },
    
    // Timing
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date,
        default: null
    },
    
    // Unique invite link code
    inviteCode: {
        type: String,
        unique: true,
        default: () => nanoid(10)
    },
    
    // Video sync state
    videoState: {
        currentTime: {
            type: Number,
            default: 0
        },
        isPlaying: {
            type: Boolean,
            default: false
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user'
        }
    },
    
    // Chat messages for this watch room (embedded for simplicity)
    messages: [{
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user'
        },
        content: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { 
    timestamps: true 
});

// Indexes for efficient queries
watchRoomSchema.index({ host: 1, status: 1 });
watchRoomSchema.index({ participants: 1, status: 1 });
watchRoomSchema.index({ inviteCode: 1 });
watchRoomSchema.index({ createdAt: -1 });

// Virtual for invite link URL
watchRoomSchema.virtual('inviteLink').get(function() {
    return `/watch-together/join/${this.inviteCode}`;
});

// Ensure virtuals are included in JSON
watchRoomSchema.set('toJSON', { virtuals: true });
watchRoomSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('WatchRoom', watchRoomSchema);
