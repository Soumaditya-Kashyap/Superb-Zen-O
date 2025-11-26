import { useState, useEffect } from 'react';
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
  Film
} from 'lucide-react';
import MovieService from '../services/movieService';
import MovieCard from '../components/MovieCard';
import HLSVideoPlayer from '../components/HLSVideoPlayer';

const MoviePlayer = () => {
  const { imdbId } = useParams();
  const navigate = useNavigate();
  
  const [movie, setMovie] = useState(null);
  const [relatedMovies, setRelatedMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSaved, setIsSaved] = useState(false);

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
        
        // Fetch movie details
        const response = await MovieService.getMovieDetails(imdbId);
        console.log('Movie response:', response);
        
        // Handle both {success: true, movie: {...}} and direct movie object
        let movieData = response.success ? response.movie : response;
        
        // If movie not found and it's a hero movie, use fallback
        if (!movieData || (response.success === false && heroMovieFallbacks[imdbId])) {
          console.log('Using fallback data for hero movie:', imdbId);
          movieData = heroMovieFallbacks[imdbId];
        }
        
        setMovie(movieData);
        console.log('Movie data set:', movieData);

        // Fetch related movies based on genre or categories
        if (movieData) {
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

      const response = await fetch('http://localhost:5000/api/movies/favorite', {
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
      <TopNavbar showBackButton={true} />

      {/* Back Button - Always visible */}
{/*   
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate(-1)}
        className="fixed top-6 left-24 z-50 p-3 bg-black/80 backdrop-blur-xl border border-gold/30 rounded-xl hover:bg-gold/20 transition-all shadow-lg"
      >
        <ArrowLeft size={24} className="text-gold" />
      </motion.button> */}

      {/* HLS Video Player Section */}
{/* HLS Video Player Section – width 95% & height 85% */}
<div className="w-[95%] mx-auto pt-24 pb-8">
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="relative rounded-2xl overflow-hidden shadow-2xl shadow-gold/20 
               border-2 border-gold/30 bg-gradient-to-b from-gold/5 to-transparent p-2"
    style={{ height: "88vh" }}   // 👈 UPDATED height
  >
    <div className="rounded-xl overflow-hidden h-full">
      <HLSVideoPlayer
        movieId={imdbId}
        movieTitle={movie.Title}
        posterUrl={movie.Poster !== 'N/A' ? movie.Poster : '/placeholder-movie.jpg'}
        height="100%"
      />
    </div>
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
            <h2 className="text-2xl font-bold text-white mb-6">More Like This</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {relatedMovies.map((relatedMovie, idx) => (
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
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default MoviePlayer;
