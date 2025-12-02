const User = require('../models/user');
const Connection = require('../models/Connection');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const mongoose = require('mongoose');

/**
 * Search users by name or nickName
 * GET /api/chat/users/search?query=xxx
 */
exports.searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        const currentUserId = req.user.id;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters'
            });
        }

        console.log('[CHAT] User search query: ' + query + ' by user: ' + currentUserId);

        // Search users by name or nickName, exclude current user
        const users = await User.find({
            _id: { $ne: currentUserId },
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { nickName: { $regex: query, $options: 'i' } }
            ]
        })
        .select('_id name nickName profilePicture')
        .limit(20);

        // Get existing connections for these users
        const userIds = users.map(u => u._id);
        const connections = await Connection.find({
            $or: [
                { sender: currentUserId, receiver: { $in: userIds } },
                { receiver: currentUserId, sender: { $in: userIds } }
            ]
        });

        // Map users with connection status
        const usersWithStatus = users.map(user => {
            const connection = connections.find(c => 
                c.sender.toString() === user._id.toString() || 
                c.receiver.toString() === user._id.toString()
            );

            let connectionStatus = 'none';
            let connectionId = null;
            let isSender = false;

            if (connection) {
                connectionStatus = connection.status;
                connectionId = connection._id;
                isSender = connection.sender.toString() === currentUserId;
            }

            return {
                _id: user._id,
                name: user.name,
                nickName: user.nickName,
                profilePicture: user.profilePicture,
                connectionStatus,
                connectionId,
                isSender // true if current user sent the request
            };
        });

        console.log('[CHAT] Found ' + users.length + ' users matching query');

        res.json({
            success: true,
            users: usersWithStatus
        });

    } catch (error) {
        console.error('[CHAT] Search users error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to search users'
        });
    }
};

/**
 * Send a handshake (friend request)
 * POST /api/chat/handshake/send
 */
exports.sendHandshake = async (req, res) => {
    try {
        const { receiverId } = req.body;
        const senderId = req.user.id;

        if (!receiverId) {
            return res.status(400).json({
                success: false,
                message: 'Receiver ID is required'
            });
        }

        if (senderId === receiverId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot send handshake to yourself'
            });
        }

        console.log('[CHAT] Handshake request from ' + senderId + ' to ' + receiverId);

        // Check if receiver exists
        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if connection already exists
        const existingConnection = await Connection.findOne({
            $or: [
                { sender: senderId, receiver: receiverId },
                { sender: receiverId, receiver: senderId }
            ]
        });

        if (existingConnection) {
            if (existingConnection.status === 'accepted') {
                return res.status(400).json({
                    success: false,
                    message: 'Already connected with this user'
                });
            }
            return res.status(400).json({
                success: false,
                message: 'Handshake already pending'
            });
        }

        // Create new connection
        const connection = await Connection.create({
            sender: senderId,
            receiver: receiverId,
            status: 'pending'
        });

        console.log('[CHAT] Handshake sent successfully, connection ID: ' + connection._id);

        res.status(201).json({
            success: true,
            message: 'Handshake sent successfully',
            connection: {
                _id: connection._id,
                status: connection.status,
                receiver: {
                    _id: receiver._id,
                    name: receiver.name,
                    nickName: receiver.nickName
                }
            }
        });

    } catch (error) {
        console.error('[CHAT] Send handshake error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to send handshake'
        });
    }
};

/**
 * Accept a handshake (friend request)
 * POST /api/chat/handshake/accept
 */
exports.acceptHandshake = async (req, res) => {
    try {
        const { connectionId } = req.body;
        const currentUserId = req.user.id;

        if (!connectionId) {
            return res.status(400).json({
                success: false,
                message: 'Connection ID is required'
            });
        }

        console.log('[CHAT] Accept handshake, connection ID: ' + connectionId);

        // Find the connection
        const connection = await Connection.findById(connectionId);

        if (!connection) {
            return res.status(404).json({
                success: false,
                message: 'Connection not found'
            });
        }

        // Only receiver can accept
        if (connection.receiver.toString() !== currentUserId) {
            return res.status(403).json({
                success: false,
                message: 'Only the receiver can accept this handshake'
            });
        }

        if (connection.status === 'accepted') {
            return res.status(400).json({
                success: false,
                message: 'Handshake already accepted'
            });
        }

        // Update connection status
        connection.status = 'accepted';
        await connection.save();

        // Create chat room for the two users
        const chatRoom = await ChatRoom.create({
            participants: [connection.sender, connection.receiver],
            connectionId: connection._id
        });

        console.log('[CHAT] Handshake accepted, chat room created: ' + chatRoom._id);

        // Populate sender info for response
        await connection.populate('sender', 'name nickName profilePicture');

        res.json({
            success: true,
            message: 'Handshake accepted',
            connection: {
                _id: connection._id,
                status: connection.status,
                sender: connection.sender
            },
            chatRoom: {
                _id: chatRoom._id,
                participants: chatRoom.participants
            }
        });

    } catch (error) {
        console.error('[CHAT] Accept handshake error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to accept handshake'
        });
    }
};

/**
 * Reject/Cancel a handshake
 * DELETE /api/chat/handshake/:connectionId
 */
exports.rejectHandshake = async (req, res) => {
    try {
        const { connectionId } = req.params;
        const currentUserId = req.user.id;

        console.log('[CHAT] Reject/Cancel handshake, connection ID: ' + connectionId);

        const connection = await Connection.findById(connectionId);

        if (!connection) {
            return res.status(404).json({
                success: false,
                message: 'Connection not found'
            });
        }

        // Either sender or receiver can cancel/reject
        if (connection.sender.toString() !== currentUserId && 
            connection.receiver.toString() !== currentUserId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to cancel this handshake'
            });
        }

        await Connection.findByIdAndDelete(connectionId);

        console.log('[CHAT] Handshake rejected/cancelled');

        res.json({
            success: true,
            message: 'Handshake cancelled'
        });

    } catch (error) {
        console.error('[CHAT] Reject handshake error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to reject handshake'
        });
    }
};

/**
 * Get pending handshakes (received requests)
 * GET /api/chat/handshake/pending
 */
exports.getPendingHandshakes = async (req, res) => {
    try {
        const currentUserId = req.user.id;

        console.log('[CHAT] Getting pending handshakes for user: ' + currentUserId);

        const pendingReceived = await Connection.find({
            receiver: currentUserId,
            status: 'pending'
        }).populate('sender', 'name nickName profilePicture');

        const pendingSent = await Connection.find({
            sender: currentUserId,
            status: 'pending'
        }).populate('receiver', 'name nickName profilePicture');

        console.log('[CHAT] Found ' + pendingReceived.length + ' received, ' + pendingSent.length + ' sent');

        res.json({
            success: true,
            received: pendingReceived,
            sent: pendingSent
        });

    } catch (error) {
        console.error('[CHAT] Get pending handshakes error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get pending handshakes'
        });
    }
};

/**
 * Get friends list (accepted connections)
 * GET /api/chat/friends
 */
exports.getFriends = async (req, res) => {
    try {
        const currentUserId = req.user.id;

        console.log('[CHAT] Getting friends list for user: ' + currentUserId);

        const connections = await Connection.find({
            $or: [
                { sender: currentUserId },
                { receiver: currentUserId }
            ],
            status: 'accepted'
        })
        .populate('sender', 'name nickName profilePicture')
        .populate('receiver', 'name nickName profilePicture');

        // Get chat rooms for these connections
        const connectionIds = connections.map(c => c._id);
        const chatRooms = await ChatRoom.find({
            connectionId: { $in: connectionIds }
        }).populate('lastMessage');

        // Map friends with chat room info
        const friends = connections.map(conn => {
            const friend = conn.sender._id.toString() === currentUserId 
                ? conn.receiver 
                : conn.sender;

            const chatRoom = chatRooms.find(
                cr => cr.connectionId.toString() === conn._id.toString()
            );

            return {
                _id: friend._id,
                name: friend.name,
                nickName: friend.nickName,
                profilePicture: friend.profilePicture,
                connectionId: conn._id,
                chatRoomId: chatRoom?._id || null,
                lastMessage: chatRoom?.lastMessage || null,
                lastMessageAt: chatRoom?.lastMessageAt || conn.updatedAt
            };
        });

        // Sort by last message time
        friends.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

        console.log('[CHAT] Found ' + friends.length + ' friends');

        res.json({
            success: true,
            friends
        });

    } catch (error) {
        console.error('[CHAT] Get friends error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get friends list'
        });
    }
};

/**
 * Get chat room messages
 * GET /api/chat/messages/:chatRoomId
 */
exports.getMessages = async (req, res) => {
    try {
        const { chatRoomId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const currentUserId = req.user.id;

        console.log('[CHAT] Getting messages for room: ' + chatRoomId);

        // Verify user is participant
        const chatRoom = await ChatRoom.findById(chatRoomId);
        
        if (!chatRoom) {
            return res.status(404).json({
                success: false,
                message: 'Chat room not found'
            });
        }

        const isParticipant = chatRoom.participants.some(
            p => p.toString() === currentUserId
        );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view these messages'
            });
        }

        const messages = await Message.find({ chatRoomId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('sender', 'name nickName profilePicture');

        // Reverse to get chronological order
        messages.reverse();

        const total = await Message.countDocuments({ chatRoomId });

        console.log('[CHAT] Retrieved ' + messages.length + ' messages');

        res.json({
            success: true,
            messages,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                hasMore: total > page * limit
            }
        });

    } catch (error) {
        console.error('[CHAT] Get messages error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get messages'
        });
    }
};

/**
 * Send a message (REST fallback, Socket.io preferred)
 * POST /api/chat/messages
 */
exports.sendMessage = async (req, res) => {
    try {
        const { chatRoomId, content } = req.body;
        const senderId = req.user.id;

        if (!chatRoomId || !content) {
            return res.status(400).json({
                success: false,
                message: 'Chat room ID and content are required'
            });
        }

        if (content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Message content cannot be empty'
            });
        }

        console.log('[CHAT] Sending message to room: ' + chatRoomId);

        // Verify user is participant
        const chatRoom = await ChatRoom.findById(chatRoomId);
        
        if (!chatRoom) {
            return res.status(404).json({
                success: false,
                message: 'Chat room not found'
            });
        }

        const isParticipant = chatRoom.participants.some(
            p => p.toString() === senderId
        );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to send messages here'
            });
        }

        // Create message
        const message = await Message.create({
            chatRoomId,
            sender: senderId,
            content: content.trim(),
            readBy: [senderId]
        });

        // Update chat room's last message
        chatRoom.lastMessage = message._id;
        chatRoom.lastMessageAt = message.createdAt;
        await chatRoom.save();

        // Populate sender info
        await message.populate('sender', 'name nickName profilePicture');

        console.log('[CHAT] Message sent successfully, ID: ' + message._id);

        res.status(201).json({
            success: true,
            message
        });

    } catch (error) {
        console.error('[CHAT] Send message error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to send message'
        });
    }
};

/**
 * Get or create chat room with a friend
 * POST /api/chat/room
 */
exports.getOrCreateChatRoom = async (req, res) => {
    try {
        const { friendId } = req.body;
        const currentUserId = req.user.id;

        console.log('[CHAT] Get/Create chat room between ' + currentUserId + ' and ' + friendId);

        // Check if they are connected
        const connection = await Connection.findOne({
            $or: [
                { sender: currentUserId, receiver: friendId },
                { sender: friendId, receiver: currentUserId }
            ],
            status: 'accepted'
        });

        if (!connection) {
            return res.status(403).json({
                success: false,
                message: 'You must be connected to chat with this user'
            });
        }

        // Find existing chat room
        let chatRoom = await ChatRoom.findOne({ connectionId: connection._id })
            .populate('participants', 'name nickName profilePicture');

        // Create if doesn't exist
        if (!chatRoom) {
            chatRoom = await ChatRoom.create({
                participants: [currentUserId, friendId],
                connectionId: connection._id
            });
            await chatRoom.populate('participants', 'name nickName profilePicture');
        }

        console.log('[CHAT] Chat room ID: ' + chatRoom._id);

        res.json({
            success: true,
            chatRoom
        });

    } catch (error) {
        console.error('[CHAT] Get/Create room error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get chat room'
        });
    }
};
