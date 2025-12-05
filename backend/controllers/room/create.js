/**
 * Room Creation Controller
 * Handles creating new watch rooms and sending invites
 */

const WatchRoom = require('../../models/WatchRoom');
const Movie = require('../../models/movie');
const Connection = require('../../models/Connection');
const User = require('../../models/user');
const ChatRoom = require('../../models/ChatRoom');
const Message = require('../../models/Message');
const notificationService = require('../../utils/notificationService');

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
        const validFriends = await validateInvitedFriends(hostId, invitedFriends);

        // Create the room
        const room = await WatchRoom.create({
            name: roomName || undefined,
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
            await sendInviteMessages(req, hostId, validFriends, room, movie);
        }

        // Emit room:created event to all invited friends
        emitRoomCreatedEvent(req, room, validFriends, hostId);

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
                createdAt: room.createdAt,
                isHost: true,
                userStatus: 'hosting'
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
 * Validate that invited friends are actual friends
 */
async function validateInvitedFriends(hostId, invitedFriends) {
    const validFriends = [];
    
    if (invitedFriends.length > 0) {
        const connections = await Connection.find({
            status: 'accepted',
            $or: [
                { sender: hostId, receiver: { $in: invitedFriends } },
                { receiver: hostId, sender: { $in: invitedFriends } }
            ]
        });

        connections.forEach(conn => {
            const friendId = conn.sender.toString() === hostId 
                ? conn.receiver.toString() 
                : conn.sender.toString();
            if (invitedFriends.includes(friendId)) {
                validFriends.push(friendId);
            }
        });
    }
    
    return validFriends;
}

/**
 * Send invite messages to friends via chat
 */
async function sendInviteMessages(req, hostId, validFriends, room, movie) {
    const host = await User.findById(hostId).select('name nickName');
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/watch-together/join/${room.inviteCode}`;
    const inviteMessage = `🎬 Hey! I'm inviting you to watch "${movie.Title}" together!\n\n🔗 Join my Watch Party: ${inviteLink}\n\nClick the link to join now!`;

    for (const friendId of validFriends) {
        try {
            const chatRoom = await ChatRoom.findOne({
                participants: { $all: [hostId, friendId] }
            });

            if (chatRoom) {
                const message = await Message.create({
                    chatRoomId: chatRoom._id,
                    sender: hostId,
                    content: inviteMessage,
                    readBy: [hostId]
                });

                chatRoom.lastMessage = message._id;
                chatRoom.lastMessageAt = message.createdAt;
                await chatRoom.save();

                await message.populate('sender', 'name nickName profilePicture');

                // Emit via socket if available
                const io = req.app.get('io');
                if (io) {
                    emitInviteMessageSocket(io, chatRoom, message, friendId);
                }

                console.log('[ROOM] Invite message saved for friend:', friendId);
            }
            
            // Send notification for the watch invite
            await notificationService.notifyWatchInvite(
                friendId,
                hostId,
                host.nickName || host.name,
                room._id,
                movie.Title
            );
        } catch (msgErr) {
            console.error('[ROOM] Failed to send invite to friend:', friendId, msgErr.message);
        }
    }
}

/**
 * Emit invite message via socket
 */
function emitInviteMessageSocket(io, chatRoom, message, friendId) {
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

    io.to(`room:${chatRoom._id}`).emit('message:received', messageData);
    io.to(`user:${friendId}`).emit('message:received', messageData);
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
}

/**
 * Emit room:created event to invited friends
 */
function emitRoomCreatedEvent(req, room, validFriends, hostId) {
    const io = req.app.get('io');
    if (io && validFriends.length > 0) {
        const roomData = {
            _id: room._id,
            name: room.name,
            host: room.host,
            movie: room.movie,
            participants: room.participants,
            inviteCode: room.inviteCode,
            status: room.status,
            startTime: room.startTime,
            createdAt: room.createdAt,
            attendees: room.attendees,
            isHost: false,
            userStatus: 'invited'
        };

        for (const friendId of validFriends) {
            io.to(`user:${friendId}`).emit('room:created', { room: roomData });
            console.log('[ROOM] 📢 Room created notification sent to:', friendId);
        }
    }
}
