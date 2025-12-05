/**
 * Notification Type Helpers
 * Maps notification types to categories and related models
 */

const TYPE_CATEGORY_MAP = {
    'FRIEND_REQ': 'social',
    'FRIEND_ACCEPT': 'social',
    'WATCH_INVITE': 'watch_party',
    'ROOM_ENDED': 'watch_party',
    'MOVIE_ALERTS': 'movies',
    'MESSAGE': 'chat',
    'SYSTEM': 'system'
};

const TYPE_MODEL_MAP = {
    'FRIEND_REQ': 'user',
    'FRIEND_ACCEPT': 'user',
    'WATCH_INVITE': 'WatchRoom',
    'ROOM_ENDED': 'WatchRoom',
    'MOVIE_ALERTS': 'Movie',
    'MESSAGE': 'ChatRoom',
    'SYSTEM': null
};

/**
 * Get category based on notification type
 */
const getCategoryFromType = (type) => {
    return TYPE_CATEGORY_MAP[type] || 'system';
};

/**
 * Get related model based on notification type
 */
const getRelatedModelFromType = (type) => {
    return TYPE_MODEL_MAP[type] || null;
};

module.exports = {
    getCategoryFromType,
    getRelatedModelFromType
};
