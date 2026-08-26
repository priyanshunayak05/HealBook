const express = require("express");
const { validationResult } = require("express-validator");
// const rateLimit = require("express-rate-limit");
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const { authenticate, authorize } = require("../middleware/auth");
const {
  symptomCheckValidation,
} = require("../validations/healthAssistantValidation");
const {
  symptomCheck,
  getLatestConversation,
  createConversation,
} = require("../controllers/healthAssistantController");

const router = express.Router();

// Per-user AI rate limit: prevents unlimited Gemini calls (15 requests / minute / patient)
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Authenticated patient identity
    if (req.user?._id) {
      return `user:${req.user._id}`;
    }

    // IPv6-safe IP fallback
    return `ip:${ipKeyGenerator(req.ip)}`;
  },
  message: {
    success: false,
    message:
      "You're sending messages too quickly. Please wait a moment and try again.",
    data: {},
  },
});

// Middleware to run express-validator chains
const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((v) => v.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || "Invalid request",
      data: {},
    });
  }
  next();
};

// All AI routes require an authenticated PATIENT
router.use(authenticate, authorize("patient"));

router.post(
  "/symptom-check",
  aiRateLimiter,
  validate(symptomCheckValidation),
  symptomCheck
);

router.get("/conversations/latest", getLatestConversation);

router.post("/conversations", createConversation);

module.exports = router;