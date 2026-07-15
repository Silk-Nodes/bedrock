// GET /api/icf · live Interchain Foundation treasury holdings (on-chain).

import { getLiveIcf } from "@/lib/icf";

export const revalidate = 300;

export async function GET() {
  const data = await getLiveIcf();
  return Response.json(data, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
  });
}
