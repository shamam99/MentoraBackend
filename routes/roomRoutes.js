const express = require('express');
const { createRoom, joinRoomByPin } = require('../controllers/roomController');
const authenticateUser = require('../middlewares/authenticateUser');

const router = express.Router();

router.post('/create', authenticateUser, createRoom);

router.post('/join', authenticateUser, joinRoomByPin);

module.exports = router;
