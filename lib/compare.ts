// "ATOM at the market cap of X": market caps and FDVs for a fixed comparison
// basket, one bulk CoinGecko call (works from the VM; Coinpaprika's per-coin
// tickers were stale for DOT and missing CRO). ATOM's own mcap is on-chain
// derived elsewhere; here we use the same basket source for the multiples so
// numerator and denominator are consistent.

export type CompareCoin = {
  id: string;
  symbol: string;   // upper-case ticker
  name: string;
  price: number;
  mcap: number;
  fdv: number;      // falls back to mcap when the provider has no FDV
};

const IDS = [
  "cosmos", "bitcoin", "ethereum", "solana", "hyperliquid", "tron", "ripple",
  "binancecoin", "dogecoin", "zcash", "stellar", "monero", "chainlink",
  "cardano", "sui", "avalanche-2", "polkadot", "near", "crypto-com-chain",
];

export async function getMarketComparison(): Promise<{ atom: CompareCoin | null; coins: CompareCoin[]; live: boolean }> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${IDS.join(",")}`,
      { next: { revalidate: 600 } },
    );
    if (!res.ok) return { atom: null, coins: [], live: false };
    const arr = (await res.json()) as Array<{
      id?: string; symbol?: string; name?: string; current_price?: number;
      market_cap?: number; fully_diluted_valuation?: number | null;
    }>;
    const rows: CompareCoin[] = (arr ?? [])
      .filter((c) => c.id && Number.isFinite(c.current_price) && Number.isFinite(c.market_cap) && (c.market_cap ?? 0) > 0)
      .map((c) => ({
        id: c.id as string,
        symbol: (c.symbol ?? "").toUpperCase(),
        name: c.name ?? (c.symbol ?? "").toUpperCase(),
        price: Number(c.current_price),
        mcap: Number(c.market_cap),
        fdv: Number(c.fully_diluted_valuation) > 0 ? Number(c.fully_diluted_valuation) : Number(c.market_cap),
      }));
    const atom = rows.find((r) => r.id === "cosmos") ?? null;
    const coins = rows.filter((r) => r.id !== "cosmos").sort((a, b) => b.mcap - a.mcap);
    return { atom, coins, live: coins.length > 0 && !!atom };
  } catch {
    return { atom: null, coins: [], live: false };
  }
}
