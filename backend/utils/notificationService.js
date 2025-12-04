/**
 * Notification Utility Service
 * 
 * This utility provides functions to create and emit notifications
 * that can be called from any controller in the application.
 */

const Notification = require('../models/Notification');

// Store io instance globally
let ioInstance = null;

/**
 * Set the Socket.io instance
 * Call this once when the server starts
 */
const setSocketIO = (io) => {
    ioInstance = io;
    console.log('[NOTIFICATION] Socket.io instance registered');
};

/**
 * Get category based on notification type
 */
const getCategoryFromType = (type) => {
    const categoryMap = {
        'FRIEND_REQ': 'social',
        'FRIEND_ACCEPT': 'social',
        'WATCH_INVITE': 'watch_party',
        'ROOM_ENDED': 'watch_party',
        'MOVIE_ALERTS': 'movies',
        'MESSAGE': 'chat',
        'SYSTEM': 'system'
    };
    return categoryMap[type] || 'system';
};

/**
 * Get related model based on notification type
 */
const getRelatedModelFromType = (type) => {
    const modelMap = {
        'FRIEND_REQ': 'user',
        'FRIEND_ACCEPT': 'user',
        'WATCH_INVITE': 'WatchRoom',
        'ROOM_ENDED': 'WatchRoom',
        'MOVIE_ALERTS': 'Movie',
        'MESSAGE': 'ChatRoom',
        'SYSTEM': null
    };
    return modelMap[type] || null;
};

/**
 * Create and emit a notification
 * 
 * @param {Object} options - Notification options
 * @param {String} options.recipientId - User ID who receives the notification
 * @param {String} options.senderId - User ID who triggered the notification (optional)
 * @param {String} options.type - Notification type (FRIEND_REQ, FRIEND_ACCEPT, etc.)
 * @param {String} options.message - Notification message
 * @param {String} options.relatedId - Related document ID (optional)
 * @param {Object} options.metadata - Additional data (optional)
 * @param {Object} options.io - Socket.io instance (optional, uses global if not provided)
 * @returns {Object} Created notification
 */
const createNotification = async ({
    recipientId,
    senderId = null,
    type,
    message,
    relatedId = null,
    metadata = {},
    io = null
}) => {
    try {
        // Use provided io or global instance
        const socketIO = io || ioInstance;
        
        // Create notification in database
        const notification = await Notification.create({
            recipient: recipientId,
            sender: senderId,
            type,
            message,
            relatedId,
            relatedModel: getRelatedModelFromType(type),
            metadata,
            category: getCategoryFromType(type),
            isRead: false
        });

        // Populate sender info for socket emission
        await notification.populate('sender', 'name nickName profilePicture');
        
        // If relatedId exists, try to populate it
        if (relatedId) {
            try {
                await notification.populate('relatedId');
            } catch (e) {
                // Related document might not exist, that's okay
            }
        }

        // Emit socket event to recipient
        if (socketIO) {
            const notificationData = {
                _id: notification._id,
                type: notification.type,
                message: notification.message,
                sender: notification.sender,
                relatedId: notification.relatedId,
                metadata: notification.metadata,
                category: notification.category,
                isRead: notification.isRead,
                createdAt: notification.createdAt,
                timeAgo: notification.timeAgo
            };

            // Emit to user's personal room
            socketIO.to(`user:${recipientId}`).emit('new_notification', notificationData);
            
            console.log(`[NOTIFICATION] ✅ Sent ${type} notification to user:${recipientId}`);
        } else {
            console.log('[NOTIFICATION] ⚠️ Socket.io not available, notification saved but not pushed');
        }

        return notification;
    } catch (error) {
        console.error('[NOTIFICATION] ❌ Error creating notification:', error.message);
        throw error;
    }
};

/**
 * Create notifications for multiple recipients
 * 
 * @param {Array<String>} recipientIds - Array of user IDs
 * @param {Object} options - Same as createNotification options (except recipientId)
 * @returns {Array} Created notifications
 */
const createBulkNotifications = async (recipientIds, options) => {
    const notifications = [];
    
    for (const recipientId of recipientIds) {
        try {
            const notification = await createNotification({
                ...options,
                recipientId
            });
            notifications.push(notification);
        } catch (error) {
            console.error(`[NOTIFICATION] Failed to notify user ${recipientId}:`, error.message);
        }
    }
    
    return notifications;
};

/**
 * Notification type-specific helper functions
 */

// Friend request notification
const notifyFriendRequest = async (recipientId, senderId, senderName, io = null) => {
    return createNotification({
        recipientId,
        senderId,
        type: 'FRIEND_REQ',
        message: `${senderName} sent you a friend request`,
        relatedId: senderId,
        io
    });
};

// Friend request accepted notification
const notifyFriendAccepted = async (recipientId, senderId, senderName, io = null) => {
    return createNotification({
        recipientId,
        senderId,
        type: 'FRIEND_ACCEPT',
        message: `${senderName} accepted your friend request`,
        relatedId: senderId,
        io
    });
};

// Watch party invite notification
const notifyWatchInvite = async (recipientId, senderId, senderName, roomId, movieTitle, io = null) => {
    return createNotification({
        recipientId,
        senderId,
        type: 'WATCH_INVITE',
        message: `${senderName} invited you to watch "${movieTitle}"`,
        relatedId: roomId,
        metadata: { movieTitle, roomId: roomId.toString() },
        io
    });
};

// Room ended notification
const notifyRoomEnded = async (recipientId, senderId, hostName, roomId, movieTitle, io = null) => {
    return createNotification({
        recipientId,
        senderId,
        type: 'ROOM_ENDED',
        message: `${hostName} closed the watch party for "${movieTitle}"`,
        relatedId: roomId,
        metadata: { movieTitle },
        io
    });
};

// Movie available notification
const notifyMovieAvailable = async (recipientId, movieId, movieTitle, io = null) => {
    return createNotification({
        recipientId,
        senderId: null,
        type: 'MOVIE_ALERTS',
        message: `Great news! "${movieTitle}" is now available to watch!`,
        relatedId: movieId,
        metadata: { movieTitle },
        io
    });
};

// New chat message notification
const notifyMessage = async (recipientId, senderId, senderName, messagePreview, chatRoomId, io = null) => {
    return createNotification({
        recipientId,
        senderId,
        type: 'MESSAGE',
        message: `${senderName}: ${messagePreview}`,
        relatedId: chatRoomId,
        metadata: { chatRoomId: chatRoomId.toString() },
        io
    });
};

// System notification
const notifySystem = async (recipientId, message, metadata = {}, io = null) => {
    return createNotification({
        recipientId,
        senderId: null,
        type: 'SYSTEM',
        message,
        metadata,
        io
    });
};

/**
 * Get unread notification count for a user
 */
const getUnreadCount = async (userId) => {
    return Notification.getUnreadCount(userId);
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId, userId) => {
    return Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { $set: { isRead: true } },
        { new: true }
    );
};

/**
 * Mark all notifications as read for a user
 */
const markAllAsRead = async (userId) => {
    return Notification.markAllAsRead(userId);
};

/**
 * Delete a notification
 */
const deleteNotification = async (notificationId, userId) => {
    return Notification.findOneAndDelete({
        _id: notificationId,
        recipient: userId
    });
};

/**
 * Clear all notifications for a user
 */
const clearAllNotifications = async (userId) => {
    return Notification.deleteMany({ recipient: userId });
};

module.exports = {
    setSocketIO,
    createNotification,
    createBulkNotifications,
    notifyFriendRequest,
    notifyFriendAccepted,
    notifyWatchInvite,
    notifyRoomEnded,
    notifyMovieAvailable,
    notifyMessage,
    notifySystem,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
};
