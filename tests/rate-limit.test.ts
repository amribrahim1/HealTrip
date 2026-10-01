import { describe, expect, it } from "vitest";
import { allowChatRequest } from "@/server/services/rate-limit";

describe("chat request limit", () => {
  it("allows ten messages per owner in a minute and resets after the window", () => {
    const ownerId = `rate-limit-test-${crypto.randomUUID()}`;
    for (let index = 0; index < 10; index += 1) {
      expect(allowChatRequest(ownerId, 1_000)).toBe(true);
    }
    expect(allowChatRequest(ownerId, 1_000)).toBe(false);
    expect(allowChatRequest(ownerId, 61_000)).toBe(true);
  });

  it("tracks owners independently", () => {
    const firstOwner = `rate-limit-first-${crypto.randomUUID()}`;
    const secondOwner = `rate-limit-second-${crypto.randomUUID()}`;
    for (let index = 0; index < 10; index += 1) allowChatRequest(firstOwner, 10_000);

    expect(allowChatRequest(firstOwner, 10_000)).toBe(false);
    expect(allowChatRequest(secondOwner, 10_000)).toBe(true);
  });
});