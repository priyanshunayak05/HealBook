const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.Mixed, // Patient ObjectId or Patient string ID
      required: true,
      index: true,
    },
    patientRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
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
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "", trim: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Referral", referralSchema);
