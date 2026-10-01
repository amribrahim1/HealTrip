import { afterEach, describe, expect, it } from "vitest";
import { createSessionCookieValue, getOwnerIdFromCookie } from "@/server/auth/session";

const previousSecret = process.env.SESSION_SECRET;

describe("anonymous session cookie ownership", () => {
  afterEach(() => {
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
  });

  it("derives a stable opaque owner ID from a signed cookie", () => {
    process.env.SESSION_SECRET = "test-session-secret-with-at-least-32-characters";
    const cookie = createSessionCookieValue();

    expect(getOwnerIdFromCookie(cookie)).toMatch(/^[a-f0-9]{64}$/);
    expect(getOwnerIdFromCookie(cookie)).toBe(getOwnerIdFromCookie(cookie));
  });

  it("rejects tampered, malformed, and missing cookies", () => {
    process.env.SESSION_SECRET = "test-session-secret-with-at-least-32-characters";
    const cookie = createSessionCookieValue();
    const tampered = `${cookie.slice(0, -1)}${cookie.endsWith("a") ? "b" : "a"}`;

    expect(getOwnerIdFromCookie(tampered)).toBeNull();
    expect(getOwnerIdFromCookie("not-a-cookie")).toBeNull();
    expect(getOwnerIdFromCookie(undefined)).toBeNull();
  });

  it("refuses to operate without a sufficiently long session secret", () => {
    process.env.SESSION_SECRET = "short";
    expect(() => createSessionCookieValue()).toThrow("SESSION_SECRET must contain at least 32 characters");
  });
});