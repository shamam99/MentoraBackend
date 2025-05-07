const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
    trim: true,
  },
  answer: {
    type: mongoose.Schema.Types.Mixed, // String or Boolean
    required: true,
  },
  options: [{
    type: String
  }],
  type: {
    type: String,
    enum: ['boolean', 'mcq', 'text'],
    default: 'boolean',
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  sourcePDF: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UploadedFile',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Question', questionSchema);
