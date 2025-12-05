/**
 * Personalized Movies Controller
 * Handles fetching personalized movie recommendations based on user preferences
 */

const Movie = require('../../models/movie');
const User = require('../../models/user');

/**
 * Get personalized movies based on user preferences
 * GET /api/movies/personalized
 */
exports.getPersonalizedMovies = async (req, res) => {
    console.log('[PERSONALIZED] Request received');
    try {
        console.log('[PERSONALIZED] Fetching for user: ' + (req.user?.nickName || 'Unknown'));
        
        const user = await User.findById(req.user.id);
        
        if (!user || !user.preferences || !user.preferences.genres || user.preferences.genres.length === 0) {
            console.log('[PERSONALIZED] No preferences found, returning empty');
            return res.json({
                success: true,
                message: 'No preferences set',
                userName: user?.nickName || 'User',
                userPreferences: { languages: [], genres: [] },
                personalizedMovies: [],
            });
        }

        console.log('[PERSONALIZED] User preferences - Languages: ' + user.preferences.languages.join(', ') + ', Genres: ' + user.preferences.genres.join(', '));

        const personalizedMovies = [];
        const userLanguages = user.preferences.languages || [];
        const userGenres = user.preferences.genres || [];
        
        // Fetch genre-based movies
        for (const genre of userGenres) {
            const movies = await fetchMoviesByGenre(genre, userLanguages);
            if (movies.length > 0) {
                personalizedMovies.push({
                    genre,
                    displayName: genre.charAt(0).toUpperCase() + genre.slice(1),
                    movies: movies,
                    totalResults: movies.length,
                });
            }
        }

        // Fetch language-based movies
        for (const language of userLanguages) {
            const movies = await fetchMoviesByLanguage(language);
            if (movies.length > 0) {
                personalizedMovies.push({
                    genre: language,
                    displayName: language.charAt(0).toUpperCase() + language.slice(1) + ' Movies',
                    movies: movies,
                    totalResults: movies.length,
                    isLanguageCategory: true,
                });
            }
        }

        console.log('[PERSONALIZED] Returning ' + personalizedMovies.length + ' categories for ' + user.nickName);

        res.json({
            success: true,
            userName: user.nickName,
            userPreferences: {
                languages: user.preferences.languages,
                genres: user.preferences.genres,
            },
            personalizedMovies,
            totalCategories: personalizedMovies.length,
        });

    } catch (error) {
        console.error('[PERSONALIZED] Error:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch personalized movies' 
        });
    }
};

/**
 * Fetch movies by genre with optional language filter
 */
async function fetchMoviesByGenre(genre, userLanguages) {
    console.log('[PERSONALIZED] Fetching ' + genre + ' movies...');
    
    const query = {
        categories: genre.toLowerCase(),
        imdbRating: { $exists: true, $ne: 'N/A', $nin: ['', null] }
    };

    if (userLanguages.length > 0) {
        query.$or = [
            { languages: { $in: userLanguages.map(lang => lang.toLowerCase()) } },
            { languages: { $exists: false } },
            { languages: { $size: 0 } }
        ];
    }
    
    const movies = await Movie.find(query)
        .sort({ imdbRating: -1, imdbVotes: -1 })
        .limit(30);
    
    console.log('[PERSONALIZED] Found ' + movies.length + ' ' + genre + ' movies');
    return movies;
}

/**
 * Fetch movies by language
 */
async function fetchMoviesByLanguage(language) {
    console.log('[PERSONALIZED] Fetching ' + language + ' movies...');
    
    const movies = await Movie.find({
        languages: language.toLowerCase(),
        imdbRating: { $exists: true, $ne: 'N/A', $nin: ['', null] }
    })
    .sort({ imdbRating: -1, imdbVotes: -1 })
    .limit(30);
    
    console.log('[PERSONALIZED] Found ' + movies.length + ' ' + language + ' movies');
    return movies;
}
