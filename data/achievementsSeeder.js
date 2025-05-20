const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Achievement = require("../models/Achievement");

dotenv.config();
mongoose.connect(process.env.MONGO_URI);

const achievements = [
  {
    title: "The fifth star !",
    iconURL: "badge1", // Match Game Center ID
    condition: { type: "streak", value: 5 },
    rewardType: "badge"
  },
  {
    title: "King of the game !",
    iconURL: "badge2",
    condition: { type: "gamesPlayed", value: 3 },
    rewardType: "badge"
  },
  {
    title: "Popular Kid !",
    iconURL: "badge3",
    condition: { type: "friendsAdded", value: 5 },
    rewardType: "badge"
  },
  {
    title: "Educated king !",
    iconURL: "badge4",
    condition: { type: "filesUploaded", value: 4 },
    rewardType: "badge"
  }
];

(async () => {
  try {
    await Achievement.deleteMany();
    await Achievement.insertMany(achievements);
    console.log("Achievements seeded");
    process.exit();
  } catch (err) {
    console.error("Seeding failed", err);
    process.exit(1);
  }
})();
