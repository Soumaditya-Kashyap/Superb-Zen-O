import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Play, Users, X, Star, Clock, AlertTriangle } from 'lucide-react';
import MovieService from '../services/movieService';
import WatchModeModal from './WatchModeModal';

const MovieDetails = ({ imdbId, onClose }) => {
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWatchModal, setShowWatchModal] = useState(false);

  useEffect(() => {
    const fetchMovieDetails = async () => {
      try {
        setLoading(true);
        const response = await MovieService.getMovieDetails(imdbId);
        if (response.success) {
          setMovie(response.movie);
        } else {
          setError(response.error);
        }
      } catch (err) {
        setError('Failed to load movie details');
      } finally {
        setLoading(false);
      }
    };

    if (imdbId) {
      fetchMovieDetails();
    }
  }, [imdbId]);

  const handleImageError = (e) => {
    e.target.src = 'https://via.placeholder.com/400x600?text=No+Poster';
  };

  const handleWatchNow = () => {
    setShowWatchModal(true);
  };

  const handleWatchMode = (mode) => {
    setShowWatchModal(false);
    if (mode === 'alone') {
      navigate(`/player/${imdbId}`);
    } else {
      alert('Watch Together feature coming soon!');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
        <div className="glass-effect-dark p-12 rounded-2xl text-center" onClick={(e) => e.stopPropagation()}>
          <div className="loading-spinner"></div>
          <p className="text-white/60 mt-4">Loading movie details...</p>
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
        <div className="glass-effect-dark p-12 rounded-2xl text-center relative" onClick={(e) => e.stopPropagation()}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors" onClick={onClose}>
            <X size={20} />
          </button>
          <p className="text-red-400">Error: {error || 'Movie not found'}</p>
        </div>
      </div>
    );
  }

  const posterUrl = movie.Poster && movie.Poster !== 'N/A' 
    ? movie.Poster 
    : 'https://via.placeholder.com/400x600?text=No+Poster';

  // Check if movie has HLS streaming available
  const isVideoAvailable = !!movie.videoFolderName;

  return (
    <>
      <WatchModeModal 
        isOpen={showWatchModal}
        onClose={() => setShowWatchModal(false)}
        onSelectMode={handleWatchMode}
        movieTitle={movie?.Title || ''}
      />
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
        <div className="glass-effect-dark rounded-2xl max-w-6xl w-full my-8 relative" onClick={(e) => e.stopPropagation()}>
          <button className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl flex items-center justify-center transition-colors z-10" onClick={onClose}>
            <X size={24} />
          </button>
          
          <div className="flex flex-col md:flex-row gap-8 p-8">
            <div className="flex-shrink-0">
              <img 
                src={posterUrl} 
                alt={movie.Title}
                onError={handleImageError}
                className="w-full md:w-80 rounded-lg shadow-2xl"
              />
            </div>

            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-3">{movie.Title}</h1>
              <div className="flex items-center gap-3 text-white/70 mb-4">
                <span>{movie.Year}</span>
                <span>•</span>
                <span>{movie.Rated}</span>
                <span>•</span>
                <span>{movie.Runtime}</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {movie.Genre && movie.Genre.split(',').map((genre, idx) => (
                  <span key={idx} className="px-3 py-1 bg-white/10 text-white/80 rounded-full text-sm">{genre.trim()}</span>
                ))}
              </div>

              <div className="flex flex-wrap gap-4 mb-6">
                {movie.Ratings && movie.Ratings.map((rating, index) => (
                  <div key={index} className="glass-effect px-4 py-2 rounded-lg">
                    <div className="text-white/60 text-xs mb-1">{rating.Source}</div>
                    <div className="text-white font-semibold">{rating.Value}</div>
                  </div>
                ))}
                {movie.imdbRating && (
                  <div className="glass-effect px-4 py-2 rounded-lg border border-gold/30">
                    <div className="text-gold-light text-xs mb-1">IMDb</div>
                    <div className="text-white font-semibold flex items-center gap-1">
                      <Star size={16} fill="#FFD700" className="text-yellow-400" /> {movie.imdbRating}
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">Plot</h3>
                <p className="text-white/70 leading-relaxed">{movie.Plot}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <span className="text-white/60">Director: </span>
                  <span className="text-white">{movie.Director}</span>
                </div>
                <div>
                  <span className="text-white/60">Actors: </span>
                  <span className="text-white">{movie.Actors}</span>
                </div>
                <div>
                  <span className="text-white/60">Writers: </span>
                  <span className="text-white">{movie.Writer}</span>
                </div>
                <div>
                  <span className="text-white/60">Language: </span>
                  <span className="text-white">{movie.Language}</span>
                </div>
                <div>
                  <span className="text-white/60">Country: </span>
                  <span className="text-white">{movie.Country}</span>
                </div>
                {movie.Awards && movie.Awards !== 'N/A' && (
                  <div>
                    <span className="text-white/60">Awards: </span>
                    <span className="text-white">{movie.Awards}</span>
                  </div>
                )}
                {movie.BoxOffice && movie.BoxOffice !== 'N/A' && (
                  <div>
                    <span className="text-white/60">Box Office: </span>
                    <span className="text-white">{movie.BoxOffice}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-4 flex-wrap">
                {isVideoAvailable ? (
                  <button 
                    onClick={handleWatchNow}
                    className="px-8 py-3 bg-gradient-to-r from-gold to-gold-light text-black font-bold rounded-lg hover:scale-105 transition-transform flex items-center gap-2"
                  >
                    <Play size={20} fill="currentColor" /> Watch Now
                  </button>
                ) : (
                  <button 
                    disabled
                    className="px-8 py-3 bg-gray-600/50 text-white/60 font-bold rounded-lg cursor-not-allowed flex items-center gap-2"
                  >
                    <Clock size={20} /> Coming Soon
                  </button>
                )}
                <button 
                  onClick={handleWatchNow}
                  disabled={!isVideoAvailable}
                  className={`px-8 py-3 glass-effect font-semibold rounded-lg flex items-center gap-2 transition-colors ${
                    isVideoAvailable 
                      ? 'text-white hover:bg-white/20' 
                      : 'text-white/40 cursor-not-allowed'
                  }`}
                >
                  <Users size={20} /> Watch Together
                </button>
              </div>
              
              {/* Availability Status Badge */}
              {!isVideoAvailable && (
                <div className="mt-4 flex items-center gap-2 text-amber-400/80 bg-amber-400/10 px-4 py-2 rounded-lg w-fit">
                  <AlertTriangle size={16} />
                  <span className="text-sm">This movie is not yet available for streaming</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

MovieDetails.propTypes = {
  imdbId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default MovieDetails;
