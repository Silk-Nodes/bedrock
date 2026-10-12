// Freshness of Bedrock's data for the client-side "Live data delayed" notice.
// The browser polls this; it relays only the indexer's state and lag (public
// chain facts), never the service key. Always fresh.

import { NextResponse } from "next/server";
import { getIndexerStatus } from "@/lib/indexerStatus";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const status = await getIndexerStatus();
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}
