const registerController = require('./register');
const loginController = require('./login');
const userController = require('./user');
const preferencesController = require('./preferences');

module.exports = {
    register: registerController.register,
    login: loginController.login,
    getCurrentUser: userController.getCurrentUser,
    logout: userController.logout,
    getPreferences: preferencesController.getPreferences,
    updatePreferences: preferencesController.updatePreferences
};
