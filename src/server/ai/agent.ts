import "server-only";
import { generateText, stepCountIs } from "ai";
import { z } from "zod";
import { getSystemPrompt } from "@/server/ai/prompts";
import { getLanguageModel } from "@/server/ai/provider";
import { emptyProviderResults, type ProviderResults, type ToolCallSummary } from "@/server/ai/types";
import { createEmergencyGuidanceTool } from "@/server/ai/tools/emergency-tool";
import { createSearchDoctorsTool } from "@/server/ai/tools/search-doctors";
import { createSearchHospitalsTool } from "@/server/ai/tools/search-hospitals";
import { emergencyGuidance } from "@/server/ai/tools/emergency-guidance";
import { searchDoctors, searchHospitals, type ProviderSearchInput } from "@/server/services/providers";

const MAX_TOOL_ITERATIONS = 5;
const ModelMessageSchema = z.array(z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(2000),
})).max(12);

export async function runAgent(input: {
  locale: "en" | "ar";
  latestMessage: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}) {
  const messages = ModelMessageSchema.parse(input.messages);
  const providerResults: ProviderResults = emptyProviderResults();
  const toolCalls: ToolCallSummary[] = [];
  let providerUnavailable = false;
  const search = async (kind: "doctors" | "hospitals", params: ProviderSearchInput) => {
    try {
      if (kind === "doctors") {
        const results = await searchDoctors(params);
        providerResults.doctors.push(...results);
        toolCalls.push({ name: "searchDoctors", status: results.length ? "success" : "empty", count: results.length });
        return { found: results.length > 0, doctors: results };
      }

      const results = await searchHospitals(params);
      providerResults.hospitals.push(...results);
      toolCalls.push({ name: "searchHospitals", status: results.length ? "success" : "empty", count: results.length });
      return { found: results.length > 0, hospitals: results };
    } catch {
      providerUnavailable = true;
      toolCalls.push({ name: kind === "doctors" ? "searchDoctors" : "searchHospitals", status: "unavailable" });
      return { found: false, unavailable: true, [kind]: [] };
    }
  };

  const latestEmergencyResult = emergencyGuidance(input.latestMessage);
  const result = await generateText({
    model: getLanguageModel(),
    system: getSystemPrompt(input.locale),
    messages,
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(25_000),
    stopWhen: stepCountIs(MAX_TOOL_ITERATIONS),
    tools: {
      searchDoctors: createSearchDoctorsTool((params) => search("doctors", params)),
      searchHospitals: createSearchHospitalsTool((params) => search("hospitals", params)),
      emergencyGuidance: createEmergencyGuidanceTool(async () => ({
        isEmergency: latestEmergencyResult.isEmergency,
        messageKey: latestEmergencyResult.messageKey,
        reasonCodes: latestEmergencyResult.reasonCodes,
      })),
    },
  });

  if (providerUnavailable) {
    return {
      message: input.locale === "ar"
        ? "تعذر استرجاع معلومات مقدمي الرعاية الآن. يرجى المحاولة لاحقاً."
        : "I couldn't retrieve provider information right now. Please try again later.",
      providerResults: emptyProviderResults(),
      toolCalls,
    };
  }

  if (toolCalls.length > 0) {
    const hasResults = providerResults.doctors.length > 0 || providerResults.hospitals.length > 0;
    return {
      message: hasResults
        ? input.locale === "ar"
          ? "هذه الخيارات مأخوذة من قاعدة بيانات HealTrip التجريبية. البيانات المعروضة تجريبية وليست توصية طبية."
          : "These options are from the HealTrip demo database. The records are fictional and are not a medical recommendation."
        : input.locale === "ar"
          ? "لم أجد خيارات مطابقة في قاعدة بيانات HealTrip التجريبية الحالية."
          : "I couldn't find matching options in the current HealTrip demo database.",
      providerResults,
      toolCalls,
    };
  }

  return { message: result.text, providerResults, toolCalls };
}