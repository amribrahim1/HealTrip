import { describe, expect, it } from "vitest";
import { emergencyGuidance, emergencyResponse, emergencyResponseForConversation } from "@/server/ai/tools/emergency-guidance";

describe("deterministic emergency guidance", () => {
  it("asks clarifying safety questions for chest pain without a listed flag", () => {
    const result = emergencyGuidance("I have chest pain");
    expect(result).toMatchObject({ isEmergency: false, messageKey: "clarify_chest_pain", reasonCodes: [] });
    expect(emergencyResponse("en", result)).toContain("Is it happening now?");
  });

  it.each([
    ["I have sudden chest pain", "SEVERE_CHEST_PAIN"],
    ["I have chest pain and shortness of breath", "CHEST_PAIN_WITH_BREATHING_DIFFICULTY"],
    ["My chest hurts and I fainted", "CHEST_PAIN_WITH_FAINTING"],
    ["Chest pain with severe sweating", "CHEST_PAIN_WITH_SEVERE_SWEATING"],
    ["Chest pain spreading to my jaw", "CHEST_PAIN_RADIATING_TO_ARM_OR_JAW"],
  ] as const)("flags the listed scenario: %s", (message, code) => {
    expect(emergencyGuidance(message)).toMatchObject({ isEmergency: true, reasonCodes: [code] });
  });

  it("does not treat explicitly negated symptoms as red flags", () => {
    expect(emergencyGuidance("I have chest pain but no shortness of breath and no severe sweating").reasonCodes).toEqual([]);
  });

  it("returns localized, fixed urgent guidance", () => {
    const result = emergencyGuidance("I have severe chest pain");
    expect(emergencyResponse("ar", result)).toContain("الطوارئ");
    expect(emergencyResponse("ar", result)).not.toContain("hospital");
  });

  it("catches a red flag reported in the user's clarification reply", () => {
    const response = emergencyResponseForConversation("en", "I have shortness of breath", "I have chest pain\nI have shortness of breath");
    expect(response).toContain("nearest emergency department");
  });

  it("lets the agent continue after a user denies the listed flags", () => {
    const response = emergencyResponseForConversation("en", "No, none of those. Find me a cardiologist.", "I have chest pain\nNo, none of those. Find me a cardiologist.");
    expect(response).toBeNull();
  });
});