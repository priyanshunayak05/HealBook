const mongoose = require("mongoose");
const ServiceAppointment = require("../models/serviceAppointment");
const Service = require("../models/Service");
const stripe = process.env.STRIPE_SECRET_KEY ? require("stripe")(process.env.STRIPE_SECRET_KEY) : null;

const safeNumber = (val) => {
  if (val === undefined || val === null || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
};

function parseTimeString(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  const t = timeStr.trim();
  const m = t.match(/([0-9]{1,2}):?([0-9]{0,2})\s*(AM|PM|am|pm)?/);
  if (!m) return null;
  let hh = parseInt(m[1], 10);
  let mm = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = (m[3] || "").toUpperCase();
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;

  if (ampm) {
    if (hh < 1 || hh > 12 || mm < 0 || mm > 59) return null;
    return { hour: hh, minute: mm, ampm };
  }

  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  if (hh === 0) return { hour: 12, minute: mm, ampm: "AM" };
  if (hh === 12) return { hour: 12, minute: mm, ampm: "PM" };
  if (hh > 12) return { hour: hh - 12, minute: mm, ampm: "PM" };
  return { hour: hh, minute: mm, ampm: "AM" };
}

const buildFrontendBase = (req) => {
  const env = process.env.FRONTEND_URL;
  if (env) return env.replace(/\/$/, "");
  const origin = req.get("origin") || req.get("referer") || null;
  return origin ? origin.replace(/\/$/, "") : "https://heal-book-frontend.vercel.app";
};

function resolveClerkUserId(req) {
  try {
    const auth = req.auth || {};
    const candidate = auth?.userId || auth?.user_id || auth?.user?.id || req.user?.clerkId || req.user?.id || null;
    if (candidate) return candidate;
    return null;
  } catch (e) {
    return null;
  }
}

// @desc    Create new service appointment
// @route   POST /api/service-appointments
// @access  Private/Patient
const createServiceAppointment = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: You must be logged in to create a service appointment.",
      });
    }

    const body = req.body || {};
    const {
      serviceId,
      serviceName: serviceNameFromBody,
      patientName,
      mobile,
      age,
      gender,
      date,
      time,
      hour,
      minute,
      ampm,
      paymentMethod = "Online",
      amount: amountFromBody,
      fees: feesFromBody,
      email,
      patientEmail,
      userId: userIdFromBody,
      meta = {},
      notes = "",
      serviceImageUrl: serviceImageUrlFromBody,
      serviceImagePublicId: serviceImagePublicIdFromBody,
    } = body;

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

    if (!serviceId) return res.status(400).json({ success: false, message: "serviceId is required" });
    if (!patientName || !String(patientName).trim()) return res.status(400).json({ success: false, message: "patientName is required" });
    if (!mobile || !String(mobile).trim()) return res.status(400).json({ success: false, message: "mobile is required" });
    if (!date || !String(date).trim()) return res.status(400).json({ success: false, message: "date is required (YYYY-MM-DD)" });

    if (age !== undefined && age !== null && age !== "") {
      const parsedAge = Number(age);
      if (isNaN(parsedAge) || parsedAge < 0) {
        return res.status(400).json({ success: false, message: "Age cannot be negative" });
      }
    }

    const numericAmount = safeNumber(amountFromBody ?? feesFromBody ?? 0);
    if (numericAmount === null || numericAmount < 0) return res.status(400).json({ success: false, message: "amount/fees must be a valid number" });

    let finalHour = hour !== undefined ? safeNumber(hour) : null;
    let finalMinute = minute !== undefined ? safeNumber(minute) : null;
    let finalAmpm = ampm || null;

    if (time && (finalHour === null || finalHour === undefined)) {
      const parsed = parseTimeString(time);
      if (!parsed) return res.status(400).json({ success: false, message: "time string couldn't be parsed" });
      finalHour = parsed.hour;
      finalMinute = parsed.minute;
      finalAmpm = parsed.ampm;
    }

    if (finalHour === null || finalMinute === null || (finalAmpm !== "AM" && finalAmpm !== "PM")) {
      return res.status(400).json({ success: false, message: "Time missing or invalid — provide time string or hour, minute and ampm." });
    }

    // DUPLICATE BOOKING CHECK
    try {
      const existing = await ServiceAppointment.findOne({
        serviceId: String(serviceId),
        createdBy: authClerkId,
        date: String(date),
        hour: Number(finalHour),
        minute: Number(finalMinute),
        ampm: finalAmpm,
        status: { $ne: "Canceled" },
      }).lean();
      if (existing) return res.status(409).json({ success: false, message: "You already have a booking for this service at the selected date and time." });
    } catch (chkErr) {
      console.warn("Duplicate booking check failed:", chkErr);
    }

    let svc = null;
    try { svc = await Service.findById(serviceId).lean(); } catch (e) { console.warn("Service lookup failed:", e?.message || e); }

    let resolvedServiceName = serviceNameFromBody || (svc && (svc.name || svc.title)) || "Service";
    const svcImageUrlFromDB = svc && (String(svc.imageUrl || svc.image || "").trim() || "");
    const svcImagePublicIdFromDB = svc && (String(svc.imagePublicId || "").trim() || "");
    const finalServiceImageUrl = (svcImageUrlFromDB && svcImageUrlFromDB.length) ? svcImageUrlFromDB : ((serviceImageUrlFromBody && String(serviceImageUrlFromBody).trim()) || "");
    const finalServiceImagePublicId = (svcImagePublicIdFromDB && svcImagePublicIdFromDB.length) ? svcImagePublicIdFromDB : ((serviceImagePublicIdFromBody && String(serviceImagePublicIdFromBody).trim()) || "");

    const base = {
      userId: authClerkId,
      patientEmail: authEmail,
      email: authEmail,
      serviceId,
      serviceName: resolvedServiceName,
      serviceImage: { url: finalServiceImageUrl, publicId: finalServiceImagePublicId },
      patientName: String(patientName || authName).trim(),
      mobile: String(mobile).trim(),
      age: age ? Number(age) : undefined,
      gender: gender || "",
      date: String(date),
      hour: Number(finalHour),
      minute: Number(finalMinute),
      ampm: finalAmpm,
      fees: numericAmount,
      createdBy: authClerkId,
      notes: notes || "",
    };

    // Free appointment
    if (numericAmount === 0) {
      const created = await ServiceAppointment.create({ ...base, status: "Confirmed", payment: { method: "Cash", status: "Paid", amount: 0, paidAt: new Date() } });
      return res.status(201).json({ success: true, appointment: created });
    }

    // Cash booking
    if (paymentMethod === "Cash") {
      const created = await ServiceAppointment.create({
        ...base,
        status: "Confirmed",
        payment: { method: "Cash", status: "Pending", amount: numericAmount, meta },
      });
      return res.status(201).json({ success: true, appointment: created, checkoutUrl: null });
    }

    // Online booking (Stripe)
    if (!stripe) {
      return res.status(400).json({
        success: false,
        message: "Online payment gateway is not configured. Please choose Cash payment.",
      });
    }

    const frontendBase = buildFrontendBase(req);
    const successUrl = `${frontendBase}/service-appointment/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendBase}/service-appointment/cancel`;

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: email ? String(email) : undefined,
        line_items: [
          {
            price_data: {
              currency: "inr",
              product_data: {
                name: `Service: ${String(resolvedServiceName).slice(0, 60)}`,
                description: `Appointment on ${base.date} ${base.hour}:${String(base.minute).padStart(2, "0")} ${base.ampm}`,
              },
              unit_amount: Math.round(numericAmount * 100),
            },
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          serviceId: String(serviceId),
          serviceName: String(resolvedServiceName).slice(0, 200),
          patientName: base.patientName,
          mobile: base.mobile,
          age: base.age ? String(base.age) : "",
          gender: base.gender || "",
          date: base.date,
          hour: String(base.hour),
          minute: String(base.minute),
          ampm: base.ampm,
          fees: String(numericAmount),
          notes: base.notes || "",
          clerkUserId: base.createdBy || "",
          email: email ? String(email) : "",
          serviceImageUrl: finalServiceImageUrl ? String(finalServiceImageUrl).slice(0, 200) : "",
          serviceImagePublicId: finalServiceImagePublicId ? String(finalServiceImagePublicId).slice(0, 200) : "",
        },
      });
    } catch (stripeErr) {
      console.error("Stripe create session error:", stripeErr);
      return res.status(400).json({ success: false, message: "Payment session creation failed." });
    }

    // Online booking: Do NOT create service appointment in DB until payment is completed!
    return res.status(200).json({ success: true, checkoutUrl: session.url || null, sessionId: session.id });
  } catch (err) {
    console.error("createServiceAppointment unexpected:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Confirm service appointment payment
// @route   POST /api/service-appointments/confirm-payment
// @access  Public
const confirmServicePayment = async (req, res) => {
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

    let appt = await ServiceAppointment.findOne({ "payment.sessionId": session_id });

    if (!appt) {
      const meta = session.metadata || {};
      if (meta.serviceId && meta.patientName && meta.date && meta.hour !== undefined) {
        const numericAmount = safeNumber(meta.fees || (session.amount_total ? session.amount_total / 100 : 0));
        appt = await ServiceAppointment.create({
          serviceId: meta.serviceId,
          serviceName: meta.serviceName || "Service",
          serviceImage: { url: meta.serviceImageUrl || "", publicId: meta.serviceImagePublicId || "" },
          patientName: meta.patientName,
          mobile: meta.mobile,
          age: meta.age ? Number(meta.age) : undefined,
          gender: meta.gender || "",
          date: meta.date,
          hour: Number(meta.hour),
          minute: Number(meta.minute || 0),
          ampm: meta.ampm || "AM",
          fees: numericAmount,
          status: "Confirmed",
          payment: {
            method: "Online",
            status: "Paid",
            amount: numericAmount,
            providerId: session.payment_intent || "",
            sessionId: session_id,
            paidAt: new Date(),
          },
          notes: meta.notes || "",
          createdBy: meta.clerkUserId || "guest",
        });
      } else {
        appt = await ServiceAppointment.findOneAndUpdate(
          {
            serviceId: meta.serviceId,
            mobile: meta.mobile,
            patientName: meta.patientName,
          },
          {
            $set: {
              "payment.status": "Paid",
              "payment.providerId": session.payment_intent || "",
              "payment.paidAt": new Date(),
              "payment.sessionId": session_id,
              status: "Confirmed",
            },
          },
          { new: true }
        );
      }
    } else {
      if (appt.payment.status !== "Paid" || appt.status !== "Confirmed") {
        appt.payment.status = "Paid";
        appt.status = "Confirmed";
        appt.payment.paidAt = appt.payment.paidAt || new Date();
        appt.payment.providerId = session.payment_intent || appt.payment.providerId;
        await appt.save();
      }
    }

    if (!appt) return res.status(404).json({ success: false, message: "Service appointment not found" });

    return res.json({ success: true, appointment: appt });
  } catch (err) {
    console.error("confirmServicePayment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get all service appointments
// @route   GET /api/service-appointments
// @access  Private
const getServiceAppointments = async (req, res) => {
  try {
    const { serviceId, mobile, status, page: pageRaw = 1, limit: limitRaw = 50, search = "", createdBy, patientClerkId } = req.query;
    const limit = Math.min(200, Math.max(1, parseInt(limitRaw, 10) || 50));
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * limit;

    const filter = {};
    if (serviceId) filter.serviceId = serviceId;
    if (mobile) filter.mobile = mobile;
    if (status) filter.status = status;

    if (req.user && req.user.role !== "admin") {
      const rawIds = [
        req.user.clerkId,
        req.user.id,
        req.user._id ? String(req.user._id) : null,
        createdBy,
        patientClerkId
      ].filter(Boolean);

      const ids = Array.from(new Set(rawIds));
      const validObjectIds = ids
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      const orConditions = [
        { createdBy: { $in: ids } },
        { createdBy: { $in: validObjectIds } },
        { patientClerkId: { $in: ids } }
      ];

      if (req.user.email) {
        orConditions.push({ email: req.user.email.toLowerCase() });
      }

      filter.$or = orConditions;
    } else {
      if (createdBy) filter.createdBy = createdBy;
      if (patientClerkId) filter.createdBy = patientClerkId;
    }

    if (search) {
      const re = new RegExp(search, "i");
      const searchOr = [{ patientName: re }, { mobile: re }, { serviceName: re }];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
        delete filter.$or;
      } else {
        filter.$or = searchOr;
      }
    }

    const items = await ServiceAppointment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ServiceAppointment.countDocuments(filter);
    return res.json({ success: true, data: items, appointments: items, meta: { total, page, limit } });
  } catch (err) {
    console.error("getServiceAppointments error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Update service appointment status/reschedule
// @route   PUT /api/service-appointments/:id
// @access  Private
const updateServiceAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const appt = await ServiceAppointment.findById(id);
    if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });

    const updates = {};
    if (body.status !== undefined) {
      const formattedStatus = body.status.charAt(0).toUpperCase() + body.status.slice(1).toLowerCase();
      updates.status = formattedStatus === "Cancelled" ? "Canceled" : formattedStatus;
    }
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.payment !== undefined) updates.payment = body.payment;
    if (body["payment.status"] !== undefined) updates["payment.status"] = body["payment.status"];

    if (body.rescheduledTo) {
      const { date, time } = body.rescheduledTo || {};
      updates.rescheduledTo = {};
      if (date) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ success: false, message: "rescheduledTo.date must be YYYY-MM-DD" });
        updates.rescheduledTo.date = date;
        updates.date = date;
      }
      if (time) {
        updates.rescheduledTo.time = String(time);
        const parsed = parseTimeString(String(time));
        if (!parsed) return res.status(400).json({ success: false, message: "rescheduledTo.time couldn't be parsed" });
        updates.hour = parsed.hour;
        updates.minute = parsed.minute;
        updates.ampm = parsed.ampm;
      }
      if (!body.status) updates.status = "Rescheduled";
    }

    if (updates.payment) {
      const method = updates.payment.method;
      if (method && String(method).toLowerCase() === "online") updates.status = updates.status || "Confirmed";
      if (updates.payment.status && updates.payment.status === "Confirmed") {
        updates.status = "Confirmed";
        if (updates.payment.paidAt === undefined) updates.payment.paidAt = new Date();
      }
    }

    const updated = await ServiceAppointment.findByIdAndUpdate(id, { $set: updates }, { new: true });
    return res.json({ success: true, data: updated, appointment: updated });
  } catch (err) {
    console.error("updateServiceAppointment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Cancel service appointment
// @route   DELETE /api/service-appointments/:id
// @access  Private
const cancelServiceAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const appt = await ServiceAppointment.findById(id);
    if (!appt) return res.status(404).json({ success: false, message: "Not found" });
    if (appt.status === "Completed") return res.status(400).json({ success: false, message: "Cannot cancel a completed appointment" });

    appt.status = "Canceled";
    if (appt.payment) {
      appt.payment.status = appt.payment.status === "Paid" ? "Refunded" : "Canceled";
    }

    await appt.save();
    return res.json({ success: true, data: appt, appointment: appt });
  } catch (err) {
    console.error("cancelServiceAppointment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get service appointments stats
// @route   GET /api/admin/service-stats
// @access  Private/Admin
const getServiceAppointmentStats = async (req, res) => {
  try {
    const docs = await Service.aggregate([
      {
        $lookup: { from: "serviceappointments", localField: "_id", foreignField: "serviceId", as: "appointments" },
      },
      {
        $addFields: {
          totalAppointments: { $size: "$appointments" },
          completed: { $size: { $filter: { input: "$appointments", as: "a", cond: { $eq: ["$$a.status", "Completed"] } } } },
          canceled: { $size: { $filter: { input: "$appointments", as: "a", cond: { $eq: ["$$a.status", "Canceled"] } } } },
        },
      },
      { $addFields: { earning: { $multiply: ["$completed", "$price"] } } },
      { $project: { name: 1, price: 1, image: "$imageUrl", totalAppointments: 1, completed: 1, canceled: 1, earning: 1 } },
      { $sort: { createdAt: -1 } },
    ]);

    return res.json({ success: true, data: docs });
  } catch (err) {
    console.error("getServiceAppointmentStats error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getServiceAppointmentsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const items = await ServiceAppointment.find({ createdBy: patientId }).sort({ createdAt: -1 });
    return res.json({ success: true, data: items, appointments: items });
  } catch (err) {
    console.error("getServiceAppointmentsByPatient error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  createServiceAppointment,
  confirmServicePayment,
  getServiceAppointments,
  updateServiceAppointment,
  cancelServiceAppointment,
  getServiceAppointmentStats,
  getServiceAppointmentsByPatient,
};
