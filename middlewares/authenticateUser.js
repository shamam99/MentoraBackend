const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorResponse } = require('../utils/response');

/**
 * Middleware to authenticate user via JWT.
 * Adds the full user object to req.user if valid.
 */
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(res, "Unauthorized: No token provided", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-__v");
    if (!user) {
      return errorResponse(res, "Unauthorized: User not found", 401);
    }

    req.user = user;
    next();
  } catch (err) {
    return errorResponse(res, "Invalid or expired token", 403, {
      error: err.message
    });
  }
};

module.exports = authenticateUser;
