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
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
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
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    joinedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index to prevent duplicate doctor-patient mapping
doctorPatientSchema.index({ doctorId: 1, patientId: 1 }, { unique: true });

module.exports = mongoose.model("DoctorPatient", doctorPatientSchema);
