const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');
const authMiddleware = require('../middlewares/authMiddleware');

// Hero section movies (public route - no auth required)
router.get('/hero', movieController.getHeroMovies);

// Search movies
router.get('/search', movieController.searchMovies);

// Get personalized movies (must be before /:id route)
router.get('/personalized', authMiddleware, movieController.getPersonalizedMovies);

// Favorites
router.post('/favorite', authMiddleware, movieController.toggleFavorite);
router.get('/favorites/list', authMiddleware, movieController.getFavorites);

// Get movies by genre (must be before /:id route)
router.get('/genre/:genre', movieController.getMoviesByGenre);

// Get movies by language (must be before /:id route)
router.get('/language/:language', movieController.getMoviesByLanguage);

// Get movies by category (must be before /:id route)
router.get('/category/:category', movieController.getMoviesByCategory);

// Get movie by ID (this should be last as it's a catch-all pattern)
router.get('/:id', movieController.getMovieById);

module.exports = router;
