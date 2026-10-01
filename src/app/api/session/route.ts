import { NextRequest, NextResponse } from "next/server";
import { createSessionCookieValue, getOwnerIdFromCookie, SESSION_COOKIE, sessionCookieOptions } from "@/server/auth/session";

export async function GET(request: NextRequest) {
  try {
    const current = request.cookies.get(SESSION_COOKIE)?.value;
    if (getOwnerIdFromCookie(current)) return NextResponse.json({ ready: true });

    const response = NextResponse.json({ ready: true });
    response.cookies.set(SESSION_COOKIE, createSessionCookieValue(), sessionCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ ready: false }, { status: 503 });
  }
}