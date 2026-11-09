// JSON view of /incidents/keplr, for alerting (Hub Watch polls it and posts
// when anything is sent out of a recovery wallet). Same reads, same cache.

import { getRecoveryWatch } from "@/lib/recovery";

export const dynamic = "force-dynamic";

export async function GET() {
  const w = await getRecoveryWatch();
  return Response.json(w, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
