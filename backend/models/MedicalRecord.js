const mongoose = require("mongoose");

const prescriptionItemSchema = new mongoose.Schema(
  {
    medicineName: { type: String, required: true, trim: true },
    dosage: { type: String, default: "", trim: true }, // e.g. "5mg", "500mg"
    frequency: { type: String, default: "", trim: true }, // e.g. "Once daily", "2 times/day"
    duration: { type: String, default: "", trim: true }, // e.g. "30 days", "5 days"
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    name: { type: String, default: "Report" },
    url: { type: String, required: true },
    publicId: { type: String, default: "" },
  },
  { _id: false }
);

const medicalRecordSchema = new mongoose.Schema(
  {
    patientId: {
      type: String, // Clerk ID or Mongoose User ID
      required: true,
      index: true,
    },
    patientName: { type: String, default: "", trim: true },
    patientEmail: { type: String, default: "", lowercase: true, trim: true, index: true },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    doctorName: { type: String, default: "" },
    departmentName: { type: String, default: "" },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
      index: true,
    },
    symptoms: { type: String, default: "" },
    diagnosis: { type: String, default: "" },
    prescription: [prescriptionItemSchema],
    doctorNotes: { type: String, default: "" },
    uploadedReports: [reportSchema],
    followUpDate: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("MedicalRecord", medicalRecordSchema);
