const mongoose = require('mongoose');

const gameResultSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  score: {
    type: Number,
    required: true,
    min: 0,
  },
  correctAnswers: {
    type: Number,
    required: true,
    min: 0,
  },
  totalQuestions: {
    type: Number,
    required: true,
    min: 1,
  },
  finishedAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('GameResult', gameResultSchema);


// where to save the score of the Q for each user?? please think of this to see if something is missing also 