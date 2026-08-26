/**
 * Deterministic red-flag (emergency symptom) detection layer.
 *
 * This runs BEFORE / ALONGSIDE the LLM so that clearly urgent symptoms are
 * escalated even if the AI model fails, is misconfigured, or returns an
 * unexpected response. It never provides treatment instructions - it only
 * decides whether to escalate.
 */

// Each category: id + list of regex patterns (word-boundary aware, case-insensitive)
const RED_FLAG_PATTERNS = [
  {
    category: "severe_breathing_difficulty",
    patterns: [
      /\bcan(?:'|no)?t breathe\b/i,
      /\bcannot breathe\b/i,
      /\bstruggling to breathe\b/i,
      /\bsevere (?:difficulty|trouble|problem) breathing\b/i,
      /\bgasping\b/i,
      /\bchoking\b/i,
      /\bsuffocating\b/i,
      /\blips turning blue\b/i,
      /\bblue lips\b/i,
    ],
  },
  {
    category: "chest_pain",
    patterns: [
      /\bcrushing chest pain\b/i,
      /\bchest pain\b/i,
      /\bchest pressure\b/i,
      /\bpressure on my chest\b/i,
      /\bheavy feeling in (?:my )?chest\b/i,
      /\bpain (?:spreading|radiating) to (?:my )?(?:arm|jaw|neck)\b/i,
      /\bheart attack\b/i,
    ],
  },
  {
    category: "loss_of_consciousness",
    patterns: [
      /\bfainted?\b/i,
      /\bfainting\b/i,
      /\bpassed out\b/i,
      /\bblack(ed)? out\b/i,
      /\bunconscious\b/i,
      /\bwon(?:'|)t wake up\b/i,
      /\bunresponsive\b/i,
    ],
  },
  {
    category: "severe_confusion_or_neurological",
    patterns: [
      /\bsudden(?:ly)? confused\b/i,
      /\bsevere confusion\b/i,
      /\bdisoriented\b/i,
      /\bslurred speech\b/i,
      /\bcan(?:'|no)?t speak\b/i,
      /\bone side of (?:my )?(?:body|face) (?:is |feels )?(?:weak|numb|paralysed|paralyzed)\b/i,
      /\bface drooping\b/i,
      /\bsudden(?:ly)? weak(?:ness)? on one side\b/i,
      /\bstroke\b/i,
      /\bseizure\b/i,
      /\bfitting\b/i,
      /\bworst headache of my life\b/i,
      /\bsudden severe headache\b/i,
      /\bthunderclap headache\b/i,
    ],
  },
  {
    category: "uncontrolled_bleeding",
    patterns: [
      /\bbleeding won(?:'|)t stop\b/i,
      /\buncontrolled bleeding\b/i,
      /\bsevere bleeding\b/i,
      /\bblood won(?:'|)t stop\b/i,
      /\bvomiting blood\b/i,
      /\bcoughing up blood\b/i,
      /\bblood in vomit\b/i,
      /\bbloody vomit\b/i,
    ],
  },
  {
    category: "severe_allergic_reaction",
    patterns: [
      /\banaphyla(xis|ctic)\b/i,
      /\bthroat closing\b/i,
      /\btongue swelling\b/i,
      /\bface swelling (?:rapidly|badly|suddenly)\b/i,
      /\bhives all over\b/i,
      /\bsevere allergic reaction\b/i,
    ],
  },
  {
    category: "self_harm_emergency",
    patterns: [
      /\bsuicid(e|al)\b/i,
      /\bkill myself\b/i,
      /\bhurt myself\b/i,
      /\bself[- ]harm\b/i,
      /\bend my life\b/i,
      /\bdon(?:'|)t want to live\b/i,
      /\boverdose\b/i,
    ],
  },
  {
    category: "other_urgent",
    patterns: [
      /\bstiff neck with fever\b/i,
      /\brash that doesn(?:'|)t fade when pressed\b/i,
      /\bnon[- ]blanching rash\b/i,
      /\bsevere dehydration\b/i,
      /\bpoison(?:ing|ed)\b/i,
      /\bhigh fever with stiff neck\b/i,
      /\bsevere abdominal pain\b/i,
      /\bsevere persistent vomiting\b/i,
      /\bwatering can(?:'|)t keep fluids down\b/i,
    ],
  },
];

/**
 * Scan free text for emergency indicators.
 * @param {string} text - patient message (or combined recent context)
 * @returns {{ isEmergency: boolean, matchedCategories: string[] }}
 */
function detectRedFlags(text) {
  const result = { isEmergency: false, matchedCategories: [] };
  if (!text || typeof text !== "string") return result;

  // Collapse whitespace/newlines so multi-word phrases spanning lines still match
  const normalized = String(text).replace(/\s+/g, " ").trim();
  if (!normalized) return result;

  for (const group of RED_FLAG_PATTERNS) {
    for (const pattern of group.patterns) {
      if (pattern.test(normalized)) {
        result.isEmergency = true;
        if (!result.matchedCategories.includes(group.category)) {
          result.matchedCategories.push(group.category);
        }
        break;
      }
    }
  }

  return result;
}

/** Safe, non-actionable urgent message shown when a red flag is detected. */
const URGENT_MESSAGE =
  "Your symptoms may require urgent medical attention. Please seek emergency medical care immediately or contact your local emergency service. This assistant cannot safely assess an emergency condition.";

module.exports = { detectRedFlags, URGENT_MESSAGE };