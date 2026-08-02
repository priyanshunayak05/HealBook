const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true },
    patientEmail: { type: String, lowercase: true, trim: true, index: true },
    email: { type: String, lowercase: true, trim: true, index: true },
    patientName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    age: { type: Number, default: null, min: [0, "Age cannot be negative"] },
    gender: { type: String, default: "" },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    doctorName: { type: String, default: "" },
    speciality: { type: String, default: "" },
    doctorImage: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    date: { type: String, required: true },
    time: { type: String, required: true },
    fees: { type: Number, required: true, min: 0, default: 0 },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Completed", "Canceled", "Rescheduled"],
      default: "Pending",
    },
    rescheduledTo: {
      date: { type: String },
      time: { type: String },
    },
    payment: {
      method: {
        type: String,
        enum: ["Cash", "Online"],
        default: "Cash",
      },
      status: {
        type: String,
        enum: ["Pending", "Paid", "Failed", "Refunded"],
        default: "Pending",
      },
      amount: { type: Number, default: 0 },
      providerId: { type: String, default: "" },
      meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    sessionId: { type: String, default: null, index: true },
    paidAt: { type: Date, default: null },
    notes: { type: String, default: "" },
    createdBy: { type: String, index: true },
    owner: { type: String },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
