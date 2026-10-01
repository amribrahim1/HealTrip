import { z } from "zod";
import { DoctorSummarySchema, HospitalSummarySchema } from "@/server/services/providers";

export const ToolCallSummarySchema = z.object({
  name: z.enum(["searchDoctors", "searchHospitals", "emergencyGuidance"]),
  status: z.enum(["success", "empty", "unavailable", "completed"]),
  count: z.number().int().nonnegative().optional(),
});

export const ProviderResultsSchema = z.object({
  doctors: z.array(DoctorSummarySchema),
  hospitals: z.array(HospitalSummarySchema),
});

export type ToolCallSummary = z.infer<typeof ToolCallSummarySchema>;
export type ProviderResults = z.infer<typeof ProviderResultsSchema>;

export const emptyProviderResults = (): ProviderResults => ({ doctors: [], hospitals: [] });