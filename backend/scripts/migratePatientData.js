const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

const User = require("../models/User");
const Patient = require("../models/Patient");
const Appointment = require("../models/Appointment");
const MedicalRecord = require("../models/MedicalRecord");
const DoctorPatient = require("../models/DoctorPatient");
const Referral = require("../models/Referral");

async function runMigration() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error("MONGO_URI not configured in .env file");
      process.exit(1);
    }

    console.log("Connecting to MongoDB for Complete Patient & Doctor Migration...");
    await mongoose.connect(mongoUri);
    console.log("Connected successfully.");

    // 1. Process all Appointments
    const appointments = await Appointment.find({});
    console.log(`Processing ${appointments.length} appointment records...`);

    for (const appt of appointments) {
      const pName = (appt.patientName || "Patient").trim();
      const cId = appt.createdBy || appt.userId;
      const pEmail = appt.email || appt.patientEmail;

      const patientDoc = await Patient.findOrCreateForUser({
        clerkId: cId,
        name: pName,
        email: pEmail,
        phone: appt.mobile,
      });

      appt.patientRef = patientDoc._id;
      appt.patientId = patientDoc._id.toString();
      await appt.save();

      // Upsert DoctorPatient for Appointment
      if (appt.doctorId) {
        try {
          await DoctorPatient.findOneAndUpdate(
            { doctorId: appt.doctorId, patientId: patientDoc._id },
            {
              doctorId: appt.doctorId,
              patientId: patientDoc._id,
              relationshipType: "Self Registered",
              status: "Active",
              joinedDate: appt.createdAt || new Date(),
            },
            { upsert: true, new: true }
          );
        } catch (e) {
          // Ignore duplicate index errors
        }
      }
    }

    // 2. Process Medical Records
    const records = await MedicalRecord.find({});
    console.log(`Processing ${records.length} medical record entries...`);

    for (const rec of records) {
      const pName = (rec.patientName || "").trim();
      const pIdStr = String(rec.patientId || "");
      const cleanId = pIdStr.includes(":::") ? pIdStr.split(":::")[0] : pIdStr;

      let patientDoc = null;
      if (cleanId && mongoose.Types.ObjectId.isValid(cleanId)) {
        patientDoc = await Patient.findById(cleanId);
      }
      if (!patientDoc && pName) {
        patientDoc = await Patient.findOne({ name: new RegExp(`^${pName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
      }

      if (!patientDoc) {
        patientDoc = await Patient.findOrCreateForUser({
          clerkId: cleanId,
          name: pName || "Patient",
          email: rec.patientEmail,
        });
      }

      rec.patientRef = patientDoc._id;
      rec.patientId = patientDoc._id.toString();
      await rec.save();
    }

    // 3. Process Referrals
    const referrals = await Referral.find({});
    console.log(`Processing ${referrals.length} referral records...`);

    for (const ref of referrals) {
      const pName = (ref.patientName || "").trim();
      const pIdStr = String(ref.patientId || "");
      const cleanId = pIdStr.includes(":::") ? pIdStr.split(":::")[0] : pIdStr;

      let patientDoc = null;
      if (cleanId && mongoose.Types.ObjectId.isValid(cleanId)) {
        patientDoc = await Patient.findById(cleanId);
      }
      if (!patientDoc && pName) {
        patientDoc = await Patient.findOne({ name: new RegExp(`^${pName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
      }

      if (!patientDoc) {
        patientDoc = await Patient.findOrCreateForUser({
          clerkId: cleanId,
          name: pName || "Patient",
          email: ref.patientEmail,
        });
      }

      ref.patientRef = patientDoc._id;
      ref.patientId = patientDoc._id.toString();
      await ref.save();

      // Upsert DoctorPatient for accepted referral
      if (ref.status === "accepted" && ref.toDoctorId) {
        try {
          await DoctorPatient.findOneAndUpdate(
            { doctorId: ref.toDoctorId, patientId: patientDoc._id },
            {
              doctorId: ref.toDoctorId,
              patientId: patientDoc._id,
              relationshipType: "Referral",
              referredByDoctorId: ref.fromDoctorId,
              status: "Active",
              joinedDate: ref.acceptedAt || ref.createdAt || new Date(),
            },
            { upsert: true, new: true }
          );
        } catch (e) {
          // Ignore duplicate index errors
        }
      }
    }

    console.log("Patient & Doctor Database Migration Completed Successfully!");
    await mongoose.disconnect();
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

runMigration();
