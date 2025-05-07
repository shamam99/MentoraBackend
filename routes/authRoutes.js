const express = require("express");
const router = express.Router();
const { appleGameCenterLogin, refreshToken } = require("../controllers/authController");
const authenticateUser = require("../middlewares/authenticateUser");

router.post("/apple-gamecenter-login", appleGameCenterLogin);
router.get("/refresh-token", authenticateUser, refreshToken);

module.exports = router;
