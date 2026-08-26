/**
 * Isolated Gemini API integration for the Health Assistant.
 *
 * - The API key lives ONLY here (server-side) and is read from env.
 * - Uses the official Gemini REST API via native fetch (Node 18+),
 *   so no additional dependency is introduced into the project.
 * - Requests a strict JSON response and validates/recovers it safely.
 * - Raw provider errors are never returned to patients; they are logged
 *   server-side only.
 */

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 20000);
const MAX_HISTORY_MESSAGES = 16; // limit context sent to the model

const DISCLAIMER =
  "This is preliminary health information and not a medical diagnosis.";

/**
 * System instruction: cautious healthcare INFORMATION assistant.
 * Encodes the safety contract for every conversation turn.
 */
function buildSystemInstruction(patientContext) {
  const ctxLines = [];
  if (patientContext && typeof patientContext === "object") {
    if (patientContext.age) ctxLines.push(`- Age: ${patientContext.age}`);
    if (patientContext.gender) ctxLines.push(`- Sex: ${patientContext.gender}`);
    if (patientContext.bloodGroup)
      ctxLines.push(`- Blood group: ${patientContext.bloodGroup}`);
  }

  return `You are the "Health Assistant" inside HealBook, a patient-facing healthcare web application. You are a cautious healthcare INFORMATION assistant. You are NOT a doctor and must never claim to be one.

CORE BEHAVIOR RULES:
1. Never claim certainty. Never state or imply a definitive diagnosis (e.g., never say "You have dengue" or "This is pneumonia").
2. Provide preliminary possibilities ONLY when enough context exists, always framed as possibilities ("can occur with several conditions").
3. If key information is missing (duration, severity, temperature, associated symptoms, relevant history), ask clarifying questions FIRST instead of guessing.
4. Ask at most 3-4 of the most relevant follow-up questions per reply. Do not overwhelm the patient.
5. Encourage professional medical evaluation whenever appropriate.
6. If symptoms suggest an emergency (severe breathing difficulty, chest pain/pressure, loss of consciousness, severe confusion, uncontrolled bleeding, sudden severe neurological symptoms, severe allergic reaction, suicidal/self-harm crisis), tell the patient to seek emergency care immediately and stop casual questioning.
7. NEVER recommend specific prescription medications or dosages. For medicine questions, give only general safe guidance (e.g., rest, hydration, over-the-counter options may be discussed with a pharmacist) and advise consulting a doctor or pharmacist.
8. NEVER tell a patient to stop or change prescribed medication.
9. Do not provide dangerous self-treatment instructions.
10. Use simple, patient-friendly language. Avoid excessive medical jargon. Be warm but concise.
11. Clearly distinguish reported symptoms from possible causes. Do not create false confidence.
12. Remind the patient that a healthcare professional should be consulted for diagnosis.

RESPONSE STYLE (when giving guidance):
1. Acknowledge the symptoms empathetically.
2. Briefly summarize what was reported.
3. Either ask relevant follow-up questions OR provide preliminary general guidance.
4. Give safe next steps (rest, hydration, monitoring).
5. Explain when to see a doctor.
6. Include an emergency warning when applicable.
7. End with a short disclaimer that this is not a medical diagnosis.

PATIENT CONTEXT (already known from their profile - use only if relevant):
${ctxLines.length > 0 ? ctxLines.join("\n") : "- None available"}

OUTPUT FORMAT (STRICT):
Respond with ONLY a valid JSON object, no markdown fences, no extra text, matching exactly this shape:
{
  "summary": "short acknowledgment + summary of what the patient reported",
  "possible_causes": ["general possibility 1", "..."],   // empty array if still gathering info
  "follow_up_questions": ["question 1", "..."],          // max 4, empty array when giving final guidance
  "self_care": ["safe general step 1", "..."],
  "red_flags": ["warning sign that should trigger urgent care", "..."],
  "recommended_action": "monitor" | "book_appointment" | "urgent_care" | "emergency",
  "confidence": "low" | "medium",
  "disclaimer": "${DISCLAIMER}"
}`;
}

/** Build the conversation contents array for the Gemini API. */
function buildContents(recentMessages, currentMessage) {
  const contents = [];

  const history = Array.isArray(recentMessages)
    ? recentMessages.slice(-MAX_HISTORY_MESSAGES)
    : [];

  for (const msg of history) {
    if (!msg || !msg.message) continue;
    const role = msg.sender === "user" ? "user" : "model";
    // Keep roles alternating-safe: merge consecutive same-role turns
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts[0].text += `\n${msg.message}`;
    } else {
      contents.push({ role, parts: [{ text: String(msg.message).slice(0, 1500) }] });
    }
  }

  contents.push({ role: "user", parts: [{ text: String(currentMessage).slice(0, 2000) }] });
  return contents;
}

/**
 * Extract the first balanced JSON object from arbitrary model text.
 * Handles markdown fences and leading/trailing chatter.
 */
function extractJsonObject(rawText) {
  if (!rawText || typeof rawText !== "string") return null;
  let text = rawText.trim();

  // Strip markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    text = fenceMatch[1].trim();
  }

  // Direct parse
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") return parsed;
  } catch (_) {
    /* fall through to recovery */
  }

  // Recovery: find first '{' and attempt progressively trimmed parses
  const start = text.indexOf("{");
  if (start === -1) return null;
  for (let end = text.lastIndexOf("}"); end > start; end--) {
    const candidate = text.slice(start, end + 1);
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (_) {
      continue;
    }
  }
  return null;
}

/** Coerce/validate the model's JSON into our trusted response shape. */
function normalizeAssistantPayload(parsed) {
  const asStringArray = (value, maxItems = 6) => {
    if (!Array.isArray(value)) return [];
    return value
      .filter((v) => v !== null && v !== undefined)
      .map((v) => String(v).trim())
      .filter(Boolean)
      .slice(0, maxItems);
  };

  const ACTIONS = ["monitor", "book_appointment", "urgent_care", "emergency"];
  let action = String(parsed.recommended_action || "monitor").toLowerCase().trim();
  if (!ACTIONS.includes(action)) action = "monitor";

  let confidence = String(parsed.confidence || "low").toLowerCase().trim();
  if (!["low", "medium"].includes(confidence)) confidence = "low";

  const followUps = asStringArray(parsed.follow_up_questions, 4);

  return {
    summary: String(parsed.summary || "").trim(),
    possible_causes: asStringArray(parsed.possible_causes),
    follow_up_questions: followUps,
    self_care: asStringArray(parsed.self_care),
    red_flags: asStringArray(parsed.red_flags),
    recommended_action: action,
    confidence,
    disclaimer: DISCLAIMER,
  };
}

/** Compose the final patient-friendly message from the structured payload. */
function composePatientMessage(payload) {
  const sections = [];

  if (payload.summary) sections.push(payload.summary);

  if (
    payload.follow_up_questions.length === 0 &&
    payload.possible_causes.length > 0
  ) {
    sections.push(
      `Your symptoms can occur with several conditions, such as: ${payload.possible_causes
        .map((c) => c.replace(/\.$/, ""))
        .join(", ")}. A healthcare professional would need to evaluate you to determine the actual cause.`
    );
  }

  if (payload.follow_up_questions.length > 0) {
    sections.push(
      payload.follow_up_questions.map((q) => `• ${q}`).join("\n")
    );
  }

  if (payload.self_care.length > 0) {
    sections.push(
      `In the meantime:\n${payload.self_care.map((s) => `• ${s}`).join("\n")}`
    );
  }

  if (payload.red_flags.length > 0) {
    sections.push(
      `Seek medical attention promptly if you experience: ${payload.red_flags
        .map((r) => r.replace(/\.$/, ""))
        .join("; ")}.`
    );
  }

  if (payload.recommended_action === "book_appointment") {
    sections.push(
      "It would be a good idea to book an appointment with a doctor so your symptoms can be properly evaluated."
    );
  }

  sections.push(payload.disclaimer);
  return sections.filter(Boolean).join("\n\n");
}

/** Safe fallback used when Gemini fails or returns unusable output. */
function buildFallbackPayload(reason) {
  console.warn(`[geminiService] Using fallback response (${reason})`);
  return {
    summary:
      "I'm temporarily unable to analyze your symptoms right now, but I can still offer some general guidance.",
    possible_causes: [],
    follow_up_questions: [],
    self_care: [
      "Rest and stay hydrated.",
      "Monitor your symptoms and note any changes.",
      "Avoid self-medicating beyond simple, well-known remedies.",
    ],
    red_flags: [
      "difficulty breathing",
      "chest pain",
      "fainting or confusion",
      "uncontrolled bleeding",
    ],
    recommended_action: "book_appointment",
    confidence: "low",
    disclaimer: DISCLAIMER,
  };
}

/**
 * Call Gemini to generate the assistant's structured reply.
 * @param {Object} params
 * @param {Array}  params.history       recent [{sender:'user'|'assistant', message}]
 * @param {string} params.message       current patient message
 * @param {Object} [params.patientContext] minimal profile info {age, gender, bloodGroup}
 * @returns {Promise<{payload: Object, message: string, degraded: boolean}>}
 */
async function generateSymptomGuidance({ history, message, patientContext }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[geminiService] GEMINI_API_KEY is not configured");
    const payload = buildFallbackPayload("missing_api_key");
    return { payload, message: composePatientMessage(payload), degraded: true };
  }

  const model = DEFAULT_MODEL;
  const url = `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    systemInstruction: {
      parts: [{ text: buildSystemInstruction(patientContext) }],
    },
    contents: buildContents(history, message),
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const elapsed = Date.now() - startedAt;

    if (!res.ok) {
      const errType =
        res.status === 401 || res.status === 403
          ? "invalid_api_key"
          : res.status === 429
            ? "rate_limited"
            : res.status >= 500
              ? "provider_error"
              : "provider_http_error";
      // Log status/type only - never the key or full body
      console.error(
        `[geminiService] Request failed: type=${errType} status=${res.status} elapsed=${elapsed}ms`
      );
      const payload = buildFallbackPayload(errType);
      return { payload, message: composePatientMessage(payload), degraded: true };
    }

    const data = await res.json();

    const candidate = data?.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const rawText =
      candidate?.content?.parts
        ?.map((p) => p?.text || "")
        .filter(Boolean)
        .join("\n") || "";

    if (!rawText) {
      console.error(
        `[geminiService] Empty completion: finishReason=${finishReason || "unknown"} elapsed=${Date.now() - startedAt}ms`
      );
      const payload = buildFallbackPayload("empty_completion");
      return { payload, message: composePatientMessage(payload), degraded: true };
    }

    const parsed = extractJsonObject(rawText);
    if (!parsed) {
      console.error(
        `[geminiService] Malformed JSON from model elapsed=${Date.now() - startedAt}ms`
      );
      const payload = buildFallbackPayload("malformed_json");
      return { payload, message: composePatientMessage(payload), degraded: true };
    }

    const payload = normalizeAssistantPayload(parsed);
    console.log(
      `[geminiService] Success elapsed=${Date.now() - startedAt}ms action=${payload.recommended_action}`
    );
    return { payload, message: composePatientMessage(payload), degraded: false };
  } catch (err) {
    const isTimeout = err?.name === "AbortError";
    console.error(
      `[geminiService] Network failure: type=${isTimeout ? "timeout" : "network_error"} detail=${err?.message || "unknown"}`
    );
    const payload = buildFallbackPayload(isTimeout ? "timeout" : "network_error");
    return { payload, message: composePatientMessage(payload), degraded: true };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  generateSymptomGuidance,
  composePatientMessage,
  buildFallbackPayload,
  extractJsonObject,
  normalizeAssistantPayload,
};