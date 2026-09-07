const jwt = require('jsonwebtoken');

// Main authentication middleware
const authMiddleware = (req, res, next) => {
    try {
        // Check for token in cookies first, then Authorization header
        let token = req.cookies?.token;
        
        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: "Access denied. Please login to continue." 
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                message: "Session expired. Please login again." 
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                message: "Invalid token. Please login again." 
            });
        }

        return res.status(500).json({ 
            success: false,
            message: "Authentication error",
            error: error.message 
        });
    }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
    try {
        let token = req.cookies?.token;
        
        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        }
        
        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
};

// Admin-only middleware
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ 
            success: false,
            message: "Access denied. Admin privileges required." 
        });
    }
};

module.exports = authMiddleware;
module.exports.optionalAuth = optionalAuth;
module.exports.adminOnly = adminOnly;
