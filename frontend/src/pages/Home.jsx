import { useState, useEffect } from 'react';
import MovieService from '../services/movieService';
import MovieCard from '../components/MovieCard';
import MovieDetails from '../components/MovieDetails';
import './Home.css';

const Home = () => {
  const [movieCategories, setMovieCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [featuredContent] = useState({
    title: "Watch Together",
    description: "2025 • Stream & Connect",
    tagline: "Experience movies with friends in real-time. Synchronized playback, video calls, and live chat.",
    image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&h=600&fit=crop"
  });

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        const [trending, popular, action] = await Promise.all([
          MovieService.getMoviesByCategory('trending'),
          MovieService.getMoviesByCategory('popular'),
          MovieService.getMoviesByCategory('action'),
        ]);

        setMovieCategories([
          { title: 'Trending Now', movies: trending.movies || [] },
          { title: 'Popular Movies', movies: popular.movies || [] },
          { title: 'Action & Adventure', movies: action.movies || [] },
        ]);
      } catch (error) {
        console.error('Error fetching movies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  const handleMovieClick = (movie) => {
    setSelectedMovie(movie.imdbID);
  };

  const handleCloseDetails = () => {
    setSelectedMovie(null);
  };

  return (
    <div className="home">
      {/* Hero Banner */}
      <div className="hero-banner" style={{ backgroundImage: `url(${featuredContent.image})` }}>
        <div className="hero-overlay">
          <div className="hero-content">
            <h1 className="hero-title">{featuredContent.title}</h1>
            <p className="hero-meta">{featuredContent.description}</p>
            <p className="hero-description">{featuredContent.tagline}</p>
            <div className="hero-buttons">
              <button className="btn-primary">
                <span>▶</span> Browse Movies
              </button>
              <button className="btn-secondary">
                <span>👥</span> Create Room
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="content-sections">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading movies...</p>
          </div>
        ) : (
          movieCategories.map((category, idx) => (
            <div key={idx} className="content-section">
              <h2 className="section-title">{category.title}</h2>
              <div className="movies-scroll">
                {category.movies && category.movies.length > 0 ? (
                  category.movies.map((movie) => (
                    <MovieCard 
                      key={movie.imdbID} 
                      movie={movie} 
                      onClick={handleMovieClick}
                    />
                  ))
                ) : (
                  <p className="no-movies">No movies available</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Movie Details Modal */}
      {selectedMovie && (
        <MovieDetails 
          imdbId={selectedMovie} 
          onClose={handleCloseDetails}
        />
      )}
    </div>
  );
};

export default Home;
