const GameSession = require("../models/GameSession");
const { successResponse, errorResponse } = require("../utils/response");

exports.getUserHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    const sessions = await GameSession.find({ "players.userId": userId })
      .sort({ createdAt: -1 })
      .limit(10);

    return successResponse(res, "History fetched successfully", { sessions });
  } catch (err) {
    return errorResponse(res, "Failed to fetch history", 500, err.message);
  }
};
