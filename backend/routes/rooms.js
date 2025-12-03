const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const authMiddleware = require('../middlewares/authMiddleware');

// All room routes require authentication
router.use(authMiddleware);

// Get available movies for Watch Together (with video)
router.get('/movies/available', roomController.getAvailableMovies);

// Get user's active room (if any)
router.get('/active', roomController.getActiveRoom);

// Get room history
router.get('/history', roomController.getRoomHistory);

// Create a new room
router.post('/create', roomController.createRoom);

// Join a room via invite code
router.post('/join/:inviteCode', roomController.joinRoom);

// Get a specific room by ID or invite code
router.get('/:identifier', roomController.getRoom);

// Leave a room
router.post('/:roomId/leave', roomController.leaveRoom);

// End a room (host only)
router.post('/:roomId/end', roomController.endRoom);

module.exports = router;
