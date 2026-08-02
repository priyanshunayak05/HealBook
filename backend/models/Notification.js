const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: String, // Clerk ID, Doctor ID, or User ID
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      default: null,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["referral", "appointment", "system", "info", "warning", "success", "danger"],
      default: "system",
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Notification", notificationSchema);
