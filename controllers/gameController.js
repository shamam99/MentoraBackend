const GameSession = require("../models/GameSession");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * Get all game sessions the current user participated in
 */
exports.getMyGames = async (req, res) => {
  try {
    const userId = req.user._id;
    const games = await GameSession.find({ "players.userId": userId })
      .sort({ endedAt: -1 })
      .limit(20);

    return successResponse(res, "User game history retrieved", { games });
  } catch (err) {
    return errorResponse(res, "Failed to fetch game history", 500, err.message);
  }
};

/**
 * Get a specific game by ID
 */
exports.getGameById = async (req, res) => {
  try {
    const { id } = req.params;
    const game = await GameSession.findById(id).populate("players.userId", "name email");

    if (!game) {
      return errorResponse(res, "Game not found", 404);
    }

    return successResponse(res, "Game session found", { game });
  } catch (err) {
    return errorResponse(res, "Failed to get game session", 500, err.message);
  }
};
