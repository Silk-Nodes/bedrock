// Public proxy for the live flow feed: the indexer is VM-internal (127.0.0.1:8080),
// so the browser can't reach it directly. This route runs server-side and relays
// the labeled flow feed to the client poller. No caching, always fresh.

import { NextRequest, NextResponse } from "next/server";
import { getFlowFeed } from "@/lib/indexer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const minAtom = Number(sp.get("min")) > 0 ? Number(sp.get("min")) : 100;
  const limit = Math.min(200, Number(sp.get("limit")) > 0 ? Number(sp.get("limit")) : 60);
  const exchangeOnly = sp.get("exchange") === "1";
  const entity = sp.get("entity") ?? "";
  const dir = sp.get("dir") ?? "";
  const { flows, live } = await getFlowFeed({ minAtom, limit, exchangeOnly, entity, direction: dir });
  return NextResponse.json({ live, flows }, { headers: { "Cache-Control": "no-store" } });
}
