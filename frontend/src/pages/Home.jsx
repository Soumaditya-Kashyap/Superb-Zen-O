import { useState, useEffect } from 'react';
import { Play, Users } from 'lucide-react';
import MovieService from '../services/movieService';
import MovieCard from '../components/MovieCard';
import MovieDetails from '../components/MovieDetails';

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
    <div className="min-h-screen bg-black">
      {/* Hero Banner */}
      <div 
        className="relative h-[70vh] bg-cover bg-center"
        style={{ backgroundImage: `url(${featuredContent.image})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent">
          <div className="absolute bottom-0 left-0 right-0 px-10 pb-16">
            <h1 className="text-7xl font-bold text-white mb-3">{featuredContent.title}</h1>
            <p className="text-gold-light text-xl mb-2">{featuredContent.description}</p>
            <p className="text-gray-300 text-lg max-w-2xl mb-8">{featuredContent.tagline}</p>
            <div className="flex gap-4">
              <button className="px-8 py-3.5 bg-gradient-to-r from-gold to-gold-light text-black font-bold rounded-lg hover:scale-105 transition-transform flex items-center gap-2">
                <Play size={20} fill="currentColor" /> Browse Movies
              </button>
              <button className="px-8 py-3.5 glass-effect text-white font-semibold rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2">
                <Users size={20} /> Create Room
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="px-10 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="loading-spinner"></div>
            <p className="text-white/60 mt-4">Loading movies...</p>
          </div>
        ) : (
          movieCategories.map((category, idx) => (
            <div key={idx} className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-6">{category.title}</h2>
              <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gold/30 scrollbar-track-transparent">
                {category.movies && category.movies.length > 0 ? (
                  category.movies.map((movie) => (
                    <div key={movie.imdbID} className="flex-none w-[220px]">
                      <MovieCard 
                        movie={movie} 
                        onClick={handleMovieClick}
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-white/60">No movies available</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

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
