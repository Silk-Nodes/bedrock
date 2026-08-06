// GET  /api/feedback   → list (proxied to indexer, with per-voter has_voted)
// POST /api/feedback   → submit a new idea
// The voter cookie is minted here and forwarded to the indexer as ?voter=;
// the client IP is forwarded as ?ip= for rate-limiting (never returned).
import { ixFetch } from "@/lib/indexer";

import { NextResponse } from "next/server";
import { getVoter, setVoter, clientIp, INDEXER_URL } from "@/lib/feedback/voter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const { voterId, isFresh } = getVoter(req);
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "";
  const sort = url.searchParams.get("sort") || "votes";
  try {
    const r = await ixFetch(`${INDEXER_URL}/api/v1/feedback?voter=${encodeURIComponent(voterId)}&status=${encodeURIComponent(status)}&sort=${encodeURIComponent(sort)}`, { cache: "no-store" });
    const data = await r.json();
    const res = NextResponse.json(data, { status: r.status, headers: { "cache-control": "no-store" } });
    if (isFresh) setVoter(res, voterId);
    return res;
  } catch {
    return NextResponse.json({ items: [], error: "unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}

export async function POST(req: Request) {
  const { voterId, isFresh } = getVoter(req);
  const ip = clientIp(req);
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid-json" }, { status: 400 }); }
  try {
    const r = await ixFetch(`${INDEXER_URL}/api/v1/feedback?voter=${encodeURIComponent(voterId)}&ip=${encodeURIComponent(ip)}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store",
    });
    if (r.status === 204) { const res = new NextResponse(null, { status: 204 }); if (isFresh) setVoter(res, voterId); return res; }
    const data = await r.json();
    const res = NextResponse.json(data, { status: r.status, headers: { "cache-control": "no-store" } });
    if (isFresh) setVoter(res, voterId);
    return res;
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
