// const mongoose = require("mongoose");

// const gameSessionSchema = new mongoose.Schema(
//   {
//     roomId: { type: String, required: true },
//     players: [
//       {
//         userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//         score: { type: Number, default: 0 },
//         hearts: { type: Number, default: 5 },
//         isWinner: { type: Boolean, default: false },
//       },
//     ],
//     totalQuestions: { type: Number },
//     endedAt: { type: Date, default: Date.now },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("GameSession", gameSessionSchema);
