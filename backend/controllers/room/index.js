const createController = require('./create');
const historyController = require('./history');
const actionsController = require('./actions');
const queriesController = require('./queries');

module.exports = {
    createRoom: createController.createRoom,
    getRoomHistory: historyController.getRoomHistory,
    joinRoom: actionsController.joinRoom,
    leaveRoom: actionsController.leaveRoom,
    endRoom: actionsController.endRoom,
    getRoom: queriesController.getRoom,
    getAvailableMovies: queriesController.getAvailableMovies,
    getActiveRoom: queriesController.getActiveRoom
};
