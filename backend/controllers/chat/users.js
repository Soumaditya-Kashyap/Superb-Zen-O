/**
 * User Search Controller
 * Handles searching for users
 */

const User = require('../../models/user');
const Connection = require('../../models/Connection');

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
                isSender
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
