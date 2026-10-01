import { z } from "zod";
import { db } from "@/server/db";
import { runAgent } from "@/server/ai/agent";
import { emergencyGuidance, emergencyResponseForConversation } from "@/server/ai/tools/emergency-guidance";
import { emptyProviderResults, ToolCallSummarySchema } from "@/server/ai/types";
import { protectedProcedure, router } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { allowChatRequest } from "@/server/services/rate-limit";

const sendMessageInput = z.object({
  conversationId: z.string().min(1).max(32),
  message: z.string().trim().min(1).max(2000),
  locale: z.enum(["en", "ar"]),
});

const sendMessageOutput = z.object({
  message: z.string(),
  providerResults: z.object({ doctors: z.array(z.object({ id: z.string(), name: z.string(), specialty: z.string(), city: z.string(), hospital: z.string().nullable() })), hospitals: z.array(z.object({ id: z.string(), name: z.string(), city: z.string(), address: z.string() })) }),
  toolCalls: z.array(ToolCallSummarySchema),
});

export const chatRouter = router({
  sendMessage: protectedProcedure.input(sendMessageInput).output(sendMessageOutput).mutation(async ({ ctx, input }) => {
    if (!allowChatRequest(ctx.ownerId)) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Please wait before sending another message." });
    }

    try {
      const conversation = await db.conversation.findFirst({
        where: { id: input.conversationId, ownerId: ctx.ownerId },
        select: { id: true },
      });
      if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");

      await db.message.create({
        data: { conversationId: conversation.id, role: "user", content: input.message },
      });
      await db.conversation.update({ where: { id: conversation.id }, data: { locale: input.locale } });

      const storedHistory = await db.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: { role: true, content: true },
      });
      const history = storedHistory.reverse();
      const recentUserMessages = history.filter((message) => message.role === "user").slice(-3).map((message) => message.content).join("\n");
      const emergency = emergencyGuidance(recentUserMessages);
      const fixedResponse = emergencyResponseForConversation(input.locale, input.message, recentUserMessages);
      let result;

      if (fixedResponse) {
        result = {
          message: fixedResponse,
          providerResults: emptyProviderResults(),
          toolCalls: [{ name: "emergencyGuidance" as const, status: emergency.isEmergency ? "success" as const : "completed" as const }],
        };
      } else {
        try {
          result = await runAgent({
            locale: input.locale,
            latestMessage: input.message,
            messages: history.map((message) => ({ role: message.role, content: message.content })),
          });
        } catch {
          result = {
            message: input.locale === "ar"
              ? "خدمة الذكاء الاصطناعي غير متاحة مؤقتاً. يرجى المحاولة مرة أخرى."
              : "The AI service is temporarily unavailable. Please try again.",
            providerResults: emptyProviderResults(),
            toolCalls: [],
          };
        }
      }

      await db.message.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          content: result.message,
          providerResults: result.providerResults,
          toolCalls: result.toolCalls,
        },
      });

      return result;
    } catch (error) {
      if (error instanceof Error && error.message === "CONVERSATION_NOT_FOUND") {
        throw new Error("Conversation unavailable.");
      }
      return {
        message: input.locale === "ar"
          ? "تعذر حفظ الرسالة أو استرجاع البيانات الآن. يرجى المحاولة لاحقاً."
          : "I couldn't save your message or retrieve information right now. Please try again later.",
        providerResults: emptyProviderResults(),
        toolCalls: [],
      };
    }
  }),
});