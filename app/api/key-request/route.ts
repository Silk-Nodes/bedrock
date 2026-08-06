// POST /api/key-request - public. Records a request for API access.
//
// Unauthenticated by necessity: a caller asking for their first key has nothing
// to authenticate with. It forwards to the indexer using the site's service key
// and passes the client IP for flood control, which the indexer enforces at 3
// per address per day. The endpoint records a row and nothing else; keys are
// minted by hand.

import { NextResponse } from "next/server";
import { ixFetch } from "@/lib/indexer";
import { clientIp, INDEXER_URL } from "@/lib/feedback/voter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  let body: { contact?: string; project?: string; use_case?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const contact = (body.contact ?? "").trim();
  if (contact.length < 5 || contact.length > 200 || !contact.includes("@")) {
    return NextResponse.json({ error: "enter a valid email" }, { status: 400 });
  }

  const ip = clientIp(req);
  try {
    const r = await ixFetch(`${INDEXER_URL}/api/v1/keys/request?ip=${encodeURIComponent(ip)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contact,
        project: (body.project ?? "").trim().slice(0, 200),
        use_case: (body.use_case ?? "").trim().slice(0, 1000),
      }),
      cache: "no-store",
    });
    if (r.status === 204) return new NextResponse(null, { status: 204 });
    const data = await r.json().catch(() => ({ error: "could not record request" }));
    return NextResponse.json(data, { status: r.status });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
