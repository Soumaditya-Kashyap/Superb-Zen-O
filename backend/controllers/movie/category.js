/**
 * Movie Category Controller
 * Handles fetching movies by category
 */

const Movie = require('../../models/movie');

/**
 * Get movies by category
 * GET /api/movies/category/:category
 */
exports.getMoviesByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const { page = 1, limit = 20 } = req.query;
        
        console.log('[CATEGORY] Fetching ' + category + ' movies...');
        
        // Handle special "trending" category
        let query = {};
        if (category === 'trending') {
            query = { imdbRating: { $exists: true, $ne: 'N/A' } };
        } else {
            query = { categories: category.toLowerCase() };
        }
        
        const movies = await Movie.find(query)
            .sort({ imdbRating: -1, imdbVotes: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        
        const total = await Movie.countDocuments(query);
        
        console.log('[CATEGORY] Found ' + movies.length + ' ' + category + ' movies');
        
        res.json({
            success: true,
            movies,
            totalResults: total,
            category,
            page: parseInt(page)
        });
        
    } catch (error) {
        console.error('[CATEGORY] Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch category movies'
        });
    }
};
