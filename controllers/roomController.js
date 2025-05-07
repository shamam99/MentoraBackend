const Room = require('../models/Room');
// const RoomUser = require('../models/RoomUser');
const { successResponse, errorResponse } = require('../utils/response');
const { generatePinCode } = require('../utils/roomUtils');


exports.createRoom = async (req, res) => {
  try {
    const userId = req.user.userId; // From JWT middleware
    const pinCode = await generatePinCode();

    const room = await Room.create({
      creator: userId,
      pinCode,
      players: [{ userId }]
    });

    return successResponse(res, 'Room created successfully', { room });
  } catch (err) {
    return errorResponse(res, 'Failed to create room', 500, err.message);
  }
};

/**
 * Join a room by PIN code
 */
exports.joinRoomByPin = async (req, res) => {
    try {
      const { pinCode } = req.body;
      const userId = req.user.userId;
  
      const room = await Room.findOne({ pinCode });
      if (!room) {
        return errorResponse(res, 'Room not found with this PIN code', 404);
      }
  
      const alreadyJoined = await Room.findOne({ userId, roomId: room._id });
      if (alreadyJoined) {
        return successResponse(res, 'You are already in this room', { room });
      }
  
      await Room.create({ roomId: room._id, userId });
      return successResponse(res, 'Joined room successfully', { room });
    } catch (err) {
      return errorResponse(res, 'Failed to join room', 500, err);
    }
  };
