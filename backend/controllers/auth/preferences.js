/**
 * Preferences Controller
 * Handles user preferences (languages, genres)
 */

const User = require('../../models/user');

/**
 * Get user preferences
 * GET /api/auth/preferences
 */
exports.getPreferences = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('[AUTH] Fetching preferences for user: ' + userId);

        const user = await User.findById(userId);

        if (!user) {
            console.log('[AUTH] User not found');
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        
        console.log('[AUTH] Preferences found for ' + user.nickName);

        res.status(200).json({
            success: true,
            preferences: user.preferences || { languages: [], genres: [] }
        });

    } catch (error) {
        console.error('[AUTH] Get preferences error:', error.message);
        return res.status(500).json({
            success: false,
            message: "Error fetching preferences",
            error: error.message
        });
    }
};

/**
 * Update user preferences
 * PUT /api/auth/preferences
 */
exports.updatePreferences = async (req, res) => {
    try {
        const { languages, genres } = req.body;
        const userId = req.user.id;

        const user = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    'preferences.languages': languages || [],
                    'preferences.genres': genres || []
                }
            },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Preferences updated successfully",
            preferences: user.preferences
        });

    } catch (error) {
        console.error('Update preferences error:', error);
        return res.status(500).json({
            success: false,
            message: "Error updating preferences",
            error: error.message
        });
    }
};
