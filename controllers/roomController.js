const Room = require("../models/Room");
const { generatePinCode } = require("../utils/pinGenerator");
const { successResponse, errorResponse } = require("../utils/response");

exports.createRoom = async (req, res) => {
  try {
    const { userId, mode } = req.body;

    if (!userId || !mode) {
      return errorResponse(res, "Missing userId or mode");
    }

    const isSolo = mode === "solo";
    const pinCode = isSolo ? null : generatePinCode();

    const room = await Room.create({
      hostUser: userId,
      players: [userId],
      isSolo,
      pinCode: pinCode || undefined,
      status: "waiting",
      createdAt: new Date()
    });

    return successResponse(res, "Room created successfully", {
      roomId: room._id,
      pinCode: room.pinCode,
      status: room.status,
      isSolo: room.isSolo
    });
  } catch (err) {
    console.error("Create Room Error:", err);
    return errorResponse(res, "Failed to create room", 500);
  }
};
