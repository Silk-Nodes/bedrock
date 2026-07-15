// /atom/market/trade · where to buy & sell ATOM, live. The CEX and DEX markets
// ranked by 24h volume, with the cheapest liquid price, the CEX-vs-DEX split,
// and a trade link per venue. Data from CoinGecko tickers (CEX + DEX incl.
// Osmosis), with Coinpaprika as the CEX fallback. Volume is the liquidity proxy.

import { ConsolePage, ConsoleModule, IntelCard } from "@/components/console/Console";
import { MetricCard } from "@/components/console/MetricCard";
import { getAtomMarkets, type AtomMarketRow } from "@/lib/price";
import { ShareStack } from "@/components/share/ShareCharts";
import { seo } from "@/lib/seo";

export const revalidate = 300;

function fmtUsd(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(2)}`;
}

export const metadata = seo({ title: "Where to Trade ATOM", description: "Where to buy and trade ATOM: the major centralized and decentralized venues by liquidity, with custody and staking notes for each.", path: "/atom/market/trade", keywords: ["buy ATOM", "trade ATOM", "ATOM exchanges", "where to buy ATOM"] });

function MarketTable({ rows }: { rows: AtomMarketRow[] }) {
  return (
    <table className="broadsheet mfit mhide4">
      <thead>
        <tr>
          <th style={{ width: 28 }}>#</th>
          <th>Venue</th>
          <th>Pair</th>
          <th style={{ textAlign: "right" }}>Price</th>
          <th style={{ textAlign: "right" }}>24h volume</th>
          <th style={{ textAlign: "right", width: 84 }}>Share</th>
          <th style={{ width: 70 }} />
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.exchange}-${r.pair}-${i}`}>
            <td className="data" style={{ fontSize: 11, color: "var(--ink-30)" }}>{i + 1}</td>
            <td style={{ fontWeight: 600, color: "var(--ink)" }}>{r.exchange}</td>
            <td className="data" style={{ fontSize: 12, color: "var(--ink-60)", maxWidth: 130, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.pair}</td>
            <td className="num" style={{ color: "var(--ink)" }}>${r.priceUsd.toFixed(3)}</td>
            <td className="num" style={{ fontWeight: 700, color: "var(--ink)" }}>{fmtUsd(r.volumeUsd)}</td>
            <td className="num" style={{ color: "var(--ink-50)" }}>{r.share < 0.1 ? "<0.1%" : `${r.share}%`}</td>
            <td style={{ textAlign: "right" }}>
              {r.tradeUrl ? (
                <a href={r.tradeUrl} target="_blank" rel="noopener noreferrer nofollow" className="data" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, color: "var(--hub)", textDecoration: "none" }}>Trade ↗</a>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function AtomTrade() {
  const m = await getAtomMarkets();
  const cex = m.rows.filter((r) => !r.isDex).slice(0, 20);
  const dex = m.rows.filter((r) => r.isDex).slice(0, 12);
  const dexShare = m.totalVolUsd > 0 ? (m.dexVolUsd / m.totalVolUsd) * 100 : 0;
  const cexShare = 100 - dexShare;

  return (
    <ConsolePage>
      <ConsoleModule lead dot="var(--hub-2)" title="Where to trade ATOM" meta={m.live ? `live · ${m.venues} venues · CEX + DEX` : "snapshot"}>
        <div className="console-grid">
          {/* Lead facts */}
          <div className="span-3"><MetricCard label="Cheapest price" value={`$${m.bestBuyUsd.toFixed(3)}`} series={[]} color="var(--moss)" footnote="best liquid market" /></div>
          <div className="span-3"><MetricCard label="24h volume" value={fmtUsd(m.totalVolUsd)} series={[]} color="var(--hub)" footnote="across tracked markets" /></div>
          <div className="span-3"><MetricCard label="Venues" value={String(m.venues)} series={[]} color="var(--sand)" footnote="CEX + DEX" /></div>
          <div className="span-3"><MetricCard label="On DEXs" value={`${dexShare.toFixed(0)}%`} series={[]} color="var(--sand)" footnote="of 24h volume" /></div>

          {/* CEX vs DEX split */}
          <div className="span-12">
            <IntelCard title="CEX vs DEX" meta="share of 24h volume" shareFilename="bedrock-atom-trade"
              share={{ title: "Where ATOM trades · Cosmos HUB", subtitle: "CEX vs DEX share of 24h ATOM volume", big: fmtUsd(m.totalVolUsd), unit: "24h volume", context: "Live ATOM markets ranked by 24h volume, split between centralized exchanges and on-chain DEXes like Osmosis.", body: <ShareStack rows={[{ label: "", segments: [{ label: `CEX · ${fmtUsd(m.cexVolUsd)}`, value: m.cexVolUsd, color: "var(--hub)" }, { label: `DEX · ${fmtUsd(m.dexVolUsd)}`, value: m.dexVolUsd, color: "var(--sand)" }] }]} /> }}>
              <div style={{ display: "flex", width: "100%", height: 22, overflow: "hidden", borderRadius: 2, background: "var(--ink-10)" }}>
                {cexShare > 0 && <div style={{ width: `${cexShare}%`, background: "var(--hub)" }} />}
                {dexShare > 0 && <div style={{ width: `${Math.max(dexShare, 0.8)}%`, background: "var(--sand)" }} />}
              </div>
              <div style={{ display: "flex", gap: 28, marginTop: 14, flexWrap: "wrap", fontSize: 13, color: "var(--ink-80)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ width: 12, height: 12, background: "var(--hub)" }} /> CEX <strong style={{ color: "var(--ink)" }}>{fmtUsd(m.cexVolUsd)}</strong> · {cexShare.toFixed(0)}%</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ width: 12, height: 12, background: "var(--sand)" }} /> DEX <strong style={{ color: "var(--ink)" }}>{fmtUsd(m.dexVolUsd)}</strong> · {dexShare.toFixed(0)}%</span>
              </div>
            </IntelCard>
          </div>

          {/* CEX markets */}
          <div className="span-12">
            <IntelCard title="Centralized exchanges" meta={`top ${cex.length} by volume`}>
              {cex.length ? <MarketTable rows={cex} /> : <div style={{ fontSize: 13, color: "var(--ink-50)" }}>Market data is unavailable right now.</div>}
            </IntelCard>
          </div>

          {/* DEX markets */}
          <div className="span-12">
            <IntelCard title="Decentralized exchanges" meta="on-chain · Osmosis & others">
              {dex.length ? <MarketTable rows={dex} /> : (
                <div style={{ fontSize: 13, color: "var(--ink-50)", lineHeight: 1.6 }}>No on-chain DEX markets are being reported right now. ATOM trades on Osmosis (the main Cosmos DEX); it reappears here when the market feed lists it.</div>
              )}
            </IntelCard>
          </div>

          {/* Methodology */}
          <div className="span-12">
            <div className="data" style={{ fontSize: 11, color: "var(--ink-40)", letterSpacing: 0.4, lineHeight: 1.6 }}>
              Markets, prices and 24h volume are live from {m.source} (CEX + DEX, including Osmosis). Ranking is by reported 24h volume, the available liquidity proxy, not order-book depth. &ldquo;Trade&rdquo; links open the venue directly; always verify the pair before trading. Not financial advice.
            </div>
          </div>
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
