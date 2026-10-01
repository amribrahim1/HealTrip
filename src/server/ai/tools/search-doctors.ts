import { tool } from "ai";
import { ProviderSearchInput } from "@/server/services/provider-schemas";

export function createSearchDoctorsTool(execute: (input: { specialty?: string; city?: string }) => Promise<unknown>) {
  return tool({
    description: "Find doctors in the HealTrip demo database. Use only when the user asks for a doctor or provider options.",
    inputSchema: ProviderSearchInput,
    execute,
  });
}