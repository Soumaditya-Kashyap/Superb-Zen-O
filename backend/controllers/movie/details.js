/**
 * Movie Details Controller
 * Handles fetching individual movie details
 */

const Movie = require('../../models/movie');

/**
 * Get movie details by IMDb ID
 * GET /api/movies/:id
 */
exports.getMovieById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Movie ID is required' });
        }

        console.log('[MOVIE DETAILS] Fetching: ' + id);

        const movie = await Movie.findOne({ imdbID: id });

        if (movie) {
            console.log('[MOVIE DETAILS] Found: ' + movie.Title);
            console.log('[MOVIE DETAILS] Video available: ' + (movie.videoFolderName ? 'Yes (' + movie.videoFolderName + ')' : 'No'));
            res.json({
                success: true,
                movie,
            });
        } else {
            console.log('[MOVIE DETAILS] Not in database, fetching from OMDb API...');
            
            // Fallback to OMDb API if not in database
            const omdbMovie = await fetchFromOMDb(id);
            
            if (omdbMovie) {
                res.json({
                    success: true,
                    movie: omdbMovie,
                });
            } else {
                console.log('[MOVIE DETAILS] Movie not found anywhere');
                res.status(404).json({
                    success: false,
                    error: 'Movie not found',
                });
            }
        }

    } catch (error) {
        console.error('[MOVIE DETAILS] Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch movie details' });
    }
};

/**
 * Fetch movie from OMDb API
 */
async function fetchFromOMDb(imdbId) {
    try {
        const fetch = require('node-fetch');
        const OMDB_API_KEY = process.env.OMDB_API_KEY;
        const url = 'http://www.omdbapi.com/?i=' + imdbId + '&apikey=' + OMDB_API_KEY + '&plot=full';
        const response = await fetch(url);
        const data = await response.json();

        if (data.Response === 'True') {
            console.log('[MOVIE DETAILS] Found from OMDb: ' + data.Title);
            return data;
        }
        return null;
    } catch (error) {
        console.error('[MOVIE DETAILS] OMDb API error:', error.message);
        return null;
    }
}
