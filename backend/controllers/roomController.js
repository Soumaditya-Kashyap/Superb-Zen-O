const WatchRoom = require('../models/WatchRoom');
const Movie = require('../models/movie');
const Connection = require('../models/Connection');
const User = require('../models/user');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');

/**
 * Create a new watch room
 * POST /api/rooms/create
 */
exports.createRoom = async (req, res) => {
    try {
        const hostId = req.user.id;
        const { movieId, invitedFriends = [], roomName } = req.body;

        console.log('[ROOM] Creating room - Host:', hostId, 'Movie:', movieId);

        // Validate movie exists and has video
        const movie = await Movie.findById(movieId);
        if (!movie) {
            return res.status(404).json({
                success: false,
                message: 'Movie not found'
            });
        }

        if (!movie.videoFolderName) {
            return res.status(400).json({
                success: false,
                message: 'This movie is not available for streaming yet'
            });
        }

        // Check if user already has an active room
        const existingActiveRoom = await WatchRoom.findOne({
            host: hostId,
            status: 'active'
        });

        if (existingActiveRoom) {
            return res.status(400).json({
                success: false,
                message: 'You already have an active room. Please end it before creating a new one.',
                existingRoom: {
                    _id: existingActiveRoom._id,
                    name: existingActiveRoom.name,
                    inviteCode: existingActiveRoom.inviteCode
                }
            });
        }

        // Validate invited friends are actual friends
        const validFriends = [];
        if (invitedFriends.length > 0) {
            const connections = await Connection.find({
                status: 'accepted',
                $or: [
                    { sender: hostId, receiver: { $in: invitedFriends } },
                    { receiver: hostId, sender: { $in: invitedFriends } }
                ]
            });

            // Extract valid friend IDs
            connections.forEach(conn => {
                const friendId = conn.sender.toString() === hostId 
                    ? conn.receiver.toString() 
                    : conn.sender.toString();
                if (invitedFriends.includes(friendId)) {
                    validFriends.push(friendId);
                }
            });
        }

        // Create the room
        const room = await WatchRoom.create({
            name: roomName || undefined, // Use default if not provided
            host: hostId,
            movie: movieId,
            participants: [hostId, ...validFriends],
            attendees: [{
                user: hostId,
                joinedAt: new Date()
            }],
            status: 'active',
            startTime: new Date()
        });

        // Populate for response
        await room.populate([
            { path: 'host', select: 'name nickName' },
            { path: 'movie', select: 'Title Poster videoFolderName Runtime Genre' },
            { path: 'participants', select: 'name nickName' }
        ]);

        console.log('[ROOM] Room created:', room._id, 'Invite code:', room.inviteCode);

        // Send invite messages to selected friends
        if (validFriends.length > 0) {
            const host = await User.findById(hostId).select('name nickName');
            const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/watch-together/join/${room.inviteCode}`;
            const inviteMessage = `🎬 Hey! I'm inviting you to watch "${movie.Title}" together!\n\n🔗 Join my Watch Party: ${inviteLink}\n\nClick the link to join now!`;

            // Send message to each invited friend
            for (const friendId of validFriends) {
                try {
                    // Find chat room between host and friend
                    const chatRoom = await ChatRoom.findOne({
                        participants: { $all: [hostId, friendId] }
                    });

                    if (chatRoom) {
                        // Create invite message
                        const message = await Message.create({
                            chatRoomId: chatRoom._id,
                            sender: hostId,
                            content: inviteMessage,
                            readBy: [hostId]
                        });

                        // Update chat room
                        chatRoom.lastMessage = message._id;
                        chatRoom.lastMessageAt = message.createdAt;
                        await chatRoom.save();

                        // Populate sender info for socket emission
                        await message.populate('sender', 'name nickName profilePicture');

                        // Emit via socket if available - REAL-TIME delivery
                        const io = req.app.get('io');
                        if (io) {
                            const messageData = {
                                message: {
                                    _id: message._id,
                                    chatRoomId: message.chatRoomId,
                                    sender: message.sender,
                                    content: message.content,
                                    createdAt: message.createdAt,
                                    readBy: message.readBy
                                }
                            };

                            // Emit to the chat room (if friend is viewing that chat)
                            io.to(`room:${chatRoom._id}`).emit('message:received', messageData);

                            // Also emit to friend's personal room (notification)
                            io.to(`user:${friendId}`).emit('message:received', messageData);

                            // Send notification event too
                            io.to(`user:${friendId}`).emit('message:notification', {
                                chatRoomId: chatRoom._id,
                                message: {
                                    _id: message._id,
                                    sender: message.sender,
                                    content: message.content.substring(0, 100),
                                    createdAt: message.createdAt
                                }
                            });

                            console.log('[ROOM] ✅ Real-time invite sent to friend:', friendId);
                        } else {
                            console.log('[ROOM] ⚠️ Socket.io not available, message saved but not pushed');
                        }

                        console.log('[ROOM] Invite message saved for friend:', friendId);
                    }
                } catch (msgErr) {
                    console.error('[ROOM] Failed to send invite to friend:', friendId, msgErr.message);
                }
            }
        }

        res.status(201).json({
            success: true,
            message: 'Watch room created successfully',
            room: {
                _id: room._id,
                name: room.name,
                host: room.host,
                movie: room.movie,
                participants: room.participants,
                inviteCode: room.inviteCode,
                inviteLink: room.inviteLink,
                status: room.status,
                startTime: room.startTime,
                createdAt: room.createdAt
            }
        });

    } catch (error) {
        console.error('[ROOM] Create error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to create watch room'
        });
    }
};

/**
 * Get room history for a user
 * GET /api/rooms/history
 */
exports.getRoomHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;

        console.log('[ROOM] Getting history for user:', userId);

        // Find all rooms where user is host, participant, or was an attendee
        const rooms = await WatchRoom.find({
            $or: [
                { host: userId },
                { participants: userId },
                { 'attendees.user': userId }
            ]
        })
        .populate('host', 'name nickName')
        .populate('movie', 'Title Poster Runtime Genre Year')
        .populate('participants', 'name nickName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

        // Process rooms to add user's attendance status
        const processedRooms = rooms.map(room => {
            const roomObj = room.toObject();
            
            // Check if user is the host
            const isHost = room.host._id.toString() === userId || room.host.toString() === userId;
            
            // Find user's attendance record
            const userAttendance = room.attendees?.find(
                a => a.user?.toString() === userId || a.user?._id?.toString() === userId
            );
            
            // Determine user's status in this room
            let userStatus = 'not_joined';
            if (isHost) {
                userStatus = room.status === 'ended' ? 'ended' : 'hosting';
            } else if (userAttendance) {
                if (room.status === 'ended') {
                    userStatus = 'ended'; // Room is closed by host
                } else if (userAttendance.leftAt) {
                    userStatus = 'left'; // User left but room is still active
                } else {
                    userStatus = 'joined'; // User is currently in the room
                }
            } else if (room.participants?.some(p => p._id?.toString() === userId || p.toString() === userId)) {
                // User is participant but hasn't joined yet
                userStatus = room.status === 'ended' ? 'ended' : 'invited';
            }
            
            return {
                ...roomObj,
                userStatus,
                isHost
            };
        });

        // Separate into active and past rooms
        const activeRooms = processedRooms.filter(room => room.status === 'active');
        const pastRooms = processedRooms.filter(room => room.status === 'ended');

        const total = await WatchRoom.countDocuments({
            $or: [
                { host: userId },
                { participants: userId },
                { 'attendees.user': userId }
            ]
        });

        res.json({
            success: true,
            activeRooms,
            pastRooms,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                hasMore: total > page * limit
            }
        });

    } catch (error) {
        console.error('[ROOM] History error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get room history'
        });
    }
};

/**
 * Get a specific room by ID or invite code
 * GET /api/rooms/:identifier
 */
exports.getRoom = async (req, res) => {
    try {
        const { identifier } = req.params;
        const userId = req.user.id;

        let room;

        // Check if it's a MongoDB ObjectId or invite code
        if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
            room = await WatchRoom.findById(identifier);
        } else {
            room = await WatchRoom.findOne({ inviteCode: identifier });
        }

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        await room.populate([
            { path: 'host', select: 'name nickName' },
            { path: 'movie', select: 'Title Poster videoFolderName Runtime Genre Year Plot' },
            { path: 'participants', select: 'name nickName' },
            { path: 'attendees.user', select: 'name nickName' }
        ]);

        res.json({
            success: true,
            room
        });

    } catch (error) {
        console.error('[ROOM] Get room error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get room'
        });
    }
};

/**
 * Join a room via invite code
 * POST /api/rooms/join/:inviteCode
 */
exports.joinRoom = async (req, res) => {
    try {
        const { inviteCode } = req.params;
        const userId = req.user.id;

        const room = await WatchRoom.findOne({ inviteCode });

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found. The invite link may be invalid or expired.'
            });
        }

        if (room.status === 'ended') {
            return res.status(400).json({
                success: false,
                message: 'This watch party has ended'
            });
        }

        // Check if user is already a participant
        const isParticipant = room.participants.some(p => p.toString() === userId);
        
        if (!isParticipant) {
            // Add user to participants
            room.participants.push(userId);
        }

        // Check if user already in attendees
        const existingAttendee = room.attendees.find(a => a.user.toString() === userId);
        
        if (existingAttendee) {
            // User rejoining - update leftAt to null
            existingAttendee.leftAt = null;
        } else {
            // New attendee
            room.attendees.push({
                user: userId,
                joinedAt: new Date()
            });
        }

        await room.save();

        await room.populate([
            { path: 'host', select: 'name nickName' },
            { path: 'movie', select: 'Title Poster videoFolderName Runtime Genre Year' },
            { path: 'participants', select: 'name nickName' }
        ]);

        console.log('[ROOM] User', userId, 'joined room:', room._id);

        res.json({
            success: true,
            message: 'Joined room successfully',
            room
        });

    } catch (error) {
        console.error('[ROOM] Join error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to join room'
        });
    }
};

/**
 * Leave a room
 * POST /api/rooms/:roomId/leave
 */
exports.leaveRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.user.id;

        const room = await WatchRoom.findById(roomId);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        // Update attendee's leftAt time
        const attendee = room.attendees.find(a => a.user.toString() === userId);
        if (attendee) {
            attendee.leftAt = new Date();
        }

        await room.save();

        console.log('[ROOM] User', userId, 'left room:', roomId);

        res.json({
            success: true,
            message: 'Left room successfully'
        });

    } catch (error) {
        console.error('[ROOM] Leave error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to leave room'
        });
    }
};

/**
 * End a room (host only)
 * POST /api/rooms/:roomId/end
 */
exports.endRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.user.id;

        const room = await WatchRoom.findById(roomId);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        // Only host can end the room
        if (room.host.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Only the host can end the room'
            });
        }

        if (room.status === 'ended') {
            return res.status(400).json({
                success: false,
                message: 'Room is already ended'
            });
        }

        // Update room status
        room.status = 'ended';
        room.endTime = new Date();

        // Mark all attendees as left
        room.attendees.forEach(attendee => {
            if (!attendee.leftAt) {
                attendee.leftAt = new Date();
            }
        });

        await room.save();

        // Emit socket event to notify all participants that room is closed
        const io = req.app.get('io');
        if (io) {
            // Notify all participants (except host) that room is closed
            room.participants.forEach(participantId => {
                if (participantId.toString() !== userId) {
                    io.to(`user:${participantId}`).emit('room:closed', {
                        roomId: room._id,
                        message: 'The host has closed this room'
                    });
                }
            });
            
            // Also emit to the room itself for anyone currently watching
            io.to(`watch:${roomId}`).emit('room:closed', {
                roomId: room._id,
                message: 'The host has closed this room'
            });
            
            console.log('[ROOM] ✅ Room closed event emitted to participants');
        }

        console.log('[ROOM] Room ended:', roomId);

        res.json({
            success: true,
            message: 'Room ended successfully'
        });

    } catch (error) {
        console.error('[ROOM] End error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to end room'
        });
    }
};

/**
 * Get movies available for Watch Together (with video)
 * GET /api/rooms/movies/available
 */
exports.getAvailableMovies = async (req, res) => {
    try {
        const { search, page = 1, limit = 20 } = req.query;

        let query = {
            videoFolderName: { $ne: null, $exists: true }
        };

        // Add search filter if provided
        if (search) {
            query.$or = [
                { Title: { $regex: search, $options: 'i' } },
                { Genre: { $regex: search, $options: 'i' } },
                { Actors: { $regex: search, $options: 'i' } }
            ];
        }

        const movies = await Movie.find(query)
            .select('Title Poster Year Runtime Genre imdbRating videoFolderName')
            .sort({ Title: 1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Movie.countDocuments(query);

        res.json({
            success: true,
            movies,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                hasMore: total > page * limit
            }
        });

    } catch (error) {
        console.error('[ROOM] Get movies error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get available movies'
        });
    }
};

/**
 * Get user's active room (if any)
 * GET /api/rooms/active
 */
exports.getActiveRoom = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find room where user is host and it's active
        const activeRoom = await WatchRoom.findOne({
            host: userId,
            status: 'active'
        }).populate([
            { path: 'movie', select: 'Title Poster videoFolderName Runtime Genre' },
            { path: 'participants', select: 'name nickName' }
        ]);

        res.json({
            success: true,
            hasActiveRoom: !!activeRoom,
            room: activeRoom
        });

    } catch (error) {
        console.error('[ROOM] Get active room error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get active room'
        });
    }
};
