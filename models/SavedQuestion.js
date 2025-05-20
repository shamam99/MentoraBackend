const mongoose = require('mongoose');

const savedQuestionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  questionText: {
    type: String,
    required: true,
    trim: true,
  },
  answer: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  choices: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('SavedQuestion', savedQuestionSchema);
