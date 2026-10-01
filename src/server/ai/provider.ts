import "server-only";
import { google } from "@ai-sdk/google";

export function getLanguageModel() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("AI_PROVIDER_UNAVAILABLE");
  }

  return google(process.env.GEMINI_MODEL || "gemini-2.5-flash");
}