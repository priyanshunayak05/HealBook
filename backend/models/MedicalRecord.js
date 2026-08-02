const mongoose = require("mongoose");

const prescriptionItemSchema = new mongoose.Schema(
  {
    medicineName: { type: String, required: true, trim: true },
    dosage: { type: String, default: "", trim: true },
    frequency: { type: String, default: "", trim: true },
    duration: { type: String, default: "", trim: true },
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
    patientEmail: { type: String, default: "", lowercase: true, trim: true, index: true },
    bloodGroup: { type: String, default: "", trim: true },
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
