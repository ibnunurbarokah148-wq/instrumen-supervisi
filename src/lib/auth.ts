import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const COOKIE_NAME = "sensei_session";

export interface SessionPayload {
  userId: string;
  email: string;
  nama: string;
  role: "admin" | "guru";
}

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || "sensei-ai-super-secret-jwt-key-2026-v2";
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.userId === "string" &&
      typeof payload.email === "string" &&
      typeof payload.nama === "string" &&
      (payload.role === "admin" || payload.role === "guru")
    ) {
      return {
        userId: payload.userId,
        email: payload.email,
        nama: payload.nama,
        role: payload.role,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<
  { session: SessionPayload; error?: undefined } | { session?: undefined; error: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return {
      error: NextResponse.json(
        { error: "Sesi berakhir atau belum login. Silakan login kembali." },
        { status: 401 }
      ),
    };
  }
  if (session.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Akses ditolak (403): Endpoint ini khusus untuk Admin." },
        { status: 403 }
      ),
    };
  }
  return { session };
}

export async function requireGuru(): Promise<
  { session: SessionPayload; error?: undefined } | { session?: undefined; error: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return {
      error: NextResponse.json(
        { error: "Sesi berakhir atau belum login. Silakan login kembali." },
        { status: 401 }
      ),
    };
  }
  if (session.role !== "guru") {
    return {
      error: NextResponse.json(
        { error: "Akses ditolak (403): Endpoint ini khusus untuk Guru." },
        { status: 403 }
      ),
    };
  }
  return { session };
}

export async function requireAuth(): Promise<
  { session: SessionPayload; error?: undefined } | { session?: undefined; error: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return {
      error: NextResponse.json(
        { error: "Sesi berakhir atau belum login. Silakan login kembali." },
        { status: 401 }
      ),
    };
  }
  return { session };
}

// Simple in-memory rate limiter for Login and AI endpoints (PRD Section 14)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 15,
  windowMs: number = 60_000
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }
  entry.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}
