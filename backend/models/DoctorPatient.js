const mongoose = require("mongoose");

const doctorPatientSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    patientId: {
      type: String, // Clerk ID or Mongoose User ID
      required: true,
      index: true,
    },
    relationshipType: {
      type: String,
      enum: ["Self Registered", "Referral", "Direct Consultation"],
      default: "Self Registered",
    },
    referredByDoctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      default: null,
    },
    joinedDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate doctor-patient mapping
doctorPatientSchema.index({ doctorId: 1, patientId: 1 }, { unique: true });

module.exports = mongoose.model("DoctorPatient", doctorPatientSchema);
