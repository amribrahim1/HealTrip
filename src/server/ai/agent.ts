import "server-only";
import { generateText, stepCountIs } from "ai";
import { z } from "zod";
import { getSystemPrompt } from "@/server/ai/prompts";
import { getLanguageModel } from "@/server/ai/provider";
import { emptyProviderResults, type ProviderResults, type ToolCallSummary } from "@/server/ai/types";
import { createSearchDoctorsTool } from "@/server/ai/tools/search-doctors";
import { createSearchHospitalsTool } from "@/server/ai/tools/search-hospitals";
import { searchDoctors, searchHospitals } from "@/server/services/providers";
import { findProviderCity, type ProviderSearchInput } from "@/server/services/provider-schemas";

const MAX_TOOL_ITERATIONS = 5;
const ModelMessageSchema = z.array(z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(2000),
})).max(12);

function findExplicitDirectoryRequest(message: string): { doctors: boolean; hospitals: boolean; params: ProviderSearchInput } | null {
  const doctors = /\b(?:doctors?|physicians?|cardiologists?|cardiology|neurologists?|neurology|orthopedists?|dermatologists?)\b|أطباء|طبيب|طبيبة|دكتور|دكتورة|طبيب(?:ة)? قلب/i.test(message);
  const hospitals = /\b(?:hospitals?|clinics?)\b|مستشفيات|مستشفى|عيادات|عيادة/i.test(message);
  if (!doctors && !hospitals) return null;

  const specialties: Array<[string, RegExp]> = [
    ["Cardiology", /\b(?:cardiologist|cardiology|cardio)\b|قلب/i],
    ["Neurology", /\b(?:neurologist|neurology)\b|أعصاب/i],
    ["Orthopedics", /\b(?:orthopedist|orthopedics)\b|عظام/i],
    ["Dermatology", /\b(?:dermatologist|dermatology)\b|جلدية/i],
    ["Gastroenterology", /\b(?:gastroenterologist|gastroenterology)\b|جهاز هضمي/i],
  ];
  const specialty = specialties.find(([, pattern]) => pattern.test(message))?.[0];

  return {
    doctors,
    hospitals,
    params: { city: findProviderCity(message), specialty },
  };
}

function getProviderSearchResponse(locale: "en" | "ar", providerResults: ProviderResults, toolCalls: ToolCallSummary[]) {
  const hasResults = providerResults.doctors.length > 0 || providerResults.hospitals.length > 0;
  return {
    message: hasResults
      ? locale === "ar"
        ? "هذه خيارات من دليل HealTrip التجريبي. البيانات تجريبية وليست تأكيداً للتوفر أو توصية طبية."
        : "These options are from the HealTrip demo directory. They are fictional and are not confirmation of availability or a medical recommendation."
      : locale === "ar"
        ? "لم أجد خيارات مطابقة في قاعدة بيانات HealTrip التجريبية الحالية."
        : "I couldn't find matching options in the current HealTrip demo database.",
    providerResults,
    toolCalls,
  };
}

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

  const explicitDirectoryRequest = findExplicitDirectoryRequest(input.latestMessage);
  if (explicitDirectoryRequest) {
    await Promise.all([
      explicitDirectoryRequest.doctors ? search("doctors", explicitDirectoryRequest.params) : Promise.resolve(),
      explicitDirectoryRequest.hospitals ? search("hospitals", explicitDirectoryRequest.params) : Promise.resolve(),
    ]);

    if (providerUnavailable) {
      return {
        message: input.locale === "ar"
          ? "تعذر استرجاع معلومات مقدمي الرعاية الآن. يرجى المحاولة لاحقاً."
          : "I couldn't retrieve provider information right now. Please try again later.",
        providerResults: emptyProviderResults(),
        toolCalls,
      };
    }

    return getProviderSearchResponse(input.locale, providerResults, toolCalls);
  }

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
    return getProviderSearchResponse(input.locale, providerResults, toolCalls);
  }

  return { message: result.text, providerResults, toolCalls };
}