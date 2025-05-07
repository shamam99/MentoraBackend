const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  hostUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isSolo: {
    type: Boolean,
    required: true,
    default: true,
  },
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  pinCode: {
    type: String,
    trim: true,
    minlength: 6,
    maxlength: 6,
    sparse: true, // only present in multiplayer rooms
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'completed'],
    default: 'waiting',
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  startedAt: {
    type: Date,
    default: null,
  },
  endedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Room', roomSchema);
