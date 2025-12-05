const usersController = require('./users');
const handshakeController = require('./handshake');
const friendsController = require('./friends');
const messagesController = require('./messages');

module.exports = {
    searchUsers: usersController.searchUsers,
    sendHandshake: handshakeController.sendHandshake,
    acceptHandshake: handshakeController.acceptHandshake,
    rejectHandshake: handshakeController.rejectHandshake,
    getPendingHandshakes: handshakeController.getPendingHandshakes,
    getFriends: friendsController.getFriends,
    getMessages: messagesController.getMessages,
    sendMessage: messagesController.sendMessage,
    getOrCreateChatRoom: messagesController.getOrCreateChatRoom
};
