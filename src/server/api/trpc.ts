import { initTRPC, TRPCError } from "@trpc/server";

export type TRPCContext = { ownerId: string | null };

const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.ownerId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, ownerId: ctx.ownerId } });
});