/**
 * Auth Helpers
 * Common utility functions for authentication
 */

const jwt = require('jsonwebtoken');

/**
 * Generate JWT token
 */
exports.generateToken = (userId, role) => {
    return jwt.sign(
        { id: userId, role: role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

/**
 * Set token as HTTP-only cookie
 */
exports.setTokenCookie = (res, token) => {
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
};
