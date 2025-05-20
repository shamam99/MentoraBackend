const Achievement = require("../models/Achievement");
const User = require("../models/User");

/**
 * Checks and unlocks achievements based on provided stats
 * @param {string} userId 
 * @param {{ streak?: number, gamesPlayed?: number, filesUploaded?: number, friendsAdded?: number }} stats 
 */
async function checkAndUnlockAchievements(userId, stats) {
  const user = await User.findById(userId);
  if (!user) return;

  const achievements = await Achievement.find({});
  const unlockedIds = user.achievements.map(id => id.toString());

  const newAchievements = [];

  for (const ach of achievements) {
    const { type, value } = ach.condition;
    if (unlockedIds.includes(ach._id.toString())) continue;

    if (
      (type === "streak" && stats.streak >= value) ||
      (type === "gamesPlayed" && stats.gamesPlayed >= value) ||
      (type === "filesUploaded" && stats.filesUploaded >= value) ||
      (type === "friendsAdded" && stats.friendsAdded >= value)
    ) {
      user.achievements.push(ach._id);
      newAchievements.push(ach);
    }
  }

  if (newAchievements.length > 0) {
    await user.save();
    // ⛳ Return them so frontend can call Game Center
    return newAchievements.map(a => a._id.toString());
  }

  return [];
}

module.exports = {
  checkAndUnlockAchievements,
};
