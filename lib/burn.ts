// Live ATOM burn · server-side.
// Cumulative burn = the on-chain balance of the burn address (ATOM sent there
// never leaves). One public REST call gets the live total, no indexer needed.
// Falls back to the static snapshot (data/atom-burn.ts) if the endpoint fails.

import { BURN_ADDRESS, BURN_SUMMARY } from "@/data/atom-burn";
import { getLiveAtomPrice } from "@/lib/price";

const ENDPOINTS = [
  `https://cosmos-rest.publicnode.com/cosmos/bank/v1beta1/balances/${BURN_ADDRESS}`,
  `https://rest.cosmos.directory/cosmoshub/cosmos/bank/v1beta1/balances/${BURN_ADDRESS}`,
];

export type LiveBurn = {
  total_atom: number;
  total_usd: number;
  live: boolean;       // true = on-chain read; false = snapshot fallback
  source: string;
  fetched_at: string;
};

export async function getLiveBurn(): Promise<LiveBurn> {
  const px = (await getLiveAtomPrice()).usd;
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, { next: { revalidate: 300 } }); // cache 5 min
      if (!res.ok) continue;
      const json = (await res.json()) as { balances?: { denom: string; amount: string }[] };
      const bal = json.balances?.find((b) => b.denom === "uatom");
      if (!bal) continue;
      const total_atom = Number(bal.amount) / 1_000_000;
      if (!Number.isFinite(total_atom) || total_atom <= 0) continue;
      return {
        total_atom,
        total_usd: Math.round(total_atom * px),
        live: true,
        source: new URL(url).host,
        fetched_at: new Date().toISOString(),
      };
    } catch {
      // try next endpoint
    }
  }
  // fallback: static snapshot
  return {
    total_atom: BURN_SUMMARY.total_atom,
    total_usd: BURN_SUMMARY.total_usd,
    live: false,
    source: "snapshot",
    fetched_at: BURN_SUMMARY.generated_at,
  };
}
