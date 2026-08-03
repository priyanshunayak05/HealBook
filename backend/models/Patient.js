const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      sparse: true,
      index: true,
    },
    clerkId: {
      type: String,
      sparse: true,
      index: true,
    },
    name: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    bloodGroup: {
      type: String,
      default: "",
      trim: true,
    },
    gender: {
      type: String,
      default: "",
      trim: true,
    },
    dateOfBirth: {
      type: String,
      default: "",
    },
    age: {
      type: Number,
      default: null,
      min: 0,
    },
    address: {
      type: String,
      default: "",
    },
    emergencyContact: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Helper static method: Find or create Patient for a specific name and user account
// patientSchema.statics.findOrCreateForUser = async function ({ clerkId, userId, name, email, phone }) {
//   const patientName = String(name || "Patient").trim();
//   const userQueries = [];
//   if (clerkId) userQueries.push({ clerkId: String(clerkId) });
//   if (userId && mongoose.Types.ObjectId.isValid(userId)) userQueries.push({ userId: new mongoose.Types.ObjectId(userId) });
//   if (email) userQueries.push({ email: String(email).toLowerCase() });

//   let patient = null;
//   if (userQueries.length > 0 && patientName) {
//     patient = await this.findOne({
//       name: new RegExp(`^${patientName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
//       $or: userQueries,
//     });
//   }

//   if (!patient && userQueries.length > 0) {
//     patient = await this.findOne({ $or: userQueries });
//     if (patient && (!patient.name || patient.name === "Patient")) {
//       patient.name = patientName;
//       await patient.save();
//     } else {
//       patient = null;
//     }
//   }

//   if (!patient) {
//     patient = await this.create({
//       clerkId: clerkId ? String(clerkId) : undefined,
//       userId: userId && mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : undefined,
//       name: patientName,
//       email: email ? String(email).toLowerCase() : "",
//       phone: phone || "",
//     });
//   }

//   return patient;
// };

patientSchema.statics.findOrCreateForUser = async function ({
  clerkId,
  userId,
  name,
  email,
  phone
}) {

  let patient = null;

  // First priority: Clerk ID
  if (clerkId) {
    patient = await this.findOne({
      clerkId: String(clerkId)
    });
  }

  // Second priority: Email
  if (!patient && email) {
    patient = await this.findOne({
      email: String(email).toLowerCase()
    });
  }


  // Update existing patient
  if (patient) {

    if (name) patient.name = String(name).trim();
    if (phone) patient.phone = String(phone).trim();

    await patient.save();

    return patient;
  }


  // Create new patient only if not exists
  patient = await this.create({
    clerkId: clerkId ? String(clerkId) : undefined,

    userId:
      userId && mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(userId)
        : undefined,

    name: String(name || "Patient").trim(),
    email: email ? String(email).toLowerCase() : "",
    phone: phone || "",
  });


  return patient;
};

module.exports = mongoose.model("Patient", patientSchema);
