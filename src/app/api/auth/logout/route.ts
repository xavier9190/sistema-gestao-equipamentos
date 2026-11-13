import { NextResponse } from "next/server";
import { buildSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set(SESSION_COOKIE_NAME, "", buildSessionCookieOptions(0));
  return response;
}
