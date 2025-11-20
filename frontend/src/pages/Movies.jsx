import { useState, useEffect } from 'react';
import MovieService from '../services/movieService';
import MovieCard from '../components/MovieCard';
import MovieDetails from '../components/MovieDetails';

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
    <div className="px-10 py-10 min-h-screen bg-black">
      <div className="mb-10">
        <h1 className="text-5xl font-bold text-white mb-2">Movies</h1>
        <p className="text-gray-400 text-lg">Discover and watch together with friends</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        {genres.map((genre) => (
          <button 
            key={genre.category} 
            className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 ${
              selectedGenre === genre.category 
                ? 'bg-gradient-to-r from-gold to-gold-light text-black' 
                : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
            }`}
            onClick={() => handleGenreClick(genre.category)}
          >
            {genre.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="loading-spinner"></div>
          <p className="text-white/60 mt-4">Loading movies...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {movies.length > 0 ? (
            movies.map((movie) => (
              <MovieCard key={movie.imdbID} movie={movie} onClick={handleMovieClick} />
            ))
          ) : (
            <div className="col-span-full text-center py-20">
              <p className="text-white/60 text-lg">No movies found in this category</p>
            </div>
          )}
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

export default Movies;
