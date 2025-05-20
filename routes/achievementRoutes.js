const express = require("express");
const router = express.Router();
const authenticateUser = require("../middlewares/authenticateUser");
const Achievement = require("../models/Achievement");
const User = require("../models/User");

// GET /achievements/my
router.get("/my", authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("achievements");
    res.json({
      status: "success",
      achievements: user.achievements
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch achievements",
      error: err.message
    });
  }
});

module.exports = router;
