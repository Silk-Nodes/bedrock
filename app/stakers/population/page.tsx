// /stakers/population · how many wallets stake ATOM, and how that base is
// distributed by size.
//
// This page was a PendingData placeholder that said it was waiting on the
// backfill. That was wrong twice over. The backfill produces EVENTS, not
// per-address balances, so finishing it changed nothing here. And the data it
// was waiting for already existed: the daily holder crawl walks every bonded
// validator's full delegation list (943,921 stakers on 2026-08-11) and rolls
// the result into holder_snapshots.
//
// WHAT IS EXACT HERE: every figure comes from that crawl, which reads balances
// from the chain rather than deriving them. stakers_total is a count of
// addresses with bonded ATOM; tiers are counts of wallets by holding size.
//
// WHAT IS NOT ON THIS PAGE, and why:
//   - Retention and churn by vintage. Computable from staking_events, but a
//     wallet that never claims and never moves emits no events while staying
//     bonded, so "inactive" would read as "left". Needs care, not just a query.
//   - Stake-weighted loyalty over time. Needs per-address stake joined to first
//     delegation date, held historically. The crawl computes per-address stake
//     and already does vintage enrichment for the top 100, but only the rollup
//     is persisted, so there is nothing to look back at.
//
// DO NOT derive per-wallet stake from staking_events to fill those gaps. Summing
// delegate minus unbond over all history gives 521M ATOM against a chain truth
// of 330M, because 181M of it sits with validators that have left the active set
// and slashing emits no event. Restricting to cosmoshub-4 still lands 11.7% out.

import { MetricCard } from "@/components/console/MetricCard";
import { ConsolePage, ConsoleModule, IntelCard } from "@/components/console/Console";
import { Soon } from "@/components/console/Soon";
import { getHolders, getStakerPopulation, getStakerVintage, type HolderSnap } from "@/lib/indexer";
import { seo } from "@/lib/seo";

export const revalidate = 600;
export const metadata = seo({
  title: "Staker Population",
  description:
    "How many wallets stake ATOM on the Cosmos Hub, how that population has changed, and how the base splits across holding-size cohorts.",
  path: "/stakers/population",
  keywords: ["ATOM stakers count", "Cosmos Hub delegators", "ATOM staking population", "ATOM holder cohorts"],
});

const fmt = (n: number) => n.toLocaleString("en-US");
const compact = (n: number) =>
  Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : Math.abs(n) >= 1_000 ? `${Math.round(n / 1_000)}k` : `${Math.round(n)}`;

// Tier keys are cumulative counts of wallets holding at least that much, so the
// band for each rung is the rung minus the one above it. Reading t10 as "wallets
// with 10 to 100 ATOM" without that subtraction overstates every row.
const RUNGS: { key: keyof HolderSnap["tiers"]; label: string; next?: keyof HolderSnap["tiers"] }[] = [
  { key: "t1m", label: "1M+ ATOM" },
  { key: "t100k", label: "100k to 1M", next: "t1m" },
  { key: "t10k", label: "10k to 100k", next: "t100k" },
  { key: "t1k", label: "1k to 10k", next: "t10k" },
  { key: "t100", label: "100 to 1k", next: "t1k" },
  { key: "t10", label: "10 to 100", next: "t100" },
];

export default async function StakersPopulation() {
  const [h, months, vintage] = await Promise.all([getHolders(), getStakerPopulation(), getStakerVintage()]);

  if (!h.available || !h.latest) {
    return (
      <ConsolePage>
        <ConsoleModule title="Stakers · population & cohorts" lead dot="var(--moss)">
          <Soon
            title="Population & cohorts"
            note="Live, verified data lands here when the daily holder crawl is reachable. We do not show estimates or placeholder numbers."
          />
        </ConsoleModule>
      </ConsolePage>
    );
  }

  const latest = h.latest;
  const hist = h.history;
  const first = hist[0] ?? latest;
  const days = hist.length;

  const stakingRate = latest.holders_total > 0 ? (latest.stakers_total / latest.holders_total) * 100 : 0;

  const rungs = RUNGS.map((r) => {
    const above = r.next ? latest.tiers[r.next] : 0;
    return { label: r.label, wallets: Math.max(0, latest.tiers[r.key] - above) };
  });
  const rungMax = Math.max(...rungs.map((r) => r.wallets), 1);

  const top100Share = latest.total_atom > 0 ? (latest.top100_atom / latest.total_atom) * 100 : 0;

  return (
    <ConsolePage>
      <ConsoleModule
        title="Stakers · population & cohorts"
        meta={`${days}d of daily crawls · to ${latest.day}`}
        lead
        dot="var(--moss)"
      >
        <div className="console-grid">
          <div className="span-3">
            <MetricCard
              label="Wallets staking ATOM"
              value={fmt(latest.stakers_total)}
              series={hist.map((p) => p.stakers_total)}
              color="var(--moss)"
              footnote={`every bonded validator's delegator list, crawled ${latest.day}`}
            />
          </div>
          <div className="span-3">
            {/* Not a "change over N days" card: MetricCard already renders that
                delta from the same series, so it would state -4.5% twice. The
                staking rate is independent of it. */}
            <MetricCard
              label="Share of holders who stake"
              value={`${stakingRate.toFixed(1)}%`}
              series={hist.map((p) => (p.holders_total > 0 ? (p.stakers_total / p.holders_total) * 100 : 0))}
              color="var(--sand)"
              footnote={`${fmt(latest.stakers_total)} of ${fmt(latest.holders_total)} wallets`}
            />
          </div>
          <div className="span-3">
            <MetricCard
              label="Wallets holding ATOM"
              value={fmt(latest.holders_total)}
              series={hist.map((p) => p.holders_total)}
              color="var(--hub)"
              footnote="staking and not staking, combined"
            />
          </div>
          <div className="span-3">
            <MetricCard
              label="Top 100 share"
              value={`${top100Share.toFixed(1)}%`}
              series={hist.map((p) => (p.total_atom > 0 ? (p.top100_atom / p.total_atom) * 100 : 0))}
              color="var(--iron)"
              footnote={`${compact(latest.top100_atom)} of ${compact(latest.total_atom)} ATOM`}
            />
          </div>
        </div>
      </ConsoleModule>

      <div style={{ marginTop: 12 }}>
        <ConsoleModule title="Size cohorts" meta={`${latest.day} · wallets by holding`} headingLevel={2} dot="var(--sand)">
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 880 }}>
            {rungs.map((r) => (
              <div key={r.label} style={{ display: "grid", gridTemplateColumns: "150px 1fr 110px", alignItems: "center", gap: 16 }}>
                <span className="data" style={{ fontSize: 11.5, color: "var(--ink-70)" }}>{r.label}</span>
                <div style={{ height: 22, background: "var(--paper-2)", borderRadius: 2, position: "relative", overflow: "hidden" }}>
                  <div
                    style={{
                      position: "absolute",
                      inset: "0 auto 0 0",
                      width: `${Math.max(0.4, (r.wallets / rungMax) * 100)}%`,
                      background: "var(--hub)",
                      borderRadius: 2,
                    }}
                  />
                </div>
                <span className="data" style={{ fontSize: 12.5, color: "var(--ink)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {fmt(r.wallets)}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, fontSize: 13, lineHeight: 1.6, color: "var(--ink-60)", maxWidth: 760 }}>
            Counts of wallets, by combined liquid and bonded ATOM, read from the chain on {latest.day}. Each rung is
            exclusive: the 10 to 100 band excludes everything above it.
          </div>
        </ConsoleModule>
      </div>

      <div style={{ marginTop: 12 }}>
        <ConsoleModule title="Population, day by day" meta={`${first.day} → ${latest.day}`} headingLevel={2} dot="var(--hub)">
          <IntelCard title="Wallets staking ATOM" meta={`${days} daily crawls`}>
            <Sparkline points={hist.map((p) => p.stakers_total)} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12 }} className="data">
              <span style={{ color: "var(--ink-50)" }}>{first.day} · {fmt(first.stakers_total)}</span>
              <span style={{ color: "var(--ink)" }}>{latest.day} · {fmt(latest.stakers_total)}</span>
            </div>
          </IntelCard>
          <div style={{ marginTop: 14, fontSize: 13, lineHeight: 1.65, color: "var(--ink-60)", maxWidth: 780 }}>
            History starts at the first crawl, {first.day}, and grows a day at a time. There is no earlier series to
            show: the crawl reads balances from the chain and nothing recorded them before that date.
          </div>
        </ConsoleModule>
      </div>

      {months.length > 0 && (() => {
        const byYear = new Map<string, { added: number; cum: number }>();
        for (const m of months) {
          const y = m.month.slice(0, 4);
          const e = byYear.get(y) ?? { added: 0, cum: 0 };
          byYear.set(y, { added: e.added + m.newDelegators, cum: Math.max(e.cum, m.cumulative) });
        }
        const years = [...byYear.entries()].sort((a, b) => a[0].localeCompare(b[0]));
        const yMax = Math.max(...years.map(([, v]) => v.added), 1);
        const everStaked = months[months.length - 1]?.cumulative ?? 0;
        const recent = months.slice(-24);
        return (
          <div style={{ marginTop: 12 }}>
            <ConsoleModule
              title="Since 2019"
              meta={`${months[0].month.slice(0, 7)} → ${months[months.length - 1].month.slice(0, 7)}`}
              headingLevel={2}
              dot="var(--hub-2)"
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 40, marginBottom: 26 }}>
                <div>
                  <div className="data" style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-50)", marginBottom: 6 }}>
                    Wallets that have ever staked
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 34, color: "var(--ink)", letterSpacing: "-0.02em" }}>
                    {fmt(everStaked)}
                  </div>
                </div>
                <div>
                  <div className="data" style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-50)", marginBottom: 6 }}>
                    New in the last full month
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 34, color: "var(--ink)", letterSpacing: "-0.02em" }}>
                    {fmt(months[months.length - 2]?.newDelegators ?? 0)}
                  </div>
                </div>
              </div>

              <div className="data" style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-50)", marginBottom: 10 }}>
                First-time stakers, by year
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 880 }}>
                {years.map(([y, v]) => (
                  <div key={y} style={{ display: "grid", gridTemplateColumns: "60px 1fr 110px", alignItems: "center", gap: 16 }}>
                    <span className="data" style={{ fontSize: 12, color: "var(--ink-70)" }}>{y}</span>
                    <div style={{ height: 20, background: "var(--paper-2)", borderRadius: 2, position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", inset: "0 auto 0 0", width: `${Math.max(0.4, (v.added / yMax) * 100)}%`, background: "var(--hub-2)", borderRadius: 2 }} />
                    </div>
                    <span className="data" style={{ fontSize: 12.5, color: "var(--ink)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {fmt(v.added)}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 26 }}>
                <div className="data" style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-50)", marginBottom: 8 }}>
                  Wallets active per month, last 24 months
                </div>
                <Sparkline points={recent.map((m) => m.active)} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12 }} className="data">
                  <span style={{ color: "var(--ink-50)" }}>{recent[0].month.slice(0, 7)} · {fmt(recent[0].active)}</span>
                  <span style={{ color: "var(--ink)" }}>{recent[recent.length - 1].month.slice(0, 7)} · {fmt(recent[recent.length - 1].active)}</span>
                </div>
              </div>

              <div style={{ marginTop: 18, fontSize: 13, lineHeight: 1.65, color: "var(--ink-60)", maxWidth: 800 }}>
                First-time stakers counts a wallet the month it first delegated, so it never double counts. Active
                counts wallets that took any staking action that month, which is activity rather than headcount: a
                wallet that delegates once and never claims again emits no events while staying bonded. A fall means
                fewer wallets acted, not that stakers left.
              </div>
            </ConsoleModule>
          </div>
        );
      })()}

      {vintage.length > 0 && (() => {
        // Latest day only. The series accrues forward and is one row per vintage
        // year per day, so the newest day is the current picture.
        const latestDay = vintage[vintage.length - 1].day;
        const rows = vintage.filter((v) => v.day === latestDay).sort((a, b) => a.year - b.year);
        const totalAtom = rows.reduce((n, r) => n + r.atom, 0);
        const maxAtom = Math.max(...rows.map((r) => r.atom), 1);
        return (
          <div style={{ marginTop: 12 }}>
            <ConsoleModule
              title="Stake by joining year"
              meta={`${latestDay} · who holds the stake today`}
              headingLevel={2}
              dot="var(--moss)"
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 9, maxWidth: 900 }}>
                {rows.map((r) => (
                  <div key={r.year} style={{ display: "grid", gridTemplateColumns: "110px 1fr 150px 90px", alignItems: "center", gap: 14 }}>
                    <span className="data" style={{ fontSize: 12, color: "var(--ink-70)" }}>
                      {r.year === 0 ? "unknown" : `joined ${r.year}`}
                    </span>
                    <div style={{ height: 20, background: "var(--paper-2)", borderRadius: 2, position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", inset: "0 auto 0 0", width: `${Math.max(0.4, (r.atom / maxAtom) * 100)}%`, background: "var(--moss-text)", borderRadius: 2 }} />
                    </div>
                    <span className="data" style={{ fontSize: 12.5, color: "var(--ink)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {compact(r.atom)} ATOM
                    </span>
                    <span className="data" style={{ fontSize: 12, color: "var(--ink-50)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {totalAtom > 0 ? `${((r.atom / totalAtom) * 100).toFixed(1)}%` : "·"}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, fontSize: 13, lineHeight: 1.65, color: "var(--ink-60)", maxWidth: 820 }}>
                ATOM staked right now, grouped by the year each wallet first delegated. Balances are read from the
                chain, not derived from events. &ldquo;unknown&rdquo; is stake held by addresses with no captured
                delegate event, kept separate rather than folded into a year.
              </div>
            </ConsoleModule>
          </div>
        );
      })()}

      <div style={{ marginTop: 12 }}>
        <ConsoleModule title="Not here yet" headingLevel={2} dot="var(--ink-40)">
          <div style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--ink-70)", maxWidth: 800 }}>
            <p style={{ margin: "0 0 10px" }}>
              <strong>Loyalty weighted by stake.</strong> The crawl computes every staker&apos;s balance and already
              tags the top 100 with the date they first delegated. Only the rollup is kept, so there is no history to
              look back through. Persisting the vintage tag for the whole base is what unlocks it.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Retention and churn.</strong> First-delegation dates are exact and go back to 2019. The trap is
              that a wallet which never claims and never moves emits no events while staying bonded, so activity
              silence would read as departure. That distinction has to be built before the number is worth publishing.
            </p>
          </div>
        </ConsoleModule>
      </div>
    </ConsolePage>
  );
}

// Minimal inline sparkline: the series is short (one point per daily crawl) and
// does not warrant pulling in the chart stack.
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const W = 900, H = 120;
  const mn = Math.min(...points), mx = Math.max(...points);
  const span = mx - mn || 1;
  const d = points
    .map((v, i) => `${((i / (points.length - 1)) * W).toFixed(1)},${(H - ((v - mn) / span) * (H - 8) - 4).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 120, display: "block" }} preserveAspectRatio="none">
      <polyline points={d} fill="none" stroke="var(--moss)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
