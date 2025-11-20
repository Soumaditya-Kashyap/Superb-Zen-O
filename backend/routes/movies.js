const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');
const authMiddleware = require('../middlewares/authMiddleware');

// Search movies
router.get('/search', movieController.searchMovies);

// Get personalized movies (must be before /:id route)
router.get('/personalized', authMiddleware, movieController.getPersonalizedMovies);

// Get movie by ID
router.get('/:id', movieController.getMovieById);

// Get movies by category
router.get('/category/:category', movieController.getMoviesByCategory);

module.exports = router;
