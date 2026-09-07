const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_LINK || 'http://localhost:5000';

const getApiBaseUrl = () => {
  let url = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_LINK || API_URL;
  url = url.replace(/\/$/, ''); // Remove trailing slash
  if (!url.endsWith('/api')) {
    url += '/api';
  }
  return url;
};
const API_BASE_URL = getApiBaseUrl();

class MovieService {
  // Get hero section movies
  static async getHeroMovies() {
    try {
      console.log('🎬 MovieService: Fetching hero movies...');
      const response = await fetch(`${API_BASE_URL}/movies/hero`);
      
      if (!response.ok) {
        console.error('❌ Hero movies API error:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 MovieService: Hero movies response:', data);
      return data;
    } catch (error) {
      console.error('❌ Error fetching hero movies:', error);
      return { success: false, heroMovies: [] };
    }
  }

  // Search movies
  static async searchMovies(query, page = 1, type = '') {
    try {
      const typeParam = type ? `&type=${type}` : '';
      const response = await fetch(
        `${API_BASE_URL}/movies/search?query=${encodeURIComponent(query)}&page=${page}${typeParam}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error searching movies:', error);
      throw error;
    }
  }

  // Get movie details by IMDb ID
  static async getMovieDetails(imdbId) {
    try {
      const response = await fetch(`${API_BASE_URL}/movies/${imdbId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching movie details:', error);
      throw error;
    }
  }

  // Get movies by category
  static async getMoviesByCategory(category, page = 1) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/movies/category/${category}?page=${page}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching category movies:', error);
      throw error;
    }
  }

  // Get multiple categories at once (for homepage)
  static async getHomePageMovies() {
    try {
      const [trending, popular, action] = await Promise.all([
        this.getMoviesByCategory('trending'),
        this.getMoviesByCategory('popular'),
        this.getMoviesByCategory('action'),
      ]);

      return {
        trending: trending.movies || [],
        popular: popular.movies || [],
        action: action.movies || [],
      };
    } catch (error) {
      console.error('Error fetching homepage movies:', error);
      throw error;
    }
  }
}

export default MovieService;