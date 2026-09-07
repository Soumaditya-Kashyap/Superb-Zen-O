const express = require('express');
const router = express.Router();
const { register, login, logout, getCurrentUser, getPreferences, updatePreferences } = require('../controllers/authController.js');
const authMiddleware = require('../middlewares/authMiddleware.js');


// @route   POST /api/auth/register
// @desc    Register a user
// @access  Public
router.post("/register", register);

// @route   POST /api/auth/login
// @desc    Login a user
// @access  Public
router.post('/login', login);

// @route   POST /api/auth/logout
// @desc    Logout a user
// @access  Private
router.post('/logout', authMiddleware, logout);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authMiddleware, getCurrentUser);

// @route   GET /api/user/preferences
// @desc    Get user preferences
// @access  Private
router.get('/user/preferences', authMiddleware, getPreferences);

// @route   POST /api/user/preferences
// @desc    Update user preferences
// @access  Private
router.post('/user/preferences', authMiddleware, updatePreferences);



module.exports = router;

