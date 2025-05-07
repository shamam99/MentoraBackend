const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  playerId: {
    type: String,
    required: true,
    unique: true, // Game Center unique ID
    trim: true,
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
  },
  avatarURL: {
    type: String,
    default: null,
  },
  hearts: {
    type: Number,
    default: 3,
    min: 0,
  },
  streak: {
    type: Number,
    default: 0,
  },
  achievements: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement',
  }],
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium'],
      default: 'free',
    },
    expiresAt: {
      type: Date,
      default: null,
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('User', userSchema);
