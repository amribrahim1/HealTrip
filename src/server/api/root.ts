import { router } from "@/server/api/trpc";
import { chatRouter } from "@/server/api/routers/chat";
import { conversationsRouter } from "@/server/api/routers/conversations";
import { doctorsRouter } from "@/server/api/routers/doctors";
import { hospitalsRouter } from "@/server/api/routers/hospitals";

export const appRouter = router({
  chat: chatRouter,
  conversations: conversationsRouter,
  doctors: doctorsRouter,
  hospitals: hospitalsRouter,
});

export type AppRouter = typeof appRouter;