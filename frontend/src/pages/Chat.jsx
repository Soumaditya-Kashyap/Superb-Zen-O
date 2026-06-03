import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, 
  UserPlus, 
  Check, 
  X, 
  MessageCircle, 
  Send, 
  ArrowLeft,
  Users,
  Clock,
  Film,
  Smile
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import EmojiPicker from 'emoji-picker-react';

// Use environment variable or fallback to localhost
// For testing with teammate, change this to the host machine's IP address
// e.g., 'http://192.168.1.100:5000' 
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.SOCKET_URL;
const API_BASE_URL = import.meta.env.VITE_API_URL || 'window.API_BASE_URL';

const Chat = () => {
  // View state: 'connect' or 'chat'
  const [activeView, setActiveView] = useState('connect');
  
  // Connect view states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [pendingReceived, setPendingReceived] = useState([]);
  const [pendingSent, setPendingSent] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);
  
  // Chat view states
  const [activeChatRoom, setActiveChatRoom] = useState(null);
  const [activeFriend, setActiveFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);
  const [showUnfriendModal, setShowUnfriendModal] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState(null);
  const [removingFriend, setRemovingFriend] = useState(false);
  
  // Refs
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const activeChatRoomRef = useRef(null);
  
  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Initialize Socket.io connection
  useEffect(() => {
    if (!token) return;

    console.log('[CHAT] Connecting to socket server:', SOCKET_URL);
    
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[CHAT] ✅ Socket connected! ID:', socket.id);
      setSocketConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[CHAT] ❌ Socket disconnected. Reason:', reason);
      setSocketConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[CHAT] ⚠️ Socket connection error:', error.message);
      setSocketConnected(false);
    });

    socket.on('message:received', (data) => {
      console.log('[CHAT] 📩 Message received:', data.message?.content?.substring(0, 50));
      
      // Check if the message is for the currently active chat room
      const currentChatRoom = activeChatRoomRef.current;
      if (currentChatRoom && data.message?.chatRoomId === currentChatRoom._id) {
        // Add new message at the end (newest at bottom)
        setMessages(prev => {
          // Avoid duplicate messages
          const exists = prev.some(m => m._id === data.message._id);
          if (exists) return prev;
          return [...prev, data.message];
        });
        setTimeout(() => scrollToBottom(), 100);
      } else {
        // Message is for a different chat room - show as notification or badge
        console.log('[CHAT] 📬 Message received for different room:', data.message?.chatRoomId);
        // Refresh friends list to potentially show unread indicator
        fetchFriends();
      }
    });

    // Also listen for message notifications (for when not in room)
    socket.on('message:notification', (data) => {
      console.log('[CHAT] 🔔 Message notification:', data);
      // Could show a toast notification here
    });

    socket.on('typing:start', (data) => {
      setTypingUsers(prev => [...prev.filter(u => u.userId !== data.userId), data]);
    });

    socket.on('typing:stop', (data) => {
      setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
    });

    socket.on('user:online', (data) => {
      console.log('[CHAT] 🟢 User online:', data.userId);
      setOnlineUsers(prev => ({ ...prev, [data.userId]: true }));
    });

    socket.on('user:offline', (data) => {
      console.log('[CHAT] 🔴 User offline:', data.userId);
      setOnlineUsers(prev => ({ ...prev, [data.userId]: false }));
    });

    // Listen for online status responses
    socket.on('users:status', (statuses) => {
      console.log('[CHAT] 👥 Users status received:', statuses);
      setOnlineUsers(prev => ({ ...prev, ...statuses }));
    });

    socket.on('room:joined', (data) => {
      console.log('[CHAT] 🚪 Joined room:', data.chatRoomId);
    });

    socket.on('error', (data) => {
      console.error('[CHAT] ❌ Socket error:', data.message);
    });

    return () => {
      console.log('[CHAT] Cleaning up socket connection');
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token]);

  // Keep activeChatRoomRef in sync with activeChatRoom state
  useEffect(() => {
    activeChatRoomRef.current = activeChatRoom;
  }, [activeChatRoom]);

  // Fetch pending handshakes and friends on mount
  useEffect(() => {
    fetchPendingHandshakes();
    fetchFriends();
  }, []);

  // Request online status when socket connects and friends are loaded
  useEffect(() => {
    if (socketConnected && friends.length > 0) {
      const friendIds = friends.map(f => f._id);
      console.log('[CHAT] Requesting online status for friends:', friendIds);
      socketRef.current?.emit('users:status', { userIds: friendIds });
    }
  }, [socketConnected, friends]);

  // Periodic status check (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (socketConnected && friends.length > 0) {
        const friendIds = friends.map(f => f._id);
        socketRef.current?.emit('users:status', { userIds: friendIds });
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [socketConnected, friends]);

  // Search users with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // API Functions
  const fetchPendingHandshakes = async () => {
    try {
      setLoadingPending(true);
      const response = await fetch(`${API_BASE_URL}/chat/handshake/pending`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setPendingReceived(data.received || []);
        setPendingSent(data.sent || []);
      }
    } catch (error) {
      console.error('Error fetching pending handshakes:', error);
    } finally {
      setLoadingPending(false);
    }
  };

  const fetchFriends = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/friends`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setFriends(data.friends || []);
        // Check online status
        if (socketRef.current && data.friends?.length > 0) {
          const friendIds = data.friends.map(f => f._id);
          socketRef.current.emit('users:status', { userIds: friendIds });
        }
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const searchUsers = async (query) => {
    try {
      setSearchLoading(true);
      const response = await fetch(`${API_BASE_URL}/chat/users/search?query=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const sendHandshake = async (receiverId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/handshake/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ receiverId })
      });
      const data = await response.json();
      if (data.success) {
        // Update search results to show pending status
        setSearchResults(prev => prev.map(user => 
          user._id === receiverId ? { ...user, connectionStatus: 'pending_sent' } : user
        ));
        fetchPendingHandshakes();
      }
    } catch (error) {
      console.error('Error sending handshake:', error);
    }
  };

  const acceptHandshake = async (connectionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/handshake/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ connectionId })
      });
      const data = await response.json();
      if (data.success) {
        fetchPendingHandshakes();
        fetchFriends();
      }
    } catch (error) {
      console.error('Error accepting handshake:', error);
    }
  };

  const rejectHandshake = async (connectionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/handshake/${connectionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        fetchPendingHandshakes();
      }
    } catch (error) {
      console.error('Error rejecting handshake:', error);
    }
  };

  const removeFriend = (friend) => {
    setFriendToRemove(friend);
    setShowUnfriendModal(true);
  };

  const closeUnfriendModal = () => {
    if (removingFriend) return;
    setShowUnfriendModal(false);
    setFriendToRemove(null);
  };

  const confirmRemoveFriend = async () => {
    if (!friendToRemove?.connectionId) return;

    try {
      setRemovingFriend(true);
      const response = await fetch(`${API_BASE_URL}/chat/handshake/${friendToRemove.connectionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        // If current active chat was with removed friend, close it.
        if (activeFriend?._id) {
          const removed = friends.find(
            f => f.connectionId === friendToRemove.connectionId && f._id === activeFriend._id
          );
          if (removed) {
            setActiveFriend(null);
            setActiveChatRoom(null);
            setMessages([]);
          }
        }

        fetchFriends();
        fetchPendingHandshakes();
        closeUnfriendModal();
      }
    } catch (error) {
      console.error('Error removing friend:', error);
    } finally {
      setRemovingFriend(false);
    }
  };

  const openChatWithFriend = async (friend) => {
    try {
      setLoadingMessages(true);
      setActiveFriend(friend);
      
      // Get or create chat room
      const roomResponse = await fetch(`${API_BASE_URL}/chat/room`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ friendId: friend._id })
      });
      const roomData = await roomResponse.json();
      
      if (roomData.success) {
        setActiveChatRoom(roomData.chatRoom);
        
        // Join the socket room - ensure socket is connected
        if (socketRef.current?.connected) {
          console.log('[CHAT] Joining room:', roomData.chatRoom._id);
          socketRef.current.emit('room:join', { chatRoomId: roomData.chatRoom._id });
        } else {
          console.warn('[CHAT] Socket not connected, waiting...');
          // Wait for socket to connect and then join
          const checkSocket = setInterval(() => {
            if (socketRef.current?.connected) {
              console.log('[CHAT] Socket connected, joining room:', roomData.chatRoom._id);
              socketRef.current.emit('room:join', { chatRoomId: roomData.chatRoom._id });
              clearInterval(checkSocket);
            }
          }, 500);
          // Clear interval after 5 seconds to prevent infinite loop
          setTimeout(() => clearInterval(checkSocket), 5000);
        }
        
        // Fetch messages
        const messagesResponse = await fetch(`${API_BASE_URL}/chat/messages/${roomData.chatRoom._id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include'
        });
        const messagesData = await messagesResponse.json();
        
        if (messagesData.success) {
          // Messages already come in chronological order (oldest first) from backend
          // Don't reverse - we want oldest at top, newest at bottom (like WhatsApp)
          setMessages(messagesData.messages || []);
          setTimeout(() => scrollToBottom(), 100);
          
          // Mark messages as read
          if (socketRef.current?.connected) {
            socketRef.current.emit('messages:read', { chatRoomId: roomData.chatRoom._id });
          }
        }
        
        setActiveView('chat');
      }
    } catch (error) {
      console.error('Error opening chat:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessageHandler = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatRoom) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setShowEmojiPicker(false);

    // Stop typing indicator
    if (socketRef.current) {
      socketRef.current.emit('typing:stop', { chatRoomId: activeChatRoom._id });
    }

    // Send via socket
    if (socketRef.current) {
      socketRef.current.emit('message:send', {
        chatRoomId: activeChatRoom._id,
        content: messageContent
      });
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!activeChatRoom || !socketRef.current) return;

    // Emit typing start
    socketRef.current.emit('typing:start', { chatRoomId: activeChatRoom._id });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit('typing:stop', { chatRoomId: activeChatRoom._id });
    }, 2000);
  };

  const onEmojiClick = (emojiObject) => {
    setNewMessage(prev => prev + emojiObject.emoji);
  };

  const handleWatchTogether = () => {
    console.log('Watch Together clicked - Feature coming soon!', {
      friend: activeFriend,
      chatRoom: activeChatRoom
    });
    // TODO: Implement Watch Together feature
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Render Connect View
  const renderConnectView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column - Search & Send Handshakes */}
      <div className="space-y-6">
        <div className="glass-effect-dark rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
            <Search className="text-gold" size={24} />
            Find Friends
          </h2>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or nickname..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-12 text-white placeholder-white/40 focus:outline-none focus:border-gold/50 transition-colors"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
          </div>

          <div className="mt-4 space-y-3 max-h-80 overflow-y-auto">
            {searchLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-gold border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map(user => (
                <div key={user._id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center text-black font-bold text-sm">
                      {getInitials(user.name)}
                    </div>
                    <div>
                      <p className="text-white font-medium">{user.name}</p>
                      <p className="text-white/50 text-sm">@{user.nickName}</p>
                    </div>
                  </div>
                  
                  {user.connectionStatus === 'accepted' ? (
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                      Friends
                    </span>
                  ) : user.connectionStatus === 'pending_sent' ? (
                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                      Pending
                    </span>
                  ) : user.connectionStatus === 'pending_received' ? (
                    <button
                      onClick={() => acceptHandshake(user.connectionId)}
                      className="px-3 py-1 bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30 rounded-full text-sm transition-colors flex items-center gap-1"
                    >
                      <Check size={14} /> Accept
                    </button>
                  ) : (
                    <button
                      onClick={() => sendHandshake(user._id)}
                      className="px-3 py-1 bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30 rounded-full text-sm transition-colors flex items-center gap-1"
                    >
                      <UserPlus size={14} /> Connect
                    </button>
                  )}
                </div>
              ))
            ) : searchQuery.length >= 2 ? (
              <p className="text-white/50 text-center py-4">No users found</p>
            ) : (
              <p className="text-white/40 text-center py-4">Type at least 2 characters to search</p>
            )}
          </div>
        </div>

        {/* Sent Requests */}
        <div className="glass-effect-dark rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <Clock className="text-yellow-400" size={20} />
            Sent Requests ({pendingSent.length})
          </h3>
          
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {pendingSent.length > 0 ? (
              pendingSent.map(request => (
                <div key={request._id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center text-black font-bold text-sm">
                      {getInitials(request.receiver?.name)}
                    </div>
                    <div>
                      <p className="text-white font-medium">{request.receiver?.name}</p>
                      <p className="text-white/50 text-sm">@{request.receiver?.nickName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => rejectHandshake(request._id)}
                    className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                    title="Cancel request"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-white/40 text-center py-4">No pending sent requests</p>
            )}
          </div>
        </div>
      </div>

      {/* Right Column - Received Requests & Friends */}
      <div className="space-y-6">
        {/* Received Requests */}
        <div className="glass-effect-dark rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <UserPlus className="text-gold" size={20} />
            Handshake Requests ({pendingReceived.length})
          </h3>
          
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {loadingPending ? (
              <div className="text-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-gold border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : pendingReceived.length > 0 ? (
              pendingReceived.map(request => (
                <div key={request._id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center text-black font-bold text-sm">
                      {getInitials(request.sender?.name)}
                    </div>
                    <div>
                      <p className="text-white font-medium">{request.sender?.name}</p>
                      <p className="text-white/50 text-sm">@{request.sender?.nickName}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptHandshake(request._id)}
                      className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
                      title="Accept"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={() => rejectHandshake(request._id)}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                      title="Decline"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-white/40 text-center py-4">No pending requests</p>
            )}
          </div>
        </div>

        {/* Friends List */}
        <div className="glass-effect-dark rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <Users className="text-green-400" size={20} />
            My Friends ({friends.length})
          </h3>
          
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {friends.length > 0 ? (
              friends.map(friend => (
                <div 
                  key={friend._id} 
                  onClick={() => openChatWithFriend(friend)}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center text-black font-bold text-sm">
                        {getInitials(friend.name)}
                      </div>
                      {onlineUsers[friend._id] && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-black rounded-full"></div>
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">{friend.name}</p>
                      <p className="text-white/50 text-sm">@{friend.nickName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFriend(friend);
                      }}
                      className="px-2.5 py-1.5 text-xs bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove friend"
                    >
                      Unfriend
                    </button>
                    <MessageCircle className="text-gold opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-white/40 text-center py-4">No friends yet. Send some handshakes!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Render Chat View
  const renderChatView = () => (
    <div className="flex h-[calc(100vh-160px)] gap-6">
      {/* Friends Sidebar */}
      <div className="w-80 glass-effect-dark rounded-2xl p-4 flex flex-col">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Users className="text-gold" size={20} />
          Friends
        </h3>
        
        <div className="flex-1 overflow-y-auto space-y-2">
          {friends.map(friend => (
            <div 
              key={friend._id}
              onClick={() => openChatWithFriend(friend)}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                activeFriend?._id === friend._id 
                  ? 'bg-gold/20 border border-gold/30' 
                  : 'hover:bg-white/10'
              }`}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center text-black font-bold text-sm">
                  {getInitials(friend.name)}
                </div>
                {onlineUsers[friend._id] && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-black rounded-full"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{friend.name}</p>
                <p className="text-white/50 text-sm truncate">@{friend.nickName}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFriend(friend);
                }}
                className="px-2 py-1 text-[11px] bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 rounded-md transition-colors"
                title="Remove friend"
              >
                Unfriend
              </button>
            </div>
          ))}
        </div>
        
        <button
          onClick={() => setActiveView('connect')}
          className="mt-4 w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <UserPlus size={18} />
          Find More Friends
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 glass-effect-dark rounded-2xl flex flex-col overflow-hidden">
        {activeFriend ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveView('connect')}
                  className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ArrowLeft size={20} className="text-white" />
                </button>
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center text-black font-bold">
                    {getInitials(activeFriend.name)}
                  </div>
                  {onlineUsers[activeFriend._id] && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-black rounded-full"></div>
                  )}
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">{activeFriend.name}</h3>
                  <p className="text-white/50 text-sm">
                    {onlineUsers[activeFriend._id] ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleWatchTogether}
                className="px-4 py-2 bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30 rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <Film size={18} />
                Watch Together
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full"></div>
                </div>
              ) : messages.length > 0 ? (
                <>
                  {messages.map((message, index) => {
                    // Check if message was sent by current user
                    // Handle both populated sender object and plain string ID
                    const senderId = message.sender?._id || message.sender;
                    const isOwn = senderId === currentUser._id || senderId === currentUser.id;
                    
                    return (
                      <motion.div
                        key={message._id || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${isOwn ? 'ml-auto' : 'mr-auto'}`}>
                          <div className={`px-4 py-2.5 rounded-2xl ${
                            isOwn 
                              ? 'bg-gradient-to-r from-gold to-gold-light text-black rounded-br-sm' 
                              : 'bg-white/10 text-white rounded-bl-sm'
                          }`}>
                            <p className="break-words whitespace-pre-wrap">{message.content}</p>
                          </div>
                          <p className={`text-xs text-white/40 mt-1 px-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-white/40">
                  <div className="text-center">
                    <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-sm">Start the conversation!</p>
                  </div>
                </div>
              )}
              
              {/* Typing Indicator */}
              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 text-white/50 text-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span>{typingUsers[0]?.userName} is typing...</span>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-white/10">
              <form onSubmit={sendMessageHandler} className="flex items-center gap-3">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2.5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl transition-colors"
                  >
                    <Smile size={22} />
                  </button>
                  
                  {showEmojiPicker && (
                    <div className="absolute bottom-14 left-0 z-50">
                      <EmojiPicker
                        onEmojiClick={onEmojiClick}
                        theme="dark"
                        width={320}
                        height={400}
                      />
                    </div>
                  )}
                </div>
                
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={handleTyping}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-gold/50 transition-colors"
                />
                
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-3 bg-gold hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-xl transition-colors"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-white/40">
            <div className="text-center">
              <MessageCircle size={64} className="mx-auto mb-4 opacity-50" />
              <p className="text-xl">Select a friend to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen px-10 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">
            {activeView === 'connect' ? 'Find & Connect' : 'Chat'}
          </h1>
          <p className="text-white/60">
            {activeView === 'connect' 
              ? 'Search for friends and send handshake requests' 
              : 'Chat with your friends in real-time'
            }
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setActiveView('connect')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 ${
              activeView === 'connect'
                ? 'bg-gold text-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <UserPlus size={18} />
            Connect
          </button>
          <button
            onClick={() => setActiveView('chat')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 ${
              activeView === 'chat'
                ? 'bg-gold text-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <MessageCircle size={18} />
            Chat
          </button>
        </div>
      </div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeView === 'connect' ? renderConnectView() : renderChatView()}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showUnfriendModal && friendToRemove && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closeUnfriendModal}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-[#111317] border border-white/10 rounded-2xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-2">Remove Friend?</h3>
              <p className="text-white/70 mb-6 leading-relaxed">
                Are you sure you want to remove <span className="text-white font-semibold">{friendToRemove.name}</span> from your friends list?
                You will need to send a new handshake request to connect again.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={closeUnfriendModal}
                  disabled={removingFriend}
                  className="px-4 py-2 rounded-lg border border-white/15 text-white/80 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRemoveFriend}
                  disabled={removingFriend}
                  className="px-4 py-2 rounded-lg bg-red-500/90 hover:bg-red-500 text-white font-semibold transition-colors disabled:opacity-50"
                >
                  {removingFriend ? 'Removing...' : 'Yes, Unfriend'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chat;
