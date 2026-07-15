// Live Cosmos Hub community pool · server-side.
// The community pool is a chain module account; its ATOM balance is queryable
// directly. Falls back to a static value if the endpoint fails.

import { getLiveAtomPrice } from "@/lib/price";

const HOSTS = ["https://cosmos-rest.publicnode.com", "https://rest.cosmos.directory/cosmoshub"];

export type LiveCommunityPool = {
  atom: number;
  usd: number;
  live: boolean;
  source: string;
  fetched_at: string;
};

export async function getLiveCommunityPool(): Promise<LiveCommunityPool> {
  const px = (await getLiveAtomPrice()).usd;
  for (const host of HOSTS) {
    try {
      const res = await fetch(`${host}/cosmos/distribution/v1beta1/community_pool`, {
        next: { revalidate: 300 },
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { pool?: { denom: string; amount: string }[] };
      const uatom = json.pool?.find((c) => c.denom === "uatom")?.amount;
      if (!uatom) continue;
      const atom = Number(uatom) / 1e6;
      if (!Number.isFinite(atom) || atom <= 0) continue;
      return {
        atom,
        usd: Math.round(atom * px),
        live: true,
        source: new URL(host).host,
        fetched_at: new Date().toISOString(),
      };
    } catch {
      // next host
    }
  }
  const fallback = 10_392_632;
  return { atom: fallback, usd: Math.round(fallback * px), live: false, source: "snapshot", fetched_at: "2026-05-31" };
}
