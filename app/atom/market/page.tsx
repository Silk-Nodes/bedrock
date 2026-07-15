// /atom/market · hl.eco card grid. Live ATOM market & liquidity. Two real time
// series carry the page: price and trading volume, each a glowing 1-year feature
// chart paired with a compact fact list (Snapshot, Valuation). A performance
// strip (24h / 7d / 30d / 1y) sits under the live price, and the 24h range bar
// shows where the price sits today. Honest data only: every figure is from
// CoinGecko, and there are no fabricated series.

import { ChartCard } from "@/components/console/ChartCard";
import { ConsolePage, ConsoleModule, IntelCard } from "@/components/console/Console";
import { LineChart, type Series } from "@/components/charts/LineChart";
import { ATOM_TOKEN } from "@/data/atom";
import { getLiveAtomMarket, getAtomMarketChart } from "@/lib/price";
import { ShareLineChart, ShareRange } from "@/components/share/ShareCharts";
import { seo } from "@/lib/seo";

export const revalidate = 300;

function fmtUsd(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(2)}`;
}
function fmtAtom(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return Math.round(n).toString();
}

export const metadata = seo({ title: "ATOM Market", description: "ATOM market data: price, 24h change, liquidity, and trading range across major venues, with the context behind the moves.", path: "/atom/market", keywords: ["ATOM price", "ATOM market", "ATOM liquidity", "ATOM trading"] });

// One row of a fact list (Snapshot / Valuation).
function Fact({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, padding: "10px 0", borderTop: "1px solid var(--ink-10)" }}>
      <span className="data" style={{ fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--ink-40)" }}>{label}</span>
      <span className="data" style={{ fontSize: 15, fontWeight: 600, color: accent ?? "var(--ink)" }}>{value}</span>
    </div>
  );
}

// One cell of the performance strip: a period label + signed, colored change.
function Perf({ label, pct }: { label: string; pct: number }) {
  const up = pct >= 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 56 }}>
      <span className="data" style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "var(--ink-40)" }}>{label}</span>
      <span className="data" style={{ fontSize: 14, fontWeight: 700, color: up ? "var(--moss)" : "var(--iron)" }}>{up ? "▲" : "▼"} {Math.abs(pct)}%</span>
    </div>
  );
}

export default async function AtomMarket() {
  const [m, chart] = await Promise.all([getLiveAtomMarket(), getAtomMarketChart()]);
  const turnoverPct = m.mcap_usd > 0 ? (m.volume_24h_usd / m.mcap_usd) * 100 : 0;
  const athMultiple = m.usd > 0 ? m.ath / m.usd : 0; // ATH is N× current
  const genesisMultiple = ATOM_TOKEN.genesis_price_usd > 0 ? m.usd / ATOM_TOKEN.genesis_price_usd : 0;

  // Real 1-year daily series for the two feature charts; price falls back to the
  // live 7-day spark if the history endpoint is unavailable.
  const hasHist = chart.price.length > 1;
  const priceSeries: Series[] = [{ label: "Price", color: "var(--hub)", points: hasHist ? chart.price : m.spark }];
  const volumeSeries: Series[] = [{ label: "Volume", color: "var(--sand)", points: chart.volume }];
  const mcapSeries: Series[] = [{ label: "Market cap", color: "var(--hub-2)", points: chart.mcap }];
  const histMeta = hasHist ? "1 year · daily · live" : "7-day · live";

  // 52-week range + position, derived from the daily series (Coinpaprika's ticker
  // carries no intraday high/low), plus a more meaningful "where it sits" band.
  const vals = priceSeries[0].points.map((p) => p.value);
  const lo52 = vals.length ? Math.min(...vals) : m.usd;
  const hi52 = vals.length ? Math.max(...vals) : m.usd;
  const rangePos = hi52 > lo52 ? ((m.usd - lo52) / (hi52 - lo52)) * 100 : 50;
  const aboveLowPct = lo52 > 0 ? ((m.usd - lo52) / lo52) * 100 : 0;

  // Performance: 24h/7d live from the ticker; 30d/1y derived from daily closes
  // (the ticker reports those as 0 on the free tier).
  const ser = chart.price;
  const chgDays = (d: number) => {
    if (ser.length < 2) return 0;
    const last = ser[ser.length - 1].value;
    const base = ser[Math.max(0, ser.length - 1 - d)].value;
    return base > 0 ? +(((last - base) / base) * 100).toFixed(1) : 0;
  };
  const ch24 = m.change_24h_pct || chgDays(1);
  const ch7 = m.change_7d_pct || chgDays(7);
  const ch30 = m.change_30d_pct || chgDays(30);
  const ch1y = m.change_1y_pct || chgDays(ser.length - 1);

  return (
    <ConsolePage>
      <ConsoleModule
        lead
        title="Market & liquidity"
        dot="var(--hub-2)"
        meta={m.live ? `${ch24 >= 0 ? "+" : ""}${ch24}% 24h · live` : "snapshot"}
      >
        <div className="console-grid">
          {/* Row 1 · Price feature chart + Snapshot facts */}
          <div className="span-8">
            <ChartCard
              title="Price"
              meta={histMeta}
              accentColor="var(--hub)"
              shareFilename="bedrock-atom-price"
              share={{
                title: "ATOM price · Cosmos HUB",
                subtitle: "Live ATOM price over the past year",
                context: "Price and performance are live from CoinGecko. ATOM has no max supply, so circulating equals total and FDV adds nothing.",
                body: <ShareLineChart series={priceSeries} prefix="$" height={235} />,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 450, fontSize: "clamp(34px, 5vw, 52px)", letterSpacing: "-0.02em", lineHeight: 1, color: "var(--ink)" }}>${m.usd.toFixed(2)}</span>
                  <span className="data" style={{ fontSize: 12, letterSpacing: 1, color: "var(--ink-40)" }}>USD</span>
                </div>
                <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
                  <Perf label="24h" pct={ch24} />
                  <Perf label="7d" pct={ch7} />
                  <Perf label="30d" pct={ch30} />
                  <Perf label="1y" pct={ch1y} />
                </div>
              </div>
              <LineChart series={priceSeries} yLabel="USD" height={250} />
            </ChartCard>
          </div>
          <div className="span-4">
            <IntelCard title="Snapshot" meta="live market">
              <div style={{ display: "flex", flexDirection: "column" }}>
                <Fact label="Market cap" value={fmtUsd(m.mcap_usd)} accent="var(--hub-2)" />
                <Fact label="24h volume" value={fmtUsd(m.volume_24h_usd)} accent="var(--sand)" />
                <Fact label="Turnover" value={`${turnoverPct.toFixed(1)}%`} />
                <Fact label="52w high" value={fmtUsd(hi52)} accent="var(--moss)" />
                <Fact label="52w low" value={fmtUsd(lo52)} accent="var(--iron)" />
                <Fact label="Circulating" value={`${fmtAtom(m.circulating)} ATOM`} />
              </div>
            </IntelCard>
          </div>

          {/* Row 2 · Volume feature chart + Valuation facts */}
          <div className="span-8">
            <ChartCard
              title="Trading volume"
              meta={hasHist ? "1 year · daily · live" : "unavailable"}
              accentColor="var(--sand)"
              shareFilename="bedrock-atom-volume"
              share={{
                title: "ATOM trading volume · Cosmos HUB",
                subtitle: "Daily reported trading volume over the past year",
                context: "Exchange-reported daily volume from CoinGecko. Spikes mark days of heavy turnover relative to market cap.",
                body: <ShareLineChart series={volumeSeries} prefix="$" height={235} />,
              }}
            >
              {volumeSeries[0].points.length > 1 ? (
                <LineChart series={volumeSeries} yLabel="USD / DAY" height={250} />
              ) : (
                <div style={{ height: 250, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "var(--ink-40)" }}>Volume history unavailable right now.</div>
              )}
            </ChartCard>
          </div>
          <div className="span-4">
            <IntelCard title="Valuation" meta="vs history">
              <div style={{ display: "flex", flexDirection: "column" }}>
                <Fact label="Below all-time high" value={`${m.ath_change_pct.toFixed(0)}%`} accent="var(--iron)" />
                <Fact label="All-time high" value={m.ath_date ? `${fmtUsd(m.ath)} · ${m.ath_date}` : fmtUsd(m.ath)} />
                <Fact label="ATH multiple" value={`${athMultiple.toFixed(1)}×`} accent="var(--sand)" />
                <Fact label="Above 52w low" value={`+${aboveLowPct.toFixed(0)}%`} accent="var(--moss)" />
                <Fact label="Since ICO" value={`${genesisMultiple.toFixed(0)}×`} accent="var(--moss)" />
                <Fact label="ICO price" value={`$${ATOM_TOKEN.genesis_price_usd.toFixed(2)}`} />
              </div>
            </IntelCard>
          </div>

          {/* Row 3 · Market cap over time (diverges from price as supply inflates) */}
          {mcapSeries[0].points.length > 1 && (
            <div className="span-12">
              <ChartCard
                title="Market cap over time"
                meta="1 year · daily · live"
                accentColor="var(--hub-2)"
                shareFilename="bedrock-atom-mcap"
                share={{
                  title: "ATOM market cap over time · Cosmos HUB",
                  subtitle: "Daily market cap over the past year",
                  context: "Market cap (price × circulating supply) from CoinGecko. Because ATOM has no max supply and inflates ~10%/yr, this drifts above the price curve over time.",
                  body: <ShareLineChart series={mcapSeries} prefix="$" height={235} />,
                }}
              >
                <LineChart series={mcapSeries} yLabel="USD" height={250} />
              </ChartCard>
            </div>
          )}

          {/* CTA · where to buy & sell ATOM (CEX + DEX) */}
          <div className="span-12">
            <a href="/atom/market/trade" style={{ textDecoration: "none", display: "block" }}>
              <div className="surface surface-lift" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 20px", borderLeft: "2px solid var(--hub-2)" }}>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>Where to buy &amp; sell ATOM →</div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-60)", marginTop: 5, lineHeight: 1.5 }}>Live CEX and DEX markets ranked by volume, the cheapest price, and a trade link for each venue.</div>
                </div>
                <div className="data" style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "var(--hub-2)", whiteSpace: "nowrap" }}>Open →</div>
              </div>
            </a>
          </div>

          {/* The position visual: where the live price sits in the 24h range */}
          <div className="span-12">
            <IntelCard
              title="Where ATOM sits"
              meta="against its 52-week range · live"
              shareFilename="bedrock-atom-market"
              share={{
                title: "ATOM market position · Cosmos HUB",
                subtitle: "Price, valuation, and distance from the all-time high",
                context: "Live market data: how ATOM is valued today and where it trades within its 52-week range.",
                big: `$${m.usd.toFixed(2)}`,
                deltaPositive: ch24 >= 0,
                delta: `${ch24 >= 0 ? "+" : ""}${ch24}% · 24h`,
                body: <ShareRange low={lo52} high={hi52} value={m.usd} />,
              }}
            >
              <div className="data" style={{ fontSize: 9.5, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)", marginBottom: 8 }}>52-week range</div>
              <div style={{ position: "relative", height: 8, background: "var(--ink-10)", borderRadius: 2 }}>
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, var(--iron), var(--sand), var(--moss))", opacity: 0.25, borderRadius: 2 }} />
                <div style={{ position: "absolute", top: -3, left: `calc(${Math.max(0, Math.min(100, rangePos))}% - 1px)`, width: 2, height: 14, background: "var(--ink)", boxShadow: "0 0 6px var(--hub)" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span className="data" style={{ fontSize: 11.5, color: "var(--iron)" }}>{fmtUsd(lo52)} low</span>
                <span className="data" style={{ fontSize: 11.5, color: "var(--moss)" }}>{fmtUsd(hi52)} high</span>
              </div>
            </IntelCard>
          </div>

          {/* One tiny methodology link (allowed) */}
          <div className="span-12">
            <div className="data" style={{ fontSize: 11, color: "var(--ink-40)", letterSpacing: 0.4 }}>
              Price, cap, volume and performance are live from {m.source}. ATOM has no max supply, so circulating equals total and FDV adds nothing.{" "}
              <a href="/methodology" style={{ color: "var(--hub)", textDecoration: "underline" }}>Methodology</a>
            </div>
          </div>
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
