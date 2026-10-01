import { tool } from "ai";
import { ProviderSearchInput } from "@/server/services/providers";

export function createSearchHospitalsTool(execute: (input: { specialty?: string; city?: string }) => Promise<unknown>) {
  return tool({
    description: "Find hospitals in the HealTrip demo database. Use only when the user asks for hospital or provider options.",
    inputSchema: ProviderSearchInput,
    execute,
  });
}