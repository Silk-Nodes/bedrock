// /validators · section landing. Slimmed to a router plus its one unique asset:
// live MOMENTUM (net delegation per validator from the indexer), which no other
// page has. The concentration metrics (top-10, Nakamoto, largest) live solely on
// /validators/concentration; the full set table on /validators/set; commission on
// /validators/commission. Nothing here repeats them.

import Link from "next/link";
import { ConsolePage, ConsoleModule, IntelCard } from "@/components/console/Console";
import { MetricCard } from "@/components/console/MetricCard";
import { getLiveValidators } from "@/lib/validators";
import { getValidatorFlow } from "@/lib/indexer";
import { seo } from "@/lib/seo";

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return Math.round(n).toString();
}

function fmtSigned(n: number): string {
  const a = Math.abs(n);
  const c = a >= 1_000_000 ? `${(a / 1_000_000).toFixed(2)}M` : a >= 1_000 ? `${(a / 1_000).toFixed(1)}k` : Math.round(a).toString();
  return (n >= 0 ? "+" : "−") + c;
}
function flowSpan(s: string | null, e: string | null): string {
  if (!s || !e) return "recent";
  const h = (new Date(e).getTime() - new Date(s).getTime()) / 3_600_000;
  if (h < 1.5) return `${Math.max(1, Math.round(h * 60))}m`;
  if (h < 36) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}

export const metadata = seo({ title: "Validators", description: "The Cosmos Hub validator set: voting power, commission, concentration, and the Nakamoto coefficient, ranked from on-chain data.", path: "/validators", keywords: ["Cosmos Hub validators", "ATOM validators", "validator commission", "Nakamoto coefficient"] });
export const revalidate = 300;

const SUBPAGES = [
  { href: "/validators/set", title: "The set", blurb: "Every bonded validator with live voting power, commission, and uptime." },
  { href: "/validators/concentration", title: "Concentration", blurb: "Top-10 share, the Nakamoto coefficient, and how dominant the largest are." },
  { href: "/validators/commission", title: "Commission", blurb: "Fee rates across the set: the distribution, average, and range." },
];

export default async function ValidatorsConsole() {
  const [live, flow] = await Promise.all([getLiveValidators(0), getValidatorFlow(168, 400)]);

  const monikerByOper = new Map(live.validators.map((v) => [v.operator, v.moniker]));
  const momoName = (oper: string) => monikerByOper.get(oper) ?? `${oper.slice(0, 14)}…`;
  const gainers = flow.rows.filter((r) => r.net_atom > 0).slice(0, 5);
  const losers = flow.rows.filter((r) => r.net_atom < 0).slice(-5).reverse();
  const span = flowSpan(flow.window_start, flow.window_end);
  const hasMomentum = flow.live && (gainers.length > 0 || losers.length > 0);

  // Live shapes for the lead cards (cross-sectional, honest live data).
  const vpPctDesc = live.validators.map((v) => v.voting_power_pct);
  const netSorted = [...flow.rows].map((r) => r.net_atom).sort((a, b) => b - a);
  const inflow = flow.rows.filter((r) => r.net_atom > 0).reduce((s, r) => s + r.net_atom, 0);
  const outflow = flow.rows.filter((r) => r.net_atom < 0).reduce((s, r) => s + Math.abs(r.net_atom), 0);
  const netTotal = inflow - outflow;
  const topGain = gainers[0];
  const topLose = losers[0];

  return (
    <ConsolePage>
      <ConsoleModule title="Validators" lead dot="var(--slate)" meta={live.live ? "live on-chain" : "snapshot"}>
        <div className="console-grid">
          {/* Lead row: live set vitals + indexed momentum, each its own shape.
              Six KPIs on one even span-2 row so the grid fills edge to edge.
              All series here are cross-sectional distributions, not timelines,
              so the auto delta badge is suppressed (delta={false}). */}
          <div className="span-2">
            <MetricCard label="Active validators" value={`${live.active}`} series={vpPctDesc} delta={false} color="var(--hub)" trendLabel="VP per validator, high → low" footnote="bonded · permissionless entry" />
          </div>
          <div className="span-2">
            <MetricCard label="Nakamoto coefficient" value={live.live ? `${live.nakamoto}` : "n/a"} series={vpPctDesc} delta={false} color="var(--hub-2)" trendLabel="VP distribution" footnote="validators to halt the chain" />
          </div>
          <div className="span-2">
            <MetricCard label="Top-10 share" value={live.live ? `${live.top10_pct.toFixed(1)}%` : "n/a"} series={vpPctDesc.slice(0, 10)} delta={false} color="var(--sand)" trendLabel="top 10, high → low" footnote="of voting power, live" />
          </div>
          <div className="span-2">
            <MetricCard
              label="Net delegation"
              value={hasMomentum ? `${netTotal >= 0 ? "+" : "−"}${fmtCompact(Math.abs(netTotal))}` : "n/a"}
              unit="ATOM"
              series={netSorted}
              delta={false}
              color={netTotal >= 0 ? "var(--moss)" : "var(--iron)"}
              trendLabel={`per validator · last ${span}`}
              footnote={hasMomentum ? `+${fmtCompact(inflow)} in · −${fmtCompact(outflow)} out` : "indexer accruing a window"}
            />
          </div>
          <div className="span-2">
            <MetricCard
              label="Top inflow"
              value={topGain ? `+${fmtCompact(topGain.net_atom)}` : "n/a"}
              unit="ATOM"
              series={gainers.map((r) => r.net_atom)}
              delta={false}
              color="var(--moss)"
              trendLabel={`last ${span}`}
              footnote={topGain ? momoName(topGain.validator) : "indexer accruing"}
            />
          </div>
          <div className="span-2">
            <MetricCard
              label="Top outflow"
              value={topLose ? `−${fmtCompact(Math.abs(topLose.net_atom))}` : "n/a"}
              unit="ATOM"
              series={losers.map((r) => Math.abs(r.net_atom))}
              delta={false}
              color="var(--iron)"
              trendLabel={`last ${span}`}
              footnote={topLose ? momoName(topLose.validator) : "indexer accruing"}
            />
          </div>

          {/* Momentum: the landing's unique, live insight */}
          <div className="span-12">
            <IntelCard
              title="Momentum"
              meta={hasMomentum ? `net delegation · last ${span} · live from the indexer` : "net delegation"}
              shareFilename="bedrock-validator-momentum"
              share={hasMomentum ? {
                title: "Validator momentum · Cosmos HUB",
                subtitle: "Which validators are gaining and losing stake",
                context: "Net delegation per validator over the indexed window, from Bedrock's own indexer.",
              } : undefined}
            >
              {!hasMomentum ? (
                <div style={{ fontSize: 12.5, color: "var(--ink-50)", padding: "6px 0" }}>
                  Net delegation per validator lands here as the indexer accumulates a window.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  <div>
                    <div className="data" style={{ marginBottom: 10, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--moss)", fontWeight: 700 }}>Gaining stake</div>
                    {gainers.map((r) => (
                      <div key={r.validator} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "7px 0", borderTop: "1px dotted var(--ink-15)" }}>
                        <span style={{ color: "var(--ink-80)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>{momoName(r.validator)}</span>
                        <span className="num" style={{ color: "var(--moss)", fontWeight: 600 }}>{fmtSigned(r.net_atom)}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="data" style={{ marginBottom: 10, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--iron)", fontWeight: 700 }}>Losing stake</div>
                    {losers.map((r) => (
                      <div key={r.validator} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "7px 0", borderTop: "1px dotted var(--ink-15)" }}>
                        <span style={{ color: "var(--ink-80)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>{momoName(r.validator)}</span>
                        <span className="num" style={{ color: "var(--iron)", fontWeight: 600 }}>{fmtSigned(r.net_atom)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </IntelCard>
          </div>

          {/* Subpage nav */}
          {SUBPAGES.map((s) => (
            <div key={s.href} className="span-4">
              <Link href={s.href} style={{ textDecoration: "none", display: "block", height: "100%" }}>
                <div className="surface surface-lift" style={{ padding: "16px 18px", height: "100%", borderTop: "2px solid var(--slate)" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>{s.title}</div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-60)", lineHeight: 1.55, marginTop: 8 }}>{s.blurb}</div>
                  <div className="data" style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "var(--slate)", marginTop: 12 }}>Open →</div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
