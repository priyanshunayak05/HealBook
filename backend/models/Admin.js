const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    profileImage: {
      type: String,
    },
    role: {
      type: String,
      default: "admin",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Admin", adminSchema);
