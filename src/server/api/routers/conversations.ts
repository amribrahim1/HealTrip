import { z } from "zod";
import { db } from "@/server/db";
import { protectedProcedure, router } from "@/server/api/trpc";

const conversationIdInput = z.object({ conversationId: z.string().min(1).max(32) });

export const conversationsRouter = router({
  create: protectedProcedure.input(z.object({ locale: z.enum(["en", "ar"]) })).mutation(async ({ ctx, input }) => {
    const conversation = await db.conversation.create({ data: { ownerId: ctx.ownerId, locale: input.locale } });
    return { conversationId: conversation.id };
  }),
  list: protectedProcedure.query(async ({ ctx }) => {
    const conversations = await db.conversation.findMany({
      where: { ownerId: ctx.ownerId },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, locale: true, updatedAt: true },
    });
    return conversations.map((conversation) => ({ ...conversation, updatedAt: conversation.updatedAt.toISOString() }));
  }),
  get: protectedProcedure.input(conversationIdInput).query(async ({ ctx, input }) => {
    const conversation = await db.conversation.findFirst({
      where: { id: input.conversationId, ownerId: ctx.ownerId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 40 } },
    });
    if (!conversation) return null;
    return {
      conversationId: conversation.id,
      locale: conversation.locale === "ar" ? "ar" as const : "en" as const,
      messages: conversation.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        providerResults: message.providerResults,
        toolCalls: message.toolCalls,
      })),
    };
  }),
  delete: protectedProcedure.input(conversationIdInput).mutation(async ({ ctx, input }) => {
    const result = await db.conversation.deleteMany({ where: { id: input.conversationId, ownerId: ctx.ownerId } });
    return { deleted: result.count > 0 };
  }),
});