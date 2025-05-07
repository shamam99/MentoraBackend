const Room = require("../models/Room");
const GameResult = require("../models/GameResult");
const User = require("../models/User");
const staticQuestions = require("../data/questions");
const Question = require("../models/Question");

exports.startSoloGame = async (req, res) => {
  try {
    const userId = req.user._id;

    // Save questions to DB if not there (optional but realistic)
    const createdQuestions = await Promise.all(
      staticQuestions.slice(0, 5).map(async (q) => {
        const question = new Question({
          questionText: q.question,
          answer: q.correct,
          options: q.choices,
          type: "mcq",
          createdBy: userId,
        });
        return await question.save();
      })
    );

    // Create room with these questions
    const newRoom = await Room.create({
      hostUser: userId,
      isSolo: true,
      players: [userId],
      status: "active",
      questions: createdQuestions.map((q) => q._id),
      startedAt: new Date(),
    });

    return res.status(200).json({
      status: "success",
      message: "Solo game started",
      data: {
        roomId: newRoom._id,
        questions: createdQuestions.map((q) => ({
          _id: q._id,
          questionText: q.questionText,
          options: q.options,
          type: q.type,
        })),
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "Failed to start solo game",
      error: err.message,
    });
  }
};

exports.submitSoloAnswer = async (req, res) => {
  try {
    const userId = req.user._id;
    const { roomId, score, correctAnswers, totalQuestions } = req.body;

    if (!roomId || score == null || correctAnswers == null || totalQuestions == null) {
      return res.status(400).json({ status: "error", message: "Missing game result fields" });
    }

    // Create GameResult
    await GameResult.create({
      roomId,
      playerId: userId,
      score,
      correctAnswers,
      totalQuestions,
    });

    // Update user stats (optional bonus)
    const user = await User.findById(userId);
    if (user) {
      user.streak += 1;
      user.hearts += 1; // bonus
      await user.save();
    }

    // Update room status
    await Room.findByIdAndUpdate(roomId, {
      endedAt: new Date(),
      status: "completed",
    });

    return res.status(200).json({
      status: "success",
      message: "Game result submitted",
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "Failed to submit result",
      error: err.message,
    });
  }
};