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

// @desc    Get doctor's assigned & referred patients with consultation counts, referral sources, and appointment history
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

    // 2. Find all referrals targeting this doctor
    const referralQueryOr = [
      { toDoctorId: { $in: [...idsToMatch, ...validObjectIds] } },
    ];
    const doctorReferrals = await Referral.find({
      $or: referralQueryOr,
      status: { $in: ["accepted", "pending", "completed"] },
    })
      .populate("fromDoctorId", "name specialization")
      .populate("patientRef")
      .sort({ updatedAt: -1 });

    // 3. Find all direct appointments for this doctor
    const doctorAppointments = await Appointment.find({ $or: doctorQueryOr }).sort({ createdAt: -1 });

    // Map to track unique canonical patients
    const patientMap = new Map();
    const aliasToKeyMap = new Map();

    const getOrInitEntry = (key, initialData = {}) => {
      if (!patientMap.has(key)) {
        patientMap.set(key, {
          patientId: key,
          patientDoc: initialData.patientDoc || null,
          name: initialData.name || "",
          email: initialData.email || "",
          phone: initialData.phone || "",
          source: initialData.source || "Direct Appointment",
          referralSource: initialData.referralSource || "Direct Appointment",
          referredBy: initialData.referredBy || null,
          joinedDate: initialData.joinedDate || new Date(),
        });
      }
      return patientMap.get(key);
    };

    // 1. Process DoctorPatient entries
    for (const dp of dpMappings) {
      const pDoc = dp.patientId;
      if (!pDoc) continue;
      const canonicalKey = pDoc._id ? pDoc._id.toString() : String(pDoc);

      const isRef = dp.relationshipType === "Referral" || !!dp.referredByDoctorId;
      const refDoc = dp.referredByDoctorId;
      const refDocName = refDoc?.name || "another doctor";
      const source = isRef ? "Referred Patient" : "Direct Appointment";
      const referralSource = isRef ? `Referred by Dr. ${refDocName}` : "Direct Appointment";
      const referredBy = isRef && refDoc ? { doctorId: refDoc._id?.toString() || refDoc, doctorName: refDoc.name || "Doctor" } : null;

      getOrInitEntry(canonicalKey, {
        patientDoc: typeof pDoc === "object" ? pDoc : null,
        name: pDoc.name,
        email: pDoc.email,
        phone: pDoc.phone,
        source,
        referralSource,
        referredBy,
        joinedDate: dp.joinedDate || dp.createdAt,
      });

      if (pDoc._id) aliasToKeyMap.set(pDoc._id.toString(), canonicalKey);
      if (pDoc.clerkId) aliasToKeyMap.set(String(pDoc.clerkId), canonicalKey);
      if (pDoc.email) aliasToKeyMap.set(pDoc.email.toLowerCase(), canonicalKey);
    }

    // 2. Process Doctor Referrals
    for (const ref of doctorReferrals) {
      const pRef = ref.patientRef;
      const pIdRaw = String(
        pRef?._id ||
        ref.patientId ||
        ""
      );
      const pEmail = (ref.patientEmail || pRef?.email || "").toLowerCase();

      let canonicalKey = (pRef && pRef._id) ? pRef._id.toString() : (aliasToKeyMap.get(pIdRaw) || aliasToKeyMap.get(pEmail) || pIdRaw);
      if (!canonicalKey) continue;

      const refDoc = ref.fromDoctorId;
      const refDocName = ref.fromDoctorName || refDoc?.name || "another doctor";
      const source = "Referred Patient";
      const referralSource = `Referred by Dr. ${refDocName}`;
      const referredBy = {
        doctorId: refDoc?._id?.toString() || (ref.fromDoctorId ? String(ref.fromDoctorId) : ""),
        doctorName: refDocName,
      };

      const entry = getOrInitEntry(canonicalKey, {
        patientDoc: typeof pRef === "object" ? pRef : null,
        name: ref.patientName || pRef?.name,
        email: pEmail,
        source,
        referralSource,
        referredBy,
        joinedDate: ref.acceptedAt || ref.createdAt,
      });

      // Update referral source info
      entry.source = "Referred Patient";
      entry.referralSource = referralSource;
      entry.referredBy = referredBy;

      if (canonicalKey) aliasToKeyMap.set(canonicalKey, canonicalKey);
      if (pIdRaw) aliasToKeyMap.set(pIdRaw, canonicalKey);
      if (pEmail) aliasToKeyMap.set(pEmail, canonicalKey);
    }

    // 3. Process Doctor Direct Appointments
    for (const appt of doctorAppointments) {
      const pIdRaw = String(appt.patientRef || appt.patientId || appt.createdBy || appt.userId || "");
      const pEmail = (appt.email || appt.patientEmail || "").toLowerCase();

      let canonicalKey = aliasToKeyMap.get(pIdRaw) || aliasToKeyMap.get(pEmail) || pIdRaw;
      if (!canonicalKey) continue;

      getOrInitEntry(canonicalKey, {
        name: appt.patientName,
        email: pEmail,
        phone: appt.mobile,
        source: "Direct Appointment",
        referralSource: "Direct Appointment",
        joinedDate: appt.createdAt || appt.date,
      });

      if (pIdRaw) aliasToKeyMap.set(pIdRaw, canonicalKey);
      if (pEmail) aliasToKeyMap.set(pEmail, canonicalKey);
    }

    // Format output array
    const resultList = [];

    for (const [canonicalKey, baseInfo] of patientMap.entries()) {
      const isObjId = mongoose.Types.ObjectId.isValid(canonicalKey);
      let patientDoc = baseInfo.patientDoc;
      if (!patientDoc && isObjId) {
        patientDoc = await Patient.findById(canonicalKey);
      }
      if (!patientDoc) {
        patientDoc = await Patient.findOne({
          $or: [
            { clerkId: canonicalKey },
            { email: baseInfo.email || canonicalKey.toLowerCase() },
          ],
        });
      }

      const aliases = new Set(
        [
          canonicalKey,
          baseInfo.email ? baseInfo.email.toLowerCase() : null,
          patientDoc?._id ? patientDoc._id.toString() : null,
          patientDoc?.clerkId ? String(patientDoc.clerkId) : null,
          patientDoc?.email ? patientDoc.email.toLowerCase() : null,
        ].filter(Boolean)
      );

      const aliasArray = Array.from(aliases);
      const aliasObjectIds = aliasArray
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      // Fetch all appointments for this patient
      const allPatientAppts = await Appointment.find({
        $or: [
          { patientRef: { $in: aliasObjectIds } },
          { patientId: { $in: aliasObjectIds } },
          { createdBy: { $in: aliasArray } },
          { userId: { $in: aliasArray } },
          { email: { $in: aliasArray } },
          { patientEmail: { $in: aliasArray } },
        ],
      }).sort({ date: -1, createdAt: -1 });

      const latestAppt = allPatientAppts[0];

      const formattedAppts = allPatientAppts.map((a) => ({
        appointmentId: a._id.toString(),
        date: a.date || (a.createdAt ? new Date(a.createdAt).toISOString().split("T")[0] : ""),
        status: a.status || "Confirmed",
        reason: a.reason || a.notes || a.speciality || "Consultation",
        doctorName: a.doctorName || "",
      }));

      const medRecordQuery = {
        $or: [
          { patientId: { $in: aliasArray } },
          { patientEmail: { $in: aliasArray } },
        ],
      };
      const latestRecord = await MedicalRecord.findOne(medRecordQuery).sort({ createdAt: -1 });
      const medRecordCount = await MedicalRecord.countDocuments(medRecordQuery);

      const userDoc = await User.findOne({
        $or: [
          { clerkId: { $in: aliasArray } },
          { email: { $in: aliasArray } },
          ...aliasObjectIds.map((id) => ({ _id: id })),
        ],
      });

      const name = patientDoc?.name || baseInfo.name || latestRecord?.patientName || latestAppt?.patientName || userDoc?.name || "Patient";
      const email = patientDoc?.email || baseInfo.email || userDoc?.email || latestRecord?.patientEmail || latestAppt?.email || "N/A";
      const phone = patientDoc?.phone || baseInfo.phone || latestAppt?.mobile || userDoc?.phone || "N/A";
      const age = patientDoc?.age || latestAppt?.age || "N/A";
      const gender = patientDoc?.gender || latestAppt?.gender || "N/A";
      const bloodGroup = patientDoc?.bloodGroup || latestRecord?.bloodGroup || latestAppt?.bloodGroup || userDoc?.bloodGroup || "Not Specified";

      let lastVisit = "N/A";
      if (latestAppt?.date) {
        lastVisit = latestAppt.date;
      } else if (latestRecord?.createdAt) {
        lastVisit = new Date(latestRecord.createdAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }

      resultList.push({
        patientId: canonicalKey,
        patientName: name,
        name,
        email,
        phone,
        age,
        gender,
        bloodGroup,
        lastVisit,
        consultationCount: Math.max(medRecordCount, formattedAppts.length, 1),
        source: baseInfo.source,
        referralSource: baseInfo.referralSource,
        referredBy: baseInfo.referredBy,
        appointments: formattedAppts,
        relationshipType: baseInfo.source === "Referred Patient" ? "Referral" : "Self Registered",
        joinedDate: baseInfo.joinedDate,
      });
    }

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
