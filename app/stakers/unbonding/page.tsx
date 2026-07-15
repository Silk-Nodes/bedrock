// /stakers/unbonding - The 21-day undelegation (unbonding) queue, live on-chain.
// A dense card row (each card carries the real daily completion schedule as its
// own timeline) leading the completion chart and the per-wallet/validator tables.

import { MetricCardLive } from "@/components/console/MetricCardLive";
import { ShareBars, ShareColumns } from "@/components/share/ShareCharts";
import {
  ConsolePage, ConsoleModule, IntelCard,
} from "@/components/console/Console";
import { getLiveUndelegations } from "@/lib/undelegations";
import { TipCard } from "@/components/charts/TipCard";
import { AddressLink } from "@/components/address/AddressLink";
import { seo } from "@/lib/seo";

// Live, expensive page (per-validator unbonding fan-out): render on request so
// the fan-out never blocks the build-time static-export budget. Fetch-level
// caching still applies via lib/undelegations.ts.
export const dynamic = "force-dynamic";

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toString();
}
function fmtN(n: number): string { return n.toLocaleString("en-US"); }
function shortAddr(a: string): string { return a ? `${a.slice(0, 12)}…${a.slice(-5)}` : "unlabeled"; }

export const metadata = seo({ title: "Unbonding Queue", description: "The ATOM unbonding queue on the Cosmos Hub: how much stake is exiting, the 21-day completion schedule, and the largest wallets undelegating.", path: "/stakers/unbonding", keywords: ["ATOM unbonding", "Cosmos Hub undelegation", "ATOM unstaking queue"] });

export default async function StakersUnbonding() {
  const u = await getLiveUndelegations();
  const maxDay = Math.max(1, ...u.schedule.map((d) => d.value));

  // The real daily completion schedule, as each card's own timeline.
  const schedulePts = u.schedule.map((d) => ({ date: d.date, value: d.value }));
  // Cumulative ATOM completing through each day (what drains out of the queue).
  let run = 0;
  const cumulativePts = u.schedule.map((d) => { run += d.value; return { date: d.date, value: Math.round(run) }; });
  const next7Pts = schedulePts.slice(0, 7);

  return (
    <ConsolePage>
      <ConsoleModule lead title="Undelegation queue" dot="var(--moss)" meta={`${u.unique_wallets ? fmtN(u.unique_wallets) : "n/a"} wallets · top-10 share ${u.top10_wallets_pct ? `${u.top10_wallets_pct}%` : "n/a"}`}>
      <div className="console-grid">
        {/* The points are a forward completion schedule (and its cumulative
            curve), not history, so the auto delta badge is suppressed. */}
        <div className="span-3">
          <MetricCardLive label="In the 21-day queue" value={fmtCompact(u.total_atom)} unit="ATOM" points={cumulativePts} delta={false} color="var(--moss)" footnote={u.entries ? `${fmtN(u.entries)} entries` : "live unbonding"} />
        </div>
        <div className="span-3">
          <MetricCardLive label="Completing next 7 days" value={fmtCompact(u.completing_7d_atom)} unit="ATOM" points={next7Pts} delta={false} color="var(--iron)" footnote="back to liquid" />
        </div>
        <div className="span-3">
          <MetricCardLive label="Biggest day" value={u.largest_day ? fmtCompact(u.largest_day.atom) : "n/a"} unit="ATOM" points={schedulePts} delta={false} color="var(--moss)" footnote={u.largest_day ? `completes ${u.largest_day.date}` : ""} />
        </div>
        <div className="span-3">
          <MetricCardLive label="Share of bonded" value={u.pct_of_bonded ? `${u.pct_of_bonded.toFixed(2)}%` : "n/a"} points={cumulativePts} delta={false} color="var(--sand)" footnote="queue vs bonded stake" />
        </div>

        <div className="span-12">
          <IntelCard title="Completion schedule" meta={`ATOM completing unbond each of the next ${u.schedule.length} days · hover a day`} shareFilename="bedrock-unbonding-schedule"
            share={{
              title: "ATOM unbonding schedule · Cosmos HUB",
              subtitle: `Completing unbond each of the next ${u.schedule.length} days`,
              big: fmtCompact(u.total_atom), unit: "ATOM in the queue",
              context: `${u.largest_day ? `Peak ${fmtCompact(u.largest_day.atom)} ATOM on ${u.largest_day.date}. ` : ""}${u.pct_of_bonded ? `${u.pct_of_bonded.toFixed(2)}% of bonded stake. ` : ""}Unbonding is an exit from staking, not a sale.`,
              body: <ShareColumns points={u.schedule.map((d) => ({ label: d.date.slice(5), value: d.value }))} unit="ATOM" />,
            }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 180, paddingTop: 10 }}>
              {u.schedule.map((d, i) => {
                const peak = d.value === maxDay;
                const c = peak ? "var(--sand)" : "var(--moss)";
                const totalQ = Math.max(1, u.total_atom);
                return (
                  <div key={d.date} className="tipwrap" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
                    <TipCard title={d.date} rows={[
                      { label: "completes", value: `${fmtCompact(d.value)} ATOM`, valueColor: c },
                      { label: "share of queue", value: `${((d.value / totalQ) * 100).toFixed(1)}%` },
                      ...(peak ? [{ label: "peak day", value: "biggest of the 21", valueColor: "var(--sand)" }] : []),
                    ]} />
                    <div style={{ width: "100%", height: `${(d.value / maxDay) * 100}%`, background: c, opacity: 0.9, boxShadow: `0 0 10px color-mix(in srgb, ${c} 40%, transparent)` }} />
                    {i % 3 === 0 && <span className="data" style={{ fontSize: 8, color: "var(--ink-40)" }}>{d.date.slice(5)}</span>}
                  </div>
                );
              })}
            </div>
            <div className="data" style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--ink-40)", marginTop: 6 }}>
              <span>COMPLETION DATE →</span>
              <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--sand)", marginRight: 5, verticalAlign: -1 }} />peak day · biggest of the window</span>
            </div>
          </IntelCard>
        </div>

        <div className="span-12">
          <IntelCard title="Largest wallets exiting" meta={u.live ? "aggregated across entries, live" : "snapshot"} shareFilename="bedrock-unbonding-wallets"
            share={{
              title: "Largest wallets exiting the ATOM stake · Cosmos HUB",
              subtitle: "Aggregated across unbonding entries, live",
              big: fmtCompact(u.top_wallets.reduce((acc, w) => acc + w.atom, 0)), unit: `ATOM across the top ${u.top_wallets.length}`,
              context: `${u.unique_wallets ? `${fmtN(u.unique_wallets)} wallets in the queue. ` : ""}Unbonding is an exit from staking, not a sale.`,
              body: <ShareBars rows={u.top_wallets.slice(0, 8).map((w) => ({ label: shortAddr(w.delegator), value: w.atom, note: w.next_completion ? `· ${w.next_completion}` : undefined }))} />,
            }}>
            {u.top_wallets.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--ink-60)" }}>Per-wallet detail is unavailable right now.</div>
            ) : (
              <table className="broadsheet mcols-3">
                <thead>
                  <tr>
                    <th>Wallet</th>
                    <th style={{ textAlign: "right" }}>ATOM</th>
                    <th style={{ textAlign: "right" }}>Entries</th>
                    <th style={{ textAlign: "right" }}>Validators</th>
                    <th style={{ textAlign: "right" }}>Next completes</th>
                  </tr>
                </thead>
                <tbody>
                  {u.top_wallets.map((w) => (
                    <tr key={w.delegator}>
                      <td className="data" style={{ fontSize: 12 }}>
                        <AddressLink addr={w.delegator} style={{ color: "var(--ink-80)" }}>{shortAddr(w.delegator)}</AddressLink>
                      </td>
                      <td className="num" style={{ color: "var(--ink)", fontWeight: 600 }}>{fmtN(w.atom)}</td>
                      <td className="num" style={{ color: "var(--ink-60)" }}>{w.entries}</td>
                      <td className="num" style={{ color: "var(--ink-60)" }}>{w.validators}</td>
                      <td className="num" style={{ color: "var(--ink-60)" }}>{w.next_completion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </IntelCard>
        </div>
      </div>
          </ConsoleModule>
    </ConsolePage>
  );
}
