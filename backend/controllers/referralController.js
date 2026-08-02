const mongoose = require("mongoose");
const Referral = require("../models/Referral");
const Doctor = require("../models/Doctor");
const User = require("../models/User");
const Appointment = require("../models/Appointment");
const DoctorPatient = require("../models/DoctorPatient");
const { logActivity } = require("../services/logService");

// @desc    Create new doctor referral
// @route   POST /api/referrals/create
// @route   POST /api/referrals
// @access  Private/Doctor
const createReferral = async (req, res) => {
  try {
    const {
      patientId,
      patientName: patientNameFromBody,
      patientEmail: patientEmailFromBody,
      toDoctorId,
      specialization = "",
      reason,
      symptoms = "",
      notes = "",
      doctorNotes = "",
      attachedReports = [],
    } = req.body || {};

    if (!patientId) {
      return res.status(400).json({ success: false, message: "patientId is required" });
    }
    if (!toDoctorId) {
      return res.status(400).json({ success: false, message: "toDoctorId (target doctor) is required" });
    }
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ success: false, message: "Reason for referral is required" });
    }

    // Sender doctor identity
    const rawFromId = req.user?._id || req.user?.id;
    let fromDoctor = null;
    if (rawFromId && mongoose.Types.ObjectId.isValid(rawFromId)) {
      fromDoctor = await Doctor.findById(rawFromId);
    }
    if (!fromDoctor && req.user?.clerkId) {
      fromDoctor = await Doctor.findOne({ clerkId: req.user.clerkId });
    }
    if (!fromDoctor && req.user?.email) {
      fromDoctor = await Doctor.findOne({ email: req.user.email.toLowerCase() });
    }

    if (!fromDoctor) {
      return res.status(403).json({ success: false, message: "Only authenticated doctors can send referrals" });
    }

    // Target doctor lookup
    let toDoctor = null;
    if (mongoose.Types.ObjectId.isValid(toDoctorId)) {
      toDoctor = await Doctor.findById(toDoctorId);
    }
    if (!toDoctor) {
      toDoctor = await Doctor.findOne({
        $or: [
          { clerkId: String(toDoctorId) },
          { email: String(toDoctorId).toLowerCase() },
        ],
      });
    }

    if (!toDoctor) {
      return res.status(404).json({ success: false, message: "Target doctor not found" });
    }

    // Patient lookup
    let patientName = patientNameFromBody || "";
    let patientEmail = (patientEmailFromBody || "").toLowerCase().trim();

    const isPatientObjectId = mongoose.Types.ObjectId.isValid(patientId);

    if (!patientName || !patientEmail) {
      const userOrQueries = [{ clerkId: String(patientId) }, { email: String(patientId).toLowerCase() }];
      if (isPatientObjectId) userOrQueries.push({ _id: patientId });

      const patientUser = await User.findOne({ $or: userOrQueries });
      if (patientUser) {
        if (!patientName) patientName = patientUser.name;
        if (!patientEmail) patientEmail = (patientUser.email || "").toLowerCase();
      }
    }

    if (!patientName || !patientEmail) {
      const apptOrQueries = [
        { createdBy: String(patientId) },
        { userId: String(patientId) },
        { email: String(patientId).toLowerCase() },
        { patientEmail: String(patientId).toLowerCase() },
      ];
      if (isPatientObjectId) apptOrQueries.push({ _id: patientId });

      const appt = await Appointment.findOne({ $or: apptOrQueries });
      if (appt) {
        if (!patientName) patientName = appt.patientName;
        if (!patientEmail) patientEmail = (appt.email || appt.patientEmail || "").toLowerCase();
      }
    }

    const referral = await Referral.create({
      patientId: String(patientId),
      patientName: patientName || "Patient",
      patientEmail: patientEmail || "",
      fromDoctorId: fromDoctor._id,
      fromDoctorName: fromDoctor.name || "Doctor",
      toDoctorId: toDoctor._id,
      toDoctorName: toDoctor.name || "Specialist Doctor",
      specialization: specialization || toDoctor.specialization || toDoctor.speciality || "",
      reason: String(reason).trim(),
      symptoms: String(symptoms || "").trim(),
      doctorNotes: String(doctorNotes || notes || "").trim(),
      attachedReports: Array.isArray(attachedReports) ? attachedReports : [],
      status: "pending",
    });

    try {
      await logActivity(
        req.user?.clerkId || String(req.user?._id),
        fromDoctor.name || "Doctor",
        req.user?.email || fromDoctor.email || "doctor@medicare.com",
        "doctor",
        `New patient referral received from Dr. ${fromDoctor.name || "Doctor"}`,
        { referralId: referral._id, patientId, toDoctorId: toDoctor._id }
      );
    } catch (e) {
      console.warn("Log activity failed:", e?.message);
    }

    return res.status(201).json({
      success: true,
      message: `Referral sent successfully to Dr. ${toDoctor.name}`,
      data: referral,
      referral,
    });
  } catch (err) {
    console.error("createReferral error:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// @desc    Get pending referrals received by logged-in doctor
// @route   GET /api/referrals/pending
// @access  Private/Doctor
const getPendingReferrals = async (req, res) => {
  try {
    const rawDoctorId = req.user?._id || req.user?.id;
    let doctor = null;
    if (rawDoctorId && mongoose.Types.ObjectId.isValid(rawDoctorId)) {
      doctor = await Doctor.findById(rawDoctorId);
    }
    if (!doctor && req.user?.clerkId) {
      doctor = await Doctor.findOne({ clerkId: req.user.clerkId });
    }
    if (!doctor && req.user?.email) {
      doctor = await Doctor.findOne({ email: req.user.email.toLowerCase() });
    }

    const queryConditions = [{ status: "pending" }];
    const doctorOrs = [];
    if (doctor?._id) doctorOrs.push({ toDoctorId: doctor._id });
    if (req.user?.clerkId) doctorOrs.push({ toDoctorId: req.user.clerkId });
    if (rawDoctorId && String(rawDoctorId)) doctorOrs.push({ toDoctorId: String(rawDoctorId) });

    const query = doctorOrs.length > 0
      ? { status: "pending", $or: doctorOrs }
      : { status: "pending" };

    const referrals = await Referral.find(query).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: referrals,
      referrals,
    });
  } catch (err) {
    console.error("getPendingReferrals error:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// @desc    Get outgoing referrals created by logged-in doctor
// @route   GET /api/referrals/outgoing
// @access  Private/Doctor
const getOutgoingReferrals = async (req, res) => {
  try {
    const rawDoctorId = req.user?._id || req.user?.id;
    let doctor = null;
    if (rawDoctorId && mongoose.Types.ObjectId.isValid(rawDoctorId)) {
      doctor = await Doctor.findById(rawDoctorId);
    }
    if (!doctor && req.user?.clerkId) {
      doctor = await Doctor.findOne({ clerkId: req.user.clerkId });
    }
    if (!doctor && req.user?.email) {
      doctor = await Doctor.findOne({ email: req.user.email.toLowerCase() });
    }

    const queryConditions = [];
    if (doctor?._id) queryConditions.push({ fromDoctorId: doctor._id });
    if (req.user?.clerkId) queryConditions.push({ fromDoctorId: req.user.clerkId });
    if (rawDoctorId && String(rawDoctorId)) queryConditions.push({ fromDoctorId: String(rawDoctorId) });

    const query = queryConditions.length > 0 ? { $or: queryConditions } : {};
    const referrals = await Referral.find(query).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: referrals,
      referrals,
    });
  } catch (err) {
    console.error("getOutgoingReferrals error:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// @desc    Get incoming referrals received by logged-in doctor
// @route   GET /api/referrals/incoming
// @access  Private/Doctor
const getIncomingReferrals = async (req, res) => {
  try {
    const rawDoctorId = req.user?._id || req.user?.id;
    let doctor = null;
    if (rawDoctorId && mongoose.Types.ObjectId.isValid(rawDoctorId)) {
      doctor = await Doctor.findById(rawDoctorId);
    }
    if (!doctor && req.user?.clerkId) {
      doctor = await Doctor.findOne({ clerkId: req.user.clerkId });
    }
    if (!doctor && req.user?.email) {
      doctor = await Doctor.findOne({ email: req.user.email.toLowerCase() });
    }

    const queryConditions = [];
    if (doctor?._id) queryConditions.push({ toDoctorId: doctor._id });
    if (req.user?.clerkId) queryConditions.push({ toDoctorId: req.user.clerkId });
    if (rawDoctorId && String(rawDoctorId)) queryConditions.push({ toDoctorId: String(rawDoctorId) });

    const query = queryConditions.length > 0 ? { $or: queryConditions } : {};
    const referrals = await Referral.find(query).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: referrals,
      referrals,
    });
  } catch (err) {
    console.error("getIncomingReferrals error:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// @desc    Accept referral & automatically map patient to receiving doctor
// @route   PUT /api/referrals/:id/accept
// @access  Private/Doctor
const acceptReferral = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid referral ID format" });
    }

    const referral = await Referral.findById(id);
    if (!referral) {
      return res.status(404).json({ success: false, message: "Referral not found" });
    }

    referral.status = "accepted";
    referral.acceptedAt = new Date();
    await referral.save();

    // Automatically add patient into Doctor B's patient list via DoctorPatient mapping
    await DoctorPatient.findOneAndUpdate(
      { doctorId: referral.toDoctorId, patientId: String(referral.patientId) },
      {
        doctorId: referral.toDoctorId,
        patientId: String(referral.patientId),
        relationshipType: "Referral",
        referredByDoctorId: referral.fromDoctorId,
        joinedDate: new Date(),
        status: "Active",
      },
      { upsert: true, new: true }
    );

    // Also map to referring doctor as Self Registered / Original Doctor if not already present
    await DoctorPatient.findOneAndUpdate(
      { doctorId: referral.fromDoctorId, patientId: String(referral.patientId) },
      {
        doctorId: referral.fromDoctorId,
        patientId: String(referral.patientId),
        relationshipType: "Self Registered",
        joinedDate: new Date(),
        status: "Active",
      },
      { upsert: true, new: true }
    );

    try {
      await logActivity(
        req.user?.clerkId || String(req.user?._id),
        referral.toDoctorName || "Doctor",
        req.user?.email || "doctor@medicare.com",
        "doctor",
        `Dr. ${referral.toDoctorName || "Doctor"} accepted ${referral.patientName || "patient"}'s referral`,
        { referralId: referral._id, patientId: referral.patientId, fromDoctorId: referral.fromDoctorId }
      );
    } catch (e) {
      console.warn("Log activity failed:", e?.message);
    }

    return res.json({
      success: true,
      message: `Referral accepted! ${referral.patientName} added to your patient list.`,
      data: referral,
      referral,
    });
  } catch (err) {
    console.error("acceptReferral error:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// @desc    Reject referral
// @route   PUT /api/referrals/:id/reject
// @access  Private/Doctor
const rejectReferral = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid referral ID format" });
    }

    const referral = await Referral.findById(id);
    if (!referral) {
      return res.status(404).json({ success: false, message: "Referral not found" });
    }

    referral.status = "rejected";
    await referral.save();

    return res.json({
      success: true,
      message: `Referral rejected`,
      data: referral,
      referral,
    });
  } catch (err) {
    console.error("rejectReferral error:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// @desc    Update referral status (generic fallback)
// @route   PUT /api/referrals/:id/status
// @access  Private/Doctor
const updateReferralStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    const normalizedStatus = String(status).toLowerCase();
    if (!["pending", "accepted", "completed", "rejected"].includes(normalizedStatus)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    if (normalizedStatus === "accepted") {
      return acceptReferral(req, res);
    }
    if (normalizedStatus === "rejected") {
      return rejectReferral(req, res);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid referral ID format" });
    }

    const referral = await Referral.findById(id);
    if (!referral) {
      return res.status(404).json({ success: false, message: "Referral not found" });
    }

    referral.status = normalizedStatus;
    await referral.save();

    return res.json({
      success: true,
      message: `Referral status updated to ${referral.status}`,
      data: referral,
      referral,
    });
  } catch (err) {
    console.error("updateReferralStatus error:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

module.exports = {
  createReferral,
  getPendingReferrals,
  getOutgoingReferrals,
  getIncomingReferrals,
  acceptReferral,
  rejectReferral,
  updateReferralStatus,
};
