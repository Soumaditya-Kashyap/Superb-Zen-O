const queriesController = require('./queries');
const actionsController = require('./actions');
const movieRequestsController = require('./movieRequests');

module.exports = {
    getNotifications: queriesController.getNotifications,
    getUnreadCount: queriesController.getUnreadCount,
    markAsRead: actionsController.markAsRead,
    markAllAsRead: actionsController.markAllAsRead,
    deleteNotification: actionsController.deleteNotification,
    clearAll: actionsController.clearAll,
    addMovieRequest: movieRequestsController.addMovieRequest,
    removeMovieRequest: movieRequestsController.removeMovieRequest,
    getMovieRequests: movieRequestsController.getMovieRequests
};
