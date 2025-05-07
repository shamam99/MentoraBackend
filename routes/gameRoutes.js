const express = require("express");
const { getMyGames, getGameById } = require("../controllers/gameController");
const authenticateUser = require("../middlewares/authenticateUser");

const router = express.Router();

router.get("/mine", authenticateUser, getMyGames);
router.get("/:id", authenticateUser, getGameById);

module.exports = router;
