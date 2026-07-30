const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // Clerk ID or Mongoose User/Doctor ID
      required: true,
      index: true,
    },
    userName: {
      type: String,
      default: "",
    },
    userEmail: {
      type: String,
      required: true,
      index: true,
    },
    userRole: {
      type: String,
      required: true,
    },
    action: {
      type: String, // e.g., "Doctor Added", "Login", "Appointment Updated"
      required: true,
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed, // Storing JSON metadata of the action
      default: {},
    },
    ipAddress: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true, // Automatically manages createdAt as the log timestamp
  }
);

module.exports = mongoose.model("ActivityLog", activityLogSchema);
