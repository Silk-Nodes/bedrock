// POST /api/feedback/vote → toggle a vote. Body: { request_id }.
import { NextResponse } from "next/server";
import { getVoter, setVoter, clientIp, INDEXER_URL } from "@/lib/feedback/voter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  const { voterId, isFresh } = getVoter(req);
  const ip = clientIp(req);
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid-json" }, { status: 400 }); }
  try {
    const r = await fetch(`${INDEXER_URL}/api/v1/feedback/vote?voter=${encodeURIComponent(voterId)}&ip=${encodeURIComponent(ip)}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store",
    });
    const data = await r.json();
    const res = NextResponse.json(data, { status: r.status, headers: { "cache-control": "no-store" } });
    if (isFresh) setVoter(res, voterId);
    return res;
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
