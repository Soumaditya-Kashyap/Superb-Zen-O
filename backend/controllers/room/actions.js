/**
 * Room Actions Controller
 * Handles join, leave, and end room actions
 */

const WatchRoom = require('../../models/WatchRoom');
const User = require('../../models/user');
const notificationService = require('../../utils/notificationService');

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
            room.participants.push(userId);
        }

        // Check if user already in attendees
        const existingAttendee = room.attendees.find(a => a.user.toString() === userId);
        
        if (existingAttendee) {
            existingAttendee.leftAt = null;
        } else {
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

        // Notify participants
        await notifyParticipantsRoomEnded(req, room, userId);

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
 * Notify all participants that room has ended
 */
async function notifyParticipantsRoomEnded(req, room, hostId) {
    const host = await User.findById(hostId).select('name nickName');
    const io = req.app.get('io');
    
    if (io) {
        for (const participantId of room.participants) {
            if (participantId.toString() !== hostId) {
                io.to(`user:${participantId}`).emit('room:closed', {
                    roomId: room._id,
                    message: 'The host has closed this room'
                });
                
                await notificationService.notifyRoomEnded(
                    participantId,
                    hostId,
                    host.nickName || host.name,
                    room._id,
                    room.name
                );
            }
        }
        
        io.to(`watch:${room._id}`).emit('room:closed', {
            roomId: room._id,
            message: 'The host has closed this room'
        });
        
        console.log('[ROOM] ✅ Room closed event emitted to participants');
    }
}
