const { soloQuestions, roomQuestions } = require("../utils/questionsCache");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * @desc Store submitted questions in memory based on game mode
 * @route POST /questions/submit
 * @access Private (auth middleware must be applied before this route)
 */
exports.submitQuestions = (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { questions, mode } = req.body;

    if (!Array.isArray(questions) || !mode) {
      return res.status(400).json({ message: "Invalid question format or mode missing" });
    }

    console.log(`🔁 [submitQuestions] Received ${questions.length} questions for mode: ${mode}`);

    if (mode === "solo") {
      soloQuestions[userId] = questions.map((q, i) => ({
        statement: q.statement || q.question || `Untitled #${i}`,
        is_true: q.is_true ?? true
      }));
    } else if (mode === "multiplayer") {
      roomQuestions[userId] = questions.map((q, i) => {
        const validChoices = Array.isArray(q.choices)
          ? q.choices
              .filter(c => typeof c === "object" && typeof c.answer === "string")
              .map(c => c.answer)
          : [];

        return {
          question: q.question || `Untitled #${i}`,
          correct: q.correct_answer || "",
          choices: validChoices
        };
      });
    } else {
      return res.status(400).json({ message: "Invalid game mode" });
    }

    console.log(`✅ Questions cached in memory for ${mode}:`, mode === "solo" ? soloQuestions[userId] : roomQuestions[userId]);

    return res.status(200).json({ message: "Questions submitted successfully" });
  } catch (err) {
    console.error("[submitQuestions] Error:", err);
    return res.status(500).json({ message: "Failed to process questions" });
  }
};
