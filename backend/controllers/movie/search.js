/**
 * Movie Search Controller
 * Handles searching movies in the database
 */

const Movie = require('../../models/movie');

/**
 * Search movies in database
 * GET /api/movies/search?query=xxx
 */
exports.searchMovies = async (req, res) => {
    try {
        const { query, page = 1, limit = 20 } = req.query;

        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        console.log('[SEARCH] Query: "' + query + '"');

        const movies = await Movie.find({
            $or: [
                { Title: { $regex: query, $options: 'i' } },
                { Actors: { $regex: query, $options: 'i' } },
                { Director: { $regex: query, $options: 'i' } },
                { Plot: { $regex: query, $options: 'i' } }
            ]
        })
        .sort({ imdbRating: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

        const total = await Movie.countDocuments({
            $or: [
                { Title: { $regex: query, $options: 'i' } },
                { Actors: { $regex: query, $options: 'i' } },
                { Director: { $regex: query, $options: 'i' } }
            ]
        });

        console.log('[SEARCH] Found ' + movies.length + ' movies matching "' + query + '"');

        res.json({
            success: true,
            movies,
            totalResults: total,
        });

    } catch (error) {
        console.error('[SEARCH] Error:', error.message);
        res.status(500).json({ error: 'Failed to search movies' });
    }
};
