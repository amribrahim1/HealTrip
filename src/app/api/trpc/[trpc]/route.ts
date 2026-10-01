import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/api/root";
import { getOwnerIdFromCookie, SESSION_COOKIE } from "@/server/auth/session";

const handler = (req: Request) => fetchRequestHandler({
  endpoint: "/api/trpc",
  req,
  router: appRouter,
  createContext: () => {
    const cookie = req.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
    const value = cookie?.slice(SESSION_COOKIE.length + 1);
    let ownerId: string | null = null;
    try {
      ownerId = getOwnerIdFromCookie(value ? decodeURIComponent(value) : undefined);
    } catch {
      ownerId = null;
    }
    return { ownerId };
  },
});

export { handler as GET, handler as POST };