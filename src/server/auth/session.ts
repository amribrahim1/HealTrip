import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "healtrip_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 400;

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }
  return secret;
}

function signature(token: string): string {
  return createHmac("sha256", getSessionSecret()).update(token).digest("base64url");
}

export function createSessionCookieValue(): string {
  const token = randomBytes(32).toString("base64url");
  return `${token}.${signature(token)}`;
}

export function getOwnerIdFromCookie(value: string | undefined): string | null {
  if (!value) return null;
  const separator = value.lastIndexOf(".");
  if (separator < 1) return null;

  const token = value.slice(0, separator);
  const suppliedSignature = Buffer.from(value.slice(separator + 1));
  const expectedSignature = Buffer.from(signature(token));
  if (suppliedSignature.length !== expectedSignature.length || !timingSafeEqual(suppliedSignature, expectedSignature)) {
    return null;
  }

  return createHash("sha256").update(token).digest("hex");
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}