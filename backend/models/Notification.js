const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        default: null // null for system notifications
    },
    type: {
        type: String,
        enum: [
            'FRIEND_REQ',      // Friend request received
            'FRIEND_ACCEPT',   // Friend request accepted
            'WATCH_INVITE',    // Watch party invitation
            'ROOM_ENDED',      // Watch room closed by host
            'MOVIE_ALERTS',    // Requested movie is now available
            'MESSAGE',         // New chat message
            'SYSTEM'           // System announcements
        ],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    // Dynamic reference - can point to different collections based on type
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'relatedModel'
    },
    // Specifies which model relatedId refers to
    relatedModel: {
        type: String,
        enum: ['user', 'Movie', 'WatchRoom', 'ChatRoom', null],
        default: null
    },
    // Additional metadata that might be useful
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    // For grouping/filtering
    category: {
        type: String,
        enum: ['social', 'watch_party', 'movies', 'chat', 'system'],
        default: 'system'
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });

// Auto-delete old notifications after 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Virtual to get time ago
notificationSchema.virtual('timeAgo').get(function() {
    const seconds = Math.floor((new Date() - this.createdAt) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return this.createdAt.toLocaleDateString();
});

// Ensure virtuals are included in JSON
notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

// Static method to get unread count for a user
notificationSchema.statics.getUnreadCount = async function(userId) {
    return this.countDocuments({ recipient: userId, isRead: false });
};

// Static method to mark all as read for a user
notificationSchema.statics.markAllAsRead = async function(userId) {
    return this.updateMany(
        { recipient: userId, isRead: false },
        { $set: { isRead: true } }
    );
};

// Static method to get notifications with pagination
notificationSchema.statics.getForUser = async function(userId, options = {}) {
    const { page = 1, limit = 20, unreadOnly = false, type = null } = options;
    
    const query = { recipient: userId };
    if (unreadOnly) query.isRead = false;
    if (type) query.type = type;
    
    const notifications = await this.find(query)
        .populate('sender', 'name nickName profilePicture')
        .populate('relatedId')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
    
    const total = await this.countDocuments(query);
    const unreadCount = await this.countDocuments({ recipient: userId, isRead: false });
    
    return {
        notifications,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasMore: page * limit < total
        },
        unreadCount
    };
};

module.exports = mongoose.model('Notification', notificationSchema);
