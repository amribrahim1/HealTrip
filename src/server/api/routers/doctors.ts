import { ProviderSearchInput, searchDoctors } from "@/server/services/providers";
import { publicProcedure, router } from "@/server/api/trpc";

export const doctorsRouter = router({
  search: publicProcedure.input(ProviderSearchInput).query(async ({ input }) => ({ doctors: await searchDoctors(input) })),
});