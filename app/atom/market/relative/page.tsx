// /atom/market/relative · ATOM relative performance (hl.eco-style). Left: ATOM
// vs the majors, every line rebased to 0% at the start of the selected window.
// Right: ATOM/X pair table over 7d/30d/1y, the relative return of holding ATOM
// instead of X. Market data only; no estimates.

import { ConsolePage, ConsoleModule, IntelCard } from "@/components/console/Console";
import { Soon } from "@/components/console/Soon";
import { RelPerfChart } from "@/components/atom/RelPerfChart";
import { getPerfHistory, getRelPerfTable } from "@/lib/relperf";
import { getShareBlock } from "@/lib/indexer";
import { ShareBars } from "@/components/share/ShareCharts";
import { seo } from "@/lib/seo";

export const revalidate = 600;
export const metadata = seo({ title: "ATOM Relative Performance", description: "ATOM versus BTC, ETH, SOL, HYPE and the majors: indexed performance over 7d to 1y, and the ATOM/X pair table.", path: "/atom/market/relative", keywords: ["ATOM vs BTC", "ATOM vs ETH", "ATOM relative performance", "ATOM pair performance"] });

function cell(v: number) {
  const c = v >= 0 ? "var(--moss)" : "var(--iron)";
  return <span className="num" style={{ color: c, fontWeight: 600 }}>{Number.isFinite(v) ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}%` : "n/a"}</span>;
}

export default async function AtomRelative() {
  const [hist, table] = await Promise.all([getPerfHistory(), getRelPerfTable()]);

  if (!hist.live && !table.live) {
    return (
      <ConsolePage>
        <ConsoleModule lead>
          <Soon title="Relative performance" note="Market data providers unreachable right now. Live comparisons return when they do; no cached estimates." />
        </ConsoleModule>
      </ConsolePage>
    );
  }

  // The relative-performance snapshot is built INSIDE RelPerfChart, not here.
  // IntelCard is an async server component, so a share body passed as a prop is
  // frozen at render time and cannot see the chart's range state: picking 30D
  // still produced a one-year card, because REL_DAYS was hardcoded to 365 here
  // while the chart itself defaults to 90D. The button now lives next to the
  // range control that determines it, which is also where it belongs.
  const shareBlock = await getShareBlock();

  return (
    <ConsolePage>
      <ConsoleModule lead title="ATOM · Relative performance" dot="var(--hub)" meta="vs the majors · indexed to the window start · live market data">
        <div className="console-grid">
          {hist.live && (
            <div className="span-12">
              <IntelCard title="ATOM vs the majors" meta="rebased to 0% at window start">
                <RelPerfChart series={hist.series} shareBlock={shareBlock} />
              </IntelCard>
            </div>
          )}
          {table.live && (
            <div className="span-12">
              <IntelCard title="ATOM/X pairs" meta="relative return of holding ATOM instead of X · sorted by 7D" shareFilename="bedrock-atom-pairs" share={{ title: "ATOM/X pairs · Cosmos HUB", subtitle: "Relative return of holding ATOM instead of X, over 30 days", context: "Green means ATOM outperformed the counter-asset over the horizon. Sorted by the largest 30d gap either way.", body: <ShareBars diverging positiveColor="var(--moss)" negativeColor="var(--iron)" unit="" maxRows={8} rows={[...table.pairs].filter((p) => Number.isFinite(p.rel30d)).sort((a, b) => Math.abs(b.rel30d) - Math.abs(a.rel30d)).slice(0, 8).map((p) => ({ label: `ATOM/${p.symbol}`, value: p.rel30d, display: `${p.rel30d >= 0 ? "+" : ""}${p.rel30d.toFixed(1)}%` }))} /> }}>
                <div className="mgrid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
                  {[table.pairs.slice(0, Math.ceil(table.pairs.length / 2)), table.pairs.slice(Math.ceil(table.pairs.length / 2))].map((half, hi) => (
                    <table key={hi} className="broadsheet">
                      <thead>
                        <tr><th>Pair</th><th style={{ textAlign: "right" }}>7D</th><th style={{ textAlign: "right" }}>30D</th><th style={{ textAlign: "right" }}>1Y</th></tr>
                      </thead>
                      <tbody>
                        {half.map((p) => (
                          <tr key={p.symbol}>
                            <td style={{ whiteSpace: "nowrap" }}><span style={{ color: "var(--ink-40)" }}>ATOM/</span><strong style={{ color: "var(--ink)" }}>{p.symbol}</strong></td>
                            <td style={{ textAlign: "right" }}>{cell(p.rel7d)}</td>
                            <td style={{ textAlign: "right" }}>{cell(p.rel30d)}</td>
                            <td style={{ textAlign: "right" }}>{cell(p.rel1y)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ))}
                </div>
              </IntelCard>
            </div>
          )}
          <div className="span-12">
            <div className="data" style={{ fontSize: 11, color: "var(--ink-40)", letterSpacing: 0.2 }}>
              Pair cells are the relative return of holding ATOM instead of the counter-asset over the horizon: (1 + ATOM%) / (1 + X%) − 1. Green = ATOM outperformed. Chart series are daily closes rebased to 0% at the selected window start. Sources: CoinGecko (pair table), Coinpaprika (daily history), each cached ≤ 1h.
            </div>
          </div>
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
