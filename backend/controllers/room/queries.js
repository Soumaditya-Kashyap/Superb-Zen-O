/**
 * Room Queries Controller
 * Handles fetching room data and available movies
 */

const WatchRoom = require('../../models/WatchRoom');
const Movie = require('../../models/movie');

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
            { path: 'attendees.user', select: 'name nickName' },
            { path: 'messages.sender', select: 'name nickName' }
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
