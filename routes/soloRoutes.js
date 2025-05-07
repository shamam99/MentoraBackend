const express = require("express");
const router = express.Router();
const { startSoloGame, submitSoloAnswer } = require("../controllers/soloController");
const authenticateUser = require("../middlewares/authenticateUser");

// Create solo room and send questions
router.post("/start", authenticateUser, startSoloGame);

// Submit solo game result
router.post("/submit", authenticateUser, submitSoloAnswer);

module.exports = router;