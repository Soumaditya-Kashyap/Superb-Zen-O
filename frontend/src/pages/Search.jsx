import { useState, useEffect } from 'react';
import { AiOutlineSearch } from 'react-icons/ai';
import MovieService from '../services/movieService';
import MovieCard from '../components/MovieCard';
import MovieDetails from '../components/MovieDetails';
import './Search.css';

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      try {
        setLoading(true);
        setHasSearched(true);
        const response = await MovieService.searchMovies(searchQuery);
        
        if (response.success) {
          setSearchResults(response.movies || []);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleMovieClick = (movie) => {
    setSelectedMovie(movie.imdbID);
  };

  const handleCloseDetails = () => {
    setSelectedMovie(null);
  };

  return (
    <div className="search-page">
      <div className="search-header">
        <h1>Search</h1>
        <div className="search-bar">
          <AiOutlineSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search for movies, TV shows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Searching...</p>
        </div>
      )}

      {!loading && hasSearched && searchQuery && (
        <div className="search-results">
          <h2>Results for "{searchQuery}" ({searchResults.length})</h2>
          {searchResults.length > 0 ? (
            <div className="results-grid">
              {searchResults.map((movie) => (
                <MovieCard 
                  key={movie.imdbID} 
                  movie={movie} 
                  onClick={handleMovieClick}
                />
              ))}
            </div>
          ) : (
            <div className="no-results">
              <p>No movies or shows found for "{searchQuery}"</p>
              <p className="suggestion">Try different keywords or check your spelling</p>
            </div>
          )}
        </div>
      )}

      {!searchQuery && !hasSearched && (
        <div className="search-placeholder">
          <AiOutlineSearch size={80} />
          <p>Start typing to search movies and TV shows</p>
          <p className="search-hint">Try searching for "Avengers", "Batman", or "Star Wars"</p>
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

export default Search;
