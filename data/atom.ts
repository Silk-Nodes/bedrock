// Fixed ATOM facts only. Everything that moves (price, supply, inflation,
// distribution, governance tallies, turnout) is fetched live from the chain or
// price APIs at request time, never from this file. No synthetic/mock series.

export const ATOM_TOKEN = {
  genesis_date: "March 2019",
  genesis_price_usd: 0.10, // 2017 ICO fundraiser price
} as const;

// Last-known governance counts, used ONLY as a fallback when the live chain
// query is unavailable (the page labels it a snapshot in that case). Quorum is
// the real on-chain Cosmos Hub parameter.
export const GOV_STATS = {
  total_props: 921,
  passed: 612,
  rejected: 241,
  quorum_pct: 40,
} as const;
