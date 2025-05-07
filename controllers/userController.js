const User = require("../models/User");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * GET /user/me
 * Returns current logged-in user (from JWT)
 */
exports.getMe = async (req, res) => {
  return successResponse(res, "User fetched successfully", { user: req.user });
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
