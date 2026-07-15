// /atom/governance - Proposal history + notable props.

import { MetricCard } from "@/components/console/MetricCard";
import {
  ConsolePage, ConsoleModule,
  IntelCard,
} from "@/components/console/Console";
import { GOV_STATS } from "@/data/atom";
import Link from "next/link";
import { getProposalList, getGovStats } from "@/lib/gov";
import { seo } from "@/lib/seo";

export const metadata = seo({ title: "Cosmos Hub Governance", description: "Cosmos Hub governance: active and past ATOM proposals, turnout, quorum, and how the largest stakers and validators vote.", path: "/atom/governance", keywords: ["Cosmos Hub governance", "ATOM proposals", "Cosmos voting", "ATOM governance turnout"] });
export const dynamic = "force-dynamic";

export default async function AtomGovernance() {
  const [{ items: proposals, live: govLive }, stats] = await Promise.all([
    getProposalList(12),
    getGovStats(),
  ]);
  // Live counts when available; otherwise the snapshot. avg turnout / quorum
  // stay from the snapshot (turnout history needs the indexer).
  const totalProps = stats.live ? stats.total : GOV_STATS.total_props;
  const passed = stats.live ? stats.passed : GOV_STATS.passed;
  const rejected = stats.live ? stats.rejected : GOV_STATS.rejected;
  const voting = stats.live ? stats.voting : 0;
  const passRate = totalProps > 0 ? (passed / totalProps) * 100 : 0;
  return (
    <ConsolePage>
      <ConsoleModule lead title="Governance" dot="var(--hub-2)" meta={`${totalProps} legit props · ${passRate.toFixed(0)}% pass rate · ${govLive ? "live, on-chain" : "snapshot"}`}>
      <div className="console-grid">
        {/* Lead cards: gov totals (point-in-time counts, no per-prop time series) */}
        <div className="span-4">
          <MetricCard label="Total proposals" value={totalProps.toString()} series={[]} color="var(--hub)" footnote={stats.live ? "legit, scam-filtered" : "since genesis"} />
        </div>
        <div className="span-4">
          <MetricCard label="Pass rate" value={`${passRate.toFixed(0)}%`} series={[]} color="var(--moss)" footnote={`${passed} passed`} />
        </div>
        <div className="span-4">
          <MetricCard label="In voting" value={voting.toString()} series={[]} color="var(--hub-2)" footnote={stats.live ? "live, on-chain" : "snapshot"} />
        </div>

        <div className="span-4">
          <MetricCard label="Passed" value={passed.toString()} series={[]} color="var(--moss)" footnote="of all history" />
        </div>
        <div className="span-4">
          <MetricCard label="Rejected" value={rejected.toString()} series={[]} color="var(--iron)" footnote="incl. vetoed" />
        </div>
        <div className="span-4">
          <MetricCard label="Quorum" value={`${GOV_STATS.quorum_pct}%`} series={[]} color="var(--sand)" footnote="threshold to count" />
        </div>

        <div className="span-12">
          <IntelCard title="On-chain proposals" meta={govLive ? "live, scam-filtered" : "unavailable"}>
            {proposals.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--ink-60)" }}>No proposals available right now.</div>
            ) : (
              <>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {proposals.map((p, i) => {
                  const seg = [
                    { v: p.tally.yes, c: "var(--moss)" },
                    { v: p.tally.no, c: "var(--iron)" },
                    { v: p.tally.veto, c: "#8B3A2F" },
                    { v: p.tally.abstain, c: "var(--ink-30)" },
                  ];
                  const hasVotes = seg.some((s) => s.v > 0);
                  return (
                    <Link
                      key={p.id}
                      href={`/atom/governance/${p.id}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "56px 1fr 96px 132px 64px",
                        alignItems: "center",
                        gap: 12,
                        padding: "11px 0",
                        borderTop: i === 0 ? "none" : "1px solid var(--ink-10)",
                        textDecoration: "none",
                      }}
                    >
                      <span className="data" style={{ fontSize: 12, color: "var(--ink-60)" }}>#{p.id}</span>
                      <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</span>
                      <span className="data" style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: p.voting ? "var(--hub)" : "var(--ink-60)" }}>{p.statusLabel}</span>
                      {/* Tally micro-bar: yes / no / veto / abstain */}
                      <span className="gbar" style={{ display: "flex", height: 8 }} title={`Yes ${p.tally.yes}% · No ${p.tally.no}% · Veto ${p.tally.veto}% · Abstain ${p.tally.abstain}%`}>
                        {hasVotes ? seg.map((s, k) => <span key={k} className="gbar-seg" style={{ width: `${s.v}%`, "--gbar-c": s.c } as React.CSSProperties} />) : null}
                      </span>
                      <span className="data" style={{ fontSize: 12, color: p.tally.yes >= 50 ? "var(--moss)" : "var(--ink-60)", textAlign: "right" }}>{p.yesPct}% yes</span>
                    </Link>
                  );
                })}
              </div>
              <div className="data" style={{ marginTop: 12, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--ink-40)", display: "flex", gap: 14, flexWrap: "wrap" }}>
                <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--moss)", marginRight: 5 }} />Yes</span>
                <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--iron)", marginRight: 5 }} />No</span>
                <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#8B3A2F", marginRight: 5 }} />Veto</span>
                <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--ink-30)", marginRight: 5 }} />Abstain</span>
              </div>
              </>
            )}
          </IntelCard>
        </div>

      </div>
          </ConsoleModule>
    </ConsolePage>
  );
}
