/**
 * Favorites Controller
 * Handles user movie favorites
 */

const Movie = require('../../models/movie');
const User = require('../../models/user');

/**
 * Add/Remove movie to/from favorites
 * POST /api/movies/favorite
 */
exports.toggleFavorite = async (req, res) => {
    try {
        const { imdbId } = req.body;
        const userId = req.user.id;

        console.log('[FAVORITE] Toggle for user ' + userId + ', movie ' + imdbId);

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Initialize favorites array if it doesn't exist
        if (!user.favorites) {
            user.favorites = [];
        }

        // Check if movie is already in favorites
        const favoriteIndex = user.favorites.indexOf(imdbId);

        if (favoriteIndex > -1) {
            // Remove from favorites
            user.favorites.splice(favoriteIndex, 1);
            await user.save();
            console.log('[FAVORITE] Removed ' + imdbId + ' from favorites');
            
            return res.json({
                success: true,
                message: 'Movie removed from favorites',
                isFavorite: false,
                favorites: user.favorites
            });
        } else {
            // Add to favorites
            user.favorites.push(imdbId);
            await user.save();
            console.log('[FAVORITE] Added ' + imdbId + ' to favorites');
            
            return res.json({
                success: true,
                message: 'Movie added to favorites',
                isFavorite: true,
                favorites: user.favorites
            });
        }

    } catch (error) {
        console.error('[FAVORITE] Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle favorite'
        });
    }
};

/**
 * Get user's favorite movies
 * GET /api/movies/favorites
 */
exports.getFavorites = async (req, res) => {
    try {
        const userId = req.user.id;

        console.log('[FAVORITES] Fetching for user ' + userId);

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        if (!user.favorites || user.favorites.length === 0) {
            console.log('[FAVORITES] No favorites found');
            return res.json({
                success: true,
                favorites: [],
                message: 'No favorites yet'
            });
        }

        // Fetch movie details for all favorites
        const movies = await Movie.find({ imdbID: { $in: user.favorites } });

        console.log('[FAVORITES] Found ' + movies.length + ' favorite movies');

        res.json({
            success: true,
            favorites: movies,
            totalResults: movies.length
        });

    } catch (error) {
        console.error('[FAVORITES] Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch favorites'
        });
    }
};
