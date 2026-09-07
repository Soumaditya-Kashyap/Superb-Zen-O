/**
 * Notification Actions Controller
 * Handles marking as read, deleting, and clearing notifications
 */

const notificationService = require('../../utils/notificationService');

/**
 * Mark a single notification as read
 * PATCH /api/notifications/:id/read
 */
exports.markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const notification = await notificationService.markAsRead(id, userId);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({
            success: true,
            notification
        });
    } catch (error) {
        console.error('[NOTIFICATION] Mark read error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read'
        });
    }
};

/**
 * Mark all notifications as read
 * PATCH /api/notifications/read-all
 */
exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await notificationService.markAllAsRead(userId);

        res.json({
            success: true,
            message: 'All notifications marked as read',
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('[NOTIFICATION] Mark all read error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all as read'
        });
    }
};

/**
 * Delete a single notification
 * DELETE /api/notifications/:id
 */
exports.deleteNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const notification = await notificationService.deleteNotification(id, userId);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({
            success: true,
            message: 'Notification deleted'
        });
    } catch (error) {
        console.error('[NOTIFICATION] Delete error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification'
        });
    }
};

/**
 * Clear all notifications
 * DELETE /api/notifications/clear-all
 */
exports.clearAll = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await notificationService.clearAllNotifications(userId);

        res.json({
            success: true,
            message: 'All notifications cleared',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('[NOTIFICATION] Clear all error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to clear notifications'
        });
    }
};
