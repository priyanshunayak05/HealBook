const ActivityLog = require("../models/ActivityLog");

/**
 * Creates and saves an audit log entry in MongoDB
 * @param {Object} req - The Express request object (to extract user information and IP)
 * @param {string} action - The description of the action (e.g., "Doctor Added")
 * @param {Object} details - Additional metadata/payload of the action
 */
const logActivity = async (req, action, details = {}) => {
  try {
    if (!req || !req.user) {
      console.warn("Skipping log: req.user not found");
      return;
    }

    const log = new ActivityLog({
      userId: req.user.clerkId || req.user._id || req.user.id,
      userName: req.user.name || "Unknown User",
      userEmail: req.user.email || "unknown@medicare.com",
      userRole: req.role || req.user.role || "patient",
      action,
      details,
      ipAddress: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "",
    });

    await log.save();
  } catch (error) {
    console.error("Activity Logging failed:", error);
  }
};

module.exports = { logActivity };
