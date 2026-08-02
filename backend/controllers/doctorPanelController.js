const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");
const MedicalRecord = require("../models/MedicalRecord");
const User = require("../models/User");
const Patient = require("../models/Patient");
const DoctorPatient = require("../models/DoctorPatient");
const Referral = require("../models/Referral");
const mongoose = require("mongoose");
const { logActivity } = require("../services/logService");
const { uploadToCloudinary, deleteFromCloudinary } = require("../config/cloudinary");

// @desc    Get dashboard stats for logged-in doctor
// @route   GET /api/doctor/dashboard
// @access  Private/Doctor
const getDoctorDashboardStats = async (req, res) => {
  try {
    const doctorId = req.user._id;

    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const todayAppointments = await Appointment.countDocuments({ doctorId, date: todayStr });
    const upcomingAppointments = await Appointment.countDocuments({
      doctorId,
      status: "Confirmed",
      date: { $gt: todayStr },
    });
    const completedAppointments = await Appointment.countDocuments({ doctorId, status: "Completed" });
    const cancelledAppointments = await Appointment.countDocuments({ doctorId, status: "Canceled" });

    // Today's earnings
    const todayEarningsAgg = await Appointment.aggregate([
      { $match: { doctorId: doctorId, date: todayStr, "payment.status": "Paid" } },
      { $group: { _id: null, total: { $sum: "$fees" } } },
    ]);
    const todayEarnings = (todayEarningsAgg[0] && todayEarningsAgg[0].total) || 0;

    // Total patients treated (unique patient clerk IDs/creators)
    const uniquePatients = await Appointment.distinct("createdBy", { doctorId, status: "Completed" });
    const totalPatientsTreated = uniquePatients.length;

    // Doctor profile details (rating, quick stats)
    const doc = await Doctor.findById(doctorId);
    const averageRating = doc?.rating || 0;

    // Recent appointments
    const recentAppointments = await Appointment.find({ doctorId })
      .sort({ createdAt: -1 })
      .limit(5);

    // Upcoming schedule (Confirmed appointments today or in future)
    const upcomingSchedule = await Appointment.find({
      doctorId,
      status: "Confirmed",
      date: { $gte: todayStr },
    })
      .sort({ date: 1, time: 1 })
      .limit(5);

    return res.json({
      success: true,
      data: {
        metrics: {
          todayAppointments,
          upcomingAppointments,
          completedAppointments,
          cancelledAppointments,
          todayEarnings,
          totalPatientsTreated,
          averageRating,
        },
        recentAppointments,
        upcomingSchedule,
        profile: {
          name: doc.name,
          email: doc.email,
          specialization: doc.specialization,
          availability: doc.availability,
          fee: doc.fee,
        },
      },
    });
  } catch (err) {
    console.error("getDoctorDashboardStats error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get logged-in doctor profile
// @route   GET /api/doctor/profile
// @access  Private/Doctor
const getDoctorProfile = async (req, res) => {
  try {
    const doc = await Doctor.findById(req.user._id).select("-password");
    if (!doc) {
      return res.status(404).json({ success: false, message: "Doctor profile not found" });
    }
    return res.json({ success: true, data: doc, doctor: doc });
  } catch (err) {
    console.error("getDoctorProfile error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Update logged-in doctor profile
// @route   PUT /api/doctor/profile
// @access  Private/Doctor
const updateDoctorProfile = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const body = req.body || {};

    const doc = await Doctor.findById(doctorId);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Doctor profile not found" });
    }

    // Editable fields for doctors: phone, location (address), qualifications, experience, about, fee, availability, schedule, name
    if (body.name !== undefined) doc.name = body.name;
    if (body.phone !== undefined) doc.phone = body.phone;
    if (body.location !== undefined) doc.location = body.location;
    if (body.qualifications !== undefined) doc.qualifications = body.qualifications;
    if (body.experience !== undefined) doc.experience = body.experience;
    if (body.about !== undefined) doc.about = body.about;
    if (body.fee !== undefined) doc.fee = Number(body.fee) || 0;
    if (body.availability !== undefined) doc.availability = body.availability;
    if (body.schedule !== undefined) doc.schedule = body.schedule;

    if (req.file?.path) {
      try {
        const uploaded = await uploadToCloudinary(req.file.path, "doctors");
        if (uploaded) {
          const previousPublicId = doc.imagePublicId;
          doc.imageUrl = uploaded.secure_url || uploaded.url || doc.imageUrl;
          doc.imagePublicId = uploaded.public_id || uploaded.publicId || doc.imagePublicId;
          if (previousPublicId && previousPublicId !== doc.imagePublicId) {
            deleteFromCloudinary(previousPublicId).catch((e) => console.warn("deleteFromCloudinary warning:", e?.message || e));
          }
        }
      } catch (uploadErr) {
        console.error("Cloudinary upload failed during doctor profile update:", uploadErr);
      }
    } else if (body.imageUrl) {
      doc.imageUrl = body.imageUrl;
    }

    await doc.save();

    await logActivity(req, "Doctor Profile Edited", { id: doc._id });

    const updatedDoc = doc.toObject();
    delete updatedDoc.password;

    return res.json({ success: true, data: updatedDoc, doctor: updatedDoc });
  } catch (err) {
    console.error("updateDoctorProfile error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get appointments assigned to logged-in doctor
// @route   GET /api/doctor/appointments
// @access  Private/Doctor
const getDoctorAppointments = async (req, res) => {
  try {
    const doctorId = req.user._id.toString();
    const { status, limit: limitRaw = 50, page: pageRaw = 1, search = "" } = req.query;

    const limit = Math.min(200, Math.max(1, parseInt(limitRaw, 10) || 50));
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * limit;

    const filter = { doctorId };
    if (status) filter.status = status;
    if (search && search.trim()) {
      const re = new RegExp(search.trim(), "i");
      filter.$or = [{ patientName: re }, { mobile: re }];
    }

    const items = await Appointment.find(filter)
      .sort({ date: 1, time: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Appointment.countDocuments(filter);

    return res.json({
      success: true,
      data: items,
      appointments: items,
      meta: { total, page, limit },
    });
  } catch (err) {
    console.error("getDoctorAppointments error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Update appointment status/notes (doctor can complete, cancel, reschedule, add notes)
// @route   PUT /api/doctor/appointments/:id
// @access  Private/Doctor
const updateDoctorAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rescheduledTo, notes, time } = req.body || {};
    const doctorId = req.user._id.toString();

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    // Verify ownership
    if (appointment.doctorId.toString() !== doctorId) {
      return res.status(403).json({ success: false, message: "Not authorized to modify this appointment" });
    }

    if (status) appointment.status = status;
    if (rescheduledTo) appointment.rescheduledTo = rescheduledTo;
    if (time) appointment.time = time;
    if (notes !== undefined) appointment.notes = notes;

    await appointment.save();

    await logActivity(req, "Appointment Updated by Doctor", { id: appointment._id, status });

    return res.json({ success: true, data: appointment, appointment });
  } catch (err) {
    console.error("updateDoctorAppointment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get doctor's assigned & referred patients with consultation counts & referral sources
// @route   GET /api/doctor/patients
// @access  Private/Doctor
const getDoctorPatients = async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const User = require("../models/User");
    const MedicalRecord = require("../models/MedicalRecord");
    const DoctorPatient = require("../models/DoctorPatient");

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

    const doctorObjId = doctor?._id || (mongoose.Types.ObjectId.isValid(rawDoctorId) ? new mongoose.Types.ObjectId(rawDoctorId) : null);
    const doctorIdStr = doctorObjId ? doctorObjId.toString() : String(rawDoctorId || "");

    const idsToMatch = Array.from(
      new Set(
        [
          doctorIdStr,
          doctorObjId ? doctorObjId.toString() : null,
          req.user?.clerkId,
          req.user?.id,
          req.user?._id ? String(req.user._id) : null,
        ].filter(Boolean)
      )
    );

    const validObjectIds = idsToMatch
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const doctorQueryOr = [
      { doctorId: { $in: [...idsToMatch, ...validObjectIds] } },
      { owner: { $in: idsToMatch } },
    ];

    // 1. Find mapped patients in DoctorPatient collection
    const dpMappings = await DoctorPatient.find({
      $or: doctorQueryOr,
      status: "Active",
    })
      .populate("patientId")
      .populate("referredByDoctorId", "name specialization")
      .sort({ joinedDate: -1 });

    // 2. Find all appointments for this doctor
    const appointments = await Appointment.find({ $or: doctorQueryOr }).sort({ createdAt: -1 });

    // 3. Find all accepted referrals to this doctor
    const referralQueryOr = [
      { toDoctorId: { $in: [...idsToMatch, ...validObjectIds] } },
    ];
    const acceptedReferrals = await Referral.find({
      $or: referralQueryOr,
      status: "accepted",
    }).populate("fromDoctorId", "name specialization").sort({ updatedAt: -1 });

    // Map unique patient entries (keyed strictly by patientId)
    const patientMap = new Map();

    // 1. Process DoctorPatient mappings
    for (const mapping of dpMappings) {
      const pDoc = mapping.patientId;
      let pId = pDoc ? String(pDoc._id || pDoc) : String(mapping.patientId || "");
      if (!pId) continue;
      if (pId.includes(":::")) pId = pId.split(":::")[0];

      let refSource = "Self Registered";
      if (mapping.relationshipType === "Referral") {
        const refDocName = mapping.referredByDoctorId?.name || "another doctor";
        refSource = `Referral from Dr. ${refDocName}`;
      } else if (mapping.relationshipType) {
        refSource = mapping.relationshipType;
      }

      patientMap.set(pId, {
        patientId: pId,
        patientDoc: typeof pDoc === "object" ? pDoc : null,
        relationshipType: mapping.relationshipType || "Self Registered",
        referralSource: refSource,
        referredByDoctor: mapping.referredByDoctorId || null,
        joinedDate: mapping.joinedDate || mapping.createdAt,
      });
    }

    // 2. Process accepted Referrals
    for (const ref of acceptedReferrals) {
      let pId = String(ref.patientId || ref.patientRef || "");
      if (!pId) continue;
      if (pId.includes(":::")) pId = pId.split(":::")[0];

      if (!patientMap.has(pId)) {
        const refDocName = ref.fromDoctorId?.name || "another doctor";
        const refSource = `Referral from Dr. ${refDocName}`;

        patientMap.set(pId, {
          patientId: pId,
          patientDoc: null,
          relationshipType: "Referral",
          referralSource: refSource,
          referredByDoctor: ref.fromDoctorId || null,
          joinedDate: ref.acceptedAt || ref.createdAt,
        });
      }
    }

    // 3. Process appointments to include all consultation patients
    for (const appt of appointments) {
      let pId = String(appt.patientId || appt.patientRef || appt.userId || appt.createdBy || "");
      if (!pId) continue;
      if (pId.includes(":::")) pId = pId.split(":::")[0];

      if (!patientMap.has(pId)) {
        patientMap.set(pId, {
          patientId: pId,
          patientDoc: null,
          relationshipType: "Self Registered",
          referralSource: "Self Registered",
          referredByDoctor: null,
          joinedDate: appt.createdAt || appt.date,
        });
      }
    }

    // 3. Populate demographics, consultation count, last visit date for each patientId
    const resultList = [];

    for (const [pId, baseInfo] of patientMap.entries()) {
      const isObjId = mongoose.Types.ObjectId.isValid(pId);
      const userQueries = [{ clerkId: pId }, { email: pId.toLowerCase() }];
      if (isObjId) userQueries.push({ _id: pId });

      let patientDoc = null;
      if (isObjId) {
        patientDoc = await Patient.findById(pId);
      }
      if (!patientDoc) {
        patientDoc = await Patient.findOne({ $or: [{ clerkId: pId }, { email: pId.toLowerCase() }] });
      }

      const userDoc = await User.findOne({ $or: userQueries });

      const matchingAppts = appointments.filter(
        (a) =>
          String(a.createdBy) === pId ||
          String(a.userId) === pId ||
          String(a.patientId) === pId ||
          String(a._id) === pId ||
          (a.email && a.email.toLowerCase() === pId.toLowerCase())
      );

      const patientAppt = matchingAppts[0];

      const medRecordQuery = {
        $or: [{ patientId: pId }, { patientEmail: pId.toLowerCase() }],
      };

      const latestRecord = await MedicalRecord.findOne(medRecordQuery).sort({ createdAt: -1 });

      const medRecordCount = await MedicalRecord.countDocuments(medRecordQuery);
      const apptCount = matchingAppts.length;
      const consultationCount = Math.max(medRecordCount, apptCount, 1);

      const name = patientDoc?.name || latestRecord?.patientName || patientAppt?.patientName || userDoc?.name || "Patient";
      const email = patientDoc?.email || userDoc?.email || latestRecord?.patientEmail || patientAppt?.email || "N/A";
      const phone = patientDoc?.phone || patientAppt?.mobile || userDoc?.phone || "N/A";
      const age = patientDoc?.age || patientAppt?.age || "N/A";
      const gender = patientDoc?.gender || patientAppt?.gender || "N/A";
      const bloodGroup = patientDoc?.bloodGroup || latestRecord?.bloodGroup || patientAppt?.bloodGroup || userDoc?.bloodGroup || "Not Specified";

      let lastVisit = "N/A";
      if (latestRecord?.createdAt) {
        lastVisit = new Date(latestRecord.createdAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      } else if (patientAppt?.date) {
        lastVisit = patientAppt.date;
      }

      resultList.push({
        patientId: pId,
        name,
        email,
        phone,
        age,
        gender,
        bloodGroup,
        lastVisit,
        consultationCount,
        referralSource: baseInfo.referralSource,
        relationshipType: baseInfo.relationshipType,
        joinedDate: baseInfo.joinedDate,
      });
    }

    console.log("Doctor patients:", resultList);

    return res.json({
      success: true,
      data: resultList,
      patients: resultList,
      total: resultList.length,
    });
  } catch (err) {
    console.error("getDoctorPatients error:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

module.exports = {
  getDoctorDashboardStats,
  getDoctorProfile,
  updateDoctorProfile,
  getDoctorAppointments,
  updateDoctorAppointment,
  getDoctorPatients,
};
