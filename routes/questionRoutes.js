const express = require("express");
const router = express.Router();
const {submitQuestions} = require("../controllers/questionController");
const authenticateUser = require("../middlewares/authenticateUser");

/**
 * @route POST /questions/submit
 * @desc  Cache parsed questions (solo or multiplayer) in memory
 * @access Private
 */
router.post("/submit", authenticateUser, submitQuestions); 
// router.post('/save', authenticateUser, saveQuestion);
// router.get('/saved', authenticateUser, getSavedQuestions);

module.exports = router;
