// GET /api/burn · live cumulative ATOM burn (on-chain address balance).
// Used by client components (e.g. the live ticker) that want the live total.

import { getLiveBurn } from "@/lib/burn";

export const revalidate = 300; // seconds

export async function GET() {
  const data = await getLiveBurn();
  return Response.json(data, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
  });
}
