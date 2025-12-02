const Movie = require('../models/movie.js');
const MovieScraper = require('../utils/movieScraper.js');

// Get hero section movies
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

// Search movies in database
exports.searchMovies = async (req, res) => {
  try {
    const { query, page = 1, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    console.log('[SEARCH] Query: "' + query + '"');

    const movies = await Movie.find({
      $or: [
        { Title: { $regex: query, $options: 'i' } },
        { Actors: { $regex: query, $options: 'i' } },
        { Director: { $regex: query, $options: 'i' } },
        { Plot: { $regex: query, $options: 'i' } }
      ]
    })
    .sort({ imdbRating: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

    const total = await Movie.countDocuments({
      $or: [
        { Title: { $regex: query, $options: 'i' } },
        { Actors: { $regex: query, $options: 'i' } },
        { Director: { $regex: query, $options: 'i' } }
      ]
    });

    console.log('[SEARCH] Found ' + movies.length + ' movies matching "' + query + '"');

    res.json({
      success: true,
      movies,
      totalResults: total,
    });

  } catch (error) {
    console.error('[SEARCH] Error:', error.message);
    res.status(500).json({ error: 'Failed to search movies' });
  }
};

// Get personalized movies based on user preferences
exports.getPersonalizedMovies = async (req, res) => {
  console.log('[PERSONALIZED] Request received');
  try {
    console.log('[PERSONALIZED] Fetching for user: ' + (req.user?.nickName || 'Unknown'));
    
    const User = require('../models/user.js');
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
    
    // Create combinations of genres and languages for personalized sections
    for (const genre of userGenres) {
      console.log('[PERSONALIZED] Fetching ' + genre + ' movies...');
      
      // Build query to match genre AND user's selected languages
      const query = {
        categories: genre.toLowerCase(),
        imdbRating: { $exists: true, $ne: 'N/A', $nin: ['', null] }
      };

      // If user has language preferences, include them in the query
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
      
      if (movies.length > 0) {
        console.log('[PERSONALIZED] Found ' + movies.length + ' ' + genre + ' movies');
        
        personalizedMovies.push({
          genre,
          displayName: genre.charAt(0).toUpperCase() + genre.slice(1),
          movies: movies,
          totalResults: movies.length,
        });
      } else {
        console.log('[PERSONALIZED] No ' + genre + ' movies found');
      }
    }

    // Also create language-specific sections
    for (const language of userLanguages) {
      console.log('[PERSONALIZED] Fetching ' + language + ' movies...');
      
      const movies = await Movie.find({
        languages: language.toLowerCase(),
        imdbRating: { $exists: true, $ne: 'N/A', $nin: ['', null] }
      })
      .sort({ imdbRating: -1, imdbVotes: -1 })
      .limit(30);
      
      if (movies.length > 0) {
        console.log('[PERSONALIZED] Found ' + movies.length + ' ' + language + ' movies');
        
        personalizedMovies.push({
          genre: language,
          displayName: language.charAt(0).toUpperCase() + language.slice(1) + ' Movies',
          movies: movies,
          totalResults: movies.length,
          isLanguageCategory: true,
        });
      } else {
        console.log('[PERSONALIZED] No ' + language + ' movies in database');
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

// Get movie details by IMDb ID
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
      const fetch = require('node-fetch');
      const OMDB_API_KEY = process.env.OMDB_API_KEY;
      const url = 'http://www.omdbapi.com/?i=' + id + '&apikey=' + OMDB_API_KEY + '&plot=full';
      const response = await fetch(url);
      const data = await response.json();

      if (data.Response === 'True') {
        console.log('[MOVIE DETAILS] Found from OMDb: ' + data.Title);
        res.json({
          success: true,
          movie: data,
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

// Get movies by category
exports.getMoviesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    console.log('[CATEGORY] Fetching ' + category + ' movies...');
    
    // Handle special "trending" category
    let query = {};
    if (category === 'trending') {
      query = { imdbRating: { $exists: true, $ne: 'N/A' } };
    } else {
      query = { categories: category.toLowerCase() };
    }
    
    const movies = await Movie.find(query)
      .sort({ imdbRating: -1, imdbVotes: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Movie.countDocuments(query);
    
    console.log('[CATEGORY] Found ' + movies.length + ' ' + category + ' movies');
    
    res.json({
      success: true,
      movies,
      totalResults: total,
      category,
      page: parseInt(page)
    });
    
  } catch (error) {
    console.error('[CATEGORY] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category movies'
    });
  }
};

// Add/Remove movie to/from favorites
exports.toggleFavorite = async (req, res) => {
  try {
    const { imdbId } = req.body;
    const userId = req.user.id;

    console.log('[FAVORITE] Toggle for user ' + userId + ', movie ' + imdbId);

    const User = require('../models/user.js');
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Initialize favorites array if it doesn't exist
    if (!user.favorites) {
      user.favorites = [];
    }

    // Check if movie is already in favorites
    const favoriteIndex = user.favorites.indexOf(imdbId);

    if (favoriteIndex > -1) {
      // Remove from favorites
      user.favorites.splice(favoriteIndex, 1);
      await user.save();
      console.log('[FAVORITE] Removed ' + imdbId + ' from favorites');
      
      return res.json({
        success: true,
        message: 'Movie removed from favorites',
        isFavorite: false,
        favorites: user.favorites
      });
    } else {
      // Add to favorites
      user.favorites.push(imdbId);
      await user.save();
      console.log('[FAVORITE] Added ' + imdbId + ' to favorites');
      
      return res.json({
        success: true,
        message: 'Movie added to favorites',
        isFavorite: true,
        favorites: user.favorites
      });
    }

  } catch (error) {
    console.error('[FAVORITE] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle favorite'
    });
  }
};

// Get user's favorite movies
exports.getFavorites = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('[FAVORITES] Fetching for user ' + userId);

    const User = require('../models/user.js');
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.favorites || user.favorites.length === 0) {
      console.log('[FAVORITES] No favorites found');
      return res.json({
        success: true,
        favorites: [],
        message: 'No favorites yet'
      });
    }

    // Fetch movie details for all favorites
    const movies = await Movie.find({ imdbID: { $in: user.favorites } });

    console.log('[FAVORITES] Found ' + movies.length + ' favorite movies');

    res.json({
      success: true,
      favorites: movies,
      totalResults: movies.length
    });

  } catch (error) {
    console.error('[FAVORITES] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch favorites'
    });
  }
};
