const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI, {
  dbName: process.env.DB_NAME || 'superb',
})
  .then(() => {
    console.log('1. MongoDB Atlas connected successfully');
    console.log('2. Database:', mongoose.connection.db.databaseName);
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// OMDb API Key
const OMDB_API_KEY = process.env.OMDB_API_KEY;

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Search movies endpoint
app.get('/api/movies/search', async (req, res) => {
  try {
    const { query, page = 1, type = '' } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const typeParam = type ? `&type=${type}` : '';
    const url = `https://www.omdbapi.com/?s=${encodeURIComponent(query)}&page=${page}${typeParam}&apikey=${OMDB_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.Response === 'True') {
      res.json({
        success: true,
        movies: data.Search,
        totalResults: data.totalResults,
      });
    } else {
      res.json({
        success: false,
        error: data.Error,
        movies: [],
        totalResults: 0,
      });
    }
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search movies' });
  }
});

// Get movie details by IMDb ID
app.get('/api/movies/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Movie ID is required' });
    }

    const url = `https://www.omdbapi.com/?i=${id}&apikey=${OMDB_API_KEY}`;

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
        error: data.Error,
      });
    }
  } catch (error) {
    console.error('Movie details error:', error);
    res.status(500).json({ error: 'Failed to fetch movie details' });
  }
});

// Get trending/popular movies (predefined searches)
app.get('/api/movies/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1 } = req.query;

    // Map categories to search queries
    const categoryMap = {
      trending: 'avengers',
      popular: 'star wars',
      action: 'action',
      comedy: 'comedy',
      drama: 'drama',
      horror: 'horror',
      scifi: 'science fiction',
      romance: 'romance',
      thriller: 'thriller',
      animation: 'animation',
    };

    const searchQuery = categoryMap[category] || 'movie';
    const url = `https://www.omdbapi.com/?s=${encodeURIComponent(searchQuery)}&page=${page}&apikey=${OMDB_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.Response === 'True') {
      res.json({
        success: true,
        movies: data.Search,
        totalResults: data.totalResults,
        category,
      });
    } else {
      res.json({
        success: false,
        error: data.Error,
        movies: [],
      });
    }
  } catch (error) {
    console.error('Category error:', error);
    res.status(500).json({ error: 'Failed to fetch category movies' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`3. Server running on http://localhost:${PORT}`);
  console.log(`4. API endpoints available at http://localhost:${PORT}/api`);
});

module.exports = app;
