const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const stripe = process.env.STRIPE_SECRET_KEY ? require("stripe")(process.env.STRIPE_SECRET_KEY) : null;

const safeNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const buildFrontendBase = (req) => {
  const env = process.env.FRONTEND_URL;
  if (env) return env.replace(/\/$/, "");
  const origin = req.get("origin") || req.get("referer");
  if (origin) return origin.replace(/\/$/, "");
  const host = req.get("host");
  if (host) return `${req.protocol || "http"}://${host}`.replace(/\/$/, "");
  return "https://heal-book-frontend.vercel.app";
};

function resolveClerkUserId(req) {
  try {
    const auth = req.auth || {};
    const fromReq = auth?.userId || auth?.user_id || auth?.user?.id || req.user?.clerkId || req.user?.id || null;
    if (fromReq) return fromReq;
    return null;
  } catch (e) {
    return null;
  }
}

// @desc    Get all appointments (admin or patient)
// @route   GET /api/appointments
// @access  Private
const getAppointments = async (req, res) => {
  try {
    const { doctorId, mobile, status, search = "", limit: limitRaw = 50, page: pageRaw = 1, patientClerkId, createdBy } = req.query;
    const limit = Math.min(200, Math.max(1, parseInt(limitRaw, 10) || 50));
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * limit;

    const filter = {};
    if (doctorId) filter.doctorId = doctorId;
    if (mobile) filter.mobile = mobile;
    if (status) filter.status = status;

    if (req.user && req.user.role !== "admin") {
      const userClerkId = req.user.clerkId || req.auth?.userId || req.user.id || req.user._id;
      const userEmail = (req.user.email || "").toLowerCase();
      const queryEmail = (req.query.email || "").toLowerCase();
      const mongoIdStr = req.user._id ? String(req.user._id) : null;

      const ids = Array.from(new Set([
        userClerkId,
        req.user.clerkId,
        req.user.id,
        mongoIdStr,
        createdBy,
        patientClerkId
      ].filter(Boolean)));

      const validObjectIds = ids
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      const orConditions = [
        { createdBy: { $in: ids } },
        { createdBy: { $in: validObjectIds } },
        { userId: { $in: ids } },
        { patientClerkId: { $in: ids } }
      ];

      const emailsToMatch = Array.from(new Set([userEmail, queryEmail].filter(Boolean)));
      if (emailsToMatch.length > 0) {
        orConditions.push({ email: { $in: emailsToMatch } }, { patientEmail: { $in: emailsToMatch } });
      }

      filter.$or = orConditions;
    } else {
      if (createdBy) filter.createdBy = createdBy;
      if (patientClerkId) filter.createdBy = patientClerkId;
    }

    if (search) {
      const re = new RegExp(search, "i");
      const searchOr = [{ patientName: re }, { mobile: re }, { doctorName: re }];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
        delete filter.$or;
      } else {
        filter.$or = searchOr;
      }
    }

    const items = await Appointment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log(`getAppointments for user ${req.user?.email || req.user?.clerkId}: found ${items.length} records`);

    const normalized = items.map((a) => ({
      _id: a._id,
      id: a._id,
      userId: a.userId || a.createdBy,
      patientEmail: a.patientEmail || a.email,
      email: a.email || a.patientEmail,
      patientName: a.patientName,
      mobile: a.mobile,
      age: a.age,
      gender: a.gender,
      doctorId: a.doctorId,
      doctorName: a.doctorName,
      speciality: a.speciality,
      doctorImage: a.doctorImage,
      date: a.date,
      time: a.time,
      appointmentDate: a.date,
      appointmentTime: a.time,
      fees: a.fees,
      fee: a.fees,
      status: a.status,
      rescheduledTo: a.rescheduledTo,
      payment: a.payment,
      notes: a.notes,
      createdBy: a.createdBy,
      owner: a.owner,
      sessionId: a.sessionId,
      paidAt: a.paidAt
    }));

    const total = await Appointment.countDocuments(filter);
    return res.json({ success: true, data: normalized, appointments: normalized, meta: { total, page, limit } });
  } catch (err) {
    console.error("getAppointments error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get appointments by doctor
// @route   GET /api/doctor/appointments
// @access  Private/Doctor
const getAppointmentsByDoctor = async (req, res) => {
  try {
    const rawDoctorId =
      req.params.id ||
      req.params.doctorId ||
      req.query.doctorId ||
      (req.user ? req.user.clerkId || req.user.id || req.user._id : null);

    if (!rawDoctorId) {
      return res.status(400).json({ success: false, message: "Doctor ID is required" });
    }

    const doctorIdStr = String(rawDoctorId);
    const { mobile, status, search = "", limit: limitRaw = 50, page: pageRaw = 1 } = req.query;
    const limit = Math.min(200, Math.max(1, parseInt(limitRaw, 10) || 50));
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * limit;

    const idsToMatch = Array.from(
      new Set(
        [
          doctorIdStr,
          req.user?.clerkId,
          req.user?.id,
          req.user?._id ? String(req.user._id) : null,
        ].filter(Boolean)
      )
    );

    const validObjectIds = idsToMatch
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const filter = {
      $or: [
        { doctorId: { $in: [...idsToMatch, ...validObjectIds] } },
        { owner: { $in: idsToMatch } },
      ],
    };

    if (mobile) filter.mobile = mobile;
    if (status) filter.status = status;
    if (search) {
      const re = new RegExp(search, "i");
      filter.$and = [{ $or: filter.$or }, { $or: [{ patientName: re }, { mobile: re }] }];
      delete filter.$or;
    }

    const items = await Appointment.find(filter)
      .sort({ date: 1, time: 1 })
      .skip(skip)
      .limit(limit);

    const normalized = items.map((a) => ({
      _id: a._id,
      id: a._id,
      patientName: a.patientName,
      mobile: a.mobile,
      age: a.age,
      gender: a.gender,
      doctorId: a.doctorId,
      doctorName: a.doctorName,
      speciality: a.speciality,
      doctorImage: a.doctorImage,
      date: a.date,
      time: a.time,
      fees: a.fees,
      fee: a.fees,
      status: a.status,
      rescheduledTo: a.rescheduledTo,
      payment: a.payment,
      notes: a.notes,
      createdBy: a.createdBy,
      owner: a.owner,
      sessionId: a.sessionId,
      paidAt: a.paidAt
    }));

    const total = await Appointment.countDocuments(filter);
    return res.json({ success: true, data: normalized, appointments: normalized, meta: { total, page, limit } });
  } catch (err) {
    console.error("getAppointmentsByDoctor error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Create new appointment
// @route   POST /api/appointments
// @access  Private/Patient
const createAppointment = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: You must be logged in to create an appointment.",
      });
    }

    const {
      doctorId,
      patientName,
      mobile,
      age = "",
      gender = "",
      date,
      time,
      fee,
      fees,
      notes = "",
      email,
      patientEmail,
      userId: userIdFromBody,
      paymentMethod,
      owner: ownerFromBody = null,
      doctorName: doctorNameFromBody,
      speciality: specialityFromBody,
      doctorImageUrl: doctorImageUrlFromBody,
      doctorImagePublicId: doctorImagePublicIdFromBody,
    } = req.body || {};

    const authClerkId = String(req.user.clerkId || req.user.id || req.user._id || resolveClerkUserId(req) || "").trim();
    const authEmail = String(req.user.email || req.auth?.email || "").toLowerCase().trim();
    const authName = req.user.name || String(patientName || "").trim();

    if (!authClerkId || !authEmail) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Unable to verify authenticated user session details.",
      });
    }

    // Security check: reject if request body attempts to use another user's ID or email
    if (userIdFromBody && String(userIdFromBody).trim() !== authClerkId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot create an appointment using another person's user ID.",
      });
    }

    const requestedEmail = String(email || patientEmail || "").toLowerCase().trim();
    if (requestedEmail && requestedEmail !== authEmail) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot create an appointment using another person's email address.",
      });
    }

    if (!doctorId) return res.status(400).json({ success: false, message: "Doctor ID is required" });
    if (!patientName) return res.status(400).json({ success: false, message: "Patient Name is required" });
    if (!mobile) return res.status(400).json({ success: false, message: "Mobile number is required" });
    if (!date || !time) return res.status(400).json({ success: false, message: "Date and time slot are required" });

    if (age !== undefined && age !== null && age !== "") {
      const parsedAge = Number(age);
      if (isNaN(parsedAge) || parsedAge < 0) {
        return res.status(400).json({ success: false, message: "Age cannot be negative" });
      }
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });

    const numericFee = safeNumber(fees ?? fee ?? doctor.fee ?? 0);

    let resolvedOwner = ownerFromBody || doctor.owner || null;
    if (!resolvedOwner) resolvedOwner = String(doctorId);

    const doctorName = (doctor.name && String(doctor.name).trim()) || (doctorNameFromBody && String(doctorNameFromBody).trim()) || "";
    const speciality =
      (doctor.specialization && String(doctor.specialization).trim()) ||
      (doctor.speciality && String(doctor.speciality).trim()) ||
      (specialityFromBody && String(specialityFromBody).trim()) ||
      "";

    const doctorImageUrl =
      (doctor.imageUrl && String(doctor.imageUrl).trim()) ||
      (doctor.image && String(doctor.image).trim()) ||
      (doctorImageUrlFromBody && String(doctorImageUrlFromBody).trim()) ||
      "";

    const doctorImagePublicId =
      (doctor.imagePublicId && String(doctor.imagePublicId).trim()) ||
      (doctorImagePublicIdFromBody && String(doctorImagePublicIdFromBody).trim()) ||
      "";

    const doctorImage = { url: doctorImageUrl, publicId: doctorImagePublicId };

    const base = {
      userId: authClerkId,
      patientEmail: authEmail,
      email: authEmail,
      patientName: String(patientName || authName).trim(),
      mobile: String(mobile).trim(),
      age: age ? Number(age) : undefined,
      gender: gender ? String(gender) : "",
      doctorId: String(doctor._id || doctorId),
      doctorName,
      speciality,
      doctorImage,
      date: String(date),
      time: String(time),
      fees: numericFee,
      status: "Pending",
      payment: { method: paymentMethod === "Cash" ? "Cash" : "Online", status: "Pending", amount: numericFee },
      notes: notes || "",
      createdBy: authClerkId,
      owner: resolvedOwner,
      sessionId: null,
    };

    // Free appointment
    if (numericFee === 0) {
      const created = await Appointment.create({
        ...base,
        status: "Confirmed",
        payment: { method: base.payment.method, status: "Paid", amount: 0 },
        paidAt: new Date(),
      });
      return res.status(201).json({ success: true, appointment: created, checkoutUrl: null });
    }

    // Cash payment
    if (paymentMethod === "Cash") {
      const created = await Appointment.create({
        ...base,
        status: "Confirmed",
        payment: { method: "Cash", status: "Pending", amount: numericFee },
      });
      return res.status(201).json({ success: true, appointment: created, checkoutUrl: null });
    }

    // Online: Stripe
    if (!stripe) {
      return res.status(400).json({
        success: false,
        message: "Online payment gateway is not configured. Please choose Cash payment.",
      });
    }

    const frontBase = buildFrontendBase(req);
    const successUrl = `${frontBase}/appointment/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontBase}/appointment/cancel`;

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: email || undefined,
        line_items: [
          {
            price_data: {
              currency: "inr",
              product_data: { name: `Appointment - ${String(patientName).slice(0, 40)}` },
              unit_amount: Math.round(numericFee * 100),
            },
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          doctorId: String(doctorId),
          doctorName: doctorName || "",
          speciality: speciality || "",
          doctorImageUrl: doctorImageUrl || "",
          doctorImagePublicId: doctorImagePublicId || "",
          patientName: base.patientName,
          mobile: base.mobile,
          age: base.age ? String(base.age) : "",
          gender: base.gender || "",
          date: base.date,
          time: base.time,
          fees: String(numericFee),
          notes: base.notes || "",
          clerkUserId: clerkUserId || "",
          email: base.email || "",
          owner: resolvedOwner || "",
        },
      });
    } catch (stripeErr) {
      console.error("Stripe session creation failed:", stripeErr);
      return res.status(400).json({ success: false, message: "Payment session creation failed." });
    }

    // Online booking: Do NOT create appointment in DB until payment is completed!
    return res.status(200).json({ success: true, checkoutUrl: session.url || null, sessionId: session.id });
  } catch (err) {
    console.error("createAppointment unexpected:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Stripe payment confirmation callback
// @route   POST /api/appointments/confirm-payment
// @access  Public
const confirmPayment = async (req, res) => {
  try {
    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ success: false, message: "session_id is required" });

    if (!stripe) {
      return res.status(500).json({ success: false, message: "Stripe not configured on server" });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return res.status(400).json({ success: false, message: "Payment has not been completed" });
    }

    let appt = await Appointment.findOne({ sessionId: session_id });

    if (!appt) {
      const meta = session.metadata || {};
      if (meta.doctorId && meta.mobile && meta.patientName && meta.date && meta.time) {
        const numericFee = safeNumber(meta.fees || (session.amount_total ? session.amount_total / 100 : 0));
        appt = await Appointment.create({
          doctorId: meta.doctorId,
          doctorName: meta.doctorName || "",
          speciality: meta.speciality || "",
          doctorImage: { url: meta.doctorImageUrl || "", publicId: meta.doctorImagePublicId || "" },
          patientName: meta.patientName,
          mobile: meta.mobile,
          age: meta.age ? Number(meta.age) : undefined,
          gender: meta.gender || "",
          date: meta.date,
          time: meta.time,
          fees: numericFee,
          status: "Confirmed",
          payment: {
            method: "Online",
            status: "Paid",
            amount: numericFee,
            providerId: session.payment_intent || "",
          },
          notes: meta.notes || "",
          createdBy: meta.clerkUserId || "guest",
          email: meta.email || "",
          owner: meta.owner || meta.doctorId,
          sessionId: session_id,
          paidAt: new Date(),
        });
      } else {
        // Fallback search by patient details if created before session
        appt = await Appointment.findOneAndUpdate(
          {
            doctorId: meta.doctorId,
            mobile: meta.mobile,
            patientName: meta.patientName,
          },
          {
            "payment.status": "Paid",
            "payment.providerId": session.payment_intent || null,
            status: "Confirmed",
            paidAt: new Date(),
            sessionId: session_id,
          },
          { new: true }
        );
      }
    } else {
      if (appt.payment.status !== "Paid" || appt.status !== "Confirmed") {
        appt.payment.status = "Paid";
        appt.status = "Confirmed";
        appt.paidAt = appt.paidAt || new Date();
        appt.payment.providerId = session.payment_intent || appt.payment.providerId;
        await appt.save();
      }
    }

    if (!appt) {
      return res.status(404).json({ success: false, message: "Appointment not found for this payment session" });
    }

    return res.json({ success: true, appointment: appt });
  } catch (err) {
    console.error("confirmPayment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Update appointment status/details
// @route   PUT /api/appointments/:id
// @access  Private
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });

    const terminal = appt.status === "Completed" || appt.status === "Canceled";
    if (terminal && body.status && body.status !== appt.status) {
      return res.status(400).json({ success: false, message: "Cannot change status of a completed/canceled appointment" });
    }

    const update = {};
    if (body.status) {
      const formattedStatus = body.status.charAt(0).toUpperCase() + body.status.slice(1).toLowerCase();
      update.status = formattedStatus === "Cancelled" ? "Canceled" : formattedStatus;
    }
    if (body.notes !== undefined) update.notes = body.notes;

    if (body.date && body.time) {
      if (appt.status === "Completed" || appt.status === "Canceled") {
        return res.status(400).json({ success: false, message: "Cannot reschedule completed/canceled appointment" });
      }
      update.date = body.date;
      update.time = body.time;
      update.status = "Rescheduled";
      update.rescheduledTo = { date: body.date, time: body.time };
    }

    if (body.paymentStatus) {
      update["payment.status"] = body.paymentStatus;
    }

    const updated = await Appointment.findByIdAndUpdate(id, { $set: update }, { new: true });
    return res.json({ success: true, data: updated, appointment: updated });
  } catch (err) {
    console.error("updateAppointment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get dashboard metrics / stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getStats = async (req, res) => {
  try {
    const totalAppointments = await Appointment.countDocuments();
    const completedAppointments = await Appointment.countDocuments({ status: "Completed" });
    const canceledAppointments = await Appointment.countDocuments({ status: "Canceled" });
    const doctorsCount = await Doctor.countDocuments();

    const paidAgg = await Appointment.aggregate([
      { $match: { "payment.status": "Paid" } },
      { $group: { _id: null, total: { $sum: "$fees" } } }
    ]);
    const revenue = (paidAgg[0] && paidAgg[0].total) || 0;

    return res.json({
      success: true,
      stats: {
        totalAppointments,
        completedAppointments,
        canceledAppointments,
        doctorsCount,
        revenue,
      }
    });
  } catch (err) {
    console.error("getStats error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getAppointmentsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const filter = { createdBy: patientId };
    const items = await Appointment.find(filter).sort({ createdAt: -1 });
    const normalized = items.map((a) => ({
      _id: a._id,
      id: a._id,
      patientName: a.patientName,
      mobile: a.mobile,
      age: a.age,
      gender: a.gender,
      doctorId: a.doctorId,
      doctorName: a.doctorName,
      speciality: a.speciality,
      doctorImage: a.doctorImage,
      date: a.date,
      time: a.time,
      fees: a.fees,
      fee: a.fees,
      status: a.status,
      rescheduledTo: a.rescheduledTo,
      payment: a.payment,
      notes: a.notes,
      createdBy: a.createdBy,
      owner: a.owner,
      sessionId: a.sessionId,
      paidAt: a.paidAt
    }));
    return res.json({ success: true, data: normalized, appointments: normalized });
  } catch (err) {
    console.error("getAppointmentsByPatient error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getAppointments,
  getAppointmentsByDoctor,
  createAppointment,
  confirmPayment,
  updateAppointment,
  getStats,
  getAppointmentsByPatient,
};
