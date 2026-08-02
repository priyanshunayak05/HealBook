const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema(
  {
    patientId: {
      type: String, // Clerk ID or Mongoose User ID
      required: true,
      index: true,
    },
    patientName: { type: String, default: "", trim: true },
    patientEmail: { type: String, default: "", lowercase: true, trim: true },
    fromDoctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    fromDoctorName: { type: String, default: "" },
    toDoctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    toDoctorName: { type: String, default: "" },
    specialization: { type: String, default: "" },
    reason: { type: String, required: true, trim: true },
    symptoms: { type: String, default: "", trim: true },
    doctorNotes: { type: String, default: "", trim: true },
    attachedReports: { type: [mongoose.Schema.Types.Mixed], default: [] },
    status: {
      type: String,
      enum: ["pending", "accepted", "completed", "rejected"],
      default: "pending",
      index: true,
    },
    acceptedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Referral", referralSchema);
