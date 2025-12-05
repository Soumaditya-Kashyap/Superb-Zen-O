/**
 * Friends Controller
 * Handles getting friends list
 */

const Connection = require('../../models/Connection');
const ChatRoom = require('../../models/ChatRoom');

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
