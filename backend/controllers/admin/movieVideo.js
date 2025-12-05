/**
 * Movie Video Controller
 * Handles setting video folders and notifying users
 */

const Movie = require('../../models/movie');
const User = require('../../models/user');
const { notifyMovieAvailable } = require('../../utils/notificationService');

/**
 * Set video folder for a movie and notify users who requested it
 * POST /api/admin/movies/:movieId/set-video
 */
exports.setMovieVideo = async (req, res) => {
    try {
        const { movieId } = req.params;
        const { videoFolderName } = req.body;

        if (!videoFolderName) {
            return res.status(400).json({
                success: false,
                error: 'videoFolderName is required'
            });
        }

        // Find and update the movie
        const movie = await Movie.findById(movieId);
        if (!movie) {
            return res.status(404).json({
                success: false,
                error: 'Movie not found'
            });
        }

        const wasAlreadyAvailable = !!movie.videoFolderName;
        movie.videoFolderName = videoFolderName;
        await movie.save();

        let notifiedUsers = 0;

        // Only notify if movie wasn't previously available
        if (!wasAlreadyAvailable) {
            notifiedUsers = await notifyUsersAboutMovie(movie);
        }

        res.json({
            success: true,
            message: `Movie "${movie.Title}" is now available for streaming`,
            movie: {
                _id: movie._id,
                Title: movie.Title,
                videoFolderName: movie.videoFolderName
            },
            notifiedUsers
        });
    } catch (error) {
        console.error('❌ Set movie video error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to set movie video'
        });
    }
};

/**
 * Get all users who requested a specific movie
 * GET /api/admin/movies/:movieId/requesters
 */
exports.getMovieRequesters = async (req, res) => {
    try {
        const { movieId } = req.params;
        
        const movie = await Movie.findById(movieId).select('Title');
        if (!movie) {
            return res.status(404).json({
                success: false,
                error: 'Movie not found'
            });
        }

        const movieTitleLower = movie.Title.toLowerCase();
        
        const users = await User.find({
            $or: [
                { movieRequests: movieTitleLower },
                { movieRequests: { $regex: new RegExp(movieTitleLower, 'i') } }
            ]
        }).select('name email nickName movieRequests');

        res.json({
            success: true,
            movie: movie.Title,
            requesters: users,
            count: users.length
        });
    } catch (error) {
        console.error('❌ Get movie requesters error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get movie requesters'
        });
    }
};

/**
 * Utility function to notify users who requested a movie
 * @param {Object} movie - The movie document
 * @returns {Number} Number of users notified
 */
async function notifyUsersAboutMovie(movie) {
    try {
        const movieTitleLower = movie.Title.toLowerCase();
        
        // Find all users who have this movie in their requests
        const usersToNotify = await User.find({
            movieRequests: {
                $elemMatch: {
                    $regex: new RegExp(movieTitleLower.split(' ').join('.*'), 'i')
                }
            }
        }).select('_id movieRequests');

        // Also check for exact match
        const exactMatchUsers = await User.find({
            movieRequests: movieTitleLower
        }).select('_id movieRequests');

        // Combine and dedupe users
        const userIds = new Set();
        [...usersToNotify, ...exactMatchUsers].forEach(u => userIds.add(u._id.toString()));

        let notifiedCount = 0;

        for (const userId of userIds) {
            try {
                await notifyMovieAvailable(userId, movie._id, movie.Title);
                
                // Remove the movie from user's request list
                await User.findByIdAndUpdate(userId, {
                    $pull: { movieRequests: { $regex: new RegExp(movieTitleLower, 'i') } }
                });
                
                notifiedCount++;
            } catch (err) {
                console.error(`Failed to notify user ${userId}:`, err.message);
            }
        }

        console.log(`[ADMIN] ✅ Notified ${notifiedCount} users about "${movie.Title}"`);
        return notifiedCount;
    } catch (error) {
        console.error('[ADMIN] Error notifying users about movie:', error);
        return 0;
    }
}
