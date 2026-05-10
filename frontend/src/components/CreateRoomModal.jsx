import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Film,
  Users,
  Check,
  ChevronRight,
  ChevronLeft,
  Copy,
  ExternalLink,
  Loader,
  Search,
  Play,
  Clock,
  Star
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CreateRoomModal = ({ isOpen, onClose, onRoomCreated,youtubeMovie }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Step 1: Movie Selection
  const [movies, setMovies] = useState([]);
  const [moviesLoading, setMoviesLoading] = useState(false);
  const [movieSearch, setMovieSearch] = useState('');
  const [selectedMovie, setSelectedMovie] = useState(null);
  
  // Step 2: Friend Selection
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState([]);
  
  // Step 3: Room Created
  const [createdRoom, setCreatedRoom] = useState(null);
  const [copied, setCopied] = useState(false);

  const token = localStorage.getItem('token');

  // Fetch available movies
  useEffect(() => {
    if (isOpen && step === 1) {
      fetchMovies();
    }
  }, [isOpen, step]);

  // Fetch friends when on step 2
  useEffect(() => {
    if (step === 2) {
      fetchFriends();
    }
  }, [step]);

  const fetchMovies = async (search = '') => {
    try {
      setMoviesLoading(true);
      const url = search 
        ? `${API_BASE_URL}/rooms/movies/available?search=${encodeURIComponent(search)}`
        : `${API_BASE_URL}/rooms/movies/available`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        // setMovies(data.movies); 
      
          //by raki
         let finalMovies = data.movies || [];
          // =====================================
           // ADD CURRENT YOUTUBE VIDEO
           // =====================================

         if (youtubeMovie) {

         finalMovies = [

         youtubeMovie,

         ...finalMovies

         ];

            }
          setMovies(finalMovies);


      }
    } catch (err) {
      console.error('Failed to fetch movies:', err);
      setError('Failed to load movies');
    } finally {
      setMoviesLoading(false);
    }
  };

  const fetchFriends = async () => {
    try {
      setFriendsLoading(true);
      const response = await fetch(`${API_BASE_URL}/chat/friends`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setFriends(data.friends || []);
      }
    } catch (err) {
      console.error('Failed to fetch friends:', err);
    } finally {
      setFriendsLoading(false);
    }
  };

  const handleMovieSearch = (e) => {
    const value = e.target.value;
    setMovieSearch(value);
    
    // Debounce search
    const timer = setTimeout(() => {
      fetchMovies(value);
    }, 300);
    
    return () => clearTimeout(timer);
  };

  const toggleFriendSelection = (friendId) => {
    setSelectedFriends(prev => 
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const createRoom = async () => {
    if (!selectedMovie) {
      setError('Please select a movie');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE_URL}/rooms/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          movieId: selectedMovie._id,
          invitedFriends: selectedFriends
        })
      });

      const data = await response.json();

      if (data.success) {
        setCreatedRoom(data.room);
        setStep(3);
        if (onRoomCreated) {
          onRoomCreated(data.room);
        }
      } else {
        setError(data.message || 'Failed to create room');
      }
    } catch (err) {
      console.error('Failed to create room:', err);
      setError('Failed to create room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = () => {
    const fullLink = `${window.location.origin}/watch-together/join/${createdRoom.inviteCode}`;
    navigator.clipboard.writeText(fullLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    // Reset state
    setStep(1);
    setSelectedMovie(null);
    setSelectedFriends([]);
    setCreatedRoom(null);
    setError('');
    setMovieSearch('');
    onClose();
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gradient-to-br from-gray-900 to-black border border-gold/30 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Create Watch Party</h2>
                <p className="text-white/60 text-sm mt-1">
                  {step === 1 && 'Step 1: Select a movie to watch'}
                  {step === 2 && 'Step 2: Invite your friends'}
                  {step === 3 && 'Room created successfully!'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-white/60" />
              </button>
            </div>

            {/* Progress Steps */}
            {step < 3 && (
              <div className="flex items-center gap-2 mt-4">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      s < step ? 'bg-green-500 text-white' :
                      s === step ? 'bg-gold text-black' :
                      'bg-white/10 text-white/40'
                    }`}>
                      {s < step ? <Check className="w-4 h-4" /> : s}
                    </div>
                    {s < 3 && (
                      <div className={`w-12 h-0.5 mx-2 ${s < step ? 'bg-green-500' : 'bg-white/10'}`} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1 min-h-0">
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Step 1: Movie Selection */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search movies..."
                    value={movieSearch}
                    onChange={handleMovieSearch}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-gold/50 transition-colors"
                  />
                </div>

                {/* Movies Grid */}
                {moviesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="w-8 h-8 text-gold animate-spin" />
                  </div>
                ) : movies.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {movies.map((movie) => (
                      <motion.div
                        key={movie._id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedMovie(prev => prev?._id === movie._id ? null : movie)}
                        className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-colors ${
                          selectedMovie?._id === movie._id
                            ? 'border-gold shadow-lg shadow-gold/20'
                            : 'border-transparent hover:border-white/20'
                        }`}
                      >
                        <div className="aspect-[2/3] bg-white/5">
                          <img
                            src={movie.Poster !== 'N/A' ? movie.Poster : '/placeholder-movie.jpg'}
                            alt={movie.Title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <h3 className="text-white font-medium text-sm truncate">{movie.Title}</h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-white/60">
                            <span>{movie.Year}</span>
                            {movie.imdbRating && (
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                {movie.imdbRating}
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedMovie?._id === movie._id && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-gold rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-black" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-white/40">
                    <Film className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No movies available for streaming</p>
                    <p className="text-sm mt-1">Movies need video content to be watched together</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Friend Selection */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-white/60 text-sm">
                  Select friends to invite (optional). They'll receive an invite link.
                </p>

                {friendsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="w-8 h-8 text-gold animate-spin" />
                  </div>
                ) : friends.length > 0 ? (
                  <div className="space-y-2">
                    {friends.map((friend) => (
                      <motion.div
                        key={friend._id}
                        whileHover={{ scale: 1.01 }}
                        onClick={() => toggleFriendSelection(friend._id)}
                        className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors ${
                          selectedFriends.includes(friend._id)
                            ? 'bg-gold/20 border border-gold/30'
                            : 'bg-white/5 hover:bg-white/10 border border-transparent'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center text-black font-bold">
                          {getInitials(friend.name)}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium">{friend.name}</p>
                          <p className="text-white/50 text-sm">@{friend.nickName}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selectedFriends.includes(friend._id)
                            ? 'bg-gold border-gold'
                            : 'border-white/30'
                        }`}>
                          {selectedFriends.includes(friend._id) && (
                            <Check className="w-4 h-4 text-black" />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-white/40">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No friends yet</p>
                    <p className="text-sm mt-1">You can still create a room and share the invite link</p>
                  </div>
                )}

                {/* Selected movie preview */}
                {selectedMovie && (
                  <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-white/60 text-xs mb-2">Selected Movie</p>
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedMovie.Poster !== 'N/A' ? selectedMovie.Poster : '/placeholder-movie.jpg'}
                        alt={selectedMovie.Title}
                        className="w-12 h-16 object-cover rounded-lg"
                      />
                      <div>
                        <p className="text-white font-medium">{selectedMovie.Title}</p>
                        <p className="text-white/50 text-sm">{selectedMovie.Year} • {selectedMovie.Runtime}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Room Created */}
            {step === 3 && createdRoom && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                  <Check className="w-10 h-10 text-green-500" />
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Room Created!</h3>
                  <p className="text-white/60">Share the invite link with your friends</p>
                </div>

                {/* Room Info */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-4 mb-4">
                    <img
                      src={createdRoom.movie?.Poster !== 'N/A' ? createdRoom.movie?.Poster : '/placeholder-movie.jpg'}
                      alt={createdRoom.movie?.Title}
                      className="w-16 h-20 object-cover rounded-lg"
                    />
                    <div className="text-left">
                      <p className="text-white font-bold text-lg">{createdRoom.movie?.Title}</p>
                      <p className="text-white/50 text-sm">{createdRoom.movie?.Runtime} • {createdRoom.movie?.Genre}</p>
                      <p className="text-gold text-sm mt-1">Room: {createdRoom.name}</p>
                    </div>
                  </div>

                  {/* Invite Link */}
                  <div className="flex items-center gap-2 bg-black/30 rounded-lg p-3">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/watch-together/join/${createdRoom.inviteCode}`}
                      className="flex-1 bg-transparent text-white text-sm outline-none"
                    />
                    <button
                      onClick={copyInviteLink}
                      className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${
                        copied
                          ? 'bg-green-500 text-white'
                          : 'bg-gold hover:bg-gold-light text-black'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {selectedFriends.length > 0 && (
                  <p className="text-white/50 text-sm">
                    {selectedFriends.length} friend{selectedFriends.length > 1 ? 's' : ''} will be notified
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/10 flex items-center justify-between flex-shrink-0">
            {step > 1 && step < 3 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 px-4 py-2 text-white/60 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step === 1 && (
              <button
                onClick={() => setStep(2)}
                disabled={!selectedMovie}
                className="flex items-center gap-2 px-6 py-3 bg-gold hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-colors"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {step === 2 && (
              <button
                onClick={createRoom}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-gold hover:bg-gold-light disabled:opacity-50 text-black font-bold rounded-xl transition-colors"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Room
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            )}

            {step === 3 && (
              <button
                onClick={() => navigate(`/watch-together/join/${createdRoom.inviteCode || createdRoom._id}`)}
                className="flex items-center gap-2 px-6 py-3 bg-gold hover:bg-gold-light text-black font-bold rounded-xl transition-colors"
              >
                <Play className="w-5 h-5" />
                Enter Room Now
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateRoomModal;
