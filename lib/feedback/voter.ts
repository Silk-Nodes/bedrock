import { randomUUID } from "node:crypto";
import type { NextResponse } from "next/server";

// Opaque one-year cookie identifying a browser for vote de-duplication. Never
// displayed; the indexer only sees it as ?voter=. Cleared = revote, acceptable
// for a signal board.
const COOKIE = "bdfb_v";
const MAX_AGE = 60 * 60 * 24 * 365;

export function getVoter(req: Request): { voterId: string; isFresh: boolean } {
  const existing = (req.headers.get("cookie") || "").match(/(?:^|; )bdfb_v=([^;]+)/)?.[1];
  if (existing) return { voterId: existing, isFresh: false };
  return { voterId: randomUUID(), isFresh: true };
}

export function setVoter<T>(res: NextResponse<T>, voterId: string): NextResponse<T> {
  res.cookies.set({
    name: COOKIE, value: voterId, path: "/", maxAge: MAX_AGE,
    sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production",
  });
  return res;
}

// Best-effort client IP. Behind Cloudflare → the origin sees CF headers.
export function clientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "";
}

export const INDEXER_URL = process.env.BEDROCK_INDEXER_URL || "http://127.0.0.1:8080";
