/**
 * Messages Controller
 * Handles getting messages, sending messages, and chat room management
 */

const ChatRoom = require('../../models/ChatRoom');
const Message = require('../../models/Message');
const Connection = require('../../models/Connection');

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
