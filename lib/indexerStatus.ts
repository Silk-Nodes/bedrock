// Freshness of Bedrock's own data, for the "Live data delayed" notice.
//
// Pages are cached (ISR plus Cloudflare), so when the indexer stops, they keep
// serving their last numbers with nothing to say they are old, or they drop a
// section whose window was never cached. This asks the indexer directly, with a
// short timeout, and reports one of three states:
//   live     indexer answering and within LAG_DELAYED blocks of the chain tip
//   delayed  answering but behind (catching up after a restart or outage)
//   down     not answering at all
// Server-side only: it uses the site's service key via ixFetch.

import { ixFetch } from "@/lib/indexer";

const INDEXER_URL = process.env.BEDROCK_INDEXER_URL || "http://127.0.0.1:8080";

// ~6 s Hub blocks: 50 blocks is about five minutes behind.
const LAG_DELAYED = 50;
const BLOCK_SECONDS = 6;

export type IndexerState = "live" | "delayed" | "down";
export type IndexerStatus = {
  state: IndexerState;
  lagBlocks: number | null;
  lagMinutes: number | null;
  // Last time this server process saw the indexer live. Null after a site
  // restart until the indexer answers again.
  lastLiveAt: string | null;
  checkedAt: string;
};

let lastLiveAt: string | null = null;

export async function getIndexerStatus(): Promise<IndexerStatus> {
  const checkedAt = new Date().toISOString();
  try {
    const res = await ixFetch(`${INDEXER_URL}/api/v1/status`, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (!res.ok) return { state: "down", lagBlocks: null, lagMinutes: null, lastLiveAt, checkedAt };
    const j = (await res.json()) as { tip_follower?: { lag_blocks?: number } };
    const lag = j.tip_follower?.lag_blocks;
    if (typeof lag !== "number") return { state: "down", lagBlocks: null, lagMinutes: null, lastLiveAt, checkedAt };
    const state: IndexerState = lag > LAG_DELAYED ? "delayed" : "live";
    if (state === "live") lastLiveAt = checkedAt;
    return { state, lagBlocks: lag, lagMinutes: Math.round((lag * BLOCK_SECONDS) / 60), lastLiveAt, checkedAt };
  } catch {
    return { state: "down", lagBlocks: null, lagMinutes: null, lastLiveAt, checkedAt };
  }
}
