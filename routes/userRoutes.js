const express = require("express");
const { getMe, updateProfile } = require("../controllers/userController");
const authenticateUser = require("../middlewares/authenticateUser");

const router = express.Router();

router.get("/me", authenticateUser, getMe);
router.put("/profile", authenticateUser, updateProfile);

module.exports = router;
