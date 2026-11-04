import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE_NAME = "kardiary_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

interface AuthConfig {
  password: string;
  secret: string;
}

function getConfig(): AuthConfig | null {
  const password = process.env.KARDIARY_PASSWORD;
  const secret = process.env.KARDIARY_SESSION_SECRET;
  if (!password || !secret) return null;
  return { password, secret };
}

export function isAuthConfigured(): boolean {
  return getConfig() !== null;
}

function safeEqual(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

export function verifyPassword(candidate: string): boolean {
  const config = getConfig();
  if (!config) return false;
  return safeEqual(candidate, config.password);
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(`kardiary:${payload}`).digest("base64url");
}

export interface SessionCookie {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    secure: boolean;
    sameSite: "lax";
    path: "/";
    maxAge: number;
  };
}

export function createSessionCookie(): SessionCookie {
  const config = getConfig();
  if (!config) throw new Error("KARDIARY_PASSWORD and KARDIARY_SESSION_SECRET must be configured");
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = String(expiresAt);
  return {
    name: SESSION_COOKIE_NAME,
    value: `${payload}.${signPayload(payload, config.secret)}`,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    },
  };
}

export function verifySessionValue(value: string | undefined): boolean {
  const config = getConfig();
  if (!config || !value) return false;
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return false;
  const payload = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  return safeEqual(signature, signPayload(payload, config.secret));
}

export function isAuthenticated(request: NextRequest): boolean {
  return verifySessionValue(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}
