import { useState, useEffect } from 'react';
import { AiOutlineSearch } from 'react-icons/ai';
import MovieService from '../services/movieService';
import MovieCard from '../components/MovieCard';
import MovieDetails from '../components/MovieDetails';

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
    <div className="px-10 py-10 min-h-screen bg-black">
      <div className="mb-10">
        <h1 className="text-5xl font-bold text-white mb-6">Search</h1>
        <div className="relative max-w-3xl">
          <AiOutlineSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40" size={24} />
          <input
            type="text"
            placeholder="Search for movies, TV shows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-16 pr-6 py-4 glass-effect text-white text-lg placeholder:text-white/40 rounded-xl border border-white/10 focus:border-gold focus:outline-none transition-colors"
          />
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="loading-spinner"></div>
          <p className="text-white/60 mt-4">Searching...</p>
        </div>
      )}

      {!loading && hasSearched && searchQuery && (
        <div>
          <h2 className="text-2xl font-semibold text-white mb-6">
            Results for <span className="text-gold">"{searchQuery}"</span> ({searchResults.length})
          </h2>
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {searchResults.map((movie) => (
                <MovieCard 
                  key={movie.imdbID} 
                  movie={movie} 
                  onClick={handleMovieClick}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-white/70 text-lg mb-2">No movies or shows found for "{searchQuery}"</p>
              <p className="text-white/40">Try different keywords or check your spelling</p>
            </div>
          )}
        </div>
      )}

      {!searchQuery && !hasSearched && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AiOutlineSearch size={80} className="text-white/20 mb-6" />
          <p className="text-white/60 text-xl mb-2">Start typing to search movies and TV shows</p>
          <p className="text-white/40">Try searching for "Avengers", "Batman", or "Star Wars"</p>
        </div>
      )}

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
