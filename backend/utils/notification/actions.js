/**
 * Notification Actions
 * Database operations for notifications
 */

const Notification = require('../../models/Notification');

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
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
};
