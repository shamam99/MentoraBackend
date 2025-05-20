const User = require("../models/User");
const { successResponse, errorResponse } = require("../utils/response");
const Achievement = require("../models/Achievement");

/**
 * GET /user/me
 * Returns current logged-in user (from JWT)
 */
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id).populate("achievements");
  return successResponse(res, "User fetched successfully", { user });
};

/**
 * PUT /user/profile
 * Allows the user to update limited profile info 
 */
exports.updateProfile = async (req, res) => {
  try {
    const { displayName, avatarURL } = req.body;

    if (displayName !== undefined) req.user.displayName = displayName;
    if (avatarURL !== undefined) req.user.avatarURL = avatarURL;

    await req.user.save();

    return successResponse(res, "Profile updated successfully", { user: req.user });
  } catch (err) {
    return errorResponse(res, "Failed to update profile", 500, err.message);
  }
};

exports.getAchievements = async (req, res) => {
  try {
    const all = await Achievement.find();
    const unlockedIds = req.user.achievements.map(a => a.toString());

    const formatted = all.map(ach => ({
      id: ach.iconURL,
      title: ach.title,
      description: `${ach.condition.type} >= ${ach.condition.value}`,
      iconName: unlockedIds.includes(ach._id.toString()) ? "lightStar" : "offStar",
      isUnlocked: unlockedIds.includes(ach._id.toString())
    }));

    return successResponse(res, "Achievements loaded", { achievements: formatted });
  } catch (err) {
    return errorResponse(res, "Failed to load achievements", 500, err.message);
  }
};