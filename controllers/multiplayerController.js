const Room = require('../models/Room');
const Question = require('../models/Question');
const GameSession = require('../models/GameSession');
const GameResult = require("../models/GameResult");
const User = require("../models/User");
const { successResponse, errorResponse } = require('../utils/response');
const staticQuestions = require('../data/questions');

exports.startMultiplayerGame = async (req, res) => {
  try {
    const userId = req.user._id;
    const room = await Room.findOne({ hostUser: userId, status: 'waiting' });
    if (!room) return errorResponse(res, 'No waiting room found', 404);

    const questions = staticQuestions.slice(0, 5); // replace later with dynamic
    const createdQuestions = await Question.insertMany(
      questions.map(q => ({
        questionText: q.question,
        answer: q.correct,
        options: q.choices,
        type: 'mcq',
        createdBy: userId
      }))
    );

    const gameSession = await GameSession.create({
      roomId: room._id,
      players: room.players.map(uid => ({ userId: uid })),
      questions: createdQuestions.map(q => q._id),
      totalQuestions: createdQuestions.length
    });

    room.status = 'active';
    room.startedAt = new Date();
    room.questions = createdQuestions.map(q => q._id);
    await room.save();

    return successResponse(res, 'Multiplayer game started', { gameSessionId: gameSession._id });
  } catch (err) {
    return errorResponse(res, 'Failed to start multiplayer game', 500, err.message);
  }
};

exports.saveMultiplayerGameResult = async (req, res) => {
    try {
      const { roomId, score, correctAnswers, totalQuestions } = req.body;
      const userId = req.user._id;
  
      await GameResult.create({ roomId, playerId: userId, score, correctAnswers, totalQuestions });
  
      const user = await User.findById(userId);
      if (user) {
        const { updateStreak } = require("../utils/streakUtils");
        updateStreak(user);
        user.hearts += 1;        
        await user.save();
        const unlocked = await checkAndUnlockAchievements(userId, {
          streak: user.streak,
          gamesPlayed: await GameResult.countDocuments({ playerId: userId }),
        });
      }
  
      return res.status(200).json({
        status: "success",
        message: "Multiplayer result saved",
      });
    } catch (err) {
      return res.status(500).json({
        status: "error",
        message: "Failed to save result",
        error: err.message,
      });
    }
  };