const scrapingController = require('./scraping');
const statsController = require('./stats');
const movieVideoController = require('./movieVideo');

module.exports = {
    scrapeGenres: scrapingController.scrapeGenres,
    scrapeLanguages: scrapingController.scrapeLanguages,
    scrapeGenre: scrapingController.scrapeGenre,
    getStats: statsController.getStats,
    setMovieVideo: movieVideoController.setMovieVideo,
    getMovieRequesters: movieVideoController.getMovieRequesters
};
