import { useState, useEffect } from 'react';
import MovieService from '../services/movieService';
import MovieCard from '../components/MovieCard';
import MovieDetails from '../components/MovieDetails';
import './Movies.css';

const Movies = () => {
  const genres = [
    { name: 'All', category: 'popular' },
    { name: 'Action', category: 'action' },
    { name: 'Comedy', category: 'comedy' },
    { name: 'Drama', category: 'drama' },
    { name: 'Horror', category: 'horror' },
    { name: 'Sci-Fi', category: 'scifi' },
    { name: 'Romance', category: 'romance' },
    { name: 'Thriller', category: 'thriller' },
  ];
  
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState('popular');
  const [selectedMovie, setSelectedMovie] = useState(null);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        const response = await MovieService.getMoviesByCategory(selectedGenre);
        setMovies(response.movies || []);
      } catch (error) {
        console.error('Error fetching movies:', error);
        setMovies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, [selectedGenre]);

  const handleGenreClick = (category) => {
    setSelectedGenre(category);
  };

  const handleMovieClick = (movie) => {
    setSelectedMovie(movie.imdbID);
  };

  const handleCloseDetails = () => {
    setSelectedMovie(null);
  };

  return (
    <div className="movies-page">
      <div className="page-header">
        <h1>Movies</h1>
        <p>Discover and watch together with friends</p>
      </div>

      <div className="genre-filters">
        {genres.map((genre) => (
          <button 
            key={genre.category} 
            className={`genre-chip ${selectedGenre === genre.category ? 'active' : ''}`}
            onClick={() => handleGenreClick(genre.category)}
          >
            {genre.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading movies...</p>
        </div>
      ) : (
        <div className="movies-grid">
          {movies.length > 0 ? (
            movies.map((movie) => (
              <div key={movie.imdbID} className="movie-grid-card-wrapper">
                <MovieCard movie={movie} onClick={handleMovieClick} />
              </div>
            ))
          ) : (
            <div className="no-movies">
              <p>No movies found in this category</p>
            </div>
          )}
        </div>
      )}

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

export default Movies;
