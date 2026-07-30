const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false,
    },
    clerkId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    role: {
      type: String,
      default: "doctor",
    },
    specialization: { type: String, default: "" },
    imageUrl: { type: String, default: null },
    imagePublicId: { type: String, default: null },
    experience: { type: String, default: "" },
    qualifications: { type: String, default: "" },
    location: { type: String, default: "" },
    about: { type: String, default: "" },
    fee: { type: Number, default: 0 },
    availability: {
      type: String,
      enum: ["Available", "Unavailable"],
      default: "Available",
    },
    schedule: { type: Map, of: [String], default: {} },
    success: { type: String, default: "" },
    patients: { type: String, default: "" },
    rating: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
doctorSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
doctorSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password || typeof this.password !== "string") {
    return false;
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Doctor", doctorSchema);