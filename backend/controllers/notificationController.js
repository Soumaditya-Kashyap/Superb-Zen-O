/**
 * Notification Controller
 * Handles API endpoints for notification management
 */

const Notification = require('../models/Notification');
const notificationService = require('../utils/notificationService');

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

/**
 * Add a movie to user's request list
 * POST /api/notifications/movie-request
 */
exports.addMovieRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const { movieTitle } = req.body;

        if (!movieTitle || typeof movieTitle !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Movie title is required'
            });
        }

        const User = require('../models/user');
        const user = await User.findByIdAndUpdate(
            userId,
            { $addToSet: { movieRequests: movieTitle.trim().toLowerCase() } },
            { new: true }
        ).select('movieRequests');

        res.json({
            success: true,
            message: `You'll be notified when "${movieTitle}" is available`,
            movieRequests: user.movieRequests
        });
    } catch (error) {
        console.error('[NOTIFICATION] Movie request error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to add movie request'
        });
    }
};

/**
 * Remove a movie from user's request list
 * DELETE /api/notifications/movie-request/:title
 */
exports.removeMovieRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const { title } = req.params;

        const User = require('../models/user');
        const user = await User.findByIdAndUpdate(
            userId,
            { $pull: { movieRequests: title.toLowerCase() } },
            { new: true }
        ).select('movieRequests');

        res.json({
            success: true,
            message: 'Movie removed from request list',
            movieRequests: user.movieRequests
        });
    } catch (error) {
        console.error('[NOTIFICATION] Remove movie request error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to remove movie request'
        });
    }
};

/**
 * Get user's movie request list
 * GET /api/notifications/movie-requests
 */
exports.getMovieRequests = async (req, res) => {
    try {
        const userId = req.user.id;
        const User = require('../models/user');
        const user = await User.findById(userId).select('movieRequests');

        res.json({
            success: true,
            movieRequests: user?.movieRequests || []
        });
    } catch (error) {
        console.error('[NOTIFICATION] Get movie requests error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get movie requests'
        });
    }
};
