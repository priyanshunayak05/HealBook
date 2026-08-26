const crypto = require("crypto");
const Conversation = require("../models/Conversation");
const Appointment = require("../models/Appointment");
const { detectRedFlags, URGENT_MESSAGE } = require("../services/redFlagService");
const { generateSymptomGuidance } = require("../services/geminiService");

const DISCLAIMER =
  "This is preliminary health information and not a medical diagnosis.";

const GENERIC_ERROR =
  "I'm temporarily unable to process your request. Please try again.";

/** Sanitize free text: strip control characters, collapse whitespace, cap length. */
function sanitizeText(raw, maxLength) {
  if (!raw || typeof raw !== "string") return "";
  return raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/** Extract ONLY the minimum relevant profile context for the AI provider. */
function buildMinimalPatientContext(user) {
  const ctx = {};
  if (!user) return ctx;
  const age = String(user.age || "").trim();
  const gender = String(user.gender || "").trim();
  const bloodGroup = String(user.bloodGroup || "").trim();
  if (age && Number(age) > 0 && Number(age) < 130) ctx.age = age;
  if (gender) ctx.gender = gender;
  if (bloodGroup) ctx.bloodGroup = bloodGroup;
  return ctx;
}

/** Map conversation documents to plain serializable messages. */
function serializeMessages(conversation) {
  return (conversation?.messages || []).map((m, idx) => ({
    id: `${conversation.conversationId}-${idx}`,
    sender: m.sender,
    message: m.message,
    createdAt: m.createdAt,
  }));
}

/** Does this patient have any active (pending/confirmed) appointment? */
async function hasActiveAppointment(user) {
  try {
    const identities = [user?.clerkId, user?.email ? String(user.email).toLowerCase() : null]
      .filter(Boolean);
    if (identities.length === 0) return false;

    const count = await Appointment.countDocuments({
      $or: [{ createdBy: { $in: identities } }, { email: { $in: identities } }],
      status: { $in: ["Pending", "Confirmed"] },
    });
    return count > 0;
  } catch (err) {
    console.warn(`[healthAssistant] Active-appointment lookup failed: ${err?.message || err}`);
    return false; // never block the chat on this optional hint
  }
}

/**
 * @desc    Symptom check via Gemini (patient only)
 * @route   POST /api/ai/symptom-check
 * @access  Private (patient)
 */
const symptomCheck = async (req, res) => {
  const startedAt = Date.now();
  try {
    const user = req.user;
    if (!user || !user._id) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    const rawMessage = typeof req.body?.message === "string" ? req.body.message : "";
    const message = sanitizeText(rawMessage, 2000);

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Please describe your symptoms so the assistant can help.",
      });
    }

    // ---- Conversation resolution (strict ownership) ----
    let conversation = null;
    const requestedId = sanitizeText(req.body?.conversationId || "", 64);

    if (requestedId) {
      // Only ever load a conversation owned by THIS patient.
      conversation = await Conversation.findOne({
        conversationId: requestedId,
        patientId: user._id,
      });
    }

    if (!conversation) {
      // New (or foreign/unowned id supplied -> fresh private conversation)
      conversation = new Conversation({
        conversationId: crypto.randomUUID(),
        patientId: user._id,
        clerkId: user.clerkId || "",
        title: message.slice(0, 80),
        messages: [],
      });
    }

    console.log(
      `[healthAssistant] Request received user=${user._id} conversation=${conversation.conversationId}`
    );

    // ---- Deterministic red-flag layer (before the LLM) ----
    const recentText = conversation.messages
      .slice(-6)
      .map((m) => m.message)
      .join(" ");
    const redFlag = detectRedFlags(`${recentText} ${message}`.trim());

    if (redFlag.isEmergency) {
      console.warn(
        `[healthAssistant] Red-flag detected categories=${redFlag.matchedCategories.join(",")} conversation=${conversation.conversationId}`
      );

      conversation.messages.push({ sender: "user", message });
      conversation.messages.push({ sender: "assistant", message: URGENT_MESSAGE });
      conversation.lastSeverity = "emergency";
      await conversation.save().catch((err) =>
        console.error(`[healthAssistant] Save failed (red-flag path): ${err?.message || err}`)
      );

      return res.status(200).json({
        success: true,
        data: {
          conversation_id: conversation.conversationId,
          response: URGENT_MESSAGE,
          severity: "emergency",
          requires_urgent_attention: true,
          recommend_appointment: false,
          has_upcoming_appointment: await hasActiveAppointment(user),
          degraded: false,
          disclaimer: DISCLAIMER,
        },
      });
    }

    // ---- Gemini pipeline ----
    const history = conversation.messages.slice(-16).map((m) => ({
      sender: m.sender,
      message: m.message,
    }));

    const { payload, message: assistantMessage, degraded } =
      await generateSymptomGuidance({
        history,
        message,
        patientContext: buildMinimalPatientContext(user),
      });

    // Emergency action returned by the model is honored but re-worded safely
    const isEmergencyFromModel = payload.recommended_action === "emergency";
    const finalMessage = isEmergencyFromModel
      ? `${assistantMessage}

If your symptoms worsen suddenly, seek emergency medical care immediately.`
      : assistantMessage;

    // ---- Persistence (non-fatal on failure) ----
    conversation.messages.push({ sender: "user", message });
    conversation.messages.push({ sender: "assistant", message: finalMessage });
    conversation.lastSeverity = isEmergencyFromModel
      ? "emergency"
      : payload.recommended_action === "urgent_care"
        ? "high"
        : payload.recommended_action === "book_appointment"
          ? "moderate"
          : "low";

    await conversation.save().catch((err) =>
      console.error(`[healthAssistant] Save failed: ${err?.message || err}`)
    );

    console.log(
      `[healthAssistant] Completed conversation=${conversation.conversationId} elapsed=${Date.now() - startedAt}ms degraded=${degraded}`
    );

    return res.status(200).json({
      success: true,
      data: {
        conversation_id: conversation.conversationId,
        response: finalMessage,
        severity: conversation.lastSeverity,
        requires_urgent_attention: isEmergencyFromModel,
        recommend_appointment:
          payload.recommended_action === "book_appointment" ||
          payload.recommended_action === "urgent_care",
        has_upcoming_appointment: await hasActiveAppointment(user),
        degraded,
        disclaimer: payload.disclaimer || DISCLAIMER,
      },
    });
  } catch (err) {
    console.error(
      `[healthAssistant] Unhandled error type=${err?.name || "Unknown"} detail=${err?.message || err}`
    );
    return res.status(500).json({ success: false, message: GENERIC_ERROR });
  }
};

/**
 * @desc    Load the patient's most recent assistant conversation
 * @route   GET /api/ai/conversations/latest
 * @access  Private (patient)
 */
const getLatestConversation = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user._id) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    const conversation = await Conversation.findOne({ patientId: user._id })
      .sort({ updatedAt: -1 })
      .limit(1);

    if (!conversation) {
      return res.status(200).json({ success: true, data: null });
    }

    return res.status(200).json({
      success: true,
      data: {
        conversation_id: conversation.conversationId,
        messages: serializeMessages(conversation),
        updated_at: conversation.updatedAt,
      },
    });
  } catch (err) {
    console.error(
      `[healthAssistant] getLatestConversation error type=${err?.name || "Unknown"} detail=${err?.message || err}`
    );
    return res.status(500).json({ success: false, message: GENERIC_ERROR });
  }
};

/**
 * @desc    Start a brand-new empty conversation
 * @route   POST /api/ai/conversations
 * @access  Private (patient)
 */
const createConversation = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user._id) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    const conversation = await Conversation.create({
      conversationId: crypto.randomUUID(),
      patientId: user._id,
      clerkId: user.clerkId || "",
      title: "Symptom Check",
      messages: [],
    });

    return res.status(201).json({
      success: true,
      data: {
        conversation_id: conversation.conversationId,
        messages: [],
      },
    });
  } catch (err) {
    console.error(
      `[healthAssistant] createConversation error type=${err?.name || "Unknown"} detail=${err?.message || err}`
    );
    return res.status(500).json({ success: false, message: GENERIC_ERROR });
  }
};

module.exports = { symptomCheck, getLatestConversation, createConversation };