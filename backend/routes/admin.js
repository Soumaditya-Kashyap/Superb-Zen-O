const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Scraping endpoints
router.post('/scrape/genres', adminController.scrapeGenres);
router.post('/scrape/languages', adminController.scrapeLanguages);
router.post('/scrape/genre/:genre', adminController.scrapeGenre);

// Statistics
router.get('/stats', adminController.getStats);

// Movie video management
router.post('/movies/:movieId/set-video', adminController.setMovieVideo);
router.get('/movies/:movieId/requesters', adminController.getMovieRequesters);

module.exports = router;
