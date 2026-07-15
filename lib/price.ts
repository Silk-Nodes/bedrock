// Live ATOM market data (CoinGecko), server-side, with snapshot fallback.
// Price, market cap and 24h change. Implied circulating supply = mcap / price.

export type LiveAtomPrice = {
  usd: number;
  mcap_usd: number;
  change_24h_pct: number;
  circulating: number;
  live: boolean;
  source: string;
  fetched_at: string;
};

const FALLBACK: LiveAtomPrice = {
  usd: 1.92,
  mcap_usd: 980_000_000,
  change_24h_pct: 0,
  circulating: 510_000_000,
  live: false,
  source: "snapshot",
  fetched_at: "2026-06-01",
};

// Richer market snapshot for the /atom/market page: volume, FDV, the 24h range,
// the position vs ATH/ATL, and a real 7-day price sparkline, all from CoinGecko's
// markets endpoint (same source as the simple price). Falls back to live price
// only (no sparkline) if the markets endpoint is unavailable.
export type AtomMarket = {
  usd: number;
  change_24h_pct: number;
  change_7d_pct: number;
  change_30d_pct: number;
  change_1y_pct: number;
  mcap_usd: number;
  fdv_usd: number; // fully diluted: price × total supply
  volume_24h_usd: number;
  high_24h: number;
  low_24h: number;
  circulating: number;
  ath: number;
  ath_change_pct: number; // % below ATH (negative)
  ath_date: string;
  atl: number;
  atl_change_pct: number; // % above ATL (positive)
  spark: { date: string; value: number }[]; // 7d hourly
  live: boolean;
  source: string;
};

const pctNum = (v: unknown): number => (Number.isFinite(v as number) ? +Number(v).toFixed(1) : 0);


// Circulating supply from the chain itself: the bank module's total uatom
// supply. ATOM has no protocol-level lockups or unvested allocations, so
// circulating = on-chain total supply (CoinGecko's circulating matches this to
// a few thousand ATOM). Market caps are derived as price x on-chain supply;
// provider market caps are fallback only (Coinpaprika's went stale by ~25%).
const SUPPLY_HOSTS = ["https://cosmos-rest.publicnode.com", "https://rest.cosmos.directory/cosmoshub"];
async function onChainCirculatingAtom(): Promise<number | null> {
  for (const host of SUPPLY_HOSTS) {
    try {
      const res = await fetch(`${host}/cosmos/bank/v1beta1/supply/by_denom?denom=uatom`, { next: { revalidate: 1800 } });
      if (!res.ok) continue;
      const j = (await res.json()) as { amount?: { amount?: string } };
      const n = Number(j.amount?.amount);
      if (Number.isFinite(n) && n > 0) return n / 1e6;
    } catch {
      // try next host
    }
  }
  return null;
}

export async function getLiveAtomMarket(): Promise<AtomMarket> {
  // Primary: Coinpaprika. Keyless and reliable from a cloud IP, where CoinGecko's
  // public API rate-limits (429) on every call. Its ticker carries price, market
  // cap, volume, ATH and the 24h/7d change in one request. (30d/1y often read 0,
  // and there is no intraday high/low, so the market page derives those from the
  // daily history series instead.)
  try {
    const res = await fetch("https://api.coinpaprika.com/v1/tickers/atom-cosmos", { next: { revalidate: 300 } });
    if (res.ok) {
      const d = (await res.json()) as { quotes?: { USD?: Record<string, number | string> } };
      const q = d?.quotes?.USD;
      const usd = Number(q?.price);
      if (q && Number.isFinite(usd) && usd > 0) {
        const circ = await onChainCirculatingAtom();
        const mcap = circ ? Math.round(usd * circ) : Math.round(Number(q.market_cap) || 0);
        const ath = Number(q.ath_price) || usd;
        const athPct = Number(q.percent_from_price_ath);
        return {
          usd: +usd.toFixed(4),
          change_24h_pct: pctNum(q.percent_change_24h),
          change_7d_pct: pctNum(q.percent_change_7d),
          change_30d_pct: pctNum(q.percent_change_30d),
          change_1y_pct: pctNum(q.percent_change_1y),
          mcap_usd: mcap,
          fdv_usd: mcap, // ATOM has no max supply
          volume_24h_usd: Math.round(Number(q.volume_24h) || 0),
          high_24h: usd, low_24h: usd, // not provided; page uses the 52-week range
          circulating: circ ? Math.round(circ) : mcap > 0 ? Math.round(mcap / usd) : 0,
          ath,
          ath_change_pct: Number.isFinite(athPct) ? +athPct.toFixed(1) : 0,
          ath_date: String(q.ath_date ?? "").slice(0, 10),
          atl: 0, atl_change_pct: 0,
          spark: [],
          live: true, source: "coinpaprika.com",
        };
      }
    }
  } catch {
    // fall through to CoinGecko
  }
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=cosmos&sparkline=true&price_change_percentage=24h,7d,30d,1y",
      { next: { revalidate: 300 } },
    );
    if (res.ok) {
      const arr = (await res.json()) as Array<{
        current_price?: number; market_cap?: number; fully_diluted_valuation?: number; total_volume?: number;
        high_24h?: number; low_24h?: number; circulating_supply?: number; total_supply?: number;
        price_change_percentage_24h?: number; ath?: number; ath_change_percentage?: number; ath_date?: string;
        atl?: number; atl_change_percentage?: number; sparkline_in_7d?: { price?: number[] };
        price_change_percentage_7d_in_currency?: number; price_change_percentage_30d_in_currency?: number; price_change_percentage_1y_in_currency?: number;
      }>;
      const pct = (v: unknown) => (Number.isFinite(v) ? +Number(v).toFixed(1) : 0);
      const c = arr?.[0];
      const usd = Number(c?.current_price);
      if (c && Number.isFinite(usd) && usd > 0) {
        const circ = await onChainCirculatingAtom();
        const prices = (c.sparkline_in_7d?.price ?? []).filter((p) => Number.isFinite(p));
        // CoinGecko's 7d sparkline is hourly with no timestamps; synthesize them
        // backward from now at 1h spacing for the hover tooltip.
        const now = Date.now();
        const spark = prices.map((value, i) => ({
          date: new Date(now - (prices.length - 1 - i) * 3_600_000).toISOString(),
          value: +value.toFixed(4),
        }));
        const fdv = Number(c.fully_diluted_valuation);
        return {
          usd,
          change_24h_pct: Number.isFinite(c.price_change_percentage_24h) ? +Number(c.price_change_percentage_24h).toFixed(2) : 0,
          change_7d_pct: pct(c.price_change_percentage_7d_in_currency),
          change_30d_pct: pct(c.price_change_percentage_30d_in_currency),
          change_1y_pct: pct(c.price_change_percentage_1y_in_currency),
          mcap_usd: circ ? Math.round(usd * circ) : Math.round(Number(c.market_cap) || 0),
          fdv_usd: Number.isFinite(fdv) && fdv > 0 ? Math.round(fdv) : Math.round((Number(c.total_supply) || 0) * usd),
          volume_24h_usd: Math.round(Number(c.total_volume) || 0),
          high_24h: Number(c.high_24h) || usd,
          low_24h: Number(c.low_24h) || usd,
          circulating: circ ? Math.round(circ) : Math.round(Number(c.circulating_supply) || 0),
          ath: Number(c.ath) || usd,
          ath_change_pct: Number.isFinite(c.ath_change_percentage) ? +Number(c.ath_change_percentage).toFixed(1) : 0,
          ath_date: (c.ath_date ?? "").slice(0, 10),
          atl: Number(c.atl) || usd,
          atl_change_pct: Number.isFinite(c.atl_change_percentage) ? +Number(c.atl_change_percentage).toFixed(0) : 0,
          spark,
          live: true,
          source: "coingecko.com",
        };
      }
    }
  } catch {
    // fall through
  }
  return {
    usd: FALLBACK.usd, change_24h_pct: 0, change_7d_pct: 0, change_30d_pct: 0, change_1y_pct: 0, mcap_usd: FALLBACK.mcap_usd, fdv_usd: FALLBACK.mcap_usd,
    volume_24h_usd: 0, high_24h: FALLBACK.usd, low_24h: FALLBACK.usd, circulating: FALLBACK.circulating,
    ath: FALLBACK.usd, ath_change_pct: 0, ath_date: "", atl: FALLBACK.usd, atl_change_pct: 0,
    spark: [], live: false, source: "snapshot",
  };
}

export type PricePoint = { date: string; value: number };

// Trailing ~1 year of daily ATOM history (price + volume + market cap) from
// Coinpaprika, keyless and reliable from a cloud IP. The free tier serves the
// last year, so we request from 364 days back. Returns [] when unavailable.
async function coinpaprikaHistory(): Promise<{ date: string; price: number; volume: number; mcap: number }[]> {
  try {
    const start = new Date(Date.now() - 364 * 86_400_000).toISOString().slice(0, 10);
    const res = await fetch(
      `https://api.coinpaprika.com/v1/tickers/atom-cosmos/historical?start=${start}&interval=1d`,
      { next: { revalidate: 3600 } },
    );
    if (res.ok) {
      const rows = (await res.json()) as { timestamp?: string; price?: number; volume_24h?: number; market_cap?: number }[];
      return (rows ?? [])
        .filter((r) => Number.isFinite(r.price))
        .map((r) => ({
          date: String(r.timestamp ?? "").slice(0, 10),
          price: +Number(r.price).toFixed(4),
          volume: Math.round(Number(r.volume_24h) || 0),
          mcap: Math.round(Number(r.market_cap) || 0),
        }));
    }
  } catch {
    // fall through
  }
  return [];
}

// CoinGecko daily history fallback (price + volume). Often 429s from a cloud IP.
async function coingeckoChart(days: number): Promise<{ price: PricePoint[]; volume: PricePoint[] }> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/cosmos/market_chart?vs_currency=usd&days=${days}`,
      { next: { revalidate: 3600 } },
    );
    if (res.ok) {
      const j = (await res.json()) as { prices?: [number, number][]; total_volumes?: [number, number][] };
      const toPts = (rows?: [number, number][]) =>
        (rows ?? [])
          .filter((p) => Array.isArray(p) && Number.isFinite(p[1]))
          .map((p) => ({ date: new Date(p[0]).toISOString().slice(0, 10), value: +p[1].toFixed(4) }));
      return { price: toPts(j.prices), volume: toPts(j.total_volumes).map((p) => ({ ...p, value: Math.round(p.value) })) };
    }
  } catch {
    // fall through
  }
  return { price: [], volume: [] };
}

// ── Where to trade ATOM: live CEX + DEX markets ─────────────────────────────
export type AtomMarketRow = {
  exchange: string;
  pair: string;
  priceUsd: number;
  volumeUsd: number;
  share: number; // % of total tracked volume
  isDex: boolean;
  tradeUrl: string;
};
export type AtomMarkets = {
  rows: AtomMarketRow[];
  totalVolUsd: number;
  cexVolUsd: number;
  dexVolUsd: number;
  venues: number;
  bestBuyUsd: number;
  live: boolean;
  source: string;
};

// Names that are DEXes (on-chain AMMs), so the page can split CEX vs DEX.
function isDexName(name: string): boolean {
  const n = name.toLowerCase();
  return ["osmos", "astroport", "crescent", "white whale", "shade", "uniswap", "pancake", "curve", "thorchain", "dydx", "kujira", "balancer", "sushiswap", "quickswap"].some((x) => n.includes(x));
}

// CoinGecko gives DEX markets raw denoms/contracts (ibc/.., factory/.., 0x..) in
// base/target instead of tickers, so resolve a readable symbol from the coin_id
// when the raw symbol is an address/hash; otherwise keep the clean ticker.
const COIN_SYM: Record<string, string> = {
  cosmos: "ATOM", osmosis: "OSMO", "usd-coin": "USDC", "bridged-usdc": "USDC", tether: "USDT", "tether-usd": "USDT",
  celestia: "TIA", bitcoin: "BTC", ethereum: "ETH", dai: "DAI", "wrapped-bitcoin": "WBTC", binancecoin: "BNB",
  "first-digital-usd": "FDUSD", "dydx-chain": "DYDX", injective: "INJ", "wrapped-steth": "wstETH", solana: "SOL",
  atomone: "ATONE", "akash-network": "AKT", thorchain: "RUNE", "juno-network": "JUNO", kujira: "KUJI",
  secret: "SCRT", stride: "STRD", "stride-staked-atom": "stATOM", stargaze: "STARS", "crypto-com-chain": "CRO",
  "wrapped-cro": "CRO", "terra-luna-2": "LUNA", "neutron-3": "NTRN", "persistence": "XPRT", "fetch-ai": "FET",
  wbnb: "BNB", "binance-bridged-usdt-bnb-smart-chain": "USDT", "wrapped-kava": "KAVA", "drop-staked-atom": "dATOM",
  "terra-luna": "LUNC", regen: "REGEN", sentinel: "DVPN", "iris-network": "IRIS",
};
// Raw on-chain micro-denoms (uatom etc.) that slip through when coin_id is missing.
const DENOM_SYM: Record<string, string> = { uatom: "ATOM", uosmo: "OSMO", uusdc: "USDC", uusdt: "USDT", utia: "TIA", uakt: "AKT", ujuno: "JUNO", ukuji: "KUJI", uscrt: "SCRT", ustrd: "STRD" };
// Resolve a readable ticker, or null when we can't; callers should drop the row
// rather than show a mangled name.
function symbolOf(raw?: string, coinId?: string): string | null {
  if (coinId && COIN_SYM[coinId]) return COIN_SYM[coinId];
  let r = (raw ?? "").replace(/^ibc\//i, "").replace(/^factory\/[^/]+\//i, "");
  if (r.includes(".")) r = r.slice(r.lastIndexOf(".") + 1); // "THOR.RUNE" -> "RUNE"
  const low = r.toLowerCase();
  if (DENOM_SYM[low]) return DENOM_SYM[low];
  const ugly = !r || r.length > 8 || /^(0x)?[a-f0-9]{8,}$/i.test(r) || /[^a-z0-9]/i.test(r) || (/^u/i.test(r) && r.length >= 5 && !/^usd/i.test(r));
  if (ugly) return null;
  return r.toUpperCase();
}

function finishMarkets(rows: AtomMarketRow[], source: string): AtomMarkets {
  let clean = rows.filter((r) => r.exchange && r.volumeUsd > 0);
  // Same pair listed twice on one venue (e.g. two Osmosis ATOM/OSMO pools):
  // keep only the deepest one by volume.
  clean.sort((a, b) => b.volumeUsd - a.volumeUsd);
  const seen = new Set<string>();
  clean = clean.filter((r) => {
    const key = `${r.exchange}|${r.pair}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const totalVol = clean.reduce((s, r) => s + r.volumeUsd, 0);
  clean.forEach((r) => { r.share = totalVol > 0 ? +((r.volumeUsd / totalVol) * 100).toFixed(1) : 0; });
  const cexVol = clean.filter((r) => !r.isDex).reduce((s, r) => s + r.volumeUsd, 0);
  const dexVol = clean.filter((r) => r.isDex).reduce((s, r) => s + r.volumeUsd, 0);
  // Best buy: cheapest price among the most liquid spot markets (avoids thin outliers).
  const liquid = clean.filter((r) => r.priceUsd > 0).slice(0, 18);
  const bestBuy = liquid.length ? Math.min(...liquid.map((r) => r.priceUsd)) : 0;
  return { rows: clean, totalVolUsd: totalVol, cexVolUsd: cexVol, dexVolUsd: dexVol, venues: new Set(clean.map((r) => r.exchange)).size, bestBuyUsd: bestBuy, live: true, source };
}

// Live CEX + DEX markets for "where to trade ATOM". CoinGecko tickers carry both
// (incl. Osmosis) with USD price/volume + a trade link; Coinpaprika markets is
// the reliable CEX-only fallback.
export async function getAtomMarkets(): Promise<AtomMarkets> {
  try {
    const all: Array<{ market?: { name?: string }; base?: string; target?: string; coin_id?: string; target_coin_id?: string; trade_url?: string; converted_last?: { usd?: number }; converted_volume?: { usd?: number } }> = [];
    for (let page = 1; page <= 2; page++) {
      const res = await fetch(`https://api.coingecko.com/api/v3/coins/cosmos/tickers?depth=false&page=${page}`, { next: { revalidate: 300 } });
      if (!res.ok) break;
      const j = (await res.json()) as { tickers?: typeof all };
      const ts = j.tickers ?? [];
      all.push(...ts);
      if (ts.length < 100) break;
    }
    if (all.length) {
      const rows: AtomMarketRow[] = all.flatMap((t) => {
        const base = symbolOf(t.base, t.coin_id);
        const target = symbolOf(t.target, t.target_coin_id);
        if (!base || !target) return []; // unmappable denom: skip rather than show a mangled pair
        return [{
          exchange: t.market?.name ?? "",
          pair: `${base}/${target}`,
          priceUsd: +(Number(t.converted_last?.usd) || 0).toFixed(4),
          volumeUsd: Math.round(Number(t.converted_volume?.usd) || 0),
          share: 0,
          isDex: isDexName(t.market?.name ?? ""),
          tradeUrl: t.trade_url ?? "",
        }];
      });
      return finishMarkets(rows, "coingecko.com");
    }
  } catch {
    // fall through to Coinpaprika
  }
  try {
    const res = await fetch("https://api.coinpaprika.com/v1/coins/atom-cosmos/markets?quotes=USD", { next: { revalidate: 300 } });
    if (res.ok) {
      const arr = (await res.json()) as Array<{ exchange_name?: string; pair?: string; market_url?: string; outlier?: boolean; quotes?: { USD?: { price?: number; volume_24h?: number } } }>;
      const rows: AtomMarketRow[] = (arr ?? []).filter((m) => !m.outlier).map((m) => ({
        exchange: m.exchange_name ?? "",
        pair: m.pair ?? "",
        priceUsd: +(Number(m.quotes?.USD?.price) || 0).toFixed(4),
        volumeUsd: Math.round(Number(m.quotes?.USD?.volume_24h) || 0),
        share: 0,
        isDex: isDexName(m.exchange_name ?? ""),
        tradeUrl: m.market_url ?? "",
      }));
      return finishMarkets(rows, "coinpaprika.com");
    }
  } catch {
    // fall through
  }
  return { rows: [], totalVolUsd: 0, cexVolUsd: 0, dexVolUsd: 0, venues: 0, bestBuyUsd: 0, live: false, source: "snapshot" };
}

// Daily ATOM/USD price history (Coinpaprika primary, CoinGecko fallback).
export async function getAtomPriceHistory(days = 90): Promise<{ points: PricePoint[]; live: boolean }> {
  const h = await coinpaprikaHistory();
  if (h.length > 1) {
    const pts = h.map((r) => ({ date: r.date, value: r.price }));
    return { points: days < pts.length ? pts.slice(-days) : pts, live: true };
  }
  const cg = await coingeckoChart(days);
  return cg.price.length ? { points: cg.price, live: true } : { points: [], live: false };
}

// Price + volume daily series together, so the market page can draw a real
// volume chart distinct from price. Coinpaprika primary, CoinGecko fallback.
export async function getAtomMarketChart(): Promise<{ price: PricePoint[]; volume: PricePoint[]; mcap: PricePoint[]; live: boolean }> {
  const h = await coinpaprikaHistory();
  if (h.length > 1) {
    return {
      price: h.map((r) => ({ date: r.date, value: r.price })),
      volume: h.map((r) => ({ date: r.date, value: r.volume })),
      mcap: h.map((r) => ({ date: r.date, value: r.mcap })),
      live: true,
    };
  }
  const cg = await coingeckoChart(365);
  return cg.price.length ? { price: cg.price, volume: cg.volume, mcap: [], live: true } : { price: [], volume: [], mcap: [], live: false };
}

export async function getLiveAtomPrice(): Promise<LiveAtomPrice> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=cosmos&vs_currencies=usd&include_market_cap=true&include_24hr_change=true",
      { next: { revalidate: 300 } },
    );
    if (res.ok) {
      const j = (await res.json()) as {
        cosmos?: { usd?: number; usd_market_cap?: number; usd_24h_change?: number };
      };
      const c = j.cosmos;
      const usd = Number(c?.usd);
      const mcap = Number(c?.usd_market_cap);
      const chg = Number(c?.usd_24h_change);
      if (Number.isFinite(usd) && usd > 0) {
        const circ = await onChainCirculatingAtom();
        const mcapOk = Number.isFinite(mcap) && mcap > 0;
        return {
          usd,
          mcap_usd: circ ? Math.round(usd * circ) : mcapOk ? Math.round(mcap) : Math.round(usd * FALLBACK.circulating),
          change_24h_pct: Number.isFinite(chg) ? +chg.toFixed(2) : 0,
          circulating: circ ? Math.round(circ) : mcapOk ? Math.round(mcap / usd) : FALLBACK.circulating,
          live: true,
          source: "coingecko.com",
          fetched_at: new Date().toISOString(),
        };
      }
    }
  } catch {
    // fall through to snapshot
  }
  return FALLBACK;
}
