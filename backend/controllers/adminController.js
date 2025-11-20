const Movie = require('../models/movie.js');
const MovieScraper = require('../utils/movieScraper.js');

// Scrape all genres
exports.scrapeGenres = async (req, res) => {
  try {
    console.log('\n🚀 ADMIN: Starting genre scraping...\n');
    const results = await MovieScraper.scrapeAllGenres(12);
    
    res.json({
      success: true,
      message: 'Genre scraping completed',
      results
    });
  } catch (error) {
    console.error('❌ Genre scraping error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scrape genres'
    });
  }
};

// Scrape all languages
exports.scrapeLanguages = async (req, res) => {
  try {
    console.log('\n🚀 ADMIN: Starting language scraping...\n');
    const results = await MovieScraper.scrapeAllLanguages(15);
    
    res.json({
      success: true,
      message: 'Language scraping completed',
      results
    });
  } catch (error) {
    console.error('❌ Language scraping error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scrape languages'
    });
  }
};

// Scrape specific genre
exports.scrapeGenre = async (req, res) => {
  try {
    const { genre } = req.params;
    const { moviesPerTerm = 12 } = req.body;
    
    console.log(`\n🚀 ADMIN: Scraping ${genre}...\n`);
    const count = await MovieScraper.scrapeGenre(genre, moviesPerTerm);
    
    res.json({
      success: true,
      message: `Scraped ${genre} successfully`,
      count
    });
  } catch (error) {
    console.error(`❌ Error scraping ${req.params.genre}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to scrape genre'
    });
  }
};

// Get database statistics
exports.getStats = async (req, res) => {
  try {
    const totalMovies = await Movie.countDocuments();
    const byCategory = await Movie.aggregate([
      { $unwind: '$categories' },
      { $group: { _id: '$categories', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const byLanguage = await Movie.aggregate([
      { $unwind: '$languages' },
      { $group: { _id: '$languages', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      success: true,
      stats: {
        totalMovies,
        byCategory,
        byLanguage
      }
    });
  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats'
    });
  }
};
