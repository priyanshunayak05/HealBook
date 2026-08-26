const mongoose = require("mongoose");

/**
 * Health Assistant conversation for a single patient.
 * Messages are embedded and trimmed to keep documents lightweight
 * (only recent context is ever sent to the AI provider).
 */
const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    // Public identifier shared with the frontend (UUID)
    conversationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Owner of the conversation - always derived from the authenticated user
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    clerkId: {
      type: String,
      default: "",
      index: true,
    },
    title: {
      type: String,
      default: "Symptom Check",
      trim: true,
      maxlength: 120,
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    lastSeverity: {
      type: String,
      enum: ["low", "moderate", "high", "emergency", ""],
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Keep embedded history bounded (never grow unbounded)
conversationSchema.pre("save", function (next) {
  const MAX_MESSAGES = 60;
  if (this.messages && this.messages.length > MAX_MESSAGES) {
    this.messages = this.messages.slice(-MAX_MESSAGES);
  }
  next();
});

// Static helper: find a conversation owned strictly by the given patient
conversationSchema.statics.findOwned = function (conversationId, patientId) {
  return this.findOne({ conversationId, patientId });
};

module.exports = mongoose.model("Conversation", conversationSchema);