/**
 * Notification Socket Manager
 * Handles Socket.io instance and emission
 */

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
 * Get the Socket.io instance
 */
const getSocketIO = () => ioInstance;

/**
 * Emit notification to a user
 */
const emitToUser = (userId, notification) => {
    if (!ioInstance) {
        console.log('[NOTIFICATION] ⚠️ Socket.io not available, notification saved but not pushed');
        return false;
    }

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

    ioInstance.to(`user:${userId}`).emit('new_notification', notificationData);
    console.log(`[NOTIFICATION] ✅ Sent ${notification.type} notification to user:${userId}`);
    return true;
};

module.exports = {
    setSocketIO,
    getSocketIO,
    emitToUser
};
