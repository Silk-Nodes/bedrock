// /exchanges/balance-trend · each exchange's STAKED custody over time, from the
// indexer's daily snapshotter. The series builds forward from when snapshotting
// began (no historical backfill for it), so it shows an honest "accruing" state
// until there are at least two days. Reads ?ex from the filter bar to focus one
// exchange. Verified, high-confidence validators only.

import { ConsolePage, ConsoleModule } from "@/components/console/Console";
import { ChartCard } from "@/components/console/ChartCard";
import { MetricCardLive } from "@/components/console/MetricCardLive";
import { Soon } from "@/components/console/Soon";
import { LineChart, type Series } from "@/components/charts/LineChart";
import { getCustodyHistory } from "@/lib/indexer";
import { ShareLineChart } from "@/components/share/ShareCharts";
import { seo } from "@/lib/seo";

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return Math.round(n).toString();
}

export const revalidate = 1800;
export const metadata = seo({ title: "Balance Trend", description: "The trend in ATOM held on exchanges over time: are balances accumulating or draining, and how the bonded share has shifted.", path: "/exchanges/balance-trend", keywords: ["ATOM exchange balance", "Cosmos Hub exchange reserves", "ATOM balance trend"] });

const ENTITY_COLOR: Record<string, string> = {
  Coinbase: "var(--hub)", Kraken: "var(--hub-2)", Binance: "var(--iron)",
  Upbit: "var(--moss)", OKX: "var(--slate)", Coinone: "var(--sand)",
};

export default async function BalanceTrendPage({ searchParams }: { searchParams: Promise<{ ex?: string }> }) {
  const sp = await searchParams;
  const ex = sp?.ex ?? "";
  const { points, live } = await getCustodyHistory(90);

  const days = new Set(points.map((p) => p.day));
  if (!live || days.size < 2) {
    return (
      <ConsolePage>
        <ConsoleModule>
          <Soon
            title="Exchange custody trend"
            note={
              live
                ? `The indexer records each exchange's staked custody once a day. ${days.size === 1 ? "One day captured so far" : "No snapshots yet"}; the trend chart appears once there are at least two days. No backfilled or estimated balances, it builds forward from here.`
                : "Each exchange's staked custody over time loads here from the indexer's daily snapshots. Connecting…"
            }
          />
        </ConsoleModule>
      </ConsolePage>
    );
  }

  // Pivot into one series per entity (or just the selected one).
  const entities = [...new Set(points.map((p) => p.entity))].filter((e) => !ex || e === ex).sort();
  const allDays = [...days].sort();
  const series: Series[] = entities.map((entity) => {
    const byDay = new Map(points.filter((p) => p.entity === entity).map((p) => [p.day, p.bonded_atom]));
    return {
      label: entity,
      color: ENTITY_COLOR[entity] ?? "var(--hub)",
      points: allDays.map((d) => ({ date: d, value: Math.round(byDay.get(d) ?? 0) })),
    };
  });

  const scope = ex || "all exchanges";
  // Per-exchange custody cards, each carrying its own daily timeline (3M/6M/1Y/ALL + hover).
  const cards = series
    .map((s) => {
      const pts = s.points.map((p) => ({ date: p.date, value: p.value }));
      const last = pts.length ? pts[pts.length - 1].value : 0;
      return { entity: s.label, color: s.color, pts, last };
    })
    .filter((c) => c.last > 0)
    .sort((a, b) => b.last - a.last)
    .slice(0, 8);

  return (
    <ConsolePage>
      <ConsoleModule lead dot="var(--hub)" title="Balance trend · staked custody" meta={`${scope} · ${allDays.length} day${allDays.length === 1 ? "" : "s"} · from the Bedrock indexer`}>
        <div className="console-grid">
          {cards.map((c, i) => {
            // Spans chosen so every row fills all 12 columns for any card
            // count (a lone filtered card must not leave a hole in the row).
            const n = cards.length;
            const span =
              n === 1 ? "span-12"
              : n === 2 ? "span-6"
              : n === 3 || n === 6 ? "span-4"
              : n === 5 ? (i < 3 ? "span-4" : "span-6")
              : n === 7 ? (i < 4 ? "span-3" : "span-4")
              : "span-3"; // 4 or 8
            return (
              <div key={c.entity} className={span}>
                <MetricCardLive label={c.entity} value={fmt(c.last)} unit="ATOM" points={c.pts} color={c.color} footnote="staked custody · daily snapshots" />
              </div>
            );
          })}

          <div className="span-12">
            <ChartCard
              title="Exchange staked custody over time"
              meta="daily snapshots · verified validators · builds forward, no backfill"
              accentColor="var(--hub)"
              shareFilename="bedrock-exchange-custody-trend"
              share={{ title: "Exchange custody over time · Cosmos HUB", subtitle: "ATOM staked per exchange, daily", context: "From Bedrock's own daily snapshots of each exchange's verified validator custody.", body: <ShareLineChart series={series} unit="ATOM" height={260} /> }}
            >
              <LineChart series={series} yLabel="ATOM STAKED" height={320} />
            </ChartCard>
            <div style={{ marginTop: 12, fontSize: 11, color: "var(--ink-40)" }}>Staked custody only (delegated to each exchange&apos;s validators). Hot-wallet liquid balances excluded until verified.</div>
          </div>
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
