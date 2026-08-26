/**
 * Unit tests for healthAssistantController
 * Tests controller functions directly with mocked dependencies
 */

// Mock dependencies before requiring controller
const mockConversationSave = jest.fn();
const MockConversation = jest.fn().mockImplementation((data) => ({
  ...data,
  save: mockConversationSave.mockResolvedValue(true),
}));
MockConversation.findOne = jest.fn();
MockConversation.find = jest.fn();
MockConversation.countDocuments = jest.fn();
MockConversation.create = jest.fn();

jest.mock("../models/Conversation", () => MockConversation);

jest.mock("../models/Appointment", () => ({
  countDocuments: jest.fn(),
}));

jest.mock("../services/geminiService", () => ({
  generateSymptomGuidance: jest.fn(),
}));

jest.mock("../services/redFlagService", () => ({
  detectRedFlags: jest.fn(),
  URGENT_MESSAGE: "Emergency message",
}));

const Conversation = require("../models/Conversation");
const Appointment = require("../models/Appointment");
const { generateSymptomGuidance } = require("../services/geminiService");
const { detectRedFlags } = require("../services/redFlagService");

const {
  symptomCheck,
  getLatestConversation,
  createConversation,
  getConversationById,
  getConversations,
} = require("../controllers/healthAssistantController");

// Helper to create mock request/response
const createMockReq = (overrides = {}) => ({
  user: { _id: "user123", role: "patient", clerkId: "clerk123" },
  body: {},
  params: {},
  query: {},
  ...overrides,
});

const createMockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
};

describe("Health Assistant Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("symptomCheck", () => {
    test("should return 401 if user is not authenticated", async () => {
      const req = createMockReq({ user: null });
      const res = createMockRes();

      await symptomCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Not authorized",
      });
    });

    test("should return 400 for empty message", async () => {
      const req = createMockReq({ body: { message: "" } });
      const res = createMockRes();

      await symptomCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    test("should return 400 for missing message", async () => {
      const req = createMockReq({ body: {} });
      const res = createMockRes();

      await symptomCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should handle emergency red flag detection", async () => {
      const req = createMockReq({
        body: { message: "I have severe chest pain" },
      });
      const res = createMockRes();

      detectRedFlags.mockReturnValue({
        isEmergency: true,
        matchedCategories: ["chest_pain"],
      });

      Conversation.findOne.mockResolvedValue(null);
      const mockNewConversation = {
        conversationId: "test-conv-id",
        patientId: "user123",
        messages: [],
        save: jest.fn().mockResolvedValue(true),
      };
      Conversation.create.mockResolvedValue(mockNewConversation);
      Appointment.countDocuments.mockResolvedValue(0);

      await symptomCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          severity: "emergency",
          requires_urgent_attention: true,
        }),
      });
    });

    test("should handle normal symptom check with Gemini", async () => {
      const req = createMockReq({
        body: { message: "I have a mild headache" },
      });
      const res = createMockRes();

      detectRedFlags.mockReturnValue({
        isEmergency: false,
        matchedCategories: [],
      });

      const mockConversation = {
        conversationId: "test-conv-id",
        patientId: "user123",
        messages: [],
        save: jest.fn().mockResolvedValue(true),
      };
      Conversation.findOne.mockResolvedValue(mockConversation);
      Appointment.countDocuments.mockResolvedValue(0);

      generateSymptomGuidance.mockResolvedValue({
        payload: {
          summary: "Patient reports headache",
          possible_causes: ["tension"],
          follow_up_questions: ["How long?"],
          self_care: ["Rest"],
          red_flags: ["severe pain"],
          recommended_action: "monitor",
          confidence: "medium",
          disclaimer: "Not a diagnosis.",
        },
        message: "Patient reports headache",
        degraded: false,
      });

      await symptomCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          conversation_id: expect.any(String),
          response: expect.any(String),
          severity: expect.any(String),
          disclaimer: expect.any(String),
        }),
      });
    });

    test("should handle Gemini API failure gracefully", async () => {
      const req = createMockReq({
        body: { message: "I feel sick" },
      });
      const res = createMockRes();

      detectRedFlags.mockReturnValue({
        isEmergency: false,
        matchedCategories: [],
      });

      const mockConversation = {
        conversationId: "test-conv-id",
        patientId: "user123",
        messages: [],
        save: jest.fn().mockResolvedValue(true),
      };
      Conversation.findOne.mockResolvedValue(mockConversation);
      Appointment.countDocuments.mockResolvedValue(0);

      generateSymptomGuidance.mockResolvedValue({
        payload: {
          summary: "Unable to analyze",
          possible_causes: [],
          follow_up_questions: [],
          self_care: ["Rest"],
          red_flags: ["severe symptoms"],
          recommended_action: "book_appointment",
          confidence: "low",
          disclaimer: "Not a diagnosis.",
        },
        message: "Unable to analyze symptoms",
        degraded: true,
      });

      await symptomCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          degraded: true,
        }),
      });
    });

    test("should sanitize long messages", async () => {
      const longMessage = "a".repeat(3000);
      const req = createMockReq({
        body: { message: longMessage },
      });
      const res = createMockRes();

      detectRedFlags.mockReturnValue({
        isEmergency: false,
        matchedCategories: [],
      });

      const mockConversation = {
        conversationId: "test-conv-id",
        patientId: "user123",
        messages: [],
        save: jest.fn().mockResolvedValue(true),
      };
      Conversation.findOne.mockResolvedValue(mockConversation);
      Appointment.countDocuments.mockResolvedValue(0);

      generateSymptomGuidance.mockResolvedValue({
        payload: {
          summary: "Test",
          possible_causes: [],
          follow_up_questions: [],
          self_care: [],
          red_flags: [],
          recommended_action: "monitor",
          confidence: "low",
          disclaimer: "Not a diagnosis.",
        },
        message: "Test response",
        degraded: false,
      });

      await symptomCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      // Verify that the message was truncated
      const geminiCall = generateSymptomGuidance.mock.calls[0][0];
      expect(geminiCall.message.length).toBeLessThanOrEqual(2000);
    });

    test("should not allow access to another patient's conversation", async () => {
      const req = createMockReq({
        body: {
          message: "I have a headache",
          conversationId: "other-patient-conv",
        },
      });
      const res = createMockRes();

      detectRedFlags.mockReturnValue({
        isEmergency: false,
        matchedCategories: [],
      });

      // Return null because patientId doesn't match
      Conversation.findOne.mockResolvedValue(null);
      const mockNewConversation = {
        conversationId: "new-conv-id",
        patientId: "user123",
        messages: [],
        save: jest.fn().mockResolvedValue(true),
      };
      // The controller uses `new Conversation()` when conversation is not found
      MockConversation.mockImplementation(() => mockNewConversation);
      Appointment.countDocuments.mockResolvedValue(0);

      generateSymptomGuidance.mockResolvedValue({
        payload: {
          summary: "Test",
          possible_causes: [],
          follow_up_questions: [],
          self_care: [],
          red_flags: [],
          recommended_action: "monitor",
          confidence: "low",
          disclaimer: "Not a diagnosis.",
        },
        message: "Test response",
        degraded: false,
      });

      await symptomCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      // Should create a new conversation (either via new Conversation() or Conversation.create)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          conversation_id: expect.any(String),
        }),
      });
    });
  });

  describe("getLatestConversation", () => {
    test("should return 401 if user is not authenticated", async () => {
      const req = createMockReq({ user: null });
      const res = createMockRes();

      await getLatestConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test("should return latest conversation for authenticated patient", async () => {
      const req = createMockReq();
      const res = createMockRes();

      const mockConversation = {
        conversationId: "test-conv-id",
        messages: [
          { sender: "user", message: "Hello", createdAt: new Date() },
        ],
        updatedAt: new Date(),
      };

      Conversation.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockConversation),
        }),
      });

      await getLatestConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          conversation_id: "test-conv-id",
        }),
      });
    });

    test("should return null data if no conversations exist", async () => {
      const req = createMockReq();
      const res = createMockRes();

      Conversation.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(null),
        }),
      });

      await getLatestConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: null,
      });
    });
  });

  describe("createConversation", () => {
    test("should return 401 if user is not authenticated", async () => {
      const req = createMockReq({ user: null });
      const res = createMockRes();

      await createConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test("should create new conversation for authenticated patient", async () => {
      const req = createMockReq();
      const res = createMockRes();

      Conversation.create.mockResolvedValue({
        conversationId: "new-conv-id",
        messages: [],
      });

      await createConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          conversation_id: "new-conv-id",
        }),
      });
    });
  });

  describe("getConversationById", () => {
    test("should return 401 if user is not authenticated", async () => {
      const req = createMockReq({ user: null, params: { conversationId: "test" } });
      const res = createMockRes();

      await getConversationById(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test("should return 400 for invalid conversation ID", async () => {
      const req = createMockReq({ params: { conversationId: "" } });
      const res = createMockRes();

      await getConversationById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should return conversation for authenticated patient", async () => {
      const req = createMockReq({ params: { conversationId: "test-conv-id" } });
      const res = createMockRes();

      const mockConversation = {
        conversationId: "test-conv-id",
        title: "Test Conversation",
        messages: [
          { sender: "user", message: "Hello", createdAt: new Date() },
        ],
        lastSeverity: "low",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      Conversation.findOne.mockResolvedValue(mockConversation);

      await getConversationById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          conversation_id: "test-conv-id",
        }),
      });
    });

    test("should return 404 for conversation not owned by patient", async () => {
      const req = createMockReq({ params: { conversationId: "other-conv-id" } });
      const res = createMockRes();

      Conversation.findOne.mockResolvedValue(null);

      await getConversationById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Conversation not found",
      });
    });
  });

  describe("getConversations", () => {
    test("should return 401 if user is not authenticated", async () => {
      const req = createMockReq({ user: null });
      const res = createMockRes();

      await getConversations(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test("should return list of conversations for authenticated patient", async () => {
      const req = createMockReq({ query: {} });
      const res = createMockRes();

      const mockConversations = [
        {
          conversationId: "conv1",
          title: "Headache",
          lastSeverity: "low",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      Conversation.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockConversations),
              }),
            }),
          }),
        }),
      });
      Conversation.countDocuments.mockResolvedValue(1);

      await getConversations(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          conversations: expect.any(Array),
          total: 1,
        }),
      });
    });
  });
});
