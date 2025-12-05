/**
 * User Controller
 * Handles getting current user and logout
 */

const User = require('../../models/user');

/**
 * Get current user
 * GET /api/auth/me
 */
exports.getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: "User not found" 
            });
        }

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                nickName: user.nickName,
                phone: user.phone,
                role: user.role,
                profilePicture: user.profilePicture,
                createdAt: user.createdAt,
                preferences: user.preferences || { languages: [], genres: [] }
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        return res.status(500).json({ 
            success: false,
            message: "Error fetching user data",
            error: error.message 
        });
    }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
exports.logout = async (req, res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });

        res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });

    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({ 
            success: false,
            message: "Error logging out",
            error: error.message 
        });
    }
};
