const express = require("express");
const router = express.Router();
const questionController = require("../controllers/questionController");
const authenticateUser = require("../middlewares/authenticateUser");

/**
 * @route POST /questions/submit
 * @desc  Cache parsed questions (solo or multiplayer) in memory
 * @access Private
 */
router.post("/submit", authenticateUser, questionController.submitQuestions); 

module.exports = router;
