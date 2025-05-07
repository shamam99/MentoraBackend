const express = require("express");
const router = express.Router();
const { getUserHistory } = require("../controllers/historyController");
const authenticateUser = require("../middlewares/authenticateUser");

router.get("/", authenticateUser, getUserHistory);

module.exports = router;
