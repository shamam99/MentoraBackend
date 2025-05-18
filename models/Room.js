const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  hostUser: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  players: [{ type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }],
  pinCode: { 
    type: String, 
    unique: true, 
    sparse: true 
  },
  status: { 
    type: String, 
    enum: ["waiting", "active", "completed"], 
    default: "waiting" 
  },
  isSolo: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  startedAt: Date,
  endedAt: Date
});

module.exports = mongoose.model("Room", roomSchema);
