import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Users, 
  Play, 
  Clock, 
  Link2, 
  X, 
  CheckCircle,
  Film,
  Calendar,
  UserPlus,
  LogOut
} from 'lucide-react';
import CreateRoomModal from '../components/CreateRoomModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const WatchTogether = () => {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeRooms, setActiveRooms] = useState([]);
  const [pastRooms, setPastRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState(null);
  
  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Fetch room history on mount
  useEffect(() => {
    fetchRoomHistory();
  }, []);

  const fetchRoomHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/rooms/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setActiveRooms(data.activeRooms || []);
        setPastRooms(data.pastRooms || []);
      }
    } catch (error) {
      console.error('Error fetching room history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomCreated = (room) => {
    setActiveRooms(prev => [room, ...prev]);
  };

  const handleEnterRoom = (roomId) => {
    navigate(`/room/${roomId}`);
  };

  // Check if current user is the host of a room
  const isRoomHost = (room) => {
    const hostId = room.host?._id || room.host;
    return hostId === currentUser._id || hostId === currentUser.id;
  };

  const handleCloseRoom = async (roomId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/rooms/${roomId}/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        // Move room from active to past
        const closedRoom = activeRooms.find(r => r._id === roomId);
        if (closedRoom) {
          setActiveRooms(prev => prev.filter(r => r._id !== roomId));
          setPastRooms(prev => [{ ...closedRoom, status: 'ended', endTime: new Date() }, ...prev]);
        }
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to close room');
      }
    } catch (error) {
      console.error('Error closing room:', error);
    }
  };

  // Leave a room (for non-host participants)
  const handleLeaveRoom = async (roomId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        // Remove room from active rooms list
        setActiveRooms(prev => prev.filter(r => r._id !== roomId));
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to leave room');
      }
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  };

  const handleJoinWithCode = async () => {
    if (!joinCode.trim()) {
      setJoinError('Please enter an invite code');
      return;
    }

    setJoiningRoom(true);
    setJoinError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/rooms/join/${joinCode.trim()}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setShowJoinModal(false);
        setJoinCode('');
        navigate(`/room/${data.room._id}`);
      } else {
        setJoinError(data.error || 'Failed to join room');
      }
    } catch (error) {
      console.error('Error joining room:', error);
      setJoinError('Failed to join room. Please try again.');
    } finally {
      setJoiningRoom(false);
    }
  };

  const copyInviteLink = async (inviteCode, roomId) => {
    const link = `${window.location.origin}/watch-together/join/${inviteCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedRoomId(roomId);
      setTimeout(() => setCopiedRoomId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (startTime, endTime) => {
    if (!endTime) return 'Ongoing';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="min-h-screen p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Watch Together</h1>
          <p className="text-gray-400">Create a room and watch movies with friends in sync</p>
        </div>
        
        <div className="flex gap-3 mt-4 md:mt-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            Join Room
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gold hover:bg-gold/90 text-black font-semibold rounded-xl transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Room
          </motion.button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Active Rooms Section */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              Active Rooms
            </h2>
            
            {activeRooms.length === 0 ? (
              <div className="bg-gray-800/50 rounded-2xl p-8 text-center">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl text-white mb-2">No Active Rooms</h3>
                <p className="text-gray-400 mb-4">Create a room to start watching with friends!</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-black font-semibold rounded-lg hover:bg-gold/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Room
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeRooms.map((room) => (
                  <motion.div
                    key={room._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800/80 rounded-2xl overflow-hidden border border-gray-700 hover:border-gold/50 transition-all"
                  >
                    {/* Movie Poster/Thumbnail */}
                    <div className="relative h-40 bg-gray-900">
                      {room.movie?.Poster && room.movie.Poster !== 'N/A' ? (
                        <img
                          src={room.movie.Poster}
                          alt={room.movie.Title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-12 h-12 text-gray-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="text-white font-bold text-lg truncate">
                          {room.movie?.Title || 'Unknown Movie'}
                        </h3>
                      </div>
                      {/* Live Badge */}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-red-500/90 rounded-full">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        <span className="text-white text-xs font-semibold">LIVE</span>
                      </div>
                    </div>
                    
                    {/* Room Info */}
                    <div className="p-4">
                      <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {room.participants?.length || 0} watching
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDate(room.startTime)}
                        </span>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEnterRoom(room._id)}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gold text-black font-semibold rounded-lg hover:bg-gold/90 transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          Enter Room
                        </button>
                        <button
                          onClick={() => copyInviteLink(room.inviteCode, room._id)}
                          className={`p-2.5 rounded-lg transition-colors ${copiedRoomId === room._id ? 'bg-green-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
                          title={copiedRoomId === room._id ? 'Copied!' : 'Copy invite link'}
                        >
                          {copiedRoomId === room._id ? <CheckCircle className="w-5 h-5" /> : <Link2 className="w-5 h-5" />}
                        </button>
                        {/* Show Close button for host, Leave button for others */}
                        {isRoomHost(room) ? (
                          <button
                            onClick={() => handleCloseRoom(room._id)}
                            className="p-2.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg transition-colors"
                            title="Close room (Host only)"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleLeaveRoom(room._id)}
                            className="p-2.5 bg-orange-500/20 hover:bg-orange-500/40 text-orange-400 rounded-lg transition-colors"
                            title="Leave room"
                          >
                            <LogOut className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      {/* Host indicator */}
                      {isRoomHost(room) && (
                        <div className="mt-2 text-xs text-gold flex items-center gap-1">
                          <span className="w-2 h-2 bg-gold rounded-full"></span>
                          You are the host
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* Past Rooms Section */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-gray-400" />
              Past Sessions
            </h2>
            
            {pastRooms.length === 0 ? (
              <div className="bg-gray-800/30 rounded-2xl p-6 text-center">
                <p className="text-gray-500">No past watch sessions yet</p>
              </div>
            ) : (
              <div className="bg-gray-800/30 rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-4 px-4 text-gray-400 font-medium">Movie</th>
                      <th className="text-left py-4 px-4 text-gray-400 font-medium hidden md:table-cell">Date</th>
                      <th className="text-left py-4 px-4 text-gray-400 font-medium hidden md:table-cell">Duration</th>
                      <th className="text-left py-4 px-4 text-gray-400 font-medium">Attendees</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastRooms.slice(0, 10).map((room) => (
                      <tr key={room._id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            {room.movie?.Poster && room.movie.Poster !== 'N/A' ? (
                              <img
                                src={room.movie.Poster}
                                alt={room.movie.Title}
                                className="w-10 h-14 object-cover rounded"
                              />
                            ) : (
                              <div className="w-10 h-14 bg-gray-700 rounded flex items-center justify-center">
                                <Film className="w-5 h-5 text-gray-500" />
                              </div>
                            )}
                            <span className="text-white font-medium">{room.movie?.Title || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-400 hidden md:table-cell">
                          {formatDate(room.startTime)}
                        </td>
                        <td className="py-4 px-4 text-gray-400 hidden md:table-cell">
                          {formatDuration(room.startTime, room.endTime)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-400">{room.attendees?.length || 0}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onRoomCreated={handleRoomCreated}
      />

      {/* Join Room Modal */}
      <AnimatePresence>
        {showJoinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowJoinModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-700"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Join a Room</h2>
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <p className="text-gray-400 mb-4">
                Enter the invite code shared by your friend
              </p>

              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter invite code..."
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gold mb-4"
                onKeyDown={(e) => e.key === 'Enter' && handleJoinWithCode()}
              />

              {joinError && (
                <p className="text-red-400 text-sm mb-4">{joinError}</p>
              )}

              <button
                onClick={handleJoinWithCode}
                disabled={joiningRoom}
                className="w-full py-3 bg-gold text-black font-semibold rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {joiningRoom ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Join Room
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WatchTogether;
