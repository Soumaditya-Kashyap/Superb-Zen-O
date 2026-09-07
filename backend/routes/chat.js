const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middlewares/authMiddleware');

// All chat routes require authentication
router.use(authMiddleware);

// User search
router.get('/users/search', chatController.searchUsers);

// Handshake (friend request) routes
router.post('/handshake/send', chatController.sendHandshake);
router.post('/handshake/accept', chatController.acceptHandshake);
router.delete('/handshake/:connectionId', chatController.rejectHandshake);
router.get('/handshake/pending', chatController.getPendingHandshakes);

// Friends list
router.get('/friends', chatController.getFriends);

// Chat room routes
router.post('/room', chatController.getOrCreateChatRoom);

// Messages
router.get('/messages/:chatRoomId', chatController.getMessages);
router.post('/messages', chatController.sendMessage);

module.exports = router;
