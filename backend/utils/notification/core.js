/**
 * Core Notification Creator
 * Handles creating and emitting notifications
 */

const Notification = require('../../models/Notification');
const { getCategoryFromType, getRelatedModelFromType } = require('./typeHelpers');
const { emitToUser, getSocketIO } = require('./socket');

/**
 * Create and emit a notification
 * 
 * @param {Object} options - Notification options
 * @param {String} options.recipientId - User ID who receives the notification
 * @param {String} options.senderId - User ID who triggered the notification (optional)
 * @param {String} options.type - Notification type
 * @param {String} options.message - Notification message
 * @param {String} options.relatedId - Related document ID (optional)
 * @param {Object} options.metadata - Additional data (optional)
 * @param {Object} options.io - Socket.io instance (optional)
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

        // Populate sender info
        await notification.populate('sender', 'name nickName profilePicture');
        
        // Try to populate relatedId if exists
        if (relatedId) {
            try {
                await notification.populate('relatedId');
            } catch (e) {
                // Related document might not exist
            }
        }

        // Emit socket event (use provided io or global)
        if (io) {
            io.to(`user:${recipientId}`).emit('new_notification', formatNotificationData(notification));
            console.log(`[NOTIFICATION] ✅ Sent ${type} notification to user:${recipientId}`);
        } else {
            emitToUser(recipientId, notification);
        }

        return notification;
    } catch (error) {
        console.error('[NOTIFICATION] ❌ Error creating notification:', error.message);
        throw error;
    }
};

/**
 * Format notification data for socket emission
 */
const formatNotificationData = (notification) => ({
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
});

/**
 * Create notifications for multiple recipients
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

module.exports = {
    createNotification,
    createBulkNotifications
};
