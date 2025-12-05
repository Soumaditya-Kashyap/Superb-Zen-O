/**
 * Hero Movies Controller
 * Handles hero section movies for the homepage
 */

const Movie = require('../../models/movie');

/**
 * Get hero section movies
 * GET /api/movies/hero
 */
exports.getHeroMovies = async (req, res) => {
    try {
        console.log('[HERO] Fetching hero section movies...');
        
        const heroMovies = await Movie.find({ isHero: true })
            .sort({ heroOrder: 1 })
            .limit(10);
        
        if (heroMovies.length === 0) {
            console.log('[HERO] No hero movies found in database');
            return res.json({
                success: true,
                heroMovies: [],
                message: 'No hero movies configured'
            });
        }
        
        // Format hero movies for frontend
        const formattedHeroMovies = heroMovies.map((movie, index) => ({
            id: movie._id,
            imdbID: movie.imdbID,
            title: movie.Title,
            subtitle: movie.heroSubtitle || movie.Plot?.substring(0, 50) + '...' || 'Watch Now',
            description: movie.heroDescription || movie.Plot || 'Experience this amazing movie',
            image: movie.Poster,
            tags: movie.heroTags?.length > 0 
                ? movie.heroTags 
                : [movie.Runtime || '2h', movie.Genre?.split(',')[0] || 'Movie', movie.Type || 'Movie', movie.Year || '2024', movie.Rated || '13+'].filter(Boolean),
            rating: movie.imdbRating,
            year: movie.Year,
            genre: movie.Genre,
            runtime: movie.Runtime,
            videoFolderName: movie.videoFolderName || null
        }));
        
        console.log('[HERO] Found ' + formattedHeroMovies.length + ' hero movies');
        
        res.json({
            success: true,
            heroMovies: formattedHeroMovies,
            total: formattedHeroMovies.length
        });
        
    } catch (error) {
        console.error('[HERO] Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch hero movies'
        });
    }
};
