/**
 * Notification Senders
 * Type-specific notification helper functions
 */

const { createNotification } = require('./core');

/**
 * Friend request notification
 */
const notifyFriendRequest = async (recipientId, senderId, senderName, io = null) => {
    return createNotification({
        recipientId,
        senderId,
        type: 'FRIEND_REQ',
        message: `${senderName} sent you a friend request`,
        relatedId: senderId,
        io
    });
};

/**
 * Friend request accepted notification
 */
const notifyFriendAccepted = async (recipientId, senderId, senderName, io = null) => {
    return createNotification({
        recipientId,
        senderId,
        type: 'FRIEND_ACCEPT',
        message: `${senderName} accepted your friend request`,
        relatedId: senderId,
        io
    });
};

/**
 * Watch party invite notification
 */
const notifyWatchInvite = async (recipientId, senderId, senderName, roomId, movieTitle, io = null) => {
    return createNotification({
        recipientId,
        senderId,
        type: 'WATCH_INVITE',
        message: `${senderName} invited you to watch "${movieTitle}"`,
        relatedId: roomId,
        metadata: { movieTitle, roomId: roomId.toString() },
        io
    });
};

/**
 * Room ended notification
 */
const notifyRoomEnded = async (recipientId, senderId, hostName, roomId, movieTitle, io = null) => {
    return createNotification({
        recipientId,
        senderId,
        type: 'ROOM_ENDED',
        message: `${hostName} closed the watch party for "${movieTitle}"`,
        relatedId: roomId,
        metadata: { movieTitle },
        io
    });
};

/**
 * Movie available notification
 */
const notifyMovieAvailable = async (recipientId, movieId, movieTitle, io = null) => {
    return createNotification({
        recipientId,
        senderId: null,
        type: 'MOVIE_ALERTS',
        message: `Great news! "${movieTitle}" is now available to watch!`,
        relatedId: movieId,
        metadata: { movieTitle },
        io
    });
};

/**
 * New chat message notification
 */
const notifyMessage = async (recipientId, senderId, senderName, messagePreview, chatRoomId, io = null) => {
    return createNotification({
        recipientId,
        senderId,
        type: 'MESSAGE',
        message: `${senderName}: ${messagePreview}`,
        relatedId: chatRoomId,
        metadata: { chatRoomId: chatRoomId.toString() },
        io
    });
};

/**
 * System notification
 */
const notifySystem = async (recipientId, message, metadata = {}, io = null) => {
    return createNotification({
        recipientId,
        senderId: null,
        type: 'SYSTEM',
        message,
        metadata,
        io
    });
};

module.exports = {
    notifyFriendRequest,
    notifyFriendAccepted,
    notifyWatchInvite,
    notifyRoomEnded,
    notifyMovieAvailable,
    notifyMessage,
    notifySystem
};
