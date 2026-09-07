const {
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
} = require('./notification');

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
