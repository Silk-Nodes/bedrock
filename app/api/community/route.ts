// GET /api/community · live Cosmos Hub community pool balance (on-chain).

import { getLiveCommunityPool } from "@/lib/community";

export const revalidate = 300;

export async function GET() {
  const data = await getLiveCommunityPool();
  return Response.json(data, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
  });
}
