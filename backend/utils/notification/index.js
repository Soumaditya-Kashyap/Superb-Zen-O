const { setSocketIO } = require('./socket');
const { createNotification, createBulkNotifications } = require('./core');
const {
    notifyFriendRequest,
    notifyFriendAccepted,
    notifyWatchInvite,
    notifyRoomEnded,
    notifyMovieAvailable,
    notifyMessage,
    notifySystem
} = require('./senders');
const {
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
} = require('./actions');

module.exports = {
    setSocketIO,
    createNotification,
    createBulkNotifications,
    notifyFriendRequest,
    notifyFriendAccepted,
    notifyWatchInvite,
    notifyRoomEnded,
    notifyMovieAvailable,
    notifyMessage,
    notifySystem,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
};
