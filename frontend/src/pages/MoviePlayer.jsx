import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import TopNavbar from '../components/TopNavbar';
import { 
  ArrowLeft, 
  Heart,
  Users,
  Download,
  Share2,
  Star,
  Clock,
  Film,
  PlayCircle,
  AlertTriangle
} from 'lucide-react';
import MovieService from '../services/movieService';
import MovieCard from '../components/MovieCard';
import HLSVideoPlayer from '../components/HLSVideoPlayer';

// CloudFront base URL from environment variable
const CLOUDFRONT_BASE_URL = import.meta.env.VITE_CLOUDFRONT_BASE_URL || 'https://d2k6afcpy0ja0m.cloudfront.net';

const MoviePlayer = () => {
  const { imdbId } = useParams();
  const navigate = useNavigate();
  
  const [movie, setMovie] = useState(null);
  const [relatedMovies, setRelatedMovies] = useState([]);
  const [filteredRelatedMovies, setFilteredRelatedMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSaved, setIsSaved] = useState(false);
  const [currentFilter, setCurrentFilter] = useState('All Media');

  // Check if movie has HLS streaming available and construct URL
  const streamUrl = useMemo(() => {
    if (movie?.videoFolderName) {
      const url = `${CLOUDFRONT_BASE_URL}/${movie.videoFolderName}/master.m3u8`;
      console.log('🎬 Stream URL constructed:', url);
      return url;
    }
    console.log('⚠️ No videoFolderName available for this movie');
    return null;
  }, [movie?.videoFolderName]);

  const isVideoAvailable = !!streamUrl;

  useEffect(() => {
    const fetchMovieData = async () => {
      try {
        setLoading(true);
        
        // Hero movie fallback data for movies not in database
        const heroMovieFallbacks = {
          'tt1234567': {
            Title: 'Roi Roi Binale',
            Year: '2025',
            Rated: '13+',
            Runtime: '2h 15min',
            Genre: 'Action, Thriller',
            Director: 'N/A',
            Actors: 'N/A',
            Plot: 'An action-packed thriller that keeps you on the edge of your seat. Experience the ultimate showdown in this high-octane adventure.',
            Language: 'Bengali',
            Country: 'India',
            Poster: '/images/movie-posters/roiroibinale.png',
            imdbRating: 'N/A',
            imdbID: 'tt1234567',
            categories: ['action', 'thriller']
          }
        };

        // If it's a known hero movie, use fallback immediately
        if (heroMovieFallbacks[imdbId]) {
          console.log('Using fallback data for hero movie:', imdbId);
          setMovie(heroMovieFallbacks[imdbId]);
          setLoading(false);
          return;
        }
        
        // Fetch movie details with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        try {
          const response = await MovieService.getMovieDetails(imdbId);
          clearTimeout(timeoutId);
          console.log('Movie response:', response);
          
          // Handle both {success: true, movie: {...}} and direct movie object
          let movieData = response.success ? response.movie : response;
          
          if (movieData) {
            setMovie(movieData);
            console.log('Movie data set:', movieData);

            // Fetch related movies based on genre or categories
            let primaryGenre = null;
            
            // Try to get genre from Genre field
            if (movieData.Genre && movieData.Genre !== 'N/A') {
              const genres = movieData.Genre.split(',').map(g => g.trim());
              primaryGenre = genres[0].toLowerCase();
            }
            // Or from categories array (database movies)
            else if (movieData.categories && movieData.categories.length > 0) {
              primaryGenre = movieData.categories[0].toLowerCase();
            }
            
            if (primaryGenre) {
              console.log('Fetching related movies for genre:', primaryGenre);
              const relatedData = await MovieService.getMoviesByCategory(primaryGenre);
              // Filter out current movie and limit to 9 movies
              const filtered = (relatedData.movies || [])
                .filter(m => m.imdbID !== imdbId)
                .slice(0, 9);
              console.log('Related movies found:', filtered.length);
              setRelatedMovies(filtered);
            } else {
              // Fallback: get trending movies as suggestions
              console.log('No genre found, fetching trending movies');
              const trendingData = await MovieService.getMoviesByCategory('trending');
              const filtered = (trendingData.movies || [])
                .filter(m => m.imdbID !== imdbId)
                .slice(0, 9);
              setRelatedMovies(filtered);
            }
          }
        } catch (fetchError) {
          console.error('Fetch error, using fallback if available:', fetchError);
          if (heroMovieFallbacks[imdbId]) {
            setMovie(heroMovieFallbacks[imdbId]);
          }
        }
      } catch (error) {
        console.error('Error fetching movie data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (imdbId) {
      fetchMovieData();
    }
  }, [imdbId]);

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/auth');
        return;
      }

      const response = await fetch('window.API_BASE_URL/movies/favorite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imdbId }),
      });

      if (response.ok) {
        setIsSaved(!isSaved);
      }
    } catch (error) {
      console.error('Error saving movie:', error);
    }
  };

  const handleWatchTogether = () => {
    // TODO: Implement watch together functionality
    alert('Watch Together feature coming soon!');
  };

  const handleDownload = () => {
    // TODO: Implement download functionality
    alert('Download feature coming soon!');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: movie?.Title,
        text: `Watch ${movie?.Title} on Superb!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  // Handle filter change for related movies
  const handleFilterChange = (filter) => {
    setCurrentFilter(filter);
    
    if (filter === 'All Media') {
      setFilteredRelatedMovies(relatedMovies);
      return;
    }

    const filterLower = filter.toLowerCase();
    const filtered = relatedMovies.filter(movie => {
      const genre = (movie.Genre || '').toLowerCase();
      const type = (movie.Type || '').toLowerCase();

      // Clarify empty type handling logic.
      if (filter === 'Movies') return type === 'movie' || type === '';
      if (filter === 'Series') return type === 'series';
      
      // Genre filters
      return genre.includes(filterLower);
    });

    setFilteredRelatedMovies(filtered);
  };

  // Update filtered movies when related movies change
  useEffect(() => {
    // Fix state synchronization between currentFilter and filteredRelatedMovies.
    setCurrentFilter('All Media');
    setFilteredRelatedMovies(relatedMovies);
  }, [relatedMovies]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full mx-auto mb-4"
          />
          <p className="text-white/60">Loading player...</p>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Movie not found</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gold text-black rounded-xl font-semibold hover:bg-gold-light transition-colors"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <TopNavbar 
        showBackButton={true} 
        onFilterChange={handleFilterChange}
        currentFilter={currentFilter}
      />
{/* HLS Video Player Section */}
<div className="w-[95%] mx-auto pt-20 pb-6">
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="relative rounded-2xl overflow-hidden shadow-2xl shadow-gold/20 
               border-2 border-gold/30 bg-black"
    style={{ height: "calc(100vh - 140px)" }}
  >
    {isVideoAvailable ? (
      <HLSVideoPlayer
        streamUrl={streamUrl}
        movieTitle={movie.Title}
        posterUrl={movie.Poster !== 'N/A' ? movie.Poster : '/placeholder-movie.jpg'}
        autoPlay={true}
      />
    ) : (
      /* Coming Soon Overlay */
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black/80 via-black/90 to-black">
        {/* Background Poster with blur */}
        {movie.Poster && movie.Poster !== 'N/A' && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20 blur-xl"
            style={{ backgroundImage: `url(${movie.Poster})` }}
          />
        )}
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative z-10 text-center px-6"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              repeatType: "reverse" 
            }}
            className="mb-6"
          >
            <PlayCircle size={80} className="text-gold/50 mx-auto" />
          </motion.div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Coming Soon
          </h2>
          
          <p className="text-white/60 text-lg mb-6 max-w-md mx-auto">
            This movie is not yet available for streaming. 
            Check back later for updates!
          </p>
          
          <div className="flex items-center justify-center gap-2 text-gold/80 bg-gold/10 px-4 py-2 rounded-full">
            <AlertTriangle size={18} />
            <span className="text-sm font-medium">Streaming Unavailable</span>
          </div>
        </motion.div>
      </div>
    )}
  </motion.div>
</div>

      {/* Content Section */}
      <div className="w-full px-6 py-8">
        {/* Movie Title & Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-3">{movie.Title}</h1>
          <div className="flex items-center gap-4 flex-wrap text-white/60">
            <div className="flex items-center gap-2">
              <Star size={18} className="text-gold fill-gold" />
              <span className="text-white font-semibold">{movie.imdbRating || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={18} />
              <span>{movie.Runtime || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Film size={18} />
              <span>{movie.Year}</span>
            </div>
            <div className="px-3 py-1 bg-gold/20 border border-gold/30 rounded-full text-gold text-sm font-semibold">
              {movie.Rated || 'Not Rated'}
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-4 mb-8 flex-wrap"
        >
          {/* Save Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${
              isSaved
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
            }`}
          >
            <Heart size={20} fill={isSaved ? 'currentColor' : 'none'} />
            {isSaved ? 'Saved' : 'Save'}
          </motion.button>

          {/* Watch Together Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleWatchTogether}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-semibold flex items-center gap-2 hover:from-purple-600 hover:to-blue-600 transition-all"
          >
            <Users size={20} />
            Watch Together
          </motion.button>

          {/* Download Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDownload}
            className="px-6 py-3 bg-gradient-to-r from-gold to-gold-light text-black rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-gold/50 transition-all"
          >
            <Download size={20} />
            Download
          </motion.button>

          {/* Share Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleShare}
            className="px-6 py-3 bg-white/10 text-white border border-white/20 rounded-xl font-semibold flex items-center gap-2 hover:bg-white/20 transition-all"
          >
            <Share2 size={20} />
            Share
          </motion.button>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-4 border-b border-white/10 mb-6"
        >
          {['overview', 'details', 'cast'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-semibold capitalize transition-all relative ${
                activeTab === tab
                  ? 'text-gold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mb-12"
          >
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">Synopsis</h3>
                <p className="text-white/70 leading-relaxed">{movie.Plot || 'No plot available.'}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div>
                    <p className="text-white/50 text-sm mb-1">Genre</p>
                    <p className="text-white font-semibold">{movie.Genre || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-white/50 text-sm mb-1">Director</p>
                    <p className="text-white font-semibold">{movie.Director || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-white/50 text-sm mb-1">Language</p>
                    <p className="text-white font-semibold">{movie.Language || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-white/50 text-sm mb-1">Country</p>
                    <p className="text-white font-semibold">{movie.Country || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <p className="text-white/50 text-sm mb-1">Writer</p>
                    <p className="text-white">{movie.Writer || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-white/50 text-sm mb-1">Released</p>
                    <p className="text-white">{movie.Released || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-white/50 text-sm mb-1">Box Office</p>
                    <p className="text-white">{movie.BoxOffice || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-white/50 text-sm mb-1">Awards</p>
                    <p className="text-white">{movie.Awards || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'cast' && (
              <div className="space-y-4">
                <div>
                  <p className="text-white/50 text-sm mb-2">Actors</p>
                  <p className="text-white">{movie.Actors || 'N/A'}</p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Related Movies */}
        {relatedMovies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">More Like This</h2>
              {currentFilter !== 'All Media' && (
                <span className="px-3 py-1 bg-gold/20 text-gold rounded-full text-sm">
                  Filtered: {currentFilter}
                </span>
              )}
            </div>
            {filteredRelatedMovies.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {filteredRelatedMovies.map((relatedMovie, idx) => (
                  <motion.div
                    key={relatedMovie.imdbID}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + idx * 0.05 }}
                  >
                    <MovieCard
                      movie={relatedMovie}
                      onClick={(movie) => navigate(`/player/${movie.imdbID}`)}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-white/60">No movies found for "{currentFilter}" filter</p>
                <button 
                  onClick={() => handleFilterChange('All Media')}
                  className="mt-4 px-6 py-2 bg-gold/20 text-gold rounded-lg hover:bg-gold/30 transition-colors"
                >
                  Clear Filter
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default MoviePlayer;
