const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('./models/Message');
const ChatRoom = require('./models/ChatRoom');
const User = require('./models/user');
const notificationService = require('./utils/notificationService');

// Store online users: { odObjectId: socketId }
const onlineUsers = new Map();

/**
 * Initialize Socket.io with the HTTP server
 */
function initializeSocket(httpServer) {
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
            onlineUsers.delete(userId);
            socket.broadcast.emit('user:offline', { userId });
        });
    });

    console.log('[SOCKET] Socket.io initialized');
    return io;
}

module.exports = { initializeSocket, onlineUsers };
