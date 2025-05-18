const express = require('express');
const router = express.Router();
const { startMultiplayerGame, saveMultiplayerGameResult } = require('../controllers/multiplayerController');
const authenticateUser = require('../middlewares/authenticateUser');

router.post('/start', authenticateUser, startMultiplayerGame);
router.post("/submit", authenticateUser, saveMultiplayerGameResult);

module.exports = router;
