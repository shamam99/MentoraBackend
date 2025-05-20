const express = require("express");
const { getMe, updateProfile } = require("../controllers/userController");
const authenticateUser = require("../middlewares/authenticateUser");
const { getAchievements } = require("../controllers/userController");


const router = express.Router();

router.get("/me", authenticateUser, getMe);
router.put("/profile", authenticateUser, updateProfile);
router.get("/achievements", authenticateUser, getAchievements);

module.exports = router;
