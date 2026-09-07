/**
 * Movie Requests Controller
 * Handles user movie request list (notify when available)
 */

const User = require('../../models/user');

/**
 * Add a movie to user's request list
 * POST /api/notifications/movie-request
 */
exports.addMovieRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const { movieTitle } = req.body;

        if (!movieTitle || typeof movieTitle !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Movie title is required'
            });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $addToSet: { movieRequests: movieTitle.trim().toLowerCase() } },
            { new: true }
        ).select('movieRequests');

        res.json({
            success: true,
            message: `You'll be notified when "${movieTitle}" is available`,
            movieRequests: user.movieRequests
        });
    } catch (error) {
        console.error('[NOTIFICATION] Movie request error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to add movie request'
        });
    }
};

/**
 * Remove a movie from user's request list
 * DELETE /api/notifications/movie-request/:title
 */
exports.removeMovieRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const { title } = req.params;

        const user = await User.findByIdAndUpdate(
            userId,
            { $pull: { movieRequests: title.toLowerCase() } },
            { new: true }
        ).select('movieRequests');

        res.json({
            success: true,
            message: 'Movie removed from request list',
            movieRequests: user.movieRequests
        });
    } catch (error) {
        console.error('[NOTIFICATION] Remove movie request error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to remove movie request'
        });
    }
};

/**
 * Get user's movie request list
 * GET /api/notifications/movie-requests
 */
exports.getMovieRequests = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('movieRequests');

        res.json({
            success: true,
            movieRequests: user?.movieRequests || []
        });
    } catch (error) {
        console.error('[NOTIFICATION] Get movie requests error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get movie requests'
        });
    }
};
