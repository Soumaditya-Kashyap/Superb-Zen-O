/**
 * Movie Category Controller
 * Handles fetching movies by category, genre, and language
 */

const Movie = require('../../models/movie');

/**
 * Build sort options based on query parameter
 */
const buildSortOptions = (sortBy) => {
    switch (sortBy) {
        case 'year':
            return { Year: -1, imdbRating: -1 };
        case 'title':
            return { Title: 1 };
        case 'rating':
        default:
            return { imdbRating: -1, imdbVotes: -1 };
    }
};

/**
 * Get movies by category
 * GET /api/movies/category/:category
 */
exports.getMoviesByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const { page = 1, limit = 24, sort = 'rating' } = req.query;
        
        console.log('[CATEGORY] Fetching ' + category + ' movies...');
        
        // Handle special "trending" category
        let query = {};
        if (category === 'trending') {
            query = { imdbRating: { $exists: true, $ne: 'N/A' } };
        } else if (category === 'popular') {
            query = { imdbVotes: { $exists: true } };
        } else {
            // Search in categories array (case-insensitive)
            query = { 
                categories: { 
                    $regex: new RegExp(category, 'i') 
                } 
            };
        }
        
        const sortOptions = buildSortOptions(sort);
        
        const movies = await Movie.find(query)
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        
        const total = await Movie.countDocuments(query);
        
        console.log('[CATEGORY] Found ' + movies.length + ' ' + category + ' movies (Total: ' + total + ')');
        
        res.json({
            success: true,
            movies,
            totalResults: total,
            category,
            page: parseInt(page),
            hasMore: (page * limit) < total
        });
        
    } catch (error) {
        console.error('[CATEGORY] Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch category movies'
        });
    }
};

/**
 * Get movies by genre
 * GET /api/movies/genre/:genre
 */
exports.getMoviesByGenre = async (req, res) => {
    try {
        const { genre } = req.params;
        const { page = 1, limit = 24, sort = 'rating' } = req.query;
        
        console.log('[GENRE] Fetching ' + genre + ' movies...');
        
        // Search in Genre field (case-insensitive, partial match)
        const query = { 
            Genre: { 
                $regex: new RegExp(genre, 'i') 
            } 
        };
        
        const sortOptions = buildSortOptions(sort);
        
        const movies = await Movie.find(query)
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        
        const total = await Movie.countDocuments(query);
        
        console.log('[GENRE] Found ' + movies.length + ' ' + genre + ' movies (Total: ' + total + ')');
        
        res.json({
            success: true,
            movies,
            totalResults: total,
            genre,
            page: parseInt(page),
            hasMore: (page * limit) < total
        });
        
    } catch (error) {
        console.error('[GENRE] Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch genre movies'
        });
    }
};

/**
 * Get movies by language
 * GET /api/movies/language/:language
 */
exports.getMoviesByLanguage = async (req, res) => {
    try {
        const { language } = req.params;
        const { page = 1, limit = 24, sort = 'rating' } = req.query;
        
        console.log('[LANGUAGE] Fetching ' + language + ' movies...');
        
        // Search in Language field (case-insensitive, partial match)
        const query = { 
            Language: { 
                $regex: new RegExp(language, 'i') 
            } 
        };
        
        const sortOptions = buildSortOptions(sort);
        
        const movies = await Movie.find(query)
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        
        const total = await Movie.countDocuments(query);
        
        console.log('[LANGUAGE] Found ' + movies.length + ' ' + language + ' movies (Total: ' + total + ')');
        
        res.json({
            success: true,
            movies,
            totalResults: total,
            language,
            page: parseInt(page),
            hasMore: (page * limit) < total
        });
        
    } catch (error) {
        console.error('[LANGUAGE] Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch language movies'
        });
    }
};
