// Relative performance data (hl.eco/hype-relative-perf style, for ATOM).
// Two sources, both keyless and verified from the VM:
// - Chart: Coinpaprika 1y daily closes for ATOM + the majors (one call per
//   coin, cached 1h). The client rebases to 0% at the selected window start.
// - Pairs table: one bulk CoinGecko call with 7d/30d/1y change percentages;
//   ATOM/X relative return per horizon = (1+atom)/(1+x) - 1.

export type PerfSeries = { symbol: string; color: string; points: { date: string; value: number }[] };

const CHART_COINS: { id: string; symbol: string; color: string }[] = [
  { id: "atom-cosmos", symbol: "ATOM", color: "var(--hub)" },
  { id: "btc-bitcoin", symbol: "BTC", color: "var(--sand)" },
  { id: "eth-ethereum", symbol: "ETH", color: "var(--slate)" },
  { id: "sol-solana", symbol: "SOL", color: "var(--iron)" },
  { id: "hype-hyperliquid", symbol: "HYPE", color: "var(--moss)" },
];

export async function getPerfHistory(): Promise<{ series: PerfSeries[]; live: boolean }> {
  // Coinpaprika free tier serves at most 1 year of history; 364 stays inside.
  const start = new Date(Date.now() - 364 * 86_400_000).toISOString().slice(0, 10);
  const out: PerfSeries[] = [];
  await Promise.all(CHART_COINS.map(async (c) => {
    try {
      const res = await fetch(`https://api.coinpaprika.com/v1/tickers/${c.id}/historical?start=${start}&interval=1d`, { next: { revalidate: 3600 } });
      if (!res.ok) return;
      const rows = (await res.json()) as Array<{ timestamp?: string; price?: number }>;
      const points = (rows ?? [])
        .filter((r) => r.timestamp && Number.isFinite(r.price) && (r.price ?? 0) > 0)
        .map((r) => ({ date: (r.timestamp as string).slice(0, 10), value: Number(r.price) }));
      if (points.length > 30) out.push({ symbol: c.symbol, color: c.color, points });
    } catch {
      // skip this coin
    }
  }));
  // Keep the declared order (ATOM first) regardless of fetch completion order.
  const order = new Map(CHART_COINS.map((c, i) => [c.symbol, i]));
  out.sort((a, b) => (order.get(a.symbol) ?? 9) - (order.get(b.symbol) ?? 9));
  return { series: out, live: out.some((s) => s.symbol === "ATOM") && out.length >= 2 };
}

export type RelPair = {
  symbol: string;   // the counter-asset
  name: string;
  rel7d: number;    // ATOM vs X, percent
  rel30d: number;
  rel1y: number;
};

const TABLE_IDS = [
  "cosmos", "bitcoin", "ethereum", "solana", "hyperliquid", "tron", "ripple",
  "binancecoin", "dogecoin", "zcash", "stellar", "monero", "chainlink",
  "cardano", "sui", "avalanche-2", "polkadot", "near", "crypto-com-chain",
];

export async function getRelPerfTable(): Promise<{ pairs: RelPair[]; atom: { d7: number; d30: number; y1: number } | null; live: boolean }> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${TABLE_IDS.join(",")}&price_change_percentage=7d,30d,1y`,
      { next: { revalidate: 600 } },
    );
    if (!res.ok) return { pairs: [], atom: null, live: false };
    const arr = (await res.json()) as Array<{
      id?: string; symbol?: string; name?: string;
      price_change_percentage_7d_in_currency?: number | null;
      price_change_percentage_30d_in_currency?: number | null;
      price_change_percentage_1y_in_currency?: number | null;
    }>;
    const chg = (v: number | null | undefined) => (Number.isFinite(v) ? Number(v) : null);
    const atomRow = arr.find((c) => c.id === "cosmos");
    if (!atomRow) return { pairs: [], atom: null, live: false };
    const a7 = chg(atomRow.price_change_percentage_7d_in_currency);
    const a30 = chg(atomRow.price_change_percentage_30d_in_currency);
    const a1y = chg(atomRow.price_change_percentage_1y_in_currency);
    // Relative return of holding ATOM instead of X over the horizon.
    const rel = (a: number | null, x: number | null) =>
      a === null || x === null ? NaN : ((1 + a / 100) / (1 + x / 100) - 1) * 100;
    const pairs: RelPair[] = arr
      .filter((c) => c.id && c.id !== "cosmos")
      .map((c) => ({
        symbol: (c.symbol ?? "").toUpperCase(),
        name: c.name ?? "",
        rel7d: rel(a7, chg(c.price_change_percentage_7d_in_currency)),
        rel30d: rel(a30, chg(c.price_change_percentage_30d_in_currency)),
        rel1y: rel(a1y, chg(c.price_change_percentage_1y_in_currency)),
      }))
      .filter((p) => Number.isFinite(p.rel7d) || Number.isFinite(p.rel30d) || Number.isFinite(p.rel1y))
      .sort((x, y) => (y.rel7d || -999) - (x.rel7d || -999));
    return { pairs, atom: { d7: a7 ?? 0, d30: a30 ?? 0, y1: a1y ?? 0 }, live: pairs.length > 0 };
  } catch {
    return { pairs: [], atom: null, live: false };
  }
}
