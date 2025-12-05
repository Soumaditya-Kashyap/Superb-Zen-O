const heroController = require('./hero');
const searchController = require('./search');
const personalizedController = require('./personalized');
const detailsController = require('./details');
const categoryController = require('./category');
const favoritesController = require('./favorites');

module.exports = {
    getHeroMovies: heroController.getHeroMovies,
    searchMovies: searchController.searchMovies,
    getPersonalizedMovies: personalizedController.getPersonalizedMovies,
    getMovieById: detailsController.getMovieById,
    getMoviesByCategory: categoryController.getMoviesByCategory,
    getMoviesByGenre: categoryController.getMoviesByGenre,
    getMoviesByLanguage: categoryController.getMoviesByLanguage,
    toggleFavorite: favoritesController.toggleFavorite,
    getFavorites: favoritesController.getFavorites
};
