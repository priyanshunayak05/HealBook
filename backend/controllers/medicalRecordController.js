const mongoose = require("mongoose");
const MedicalRecord = require("../models/MedicalRecord");
const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const User = require("../models/User");
const Patient = require("../models/Patient");
const Referral = require("../models/Referral");
const { logActivity } = require("../services/logService");

// @desc    Create new medical consultation record
// @route   POST /api/medical-records
// @access  Private/Doctor
const createMedicalRecord = async (req, res) => {
  try {
    const {
      patientId,
      patientName: patientNameFromBody,
      patientEmail: patientEmailFromBody,
      appointmentId,
      symptoms = "",
      diagnosis = "",
      prescription = [],
      doctorNotes = "",
      uploadedReports = [],
      followUpDate = "",
    } = req.body || {};

    if (!patientId) {
      return res.status(400).json({ success: false, message: "patientId is required" });
    }

    // Determine Doctor identity
    const doctorId = req.user?._id || req.user?.id;
    let doctor = null;
    if (doctorId && mongoose.Types.ObjectId.isValid(doctorId)) {
      doctor = await Doctor.findById(doctorId);
    }
    if (!doctor && req.user?.clerkId) {
      doctor = await Doctor.findOne({ clerkId: req.user.clerkId });
    }
    if (!doctor && req.user?.email) {
      doctor = await Doctor.findOne({ email: req.user.email.toLowerCase() });
    }

    if (!doctor) {
      return res.status(403).json({ success: false, message: "Only authenticated doctors can create medical records" });
    }

    // Determine Patient details
    let patientName = patientNameFromBody || "";
    let patientEmail = (patientEmailFromBody || "").toLowerCase().trim();

    // Check user collection or appointment for patient name/email fallback
    if (!patientEmail || !patientName) {
      const userQueries = [{ clerkId: String(patientId) }];
      if (mongoose.Types.ObjectId.isValid(patientId)) userQueries.push({ _id: patientId });

      let patientUser = await User.findOne({ $or: userQueries });
      if (patientUser) {
        if (!patientName) patientName = patientUser.name;
        if (!patientEmail) patientEmail = (patientUser.email || "").toLowerCase();
      }
    }

    if (appointmentId && mongoose.Types.ObjectId.isValid(appointmentId)) {
      const appt = await Appointment.findById(appointmentId);
      if (appt) {
        if (!patientName) patientName = appt.patientName;
        if (!patientEmail) patientEmail = (appt.email || appt.patientEmail || "").toLowerCase();

        // Mark appointment as Completed automatically when consultation notes are submitted
        if (appt.status !== "Completed") {
          appt.status = "Completed";
          if (doctorNotes) appt.notes = doctorNotes;
          await appt.save();
        }
      }
    }

    const record = await MedicalRecord.create({
      patientId: String(patientId),
      patientName: patientName || "Patient",
      patientEmail: patientEmail || "",
      doctorId: doctor._id,
      doctorName: doctor.name || req.user.name || "Doctor",
      departmentName: doctor.specialization || doctor.speciality || "",
      appointmentId: appointmentId || null,
      symptoms: String(symptoms).trim(),
      diagnosis: String(diagnosis).trim(),
      prescription: Array.isArray(prescription) ? prescription : [],
      doctorNotes: String(doctorNotes).trim(),
      uploadedReports: Array.isArray(uploadedReports) ? uploadedReports : [],
      followUpDate: String(followUpDate).trim(),
    });

    try {
      await logActivity(
        req.user?.clerkId || String(req.user?._id),
        doctor.name || "Doctor",
        req.user?.email || doctor.email || "doctor@medicare.com",
        "doctor",
        "Medical Record Created",
        { recordId: record._id, patientId, diagnosis: record.diagnosis }
      );
    } catch (e) {
      console.warn("Log activity failed:", e?.message);
    }

    return res.status(201).json({
      success: true,
      message: "Medical record saved successfully",
      data: record,
      record,
    });
  } catch (err) {
    console.error("createMedicalRecord error:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// @desc    Get patient medical history
// @route   GET /api/doctor/patient/:patientId/history
// @route   GET /api/medical-records/patient/:patientId
// @access  Private (Doctor / Admin / Patient)
const getPatientMedicalHistory = async (req, res) => {
  try {
    const { page: pageRaw = 1, limit: limitRaw = 10 } = req.query;

    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitRaw, 10) || 10));
    const skip = (page - 1) * limit;

    const userRole = req.role || req.user?.role;
    const authClerkId = req.user?.clerkId || req.user?.id || String(req.user?._id || "");
    const authEmail = (req.user?.email || "").toLowerCase();

    let rawParam = req.params.patientId || authClerkId || authEmail;
    if (rawParam.includes(":::")) {
      rawParam = rawParam.split(":::")[0];
    }

    const patientId = String(rawParam);
    console.log("History requested patientId:", patientId);

    // Authorization Rule Verification
    if (userRole === "patient" && req.params.patientId) {
      // Patients can only view their own history
      const isOwner = authClerkId === patientId || (authEmail && authEmail === patientId.toLowerCase());
      if (!isOwner) {
        return res.status(403).json({ success: false, message: "Forbidden: Patients can only view their own medical history." });
      }
    } else if (userRole === "doctor" && patientId) {
      const doctorId = req.user?._id;
      const hasAppointment = await Appointment.exists({
        doctorId,
        $or: [{ createdBy: patientId }, { userId: patientId }, { patientId: patientId }, { email: patientId.toLowerCase() }, { patientEmail: patientId.toLowerCase() }],
      });

      const hasReferral = await Referral.exists({
        patientId,
        $or: [{ toDoctorId: doctorId }, { fromDoctorId: doctorId }],
      });

      if (!hasAppointment && !hasReferral) {
        console.log(`Doctor ${doctorId} accessing patient ${patientId} history (general clinical access permitted)`);
      }
    }

    // Query MedicalRecord strictly by patientId (or matching patientEmail)
    const query = patientId
      ? {
          $or: [
            { patientId: String(patientId) },
            { patientEmail: String(patientId).toLowerCase() },
          ],
        }
      : {};

    const total = await MedicalRecord.countDocuments(query);
    const records = await MedicalRecord.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Fetch patient referrals timeline
    const referralQuery = patientId
      ? {
          $or: [
            { patientId: String(patientId) },
            { patientEmail: String(patientId).toLowerCase() },
          ],
        }
      : {};
    const patientReferrals = await Referral.find(referralQuery).sort({ createdAt: -1 });

    // Fetch user/patient demographics strictly by patientId
    const isObjId = mongoose.Types.ObjectId.isValid(patientId);
    let patientDoc = null;
    if (isObjId) {
      patientDoc = await Patient.findById(patientId);
    }
    if (!patientDoc) {
      patientDoc = await Patient.findOne({ $or: [{ clerkId: String(patientId) }, { email: String(patientId).toLowerCase() }] });
    }

    const userQueries = [{ clerkId: String(patientId) }, { email: String(patientId).toLowerCase() }];
    if (isObjId) userQueries.push({ _id: patientId });
    const userDoc = await User.findOne({ $or: userQueries });

    const patientAppt = await Appointment.findOne({
      $or: [
        { createdBy: String(patientId) },
        { userId: String(patientId) },
        { patientId: String(patientId) },
        { email: String(patientId).toLowerCase() },
        { patientEmail: String(patientId).toLowerCase() },
      ],
    }).sort({ createdAt: -1 });

    const latestRecord = records[0];

    const patientDetails = {
      patientId: String(patientId),
      name: patientDoc?.name || latestRecord?.patientName || patientAppt?.patientName || userDoc?.name || "Patient",
      email: patientDoc?.email || userDoc?.email || latestRecord?.patientEmail || patientAppt?.email || "N/A",
      phone: patientDoc?.phone || patientAppt?.mobile || userDoc?.phone || "N/A",
      age: patientDoc?.age || patientAppt?.age || "N/A",
      gender: patientDoc?.gender || patientAppt?.gender || "N/A",
      bloodGroup: patientDoc?.bloodGroup || latestRecord?.bloodGroup || patientAppt?.bloodGroup || userDoc?.bloodGroup || "Not Specified",
      address: patientDoc?.address || userDoc?.address || "N/A",
      emergencyContact: patientDoc?.emergencyContact || userDoc?.emergencyContact || userDoc?.phone || patientAppt?.mobile || "N/A",
    };

    // Format output consultations
    const formattedConsultations = records.map((r) => ({
      _id: r._id,
      id: r._id,
      patientId: r.patientId,
      patientName: r.patientName,
      date: r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "",
      createdAt: r.createdAt,
      doctor: r.doctorName,
      doctorName: r.doctorName,
      doctorId: r.doctorId,
      department: r.departmentName,
      symptoms: r.symptoms,
      diagnosis: r.diagnosis,
      prescription: r.prescription || [],
      doctorNotes: r.doctorNotes,
      uploadedReports: r.uploadedReports || [],
      followUpDate: r.followUpDate,
    }));

    return res.json({
      success: true,
      data: formattedConsultations,
      records: formattedConsultations,
      consultations: formattedConsultations,
      patientDetails,
      referralHistory: patientReferrals,
      referrals: patientReferrals,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        hasMore: skip + records.length < total,
      },
    });
  } catch (err) {
    console.error("getPatientMedicalHistory error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get patient prescription history & comparison
// @route   GET /api/patient/:patientId/prescriptions
// @access  Private (Doctor / Admin / Patient)
const getPatientPrescriptions = async (req, res) => {
  try {
    const { patientId } = req.params;
    const query = {
      $or: [
        { patientId: String(patientId) },
        { patientEmail: String(patientId).toLowerCase() },
      ],
      "prescription.0": { $exists: true },
    };

    const records = await MedicalRecord.find(query).sort({ createdAt: -1 });

    const prescriptionsList = [];
    records.forEach((rec) => {
      if (Array.isArray(rec.prescription)) {
        rec.prescription.forEach((med) => {
          prescriptionsList.push({
            recordId: rec._id,
            date: rec.createdAt ? new Date(rec.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "",
            createdAt: rec.createdAt,
            doctorName: rec.doctorName,
            doctorId: rec.doctorId,
            diagnosis: rec.diagnosis,
            medicineName: med.medicineName,
            dosage: med.dosage,
            frequency: med.frequency,
            duration: med.duration,
          });
        });
      }
    });

    return res.json({
      success: true,
      data: prescriptionsList,
      prescriptions: prescriptionsList,
      totalMedicines: prescriptionsList.length,
    });
  } catch (err) {
    console.error("getPatientPrescriptions error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  createMedicalRecord,
  getPatientMedicalHistory,
  getPatientPrescriptions,
};
