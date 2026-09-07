import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  ArrowLeft, 
  Star, 
  Play, 
  Clock, 
  Calendar,
  Film,
  Loader,
  Sparkles
} from 'lucide-react';
import MovieService from '../services/movieService';
import MovieDetails from '../components/MovieDetails';

const TrendingList = () => {
  const navigate = useNavigate();
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  useEffect(() => {
    const fetchTrendingMovies = async () => {
      try {
        setLoading(true);
        // Fetch trending movies - for now getting from the trending category
        const response = await MovieService.getMoviesByCategory('trending');
        if (response && response.movies) {
          // Get top 30 trending movies
          setTrendingMovies(response.movies.slice(0, 30));
        }
      } catch (error) {
        console.error('Error fetching trending movies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingMovies();
  }, []);

  const handleMovieClick = (movie) => {
    setSelectedMovie(movie.imdbID);
  };

  const handleCloseDetails = () => {
    setSelectedMovie(null);
  };

  const getRankBadgeColor = (rank) => {
    if (rank === 1) return 'from-yellow-400 to-yellow-600'; // Gold
    if (rank === 2) return 'from-gray-300 to-gray-500'; // Silver
    if (rank === 3) return 'from-amber-600 to-amber-800'; // Bronze
    return 'from-white/20 to-white/10'; // Others
  };

  const getRankTextColor = (rank) => {
    if (rank <= 3) return 'text-black';
    return 'text-white';
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-b from-black via-black/95 to-transparent backdrop-blur-xl border-b border-gold/20">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-6">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(-1)}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </motion.button>
            
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-gold/30 to-gold-light/20 rounded-xl">
                <TrendingUp className="w-8 h-8 text-gold" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Trending Now</h1>
                <p className="text-gold/80 text-sm mt-1">Top {trendingMovies.length} movies everyone is watching</p>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2 text-white/60">
              <Sparkles className="w-5 h-5 text-gold" />
              <span className="text-sm">Updated daily</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader className="w-12 h-12 text-gold animate-spin mb-4" />
            <p className="text-white/60">Loading trending movies...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {trendingMovies.map((movie, index) => {
                const rank = index + 1;
                const isHovered = hoveredIndex === index;
                
                return (
                  <motion.div
                    key={movie.imdbID}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.4 }}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() => handleMovieClick(movie)}
                    className={`relative flex items-center gap-6 p-4 rounded-2xl cursor-pointer transition-all duration-300 ${
                      isHovered 
                        ? 'bg-gradient-to-r from-gold/20 via-gold/10 to-transparent border border-gold/40 shadow-xl shadow-gold/10' 
                        : 'bg-white/5 border border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Rank Badge */}
                    <div className={`flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br ${getRankBadgeColor(rank)} flex items-center justify-center shadow-lg`}>
                      <span className={`text-2xl font-black ${getRankTextColor(rank)}`}>
                        {rank}
                      </span>
                    </div>

                    {/* Movie Poster */}
                    <div className="relative flex-shrink-0 w-20 h-28 rounded-xl overflow-hidden shadow-lg">
                      <img
                        src={movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : 'https://placehold.co/300x450/1a1a1a/666?text=No+Poster'}
                        alt={movie.Title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://placehold.co/300x450/1a1a1a/666?text=No+Poster';
                        }}
                      />
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0 bg-black/60 flex items-center justify-center"
                        >
                          <Play className="w-8 h-8 text-gold" fill="currentColor" />
                        </motion.div>
                      )}
                    </div>

                    {/* Movie Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-xl font-bold truncate transition-colors ${isHovered ? 'text-gold' : 'text-white'}`}>
                        {movie.Title}
                      </h3>
                      
                      <div className="flex items-center gap-4 mt-2 text-white/60 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span>{movie.Year}</span>
                        </div>
                        
                        {movie.Runtime && movie.Runtime !== 'N/A' && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>{movie.Runtime}</span>
                          </div>
                        )}
                        
                        {movie.Genre && (
                          <div className="flex items-center gap-1.5">
                            <Film className="w-4 h-4" />
                            <span className="truncate">{movie.Genre.split(',')[0].trim()}</span>
                          </div>
                        )}
                      </div>

                      {movie.Plot && movie.Plot !== 'N/A' && (
                        <p className="text-white/50 text-sm mt-2 line-clamp-1">
                          {movie.Plot}
                        </p>
                      )}
                    </div>

                    {/* Rating */}
                    {movie.imdbRating && movie.imdbRating !== 'N/A' && (
                      <div className="flex-shrink-0 flex flex-col items-center gap-1 px-4">
                        <div className="flex items-center gap-1.5 bg-black/50 px-4 py-2 rounded-xl border border-gold/30">
                          <Star className="w-5 h-5 text-gold fill-gold" />
                          <span className="text-xl font-bold text-white">{movie.imdbRating}</span>
                        </div>
                        <span className="text-white/40 text-xs">IMDb</span>
                      </div>
                    )}

                    {/* Hover Arrow */}
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
                      className="flex-shrink-0"
                    >
                      <div className="w-12 h-12 rounded-full bg-gold flex items-center justify-center">
                        <Play className="w-5 h-5 text-black ml-0.5" fill="currentColor" />
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Empty State */}
        {!loading && trendingMovies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <TrendingUp className="w-16 h-16 text-gold/50 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Trending Movies</h3>
            <p className="text-white/60">Check back later for trending content!</p>
          </div>
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

export default TrendingList;
