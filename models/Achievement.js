const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  iconURL: {
    type: String,
    default: null,
  },
  condition: {
    type: {
      type: String,
      enum: ['streak', 'score', 'gamesPlayed', 'filesUploaded', 'friendsAdded'],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 1,
    }
  },
  rewardType: {
    type: String,
    enum: ['badge', 'hearts', 'xp'],
    required: true,
  }
});

module.exports = mongoose.model('Achievement', achievementSchema);
