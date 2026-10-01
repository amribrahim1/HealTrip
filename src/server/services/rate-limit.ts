import "server-only";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;
const buckets = new Map<string, { startedAt: number; count: number }>();

export function allowChatRequest(ownerId: string, now = Date.now()): boolean {
  const current = buckets.get(ownerId);
  if (!current || now - current.startedAt >= WINDOW_MS || now < current.startedAt) {
    buckets.set(ownerId, { startedAt: now, count: 1 });
    if (buckets.size > 10_000) {
      for (const [key, bucket] of buckets) {
        if (now - bucket.startedAt >= WINDOW_MS || now < bucket.startedAt) buckets.delete(key);
      }
    }
    return true;
  }

  if (current.count >= MAX_REQUESTS) return false;
  current.count += 1;
  return true;
}