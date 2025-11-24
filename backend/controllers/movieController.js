const Movie = require('../models/movie.js');
const MovieScraper = require('../utils/movieScraper.js');

// Search movies in database
exports.searchMovies = async (req, res) => {
  try {
    const { query, page = 1, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    console.log(`🔍 Searching database for: "${query}"`);

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

    console.log(`✅ Found ${movies.length} movies matching "${query}"`);

    res.json({
      success: true,
      movies,
      totalResults: total,
    });

  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ error: 'Failed to search movies' });
  }
};

// Get personalized movies based on user preferences
exports.getPersonalizedMovies = async (req, res) => {
  console.log('🚀 PERSONALIZED ROUTE HIT - Request received');
  try {
    console.log('🎬 Fetching personalized movies for user:', req.user?.nickName || 'Unknown');
    
    const User = require('../models/user.js');
    const user = await User.findById(req.user.id);
    
    if (!user || !user.preferences || !user.preferences.genres || user.preferences.genres.length === 0) {
      console.log('⚠️  No preferences found, returning empty');
      return res.json({
        success: true,
        message: 'No preferences set',
        userName: user?.nickName || 'User',
        userPreferences: { languages: [], genres: [] },
        personalizedMovies: [],
      });
    }

    console.log('✅ User preferences:', {
      languages: user.preferences.languages,
      genres: user.preferences.genres,
    });

    const personalizedMovies = [];
    const userLanguages = user.preferences.languages || [];
    const userGenres = user.preferences.genres || [];
    
    // Create combinations of genres and languages for personalized sections
    for (const genre of userGenres) {
      console.log(`📽️  Fetching ${genre} movies from database...`);
      
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
        console.log(`✅ Found ${movies.length} ${genre} movies (filtered by languages: ${userLanguages.join(', ')})`);
        
        personalizedMovies.push({
          genre,
          displayName: genre.charAt(0).toUpperCase() + genre.slice(1),
          movies: movies,
          totalResults: movies.length,
        });
      } else {
        console.log(`⚠️  No ${genre} movies found with languages: ${userLanguages.join(', ')}`);
      }
    }

    // Also create language-specific sections
    for (const language of userLanguages) {
      console.log(`🌐 Fetching ${language} movies from database...`);
      
      const movies = await Movie.find({
        languages: language.toLowerCase(),
        imdbRating: { $exists: true, $ne: 'N/A', $nin: ['', null] }
      })
      .sort({ imdbRating: -1, imdbVotes: -1 })
      .limit(30);
      
      if (movies.length > 0) {
        console.log(`✅ Found ${movies.length} ${language} movies`);
        
        personalizedMovies.push({
          genre: language,
          displayName: `${language.charAt(0).toUpperCase() + language.slice(1)} Movies`,
          movies: movies,
          totalResults: movies.length,
          isLanguageCategory: true,
        });
      } else {
        console.log(`⚠️  No ${language} movies in database yet`);
      }
    }

    console.log(`🎉 Returning ${personalizedMovies.length} personalized categories for ${user.nickName}`);

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
    console.error('❌ Personalized movies error:', error);
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

    console.log(`📽️  Fetching movie details for: ${id}`);

    const movie = await Movie.findOne({ imdbID: id });

    if (movie) {
      console.log(`✅ Found movie: ${movie.Title}`);
      res.json({
        success: true,
        movie,
      });
    } else {
      console.log(`⚠️  Movie not found in database, fetching from OMDb...`);
      
      // Fallback to OMDb API if not in database
      const fetch = require('node-fetch');
      const OMDB_API_KEY = process.env.OMDB_API_KEY;
      const url = `http://www.omdbapi.com/?i=${id}&apikey=${OMDB_API_KEY}&plot=full`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.Response === 'True') {
        res.json({
          success: true,
          movie: data,
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Movie not found',
        });
      }
    }

  } catch (error) {
    console.error('❌ Movie details error:', error);
    res.status(500).json({ error: 'Failed to fetch movie details' });
  }
};

// Get movies by category
exports.getMoviesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    console.log(`📽️  Fetching ${category} movies from database...`);
    
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
    
    console.log(`✅ Found ${movies.length} ${category} movies`);
    
    res.json({
      success: true,
      movies,
      totalResults: total,
      category,
      page: parseInt(page)
    });
    
  } catch (error) {
    console.error(`❌ Error fetching ${req.params.category}:`, error);
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

    console.log(`💖 Toggling favorite for user ${userId}, movie ${imdbId}`);

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
      console.log(`✅ Removed ${imdbId} from favorites`);
      
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
      console.log(`✅ Added ${imdbId} to favorites`);
      
      return res.json({
        success: true,
        message: 'Movie added to favorites',
        isFavorite: true,
        favorites: user.favorites
      });
    }

  } catch (error) {
    console.error('❌ Toggle favorite error:', error);
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

    console.log(`💖 Fetching favorites for user ${userId}`);

    const User = require('../models/user.js');
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.favorites || user.favorites.length === 0) {
      return res.json({
        success: true,
        favorites: [],
        message: 'No favorites yet'
      });
    }

    // Fetch movie details for all favorites
    const movies = await Movie.find({ imdbID: { $in: user.favorites } });

    console.log(`✅ Found ${movies.length} favorite movies`);

    res.json({
      success: true,
      favorites: movies,
      totalResults: movies.length
    });

  } catch (error) {
    console.error('❌ Get favorites error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch favorites'
    });
  }
};
