/**
 * Notification Queries Controller
 * Handles fetching notifications and unread count
 */

const Notification = require('../../models/Notification');
const notificationService = require('../../utils/notificationService');

/**
 * Get notifications for the current user
 * GET /api/notifications
 */
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, unreadOnly = false, type = null } = req.query;

        console.log('[NOTIFICATION] Fetching notifications for user:', userId);

        const result = await Notification.getForUser(userId, {
            page: parseInt(page),
            limit: parseInt(limit),
            unreadOnly: unreadOnly === 'true',
            type: type || null
        });

        console.log('[NOTIFICATION] Found', result.notifications.length, 'notifications, unread:', result.unreadCount);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('[NOTIFICATION] Get error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications'
        });
    }
};

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('[NOTIFICATION] Getting unread count for user:', userId);
        
        const count = await notificationService.getUnreadCount(userId);
        console.log('[NOTIFICATION] Unread count:', count);

        res.json({
            success: true,
            unreadCount: count
        });
    } catch (error) {
        console.error('[NOTIFICATION] Count error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get unread count'
        });
    }
};
