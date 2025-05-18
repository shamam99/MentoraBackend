const express = require('express');
const { createRoom } = require('../controllers/roomController');
const authenticateUser = require('../middlewares/authenticateUser');

const router = express.Router();

router.post('/create', authenticateUser, createRoom);


module.exports = router;
