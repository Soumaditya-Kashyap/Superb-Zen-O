/**
 * Handshake (Friend Request) Controller
 * Handles sending, accepting, rejecting handshakes and getting pending requests
 */

const User = require('../../models/user');
const Connection = require('../../models/Connection');
const ChatRoom = require('../../models/ChatRoom');
const Message = require('../../models/Message');
const notificationService = require('../../utils/notificationService');

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

        // Get sender info for notification
        const sender = await User.findById(senderId).select('name nickName');
        
        // Send friend request notification to receiver
        await notificationService.notifyFriendRequest(
            receiverId,
            senderId,
            sender.nickName || sender.name
        );

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

        // Atomically accept only if this request is still pending and current user is receiver.
        // This prevents race conditions where one request accepts and another fails midway.
        let connection = await Connection.findOneAndUpdate(
            {
                _id: connectionId,
                receiver: currentUserId,
                status: 'pending'
            },
            { $set: { status: 'accepted' } },
            { new: true }
        );

        // If no pending match, inspect existing record and return a stable/idempotent response.
        if (!connection) {
            const existingConnection = await Connection.findById(connectionId);

            if (!existingConnection) {
                return res.status(404).json({
                    success: false,
                    message: 'Connection not found'
                });
            }

            if (existingConnection.receiver.toString() !== currentUserId) {
                return res.status(403).json({
                    success: false,
                    message: 'Only the receiver can accept this handshake'
                });
            }

            if (existingConnection.status !== 'accepted') {
                return res.status(400).json({
                    success: false,
                    message: 'Handshake is not pending'
                });
            }

            // Already accepted earlier: ensure chat room exists and return success.
            const existingChatRoom = await ChatRoom.findOneAndUpdate(
                { connectionId: existingConnection._id },
                {
                    $setOnInsert: {
                        participants: [existingConnection.sender, existingConnection.receiver],
                        connectionId: existingConnection._id
                    }
                },
                { new: true, upsert: true }
            );

            await existingConnection.populate('sender', 'name nickName profilePicture');

            return res.json({
                success: true,
                message: 'Handshake already accepted',
                connection: {
                    _id: existingConnection._id,
                    status: existingConnection.status,
                    sender: existingConnection.sender
                },
                chatRoom: {
                    _id: existingChatRoom._id,
                    participants: existingChatRoom.participants
                }
            });
        }

        // Create chat room idempotently for the two users.
        const chatRoom = await ChatRoom.findOneAndUpdate(
            { connectionId: connection._id },
            {
                $setOnInsert: {
                    participants: [connection.sender, connection.receiver],
                    connectionId: connection._id
                }
            },
            { new: true, upsert: true }
        );

        console.log('[CHAT] Handshake accepted, chat room created: ' + chatRoom._id);

        // Populate sender info for response
        await connection.populate('sender', 'name nickName profilePicture');

        // Get current user info for notification
        const currentUser = await User.findById(currentUserId).select('name nickName');
        
        // Notify the original sender that their request was accepted
        await notificationService.notifyFriendAccepted(
            connection.sender._id,
            currentUserId,
            currentUser.nickName || currentUser.name
        );

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

        const wasAccepted = connection.status === 'accepted';

        if (wasAccepted) {
            // Defriend flow: remove chat room and messages to fully terminate chat access.
            const chatRoom = await ChatRoom.findOne({ connectionId: connection._id });
            if (chatRoom) {
                await Message.deleteMany({ chatRoomId: chatRoom._id });
                await ChatRoom.findByIdAndDelete(chatRoom._id);
            }
        }

        await Connection.findByIdAndDelete(connectionId);

        console.log(wasAccepted ? '[CHAT] Friendship removed' : '[CHAT] Handshake rejected/cancelled');

        res.json({
            success: true,
            message: wasAccepted ? 'Friend removed successfully' : 'Handshake cancelled'
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
