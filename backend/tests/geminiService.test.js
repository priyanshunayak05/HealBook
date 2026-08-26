/**
 * Unit tests for geminiService - Gemini API integration
 */

const {
  extractJsonObject,
  normalizeAssistantPayload,
  composePatientMessage,
  buildFallbackPayload,
} = require("../services/geminiService");

describe("Gemini Service", () => {
  describe("extractJsonObject", () => {
    test("should extract valid JSON from plain text", () => {
      const input = '{"summary": "test", "possible_causes": []}';
      const result = extractJsonObject(input);
      expect(result).toEqual({ summary: "test", possible_causes: [] });
    });

    test("should extract JSON from markdown code fence", () => {
      const input = '```json\n{"summary": "test"}\n```';
      const result = extractJsonObject(input);
      expect(result).toEqual({ summary: "test" });
    });

    test("should extract JSON with leading/trailing text", () => {
      const input = 'Here is the result: {"summary": "test"} and more text';
      const result = extractJsonObject(input);
      expect(result).toEqual({ summary: "test" });
    });

    test("should return null for invalid JSON", () => {
      const result = extractJsonObject("not json at all");
      expect(result).toBeNull();
    });

    test("should return null for empty input", () => {
      const result = extractJsonObject("");
      expect(result).toBeNull();
    });

    test("should return null for null input", () => {
      const result = extractJsonObject(null);
      expect(result).toBeNull();
    });

    test("should handle nested JSON objects", () => {
      const input = '{"summary": "test", "data": {"nested": true}}';
      const result = extractJsonObject(input);
      expect(result).toEqual({ summary: "test", data: { nested: true } });
    });

    test("should handle JSON with arrays", () => {
      const input = '{"summary": "test", "items": ["a", "b", "c"]}';
      const result = extractJsonObject(input);
      expect(result).toEqual({ summary: "test", items: ["a", "b", "c"] });
    });
  });

  describe("normalizeAssistantPayload", () => {
    test("should normalize valid payload", () => {
      const input = {
        summary: "Patient has headache",
        possible_causes: ["tension", "dehydration"],
        follow_up_questions: ["How long?"],
        self_care: ["Rest"],
        red_flags: ["severe pain"],
        recommended_action: "monitor",
        confidence: "medium",
      };
      const result = normalizeAssistantPayload(input);
      expect(result.summary).toBe("Patient has headache");
      expect(result.possible_causes).toEqual(["tension", "dehydration"]);
      expect(result.recommended_action).toBe("monitor");
      expect(result.confidence).toBe("medium");
    });

    test("should default invalid recommended_action to monitor", () => {
      const input = { recommended_action: "invalid_action" };
      const result = normalizeAssistantPayload(input);
      expect(result.recommended_action).toBe("monitor");
    });

    test("should default invalid confidence to low", () => {
      const input = { confidence: "high" };
      const result = normalizeAssistantPayload(input);
      expect(result.confidence).toBe("low");
    });

    test("should limit follow_up_questions to 4", () => {
      const input = {
        follow_up_questions: ["q1", "q2", "q3", "q4", "q5", "q6"],
      };
      const result = normalizeAssistantPayload(input);
      expect(result.follow_up_questions).toHaveLength(4);
    });

    test("should limit array fields to max items", () => {
      const input = {
        possible_causes: Array(10).fill("cause"),
        self_care: Array(10).fill("care"),
        red_flags: Array(10).fill("flag"),
      };
      const result = normalizeAssistantPayload(input);
      expect(result.possible_causes.length).toBeLessThanOrEqual(6);
      expect(result.self_care.length).toBeLessThanOrEqual(6);
      expect(result.red_flags.length).toBeLessThanOrEqual(6);
    });

    test("should handle missing fields gracefully", () => {
      const result = normalizeAssistantPayload({});
      expect(result.summary).toBe("");
      expect(result.possible_causes).toEqual([]);
      expect(result.follow_up_questions).toEqual([]);
      expect(result.self_care).toEqual([]);
      expect(result.red_flags).toEqual([]);
      expect(result.recommended_action).toBe("monitor");
      expect(result.confidence).toBe("low");
    });

    test("should always include disclaimer", () => {
      const result = normalizeAssistantPayload({});
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer.length).toBeGreaterThan(0);
    });

    test("should filter out null/undefined array items", () => {
      const input = {
        possible_causes: ["cause1", null, "cause2", undefined],
      };
      const result = normalizeAssistantPayload(input);
      expect(result.possible_causes).toEqual(["cause1", "cause2"]);
    });

    test("should trim whitespace from strings", () => {
      const input = {
        summary: "  test summary  ",
        possible_causes: ["  cause1  "],
      };
      const result = normalizeAssistantPayload(input);
      expect(result.summary).toBe("test summary");
      expect(result.possible_causes[0]).toBe("cause1");
    });
  });

  describe("composePatientMessage", () => {
    test("should compose message with summary", () => {
      const payload = {
        summary: "I understand you have a headache.",
        possible_causes: [],
        follow_up_questions: [],
        self_care: [],
        red_flags: [],
        recommended_action: "monitor",
        disclaimer: "Not a diagnosis.",
      };
      const result = composePatientMessage(payload);
      expect(result).toContain("I understand you have a headache.");
      expect(result).toContain("Not a diagnosis.");
    });

    test("should include follow-up questions as bullet points", () => {
      const payload = {
        summary: "Test",
        follow_up_questions: ["How long?", "How severe?"],
        possible_causes: [],
        self_care: [],
        red_flags: [],
        recommended_action: "monitor",
        disclaimer: "Not a diagnosis.",
      };
      const result = composePatientMessage(payload);
      expect(result).toContain("• How long?");
      expect(result).toContain("• How severe?");
    });

    test("should include self-care steps", () => {
      const payload = {
        summary: "Test",
        follow_up_questions: [],
        possible_causes: [],
        self_care: ["Rest", "Drink water"],
        red_flags: [],
        recommended_action: "monitor",
        disclaimer: "Not a diagnosis.",
      };
      const result = composePatientMessage(payload);
      expect(result).toContain("• Rest");
      expect(result).toContain("• Drink water");
    });

    test("should include red flags warning", () => {
      const payload = {
        summary: "Test",
        follow_up_questions: [],
        possible_causes: [],
        self_care: [],
        red_flags: ["severe pain", "difficulty breathing"],
        recommended_action: "monitor",
        disclaimer: "Not a diagnosis.",
      };
      const result = composePatientMessage(payload);
      expect(result).toContain("Seek medical attention");
      expect(result).toContain("severe pain");
    });

    test("should include appointment recommendation for book_appointment", () => {
      const payload = {
        summary: "Test",
        follow_up_questions: [],
        possible_causes: [],
        self_care: [],
        red_flags: [],
        recommended_action: "book_appointment",
        disclaimer: "Not a diagnosis.",
      };
      const result = composePatientMessage(payload);
      expect(result).toContain("book an appointment");
    });

    test("should include possible causes when no follow-up questions", () => {
      const payload = {
        summary: "Test",
        follow_up_questions: [],
        possible_causes: ["tension headache", "migraine"],
        self_care: [],
        red_flags: [],
        recommended_action: "monitor",
        disclaimer: "Not a diagnosis.",
      };
      const result = composePatientMessage(payload);
      expect(result).toContain("tension headache");
      expect(result).toContain("migraine");
    });
  });

  describe("buildFallbackPayload", () => {
    test("should return valid fallback payload", () => {
      const result = buildFallbackPayload("test_reason");
      expect(result.summary).toBeDefined();
      expect(result.possible_causes).toEqual([]);
      expect(result.follow_up_questions).toEqual([]);
      expect(result.self_care.length).toBeGreaterThan(0);
      expect(result.red_flags.length).toBeGreaterThan(0);
      expect(result.recommended_action).toBe("book_appointment");
      expect(result.confidence).toBe("low");
      expect(result.disclaimer).toBeDefined();
    });

    test("should include safe self-care guidance", () => {
      const result = buildFallbackPayload("test");
      expect(result.self_care.some((c) => c.toLowerCase().includes("rest"))).toBe(true);
    });

    test("should include emergency red flags", () => {
      const result = buildFallbackPayload("test");
      expect(result.red_flags.some((f) => f.toLowerCase().includes("breathing"))).toBe(true);
      expect(result.red_flags.some((f) => f.toLowerCase().includes("chest"))).toBe(true);
    });
  });
});
