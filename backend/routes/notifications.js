const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Get notifications with pagination
router.get('/', notificationController.getNotifications);

// Get unread count
router.get('/unread-count', notificationController.getUnreadCount);

// Movie requests
router.get('/movie-requests', notificationController.getMovieRequests);
router.post('/movie-request', notificationController.addMovieRequest);
router.delete('/movie-request/:title', notificationController.removeMovieRequest);

// Mark as read
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);

// Delete notifications
router.delete('/clear-all', notificationController.clearAll);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
