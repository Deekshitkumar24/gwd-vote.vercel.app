import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export interface SessionPayload {
  role: "admin" | "team";
  email?: string;
  eventId?: string;
  teamId?: string;
  teamCode?: string;
  teamName?: string;
  createdAt: number;
}

const SESSION_COOKIE = "gwd_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "gwd_super_secret_session_key_2026_99482";

export function signSession(payload: SessionPayload): string {
  const data = JSON.stringify(payload);
  const base64 = Buffer.from(data).toString("base64url");
  const hmac = crypto.createHmac("sha256", SESSION_SECRET).update(base64).digest("base64url");
  return `${base64}.${hmac}`;
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const [base64, sig] = token.split(".");
    if (!base64 || !sig) return null;
    const expected = crypto.createHmac("sha256", SESSION_SECRET).update(base64).digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
    const json = Buffer.from(base64, "base64url").toString("utf-8");
    const payload = JSON.parse(json) as SessionPayload;
    // 7 days expiration
    if (Date.now() - payload.createdAt > 7 * 86400000) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function getSession(req: NextRequest): SessionPayload | null {
  const cookie = req.cookies.get(SESSION_COOKIE);
  if (!cookie?.value) return null;
  return verifySession(cookie.value);
}

export function attachSessionCookie(res: NextResponse, payload: SessionPayload): NextResponse {
  const token = signSession(payload);
  res.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 86400,
  });
  return res;
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

// In-memory rate limiter for login protection
const attempts = new Map<string, { count: number; firstTime: number }>();

export function checkRateLimit(key: string, maxAttempts = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry) {
    attempts.set(key, { count: 1, firstTime: now });
    return true;
  }
  if (now - entry.firstTime > windowMs) {
    attempts.set(key, { count: 1, firstTime: now });
    return true;
  }
  entry.count += 1;
  return entry.count <= maxAttempts;
}

export function resetRateLimit(key: string): void {
  attempts.delete(key);
}
