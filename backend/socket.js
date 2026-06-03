const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('./models/Message');
const ChatRoom = require('./models/ChatRoom');
const WatchRoom = require('./models/WatchRoom');
const User = require('./models/user');
const notificationService = require('./utils/notificationService');

// Store online users: { odObjectId: socketId }
const onlineUsers = new Map();

/**
 * Initialize Socket.io with the HTTP server
 */
function initializeSocket(httpServer) {
    // Track active users by watch room: Map<roomId, Map<userId, userData>>
    const watchRoomPresence = new Map();
    // Track who can control playback in each watch room: Map<roomId, Set<userId>>
    const watchRoomControlPermissions = new Map();
    // Track last video state update timestamp per room for latency compensation
    const watchRoomLastUpdate = new Map();

    const hasPlaybackControl = (watchRoomId, userId, hostId) => {
        const key = watchRoomId.toString();
        if (hostId && hostId.toString() === userId) return true;
        const controllers = watchRoomControlPermissions.get(key);
        return !!controllers && controllers.has(userId);
    };

    const io = new Server(httpServer, {
        cors: {
            origin: true, // Allow all origins in development
            methods: ['GET', 'POST'],
            credentials: true
        },
        // Allow connections from different IPs in development
        allowEIO3: true,
        pingTimeout: 60000,
        pingInterval: 25000
    });

    // Authentication middleware for Socket.io
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.query.token;
            
            if (!token) {
                console.log('[SOCKET] Connection rejected: No token provided');
                return next(new Error('Authentication required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('_id name nickName');
            
            if (!user) {
                console.log('[SOCKET] Connection rejected: User not found');
                return next(new Error('User not found'));
            }

            socket.user = user;
            next();
        } catch (error) {
            console.log('[SOCKET] Connection rejected: Invalid token');
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.user._id.toString();
        console.log('[SOCKET] User connected: ' + socket.user.nickName + ' (' + userId + ')');

        // Store user's socket
        onlineUsers.set(userId, socket.id);

        // Broadcast online status
        socket.broadcast.emit('user:online', { userId });

        // Join user to their personal room (for receiving notifications)
        socket.join(`user:${userId}`);

        // Track joined watch rooms per socket for cleanup on disconnect
        socket.data.joinedWatchRooms = new Set();

        /**
         * Join a watch room (by room ObjectId or inviteCode)
         */
        socket.on('join-room', async (data = {}) => {
            const { roomId } = data;

            if (!roomId) {
                socket.emit('error', { message: 'roomId is required' });
                return;
            }

            try {
                let watchRoom = null;

                // Try by ObjectId first, then inviteCode.
                if (/^[a-fA-F0-9]{24}$/.test(roomId)) {
                    watchRoom = await WatchRoom.findById(roomId);
                }
                if (!watchRoom) {
                    watchRoom = await WatchRoom.findOne({ inviteCode: roomId });
                }

                if (!watchRoom) {
                    socket.emit('error', { message: 'Watch room not found' });
                    return;
                }

                if (watchRoom.status === 'ended') {
                    socket.emit('error', { message: 'This watch room has ended' });
                    return;
                }

                // Ensure participant membership while joining through invite route.
                const isHost = watchRoom.host.toString() === userId;
                const isParticipant = watchRoom.participants.some(p => p.toString() === userId);
                if (!isHost && !isParticipant) {
                    watchRoom.participants.push(userId);
                }

                // Ensure attendee entry / rejoin tracking.
                const existingAttendee = watchRoom.attendees.find(a => a.user.toString() === userId);
                if (existingAttendee) {
                    existingAttendee.leftAt = null;
                } else {
                    watchRoom.attendees.push({ user: userId, joinedAt: new Date() });
                }
                await watchRoom.save();

                const watchSocketRoom = `watch:${watchRoom._id.toString()}`;
                const roomKey = watchRoom._id.toString();
                const hostId = watchRoom.host.toString();
                
                // Initialize presence map if needed
                if (!watchRoomPresence.has(roomKey)) {
                    watchRoomPresence.set(roomKey, new Map());
                }

                // Add user to presence BEFORE joining socket room
                const roomUsers = watchRoomPresence.get(roomKey);
                const userPayload = {
                    id: userId,
                    name: socket.user.name,
                    nickName: socket.user.nickName
                };
                
                // Check if user is rejoining
                const isRejoin = roomUsers.has(userId);
                roomUsers.set(userId, userPayload);
                
                if (isRejoin) {
                    console.log(`[SOCKET] ${socket.user.nickName} is REJOINING watch room ${roomKey}`);
                } else {
                    console.log(`[SOCKET] ${socket.user.nickName} is JOINING watch room ${roomKey} for the first time`);
                }

                // Initialize control permissions
                if (!watchRoomControlPermissions.has(roomKey)) {
                    watchRoomControlPermissions.set(roomKey, new Set([hostId]));
                }
                const controllers = watchRoomControlPermissions.get(roomKey);
                controllers.add(hostId);

                // Now join the socket room
                socket.join(watchSocketRoom);
                socket.data.joinedWatchRooms.add(roomKey);

                // Get all users for broadcast
                const allUsers = Array.from(roomUsers.values());
                
                console.log(`[SOCKET] ${socket.user.nickName} joined watch room ${roomKey}. Total users: ${allUsers.length}`);
                console.log('[SOCKET] Current participants:', allUsers.map(u => u.nickName || u.name).join(', '));

                // Use setImmediate to ensure socket.join() completes before emitting
                setImmediate(() => {
                    console.log('[SOCKET] ========== EMITTING ROOM-USERS ==========');
                    console.log('[SOCKET] To user:', socket.user.nickName);
                    console.log('[SOCKET] Room:', roomKey);
                    console.log('[SOCKET] Users to send:', JSON.stringify(allUsers, null, 2));
                    
                    // Send to the joining user first (guaranteed delivery)
                    socket.emit('room-users', {
                        roomId: roomKey,
                        users: allUsers
                    });
                    console.log(`[SOCKET] ✓ Sent room-users to ${socket.user.nickName}:`, allUsers.map(u => u.nickName).join(', '));

                    // Then broadcast to all others in the room
                    socket.to(watchSocketRoom).emit('room-users', {
                        roomId: roomKey,
                        users: allUsers
                    });
                    console.log(`[SOCKET] ✓ Broadcasted room-users to others in room`);

                    // Also notify others about the new connection
                    socket.to(watchSocketRoom).emit('user-connected', {
                        roomId: watchRoom._id,
                        user: userPayload
                    });
                    console.log('[SOCKET] ========== END EMITTING ==========');
                });

                // Calculate compensated time for late joiners
                const baseTime = Number(watchRoom.videoState?.currentTime || 0);
                const isPlayingNow = !!watchRoom.videoState?.isPlaying;
                const lastUpdatedAt = watchRoom.videoState?.lastUpdated
                    ? new Date(watchRoom.videoState.lastUpdated).getTime()
                    : Date.now();
                const driftSeconds = isPlayingNow
                    ? Math.max(0, (Date.now() - lastUpdatedAt) / 1000)
                    : 0;

                const compensatedTime = baseTime + driftSeconds;

                socket.emit('room-joined', {
                    roomId: watchRoom._id.toString(),
                    inviteCode: watchRoom.inviteCode,
                    videoState: {
                        currentTime: compensatedTime,
                        isPlaying: isPlayingNow,
                        lastUpdated: watchRoom.videoState?.lastUpdated || new Date(),
                        updatedBy: watchRoom.videoState?.updatedBy || null,
                        serverTimestamp: Date.now() // For latency calculation
                    },
                    permissions: {
                        canControl: controllers.has(userId),
                        controllers: Array.from(controllers)
                    }
                });

                io.to(watchSocketRoom).emit('playback:control-state', {
                    roomId: watchRoom._id.toString(),
                    controllers: Array.from(controllers)
                });

                console.log('[SOCKET] ' + socket.user.nickName + ' joined watch room: ' + watchRoom._id);
            } catch (error) {
                console.error('[SOCKET] Watch room join error:', error.message);
                socket.emit('error', { message: 'Failed to join watch room' });
            }
        });

        /**
         * Request current room users (manual refresh)
         */
        socket.on('request-room-users', async (data = {}, callback) => {
            const { roomId } = data;
            
            console.log(`[SOCKET] ========== REQUEST-ROOM-USERS ==========`);
            console.log(`[SOCKET] From: ${socket.user.nickName}`);
            console.log(`[SOCKET] Room ID:`, roomId);
            
            if (!roomId) {
                console.log('[SOCKET] ERROR: No roomId provided');
                if (typeof callback === 'function') {
                    callback({ success: false, message: 'roomId is required' });
                }
                return;
            }

            try {
                let watchRoom = null;
                if (/^[a-fA-F0-9]{24}$/.test(roomId)) {
                    watchRoom = await WatchRoom.findById(roomId);
                }
                if (!watchRoom) {
                    watchRoom = await WatchRoom.findOne({ inviteCode: roomId });
                }
                if (!watchRoom) {
                    console.log('[SOCKET] ERROR: Watch room not found');
                    if (typeof callback === 'function') {
                        callback({ success: false, message: 'Watch room not found' });
                    }
                    return;
                }

                const watchRoomId = watchRoom._id.toString();
                const roomUsers = watchRoomPresence.get(watchRoomId);

                console.log('[SOCKET] Presence map exists:', !!roomUsers);
                console.log('[SOCKET] Presence map size:', roomUsers ? roomUsers.size : 0);

                if (roomUsers && roomUsers.size > 0) {
                    const allUsers = Array.from(roomUsers.values());
                    console.log('[SOCKET] Sending users:', JSON.stringify(allUsers, null, 2));
                    
                    socket.emit('room-users', {
                        roomId: watchRoomId,
                        users: allUsers
                    });
                    
                    console.log(`[SOCKET] ✓ Sent ${allUsers.length} users to ${socket.user.nickName}:`, allUsers.map(u => u.nickName).join(', '));
                    
                    if (typeof callback === 'function') {
                        callback({ success: true, userCount: allUsers.length });
                    }
                } else {
                    console.log('[SOCKET] WARNING: No users in presence map, sending empty array');
                    socket.emit('room-users', {
                        roomId: watchRoomId,
                        users: []
                    });
                    
                    if (typeof callback === 'function') {
                        callback({ success: true, userCount: 0, warning: 'No users in presence map' });
                    }
                }
                
                console.log('[SOCKET] ========== END REQUEST-ROOM-USERS ==========');
            } catch (error) {
                console.error('[SOCKET] ERROR in request-room-users:', error.message);
                console.error('[SOCKET] Stack:', error.stack);
                if (typeof callback === 'function') {
                    callback({ success: false, message: error.message });
                }
            }
        });

        /**
         * Leave a watch room
         */
        socket.on('leave-room', async (data = {}) => {
            const { roomId } = data;
            if (!roomId) return;

            try {
                let watchRoom = null;
                if (/^[a-fA-F0-9]{24}$/.test(roomId)) {
                    watchRoom = await WatchRoom.findById(roomId);
                }
                if (!watchRoom) {
                    watchRoom = await WatchRoom.findOne({ inviteCode: roomId });
                }
                if (!watchRoom) return;

                const watchRoomId = watchRoom._id.toString();
                const watchSocketRoom = `watch:${watchRoomId}`;

                socket.leave(watchSocketRoom);
                socket.data.joinedWatchRooms.delete(watchRoomId);

                const attendee = watchRoom.attendees.find(a => a.user.toString() === userId);
                if (attendee && !attendee.leftAt) {
                    attendee.leftAt = new Date();
                    await watchRoom.save();
                }

                const roomUsers = watchRoomPresence.get(watchRoomId);
                if (roomUsers) {
                    const hadUser = roomUsers.has(userId);
                    roomUsers.delete(userId);
                    
                    console.log(`[SOCKET] ${socket.user.nickName} left watch room ${watchRoomId}. Had user: ${hadUser}, Remaining: ${roomUsers.size}`);
                    
                    if (roomUsers.size === 0) {
                        watchRoomPresence.delete(watchRoomId);
                        watchRoomControlPermissions.delete(watchRoomId);
                        watchRoomLastUpdate.delete(watchRoomId);
                        console.log(`[SOCKET] Watch room ${watchRoomId} is now empty, cleaning up`);
                    } else {
                        // Broadcast updated user list to remaining participants
                        const remainingUsers = Array.from(roomUsers.values());
                        io.to(watchSocketRoom).emit('room-users', {
                            roomId: watchRoomId,
                            users: remainingUsers
                        });
                        console.log(`[SOCKET] Broadcasted updated user list to room. Remaining users:`, remainingUsers.map(u => u.nickName || u.name).join(', '));
                    }
                }

                const controllers = watchRoomControlPermissions.get(watchRoomId);
                if (controllers) {
                    controllers.delete(userId);
                }

                socket.to(watchSocketRoom).emit('user-disconnected', {
                    roomId: watchRoomId,
                    userId
                });

                console.log('[SOCKET] ' + socket.user.nickName + ' left watch room: ' + watchRoomId);
            } catch (error) {
                console.error('[SOCKET] Watch room leave error:', error.message);
            }
        });


        /**
         * Send a watch-room chat message
         */
        socket.on('watch:message:send', async (data = {}, callback) => {
            const { roomId, content } = data;

            try {
                if (!roomId) {
                    socket.emit('error', { message: 'roomId is required' });
                    if (typeof callback === 'function') {
                        callback({ success: false, message: 'roomId is required' });
                    }
                    return;
                }

                if (!content || content.trim().length === 0) {
                    socket.emit('error', { message: 'Message cannot be empty' });
                    if (typeof callback === 'function') {
                        callback({ success: false, message: 'Message cannot be empty' });
                    }
                    return;
                }

                let watchRoom = null;
                if (/^[a-fA-F0-9]{24}$/.test(roomId)) {
                    watchRoom = await WatchRoom.findById(roomId);
                }
                if (!watchRoom) {
                    watchRoom = await WatchRoom.findOne({ inviteCode: roomId });
                }

                if (!watchRoom) {
                    socket.emit('error', { message: 'Watch room not found' });
                    if (typeof callback === 'function') {
                        callback({ success: false, message: 'Watch room not found' });
                    }
                    return;
                }

                if (watchRoom.status === 'ended') {
                    socket.emit('error', { message: 'This watch room has ended' });
                    if (typeof callback === 'function') {
                        callback({ success: false, message: 'This watch room has ended' });
                    }
                    return;
                }

                const isHost = watchRoom.host.toString() === userId;
                const isParticipant = watchRoom.participants.some(p => p.toString() === userId);
                if (!isHost && !isParticipant) {
                    socket.emit('error', { message: 'Not authorized to send messages in this room' });
                    if (typeof callback === 'function') {
                        callback({ success: false, message: 'Not authorized to send messages in this room' });
                    }
                    return;
                }

                const newMessage = {
                    sender: socket.user._id,
                    content: content.trim(),
                    createdAt: new Date()
                };

                watchRoom.messages.push(newMessage);
                await watchRoom.save();

                const persistedMessage = watchRoom.messages[watchRoom.messages.length - 1];
                const payload = {
                    _id: persistedMessage._id,
                    roomId: watchRoom._id,
                    sender: {
                        _id: socket.user._id,
                        name: socket.user.name,
                        nickName: socket.user.nickName
                    },
                    content: persistedMessage.content,
                    createdAt: persistedMessage.createdAt
                };

                io.to(`watch:${watchRoom._id.toString()}`).emit('watch:message:received', {
                    message: payload
                });

                if (typeof callback === 'function') {
                    callback({ success: true, message: payload });
                }

                console.log('[SOCKET] Watch message sent in room ' + watchRoom._id + ' by ' + socket.user.nickName);
            } catch (error) {
                console.error('[SOCKET] Watch message send error:', error.message);
                socket.emit('error', { message: 'Failed to send watch message' });
                if (typeof callback === 'function') {
                    callback({ success: false, message: 'Failed to send watch message' });
                }
            }
        });

        /**
         * Host changes the YouTube source for all users in the room
         */
        socket.on('watch:change-source', async (data = {}) => {
            const { roomId, youtubeVideoId } = data;
            console.log(`[SOCKET] watch:change-source request received - roomId: ${roomId}, youtubeVideoId: ${youtubeVideoId}`);

            try {
                if (!roomId || !youtubeVideoId) {
                    console.log('[SOCKET] Change source rejected: missing roomId or youtubeVideoId');
                    return;
                }

                let watchRoom = null;
                if (/^[a-fA-F0-9]{24}$/.test(roomId)) {
                    watchRoom = await WatchRoom.findById(roomId);
                }
                if (!watchRoom) {
                    watchRoom = await WatchRoom.findOne({ inviteCode: roomId });
                }
                if (!watchRoom) {
                    console.log('[SOCKET] Change source rejected: watch room not found');
                    return;
                }
                if (watchRoom.status === 'ended') {
                    console.log('[SOCKET] Change source rejected: watch room has ended');
                    return;
                }

                // Check host/controller permissions
                const hasControl = hasPlaybackControl(watchRoom._id, userId, watchRoom.host);
                if (!hasControl) {
                    console.log(`[SOCKET] Change source rejected: User ${userId} does not have control permissions`);
                    return;
                }

                // Create or find the Movie document for the new YouTube video ID
                const Movie = require('./models/Movie');
                let movie = await Movie.findOne({ imdbID: `yt_${youtubeVideoId}` });
                if (!movie) {
                    console.log(`[SOCKET] Movie document not found for yt_${youtubeVideoId}, creating new one...`);
                    movie = await Movie.create({
                        imdbID: `yt_${youtubeVideoId}`,
                        Title: 'YouTube Video',
                        Poster: `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`,
                        videoFolderName: `yt_${youtubeVideoId}`,
                        Year: new Date().getFullYear().toString(),
                        Genre: 'YouTube Video',
                        Runtime: 'Live Stream'
                    });
                }

                // Update room's movie reference
                watchRoom.movie = movie._id;
                await watchRoom.save();
                console.log(`[SOCKET] WatchRoom ${watchRoom._id} movie reference updated to Movie ID ${movie._id} (yt_${youtubeVideoId})`);

                // Broadcast to all users in the room (including sender)
                io.to(`watch:${watchRoom._id.toString()}`).emit('watch:change-source', {
                    roomId: watchRoom._id.toString(),
                    youtubeVideoId,
                    changedBy: socket.user.nickName || socket.user.name
                });

                console.log(`[SOCKET] watch:change-source: room=${watchRoom._id}, videoId=${youtubeVideoId}, user=${socket.user.nickName} broadcasted`);
            } catch (error) {
                console.error('[SOCKET] watch:change-source error:', error.stack || error.message);
            }
        });

        /**
         * Host grants playback control to a participant
         */
        socket.on('playback:grant-control', async (data = {}) => {
            const { roomId, targetUserId } = data;

            try {
                if (!roomId || !targetUserId) return;

                let watchRoom = null;
                if (/^[a-fA-F0-9]{24}$/.test(roomId)) {
                    watchRoom = await WatchRoom.findById(roomId);
                }
                if (!watchRoom) {
                    watchRoom = await WatchRoom.findOne({ inviteCode: roomId });
                }
                if (!watchRoom || watchRoom.status === 'ended') return;

                if (!hasPlaybackControl(watchRoom._id, userId, watchRoom.host)) return;

                const watchRoomId = watchRoom._id.toString();
                const hostId = watchRoom.host.toString();
                if (hostId !== userId) return;

                if (!watchRoomControlPermissions.has(watchRoomId)) {
                    watchRoomControlPermissions.set(watchRoomId, new Set([hostId]));
                }

                const controllers = watchRoomControlPermissions.get(watchRoomId);
                controllers.add(hostId);
                controllers.add(targetUserId.toString());

                io.to(`watch:${watchRoomId}`).emit('playback:control-state', {
                    roomId: watchRoomId,
                    controllers: Array.from(controllers)
                });
            } catch (error) {
                console.error('[SOCKET] playback:grant-control error:', error.message);
            }
        });

        /**
         * Host revokes playback control from a participant
         */
        socket.on('playback:revoke-control', async (data = {}) => {
            const { roomId, targetUserId } = data;

            try {
                if (!roomId || !targetUserId) return;

                let watchRoom = null;
                if (/^[a-fA-F0-9]{24}$/.test(roomId)) {
                    watchRoom = await WatchRoom.findById(roomId);
                }
                if (!watchRoom) {
                    watchRoom = await WatchRoom.findOne({ inviteCode: roomId });
                }
                if (!watchRoom || watchRoom.status === 'ended') return;

                if (!hasPlaybackControl(watchRoom._id, userId, watchRoom.host)) return;

                const watchRoomId = watchRoom._id.toString();
                const hostId = watchRoom.host.toString();
                if (hostId !== userId) return;

                const controllers = watchRoomControlPermissions.get(watchRoomId);
                if (controllers) {
                    controllers.add(hostId);
                    if (targetUserId.toString() !== hostId) {
                        controllers.delete(targetUserId.toString());
                    }
                }

                io.to(`watch:${watchRoomId}`).emit('playback:control-state', {
                    roomId: watchRoomId,
                    controllers: controllers ? Array.from(controllers) : [hostId]
                });
            } catch (error) {
                console.error('[SOCKET] playback:revoke-control error:', error.message);
            }
        });

        /**
         * IMPROVED: Watch-room video sync: play with latency compensation
         */
        socket.on('video-play', async (data = {}) => {
            const { roomId, time = 0, clientTimestamp } = data;

            try {
                if (!roomId) return;

                let watchRoom = null;
                if (/^[a-fA-F0-9]{24}$/.test(roomId)) {
                    watchRoom = await WatchRoom.findById(roomId);
                }
                if (!watchRoom) {
                    watchRoom = await WatchRoom.findOne({ inviteCode: roomId });
                }
                if (!watchRoom || watchRoom.status === 'ended') return;

                if (!hasPlaybackControl(watchRoom._id, userId, watchRoom.host)) return;

                const watchRoomId = watchRoom._id.toString();
                const serverTimestamp = Date.now();
                
                // Prevent race conditions: check if this update is newer than last
                const lastUpdate = watchRoomLastUpdate.get(watchRoomId) || 0;
                if (clientTimestamp && clientTimestamp < lastUpdate) {
                    console.log('[SOCKET] Ignoring stale video-play event');
                    return;
                }
                watchRoomLastUpdate.set(watchRoomId, serverTimestamp);

                watchRoom.videoState.currentTime = Number.isFinite(time) ? time : 0;
                watchRoom.videoState.isPlaying = true;
                watchRoom.videoState.lastUpdated = new Date(serverTimestamp);
                watchRoom.videoState.updatedBy = socket.user._id;
                await watchRoom.save();

                // Broadcast with buffering hint for smooth playback
                socket.to(`watch:${watchRoom._id.toString()}`).emit('video-play', {
                    roomId: watchRoom._id.toString(),
                    time: watchRoom.videoState.currentTime,
                    userId,
                    serverTimestamp,
                    bufferDelay: 200 // Hint clients to buffer before playing
                });

                console.log(`[SOCKET] video-play: room=${watchRoomId}, time=${time.toFixed(2)}s, user=${socket.user.nickName}`);
            } catch (error) {
                console.error('[SOCKET] video-play error:', error.message);
            }
        });

        /**
         * IMPROVED: Watch-room video sync: pause with latency compensation
         */
        socket.on('video-pause', async (data = {}) => {
            const { roomId, time = 0, clientTimestamp } = data;

            try {
                if (!roomId) return;

                let watchRoom = null;
                if (/^[a-fA-F0-9]{24}$/.test(roomId)) {
                    watchRoom = await WatchRoom.findById(roomId);
                }
                if (!watchRoom) {
                    watchRoom = await WatchRoom.findOne({ inviteCode: roomId });
                }
                if (!watchRoom || watchRoom.status === 'ended') return;

                if (!hasPlaybackControl(watchRoom._id, userId, watchRoom.host)) return;

                const watchRoomId = watchRoom._id.toString();
                const serverTimestamp = Date.now();
                
                // Prevent race conditions
                const lastUpdate = watchRoomLastUpdate.get(watchRoomId) || 0;
                if (clientTimestamp && clientTimestamp < lastUpdate) {
                    console.log('[SOCKET] Ignoring stale video-pause event');
                    return;
                }
                watchRoomLastUpdate.set(watchRoomId, serverTimestamp);

                watchRoom.videoState.currentTime = Number.isFinite(time) ? time : 0;
                watchRoom.videoState.isPlaying = false;
                watchRoom.videoState.lastUpdated = new Date(serverTimestamp);
                watchRoom.videoState.updatedBy = socket.user._id;
                await watchRoom.save();

                socket.to(`watch:${watchRoom._id.toString()}`).emit('video-pause', {
                    roomId: watchRoom._id.toString(),
                    time: watchRoom.videoState.currentTime,
                    userId,
                    serverTimestamp
                });

                console.log(`[SOCKET] video-pause: room=${watchRoomId}, time=${time.toFixed(2)}s, user=${socket.user.nickName}`);
            } catch (error) {
                console.error('[SOCKET] video-pause error:', error.message);
            }
        });

        /**
         * IMPROVED: Watch-room video sync: seek with latency compensation
         */
        socket.on('video-seek', async (data = {}) => {
            const { roomId, time = 0, isPlaying = false, clientTimestamp } = data;

            try {
                if (!roomId) return;

                let watchRoom = null;
                if (/^[a-fA-F0-9]{24}$/.test(roomId)) {
                    watchRoom = await WatchRoom.findById(roomId);
                }
                if (!watchRoom) {
                    watchRoom = await WatchRoom.findOne({ inviteCode: roomId });
                }
                if (!watchRoom || watchRoom.status === 'ended') return;

                if (!hasPlaybackControl(watchRoom._id, userId, watchRoom.host)) return;

                const watchRoomId = watchRoom._id.toString();
                const serverTimestamp = Date.now();
                
                // Prevent race conditions
                const lastUpdate = watchRoomLastUpdate.get(watchRoomId) || 0;
                if (clientTimestamp && clientTimestamp < lastUpdate) {
                    console.log('[SOCKET] Ignoring stale video-seek event');
                    return;
                }
                watchRoomLastUpdate.set(watchRoomId, serverTimestamp);

                watchRoom.videoState.currentTime = Number.isFinite(time) ? time : 0;
                watchRoom.videoState.isPlaying = !!isPlaying;
                watchRoom.videoState.lastUpdated = new Date(serverTimestamp);
                watchRoom.videoState.updatedBy = socket.user._id;
                await watchRoom.save();

                socket.to(`watch:${watchRoom._id.toString()}`).emit('video-seek', {
                    roomId: watchRoom._id.toString(),
                    time: watchRoom.videoState.currentTime,
                    isPlaying: watchRoom.videoState.isPlaying,
                    userId,
                    serverTimestamp
                });

                console.log(`[SOCKET] video-seek: room=${watchRoomId}, time=${time.toFixed(2)}s, isPlaying=${isPlaying}, user=${socket.user.nickName}`);
            } catch (error) {
                console.error('[SOCKET] video-seek error:', error.message);
            }
        });

        /**
         * IMPROVED: Periodic heartbeat sync with threshold-based correction
         * Only sent every 5-10 seconds by clients with control
         */
        socket.on('video-heartbeat', async (data = {}) => {
            const { roomId, time = 0, isPlaying = false } = data;

            try {
                if (!roomId) return;

                let watchRoom = null;
                if (/^[a-fA-F0-9]{24}$/.test(roomId)) {
                    watchRoom = await WatchRoom.findById(roomId);
                }
                if (!watchRoom) {
                    watchRoom = await WatchRoom.findOne({ inviteCode: roomId });
                }
                if (!watchRoom || watchRoom.status === 'ended') return;

                if (!hasPlaybackControl(watchRoom._id, userId, watchRoom.host)) return;

                const watchRoomId = watchRoom._id.toString();

                // Update state in database
                watchRoom.videoState.currentTime = Number.isFinite(time) ? time : 0;
                watchRoom.videoState.isPlaying = !!isPlaying;
                watchRoom.videoState.lastUpdated = new Date();
                watchRoom.videoState.updatedBy = socket.user._id;
                await watchRoom.save();

                // Broadcast heartbeat to other clients (they'll apply threshold logic)
                socket.to(`watch:${watchRoom._id.toString()}`).emit('video-heartbeat', {
                    roomId: watchRoom._id.toString(),
                    time: watchRoom.videoState.currentTime,
                    isPlaying: watchRoom.videoState.isPlaying,
                    userId,
                    serverTimestamp: Date.now()
                });
            } catch (error) {
                console.error('[SOCKET] video-heartbeat error:', error.message);
            }
        });

        /**
         * Lightweight NTP Clock Sync Ping
         */
        socket.on('sync:ping', (data = {}) => {
            const { clientTime } = data;
            socket.emit('sync:pong', {
                clientTime,
                serverTime: Date.now()
            });
        });

        /**
         * Request the latest compensated video state from database
         */
        socket.on('video-sync-request', async (data = {}) => {
            const { roomId } = data;
            try {
                if (!roomId) return;
                let watchRoom = null;
                if (/^[a-fA-F0-9]{24}$/.test(roomId)) {
                    watchRoom = await WatchRoom.findById(roomId);
                }
                if (!watchRoom) {
                    watchRoom = await WatchRoom.findOne({ inviteCode: roomId });
                }
                if (!watchRoom || watchRoom.status === 'ended') return;

                const baseTime = Number(watchRoom.videoState?.currentTime || 0);
                const isPlayingNow = !!watchRoom.videoState?.isPlaying;
                const lastUpdatedAt = watchRoom.videoState?.lastUpdated
                    ? new Date(watchRoom.videoState.lastUpdated).getTime()
                    : Date.now();
                const driftSeconds = isPlayingNow
                    ? Math.max(0, (Date.now() - lastUpdatedAt) / 1000)
                    : 0;

                const compensatedTime = baseTime + driftSeconds;

                socket.emit('video-heartbeat', {
                    roomId: watchRoom._id.toString(),
                    time: compensatedTime,
                    isPlaying: isPlayingNow,
                    serverTimestamp: Date.now()
                });
                console.log(`[SOCKET] video-sync-request: room=${watchRoom._id.toString()}, compensatedTime=${compensatedTime.toFixed(2)}s`);
            } catch (error) {
                console.error('[SOCKET] video-sync-request error:', error.message);
            }
        });


        /**
         * Join a chat room
         */
        socket.on('room:join', async (data) => {
            const { chatRoomId } = data;
            
            try {
                // Verify user is participant
                const chatRoom = await ChatRoom.findById(chatRoomId);
                
                if (!chatRoom) {
                    socket.emit('error', { message: 'Chat room not found' });
                    return;
                }

                const isParticipant = chatRoom.participants.some(
                    p => p.toString() === userId
                );

                if (!isParticipant) {
                    socket.emit('error', { message: 'Not authorized to join this room' });
                    return;
                }

                socket.join(`room:${chatRoomId}`);
                console.log('[SOCKET] ' + socket.user.nickName + ' joined room: ' + chatRoomId);
                
                socket.emit('room:joined', { chatRoomId });
            } catch (error) {
                console.error('[SOCKET] Room join error:', error.message);
                socket.emit('error', { message: 'Failed to join room' });
            }
        });

        /**
         * Leave a chat room
         */
        socket.on('room:leave', (data) => {
            const { chatRoomId } = data;
            socket.leave(`room:${chatRoomId}`);
            console.log('[SOCKET] ' + socket.user.nickName + ' left room: ' + chatRoomId);
        });

        /**
         * Send a message
         */
        socket.on('message:send', async (data) => {
            const { chatRoomId, content } = data;

            try {
                if (!content || content.trim().length === 0) {
                    socket.emit('error', { message: 'Message cannot be empty' });
                    return;
                }

                // Verify user is participant
                const chatRoom = await ChatRoom.findById(chatRoomId);
                
                if (!chatRoom) {
                    socket.emit('error', { message: 'Chat room not found' });
                    return;
                }

                const isParticipant = chatRoom.participants.some(
                    p => p.toString() === userId
                );

                if (!isParticipant) {
                    socket.emit('error', { message: 'Not authorized to send messages here' });
                    return;
                }

                // Create message
                const message = await Message.create({
                    chatRoomId,
                    sender: userId,
                    content: content.trim(),
                    readBy: [userId]
                });

                // Update chat room's last message
                chatRoom.lastMessage = message._id;
                chatRoom.lastMessageAt = message.createdAt;
                await chatRoom.save();

                // Populate sender info
                await message.populate('sender', 'name nickName profilePicture');

                console.log('[SOCKET] Message sent in room ' + chatRoomId + ' by ' + socket.user.nickName);

                // Emit to all users in the room (including sender for confirmation)
                io.to(`room:${chatRoomId}`).emit('message:received', {
                    message: {
                        _id: message._id,
                        chatRoomId: message.chatRoomId,
                        sender: message.sender,
                        content: message.content,
                        createdAt: message.createdAt,
                        readBy: message.readBy
                    }
                });

                // Notify other participant if not in room
                const otherParticipant = chatRoom.participants.find(
                    p => p.toString() !== userId
                );
                
                if (otherParticipant) {
                    io.to(`user:${otherParticipant.toString()}`).emit('message:notification', {
                        chatRoomId,
                        message: {
                            _id: message._id,
                            sender: message.sender,
                            content: message.content.substring(0, 50),
                            createdAt: message.createdAt
                        }
                    });
                    
                    // Send notification for the new message
                    const messagePreview = message.content.length > 30 
                        ? message.content.substring(0, 30) + '...' 
                        : message.content;
                    
                    await notificationService.notifyMessage(
                        otherParticipant.toString(),
                        userId,
                        socket.user.nickName || socket.user.name,
                        messagePreview,
                        chatRoomId,
                        io
                    );
                }

            } catch (error) {
                console.error('[SOCKET] Message send error:', error.message);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        /**
         * Typing indicator
         */
        socket.on('typing:start', (data) => {
            const { chatRoomId } = data;
            socket.to(`room:${chatRoomId}`).emit('typing:start', {
                userId,
                userName: socket.user.nickName
            });
        });

        socket.on('typing:stop', (data) => {
            const { chatRoomId } = data;
            socket.to(`room:${chatRoomId}`).emit('typing:stop', {
                userId
            });
        });

        /**
         * Mark messages as read
         */
        socket.on('messages:read', async (data) => {
            const { chatRoomId } = data;

            try {
                await Message.updateMany(
                    { 
                        chatRoomId, 
                        sender: { $ne: userId },
                        readBy: { $ne: userId }
                    },
                    { $push: { readBy: userId } }
                );

                socket.to(`room:${chatRoomId}`).emit('messages:read', {
                    chatRoomId,
                    readBy: userId
                });
            } catch (error) {
                console.error('[SOCKET] Mark read error:', error.message);
            }
        });

        /**
         * Get online status of users
         */
        socket.on('users:status', (data) => {
            const { userIds } = data;
            const statuses = {};

            userIds.forEach(id => {
                statuses[id] = onlineUsers.has(id);
            });

            socket.emit('users:status', statuses);
        });

        /**
         * WebRTC Signaling for Watch Room Video Calls
         */
        socket.on('webrtc:signal', (data = {}) => {
            const { targetUserId, signal } = data;
            if (!targetUserId || !signal) return;

            const targetSocketId = onlineUsers.get(targetUserId.toString());
            if (targetSocketId) {
                io.to(targetSocketId).emit('webrtc:signal', {
                    senderUserId: userId,
                    signal
                });
            }
        });

        /**
         * Update video call state of a participant
         */
        socket.on('call:state-change', (data = {}) => {
            const { roomId, inCall, isMuted, isCameraOff, isHandRaised } = data;
            if (!roomId) return;

            const roomKey = roomId.toString();
            const roomUsers = watchRoomPresence.get(roomKey);
            if (roomUsers && roomUsers.has(userId)) {
                const userPayload = roomUsers.get(userId);
                userPayload.inCall = !!inCall;
                userPayload.isMuted = !!isMuted;
                userPayload.isCameraOff = !!isCameraOff;
                userPayload.isHandRaised = !!isHandRaised;
                roomUsers.set(userId, userPayload);

                const allUsers = Array.from(roomUsers.values());
                const watchSocketRoom = `watch:${roomKey}`;
                
                // Broadcast updated user list to everyone in the room
                io.to(watchSocketRoom).emit('room-users', {
                    roomId: roomKey,
                    users: allUsers
                });
            }
        });

        /**
         * Disconnect
         */
        socket.on('disconnect', () => {
            console.log('[SOCKET] User disconnected: ' + socket.user.nickName);

            // Clean watch room presence state and notify peers.
            if (socket.data.joinedWatchRooms && socket.data.joinedWatchRooms.size > 0) {
                socket.data.joinedWatchRooms.forEach((watchRoomId) => {
                    const roomUsers = watchRoomPresence.get(watchRoomId);
                    if (roomUsers) {
                        const hadUser = roomUsers.has(userId);
                        roomUsers.delete(userId);
                        
                        console.log(`[SOCKET] ${socket.user.nickName} disconnected from watch room ${watchRoomId}. Had user: ${hadUser}, Remaining: ${roomUsers.size}`);
                        
                        if (roomUsers.size === 0) {
                            watchRoomPresence.delete(watchRoomId);
                            watchRoomControlPermissions.delete(watchRoomId);
                            watchRoomLastUpdate.delete(watchRoomId);
                            console.log(`[SOCKET] Watch room ${watchRoomId} is now empty after disconnect, cleaning up`);
                        } else {
                            // Broadcast updated user list to remaining participants
                            const remainingUsers = Array.from(roomUsers.values());
                            io.to(`watch:${watchRoomId}`).emit('room-users', {
                                roomId: watchRoomId,
                                users: remainingUsers
                            });
                            console.log(`[SOCKET] Broadcasted updated user list after disconnect. Remaining:`, remainingUsers.map(u => u.nickName || u.name).join(', '));
                        }
                    }

                    const controllers = watchRoomControlPermissions.get(watchRoomId);
                    if (controllers) {
                        controllers.delete(userId);
                    }

                    socket.to(`watch:${watchRoomId}`).emit('user-disconnected', {
                        roomId: watchRoomId,
                        userId
                    });
                });
            }

            onlineUsers.delete(userId);
            socket.broadcast.emit('user:offline', { userId });
        });
    });

    console.log('[SOCKET] Socket.io initialized');
    return io;
}

module.exports = { initializeSocket, onlineUsers };
