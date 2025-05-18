const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  players: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    score: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 }
  }],
  currentIndex: { type: Number, default: 0 },
  totalQuestions: { type: Number },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date }
});

module.exports = mongoose.model('GameSession', gameSessionSchema);
