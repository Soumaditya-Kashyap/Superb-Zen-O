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
                socket.join(watchSocketRoom);
                socket.data.joinedWatchRooms.add(watchRoom._id.toString());

                const roomKey = watchRoom._id.toString();
                const hostId = watchRoom.host.toString();
                if (!watchRoomControlPermissions.has(roomKey)) {
                    watchRoomControlPermissions.set(roomKey, new Set([hostId]));
                }
                const controllers = watchRoomControlPermissions.get(roomKey);
                controllers.add(hostId);

                if (!watchRoomPresence.has(watchRoom._id.toString())) {
                    watchRoomPresence.set(watchRoom._id.toString(), new Map());
                }

                const roomUsers = watchRoomPresence.get(watchRoom._id.toString());
                const userPayload = {
                    id: userId,
                    name: socket.user.name,
                    nickName: socket.user.nickName
                };
                roomUsers.set(userId, userPayload);

                // Send current participants to the joining user first.
                socket.emit('room-users', {
                    roomId: watchRoom._id.toString(),
                    users: Array.from(roomUsers.values())
                });

                // Notify others in room about this user.
                socket.to(watchSocketRoom).emit('user-connected', {
                    roomId: watchRoom._id,
                    user: userPayload
                });

                const baseTime = Number(watchRoom.videoState?.currentTime || 0);
                const isPlayingNow = !!watchRoom.videoState?.isPlaying;
                const lastUpdatedAt = watchRoom.videoState?.lastUpdated
                    ? new Date(watchRoom.videoState.lastUpdated).getTime()
                    : Date.now();
                const driftSeconds = isPlayingNow
                    ? Math.max(0, (Date.now() - lastUpdatedAt) / 1000)
                    : 0;

                socket.emit('room-joined', {
                    roomId: watchRoom._id.toString(),
                    inviteCode: watchRoom.inviteCode,
                    videoState: {
                        currentTime: baseTime + driftSeconds,
                        isPlaying: isPlayingNow,
                        lastUpdated: watchRoom.videoState?.lastUpdated || new Date(),
                        updatedBy: watchRoom.videoState?.updatedBy || null
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
                    roomUsers.delete(userId);
                    if (roomUsers.size === 0) {
                        watchRoomPresence.delete(watchRoomId);
                        watchRoomControlPermissions.delete(watchRoomId);
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
         * Watch-room video sync: play
         */
        socket.on('video-play', async (data = {}) => {
            const { roomId, time = 0 } = data;

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

                watchRoom.videoState.currentTime = Number.isFinite(time) ? time : 0;
                watchRoom.videoState.isPlaying = true;
                watchRoom.videoState.lastUpdated = new Date();
                watchRoom.videoState.updatedBy = socket.user._id;
                await watchRoom.save();

                socket.to(`watch:${watchRoom._id.toString()}`).emit('video-play', {
                    roomId: watchRoom._id.toString(),
                    time: watchRoom.videoState.currentTime,
                    userId
                });
            } catch (error) {
                console.error('[SOCKET] video-play error:', error.message);
            }
        });

        /**
         * Watch-room video sync: pause
         */
        socket.on('video-pause', async (data = {}) => {
            const { roomId, time = 0 } = data;

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

                watchRoom.videoState.currentTime = Number.isFinite(time) ? time : 0;
                watchRoom.videoState.isPlaying = false;
                watchRoom.videoState.lastUpdated = new Date();
                watchRoom.videoState.updatedBy = socket.user._id;
                await watchRoom.save();

                socket.to(`watch:${watchRoom._id.toString()}`).emit('video-pause', {
                    roomId: watchRoom._id.toString(),
                    time: watchRoom.videoState.currentTime,
                    userId
                });
            } catch (error) {
                console.error('[SOCKET] video-pause error:', error.message);
            }
        });

        /**
         * Watch-room video sync: seek
         */
        socket.on('video-seek', async (data = {}) => {
            const { roomId, time = 0 } = data;

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

                watchRoom.videoState.currentTime = Number.isFinite(time) ? time : 0;
                watchRoom.videoState.lastUpdated = new Date();
                watchRoom.videoState.updatedBy = socket.user._id;
                await watchRoom.save();

                socket.to(`watch:${watchRoom._id.toString()}`).emit('video-seek', {
                    roomId: watchRoom._id.toString(),
                    time: watchRoom.videoState.currentTime,
                    userId
                });
            } catch (error) {
                console.error('[SOCKET] video-seek error:', error.message);
            }
        });

        /**
         * Watch-room video sync: periodic state reconciliation (time + play state)
         */
        socket.on('video-sync', async (data = {}) => {
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

                watchRoom.videoState.currentTime = Number.isFinite(time) ? time : 0;
                watchRoom.videoState.isPlaying = !!isPlaying;
                watchRoom.videoState.lastUpdated = new Date();
                watchRoom.videoState.updatedBy = socket.user._id;
                await watchRoom.save();

                socket.to(`watch:${watchRoom._id.toString()}`).emit('video-sync', {
                    roomId: watchRoom._id.toString(),
                    time: watchRoom.videoState.currentTime,
                    isPlaying: watchRoom.videoState.isPlaying,
                    userId
                });
            } catch (error) {
                console.error('[SOCKET] video-sync error:', error.message);
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
         * Disconnect
         */
        socket.on('disconnect', () => {
            console.log('[SOCKET] User disconnected: ' + socket.user.nickName);

            // Clean watch room presence state and notify peers.
            if (socket.data.joinedWatchRooms && socket.data.joinedWatchRooms.size > 0) {
                socket.data.joinedWatchRooms.forEach((watchRoomId) => {
                    const roomUsers = watchRoomPresence.get(watchRoomId);
                    if (roomUsers) {
                        roomUsers.delete(userId);
                        if (roomUsers.size === 0) {
                            watchRoomPresence.delete(watchRoomId);
                            watchRoomControlPermissions.delete(watchRoomId);
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
