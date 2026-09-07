/**
 * User Controller
 * Handles getting current user and logout
 */

const User = require('../../models/user');
const imagekit = require('../../utils/imagekit');

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


/**
 *  user profile picture upload
 * POST /api/auth/upload-profile-picture
 */
exports.uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                message: "No file uploaded" 
            });
        }

        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: "User not found" 
            });
        }

        const uploadResult = await imagekit.upload({
            file: req.file.buffer,
            fileName: `profile_${user._id}_${Date.now()}.jpg`,
            folder: "/profile_pictures/"
        });

        user.profilePicture = uploadResult.url;
        await user.save();

        res.status(200).json({
            success: true,
            profilePicture: user.profilePicture
        });

    } catch (error) {
        console.error('Profile picture upload error:', error);
        return res.status(500).json({ 
            success: false,
            message: "Error uploading profile picture",
            error: error.message 
        });
    }
};




