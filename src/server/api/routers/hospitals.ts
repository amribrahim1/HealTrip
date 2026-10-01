import { ProviderSearchInput, searchHospitals } from "@/server/services/providers";
import { publicProcedure, router } from "@/server/api/trpc";

export const hospitalsRouter = router({
  search: publicProcedure.input(ProviderSearchInput).query(async ({ input }) => ({ hospitals: await searchHospitals(input) })),
});