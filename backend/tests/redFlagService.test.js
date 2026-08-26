/**
 * Unit tests for redFlagService - Deterministic emergency detection
 */

const { detectRedFlags, URGENT_MESSAGE } = require("../services/redFlagService");

describe("Red Flag Service", () => {
  describe("detectRedFlags", () => {
    test("should return isEmergency: false for normal text", () => {
      const result = detectRedFlags("I have a mild headache");
      expect(result.isEmergency).toBe(false);
      expect(result.matchedCategories).toEqual([]);
    });

    test("should detect severe breathing difficulty", () => {
      const result = detectRedFlags("I can't breathe properly");
      expect(result.isEmergency).toBe(true);
      expect(result.matchedCategories).toContain("severe_breathing_difficulty");
    });

    test("should detect chest pain", () => {
      const result = detectRedFlags("I have severe chest pain");
      expect(result.isEmergency).toBe(true);
      expect(result.matchedCategories).toContain("chest_pain");
    });

    test("should detect loss of consciousness", () => {
      const result = detectRedFlags("My friend fainted");
      expect(result.isEmergency).toBe(true);
      expect(result.matchedCategories).toContain("loss_of_consciousness");
    });

    test("should detect severe confusion/neurological symptoms", () => {
      const result = detectRedFlags("I have slurred speech and one side of my face is numb");
      expect(result.isEmergency).toBe(true);
      expect(result.matchedCategories).toContain("severe_confusion_or_neurological");
    });

    test("should detect uncontrolled bleeding", () => {
      const result = detectRedFlags("I'm bleeding and it won't stop");
      expect(result.isEmergency).toBe(true);
      expect(result.matchedCategories).toContain("uncontrolled_bleeding");
    });

    test("should detect severe allergic reaction", () => {
      const result = detectRedFlags("I think I'm having anaphylaxis");
      expect(result.isEmergency).toBe(true);
      expect(result.matchedCategories).toContain("severe_allergic_reaction");
    });

    test("should detect self-harm emergency", () => {
      const result = detectRedFlags("I want to kill myself");
      expect(result.isEmergency).toBe(true);
      expect(result.matchedCategories).toContain("self_harm_emergency");
    });

    test("should detect multiple categories", () => {
      const result = detectRedFlags("I have chest pain and can't breathe");
      expect(result.isEmergency).toBe(true);
      expect(result.matchedCategories).toContain("chest_pain");
      expect(result.matchedCategories).toContain("severe_breathing_difficulty");
    });

    test("should handle empty input", () => {
      const result = detectRedFlags("");
      expect(result.isEmergency).toBe(false);
      expect(result.matchedCategories).toEqual([]);
    });

    test("should handle null input", () => {
      const result = detectRedFlags(null);
      expect(result.isEmergency).toBe(false);
      expect(result.matchedCategories).toEqual([]);
    });

    test("should handle non-string input", () => {
      const result = detectRedFlags(123);
      expect(result.isEmergency).toBe(false);
      expect(result.matchedCategories).toEqual([]);
    });

    test("should be case insensitive", () => {
      const result = detectRedFlags("I HAVE SEVERE CHEST PAIN");
      expect(result.isEmergency).toBe(true);
      expect(result.matchedCategories).toContain("chest_pain");
    });

    test("should handle whitespace variations", () => {
      const result = detectRedFlags("I   can't    breathe");
      expect(result.isEmergency).toBe(true);
    });

    test("should detect stroke symptoms", () => {
      const result = detectRedFlags("I think I'm having a stroke");
      expect(result.isEmergency).toBe(true);
      expect(result.matchedCategories).toContain("severe_confusion_or_neurological");
    });

    test("should detect heart attack symptoms", () => {
      const result = detectRedFlags("I think I'm having a heart attack");
      expect(result.isEmergency).toBe(true);
      expect(result.matchedCategories).toContain("chest_pain");
    });

    test("should detect seizure", () => {
      const result = detectRedFlags("I had a seizure");
      expect(result.isEmergency).toBe(true);
      expect(result.matchedCategories).toContain("severe_confusion_or_neurological");
    });

    test("should detect vomiting blood", () => {
      const result = detectRedFlags("I'm vomiting blood");
      expect(result.isEmergency).toBe(true);
      expect(result.matchedCategories).toContain("uncontrolled_bleeding");
    });

    test("should detect suicidal thoughts", () => {
      const result = detectRedFlags("I don't want to live anymore");
      expect(result.isEmergency).toBe(true);
      expect(result.matchedCategories).toContain("self_harm_emergency");
    });
  });

  describe("URGENT_MESSAGE", () => {
    test("should be a non-empty string", () => {
      expect(typeof URGENT_MESSAGE).toBe("string");
      expect(URGENT_MESSAGE.length).toBeGreaterThan(0);
    });

    test("should contain emergency guidance", () => {
      expect(URGENT_MESSAGE.toLowerCase()).toContain("emergency");
    });

    test("should not contain treatment instructions", () => {
      // Should not prescribe or give specific treatment
      expect(URGENT_MESSAGE.toLowerCase()).not.toContain("take");
      expect(URGENT_MESSAGE.toLowerCase()).not.toContain("dose");
    });
  });
});
