/**
 * Room History Controller
 * Handles fetching room history for users
 */

const WatchRoom = require('../../models/WatchRoom');

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
        const processedRooms = rooms.map(room => processRoomForUser(room, userId));

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
 * Process a room document to add user-specific status
 */
function processRoomForUser(room, userId) {
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
            userStatus = 'ended';
        } else if (userAttendance.leftAt) {
            userStatus = 'left';
        } else {
            userStatus = 'joined';
        }
    } else if (room.participants?.some(p => p._id?.toString() === userId || p.toString() === userId)) {
        userStatus = room.status === 'ended' ? 'ended' : 'invited';
    }
    
    return {
        ...roomObj,
        userStatus,
        isHost
    };
}
