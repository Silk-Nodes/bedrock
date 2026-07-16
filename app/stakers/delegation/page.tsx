// /stakers/delegation · delegation flow, live from the indexer. Net staking
// (delegate minus undelegate) plus gross sides, over the captured window. A
// dense card row leads the bonding-vs-unbonding split. Falls back to Soon when
// no window is indexed yet. The netflow endpoint reports window totals only (no
// intra-window series), so these cards are honest number-only cards, not fake
// timelines.

import { MetricCard } from "@/components/console/MetricCard";
import { ConsolePage, ConsoleModule } from "@/components/console/Console";
import { Soon } from "@/components/console/Soon";
import { ValidatorAvatar } from "@/components/console/ValidatorAvatar";
import { ValidatorLink } from "@/components/validator/ValidatorLink";
import { DelegationFeed } from "@/components/console/DelegationFeed";
import { getStakingNetFlow, getValidatorFlow, getStakingFeed } from "@/lib/indexer";
import { getLiveValidators, getValidatorLogoMap } from "@/lib/validators";
import { seo } from "@/lib/seo";

export const revalidate = 30; // keep the live feed fresh

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
}
function fmtSigned(n: number): string {
  return (n >= 0 ? "+" : "−") + fmtCompact(Math.abs(n));
}
function spanLabel(s: string | null, e: string | null): string {
  if (!s || !e) return "recent";
  const h = (new Date(e).getTime() - new Date(s).getTime()) / 3_600_000;
  if (h < 1.5) return `last ${Math.max(1, Math.round(h * 60))}m`;
  if (h < 36) return `last ${Math.round(h)}h`;
  return `last ${Math.round(h / 24)}d`;
}

export const metadata = seo({ title: "Delegation Flows", description: "Live ATOM delegation and redelegation on the Cosmos Hub: where stake is moving, which validators are gaining, and which are losing delegators.", path: "/stakers/delegation", keywords: ["ATOM delegation", "Cosmos Hub redelegation", "validator stake flows"] });

type FlowRow = { validator: string; moniker: string; logo?: string | null; net_atom: number; delegate_atom: number; unbond_atom: number };

function FlowList({ title, rows, accent }: { title: string; rows: FlowRow[]; accent: string }) {
  return (
    <div className="surface" style={{ padding: "16px 18px", height: "100%" }}>
      <div className="data" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)", marginBottom: 12 }}>{title}</div>
      <table className="broadsheet mcols-3">
        <thead>
          <tr>
            <th style={{ width: 32 }}>#</th>
            <th>Validator</th>
            <th style={{ textAlign: "right" }}>Net</th>
            <th style={{ textAlign: "right" }}>In</th>
            <th style={{ textAlign: "right" }}>Out</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m, i) => (
            <tr key={m.validator}>
              <td className="num" style={{ color: "var(--ink-60)" }}>{i + 1}</td>
              <td>
                <ValidatorLink oper={m.validator} className="cp-click" style={{ display: "inline-flex", alignItems: "center", gap: 9, fontWeight: 600, color: "var(--ink)", borderRadius: 3 }}>
                  <ValidatorAvatar operator={m.validator} logo={m.logo} moniker={m.moniker} size={20} />
                  <span style={{ borderBottom: "1px dotted var(--ink-20)" }}>{m.moniker}</span>
                </ValidatorLink>
              </td>
              <td className="num" style={{ textAlign: "right", fontWeight: 700, color: accent }}>
                {m.net_atom >= 0 ? "+" : "−"}{fmtCompact(Math.abs(m.net_atom))}
              </td>
              <td className="num" style={{ textAlign: "right", color: "var(--ink-60)" }}>{fmtCompact(m.delegate_atom)}</td>
              <td className="num" style={{ textAlign: "right", color: "var(--ink-60)" }}>{fmtCompact(m.unbond_atom)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function StakersDelegation() {
  const [nf, nf24, flow, vals, feed, logos] = await Promise.all([
    getStakingNetFlow(168),
    getStakingNetFlow(24),
    getValidatorFlow(168, 400),
    getLiveValidators(0), // cached core: gives moniker + operator, no logo fetch
    getStakingFeed({ minAtom: 0, type: "all", hours: 168, limit: 60 }), // first page; filters + paging are server-side from here
    getValidatorLogoMap(), // server-resolved keybase logos for ALL validators (cached 6h)
  ]);
  const span = spanLabel(nf.window_start, nf.window_end);
  const span24 = spanLabel(nf24.window_start, nf24.window_end);

  // valoper -> moniker for labelling the flow rows.
  const metaByOper = new Map(vals.validators.map((v) => [v.operator, v.moniker]));
  const label = (oper: string) => metaByOper.get(oper) ?? `${oper.slice(0, 14)}…`;
  const named = flow.rows.map((r) => ({ ...r, moniker: label(r.validator), logo: logos[r.validator] ?? null }));

  // Split into the validators attracting stake vs shedding it.
  const inflows = named.filter((r) => r.net_atom >= 1).sort((a, b) => b.net_atom - a.net_atom).slice(0, 8);
  const outflows = named.filter((r) => r.net_atom <= -1).sort((a, b) => a.net_atom - b.net_atom).slice(0, 8);
  const gaining = named.filter((r) => r.net_atom > 0).length;
  const losing = named.filter((r) => r.net_atom < 0).length;

  // First page of the feed, labelled with validator monikers for the client
  // component. Subsequent filter changes + "load more" fetch server-side.
  const feedEvents = feed.events.map((e) => ({ ...e, valName: label(e.validator), logo: logos[e.validator] ?? null }));

  // Momentum: 24h net vs the 7d daily pace (is bonding speeding up or slowing?).
  const days = Math.max(1, (new Date(nf.window_end ?? 0).getTime() - new Date(nf.window_start ?? 0).getTime()) / 86_400_000);
  const dailyPace = nf.net_atom / days;
  const accelerating = nf24.live && Math.abs(nf24.net_atom) > Math.abs(dailyPace) * 1.15;

  // Concentration: how much of the net NEW stake the biggest gainers captured.
  const totalInflow = inflows.reduce((s, r) => s + r.net_atom, 0);
  const top1Share = totalInflow > 0 ? (inflows[0].net_atom / totalInflow) * 100 : 0;
  const top5Share = totalInflow > 0 ? (inflows.slice(0, 5).reduce((s, r) => s + r.net_atom, 0) / totalInflow) * 100 : 0;

  // Significance: net flow relative to the bonded base it's moving against.
  const bonded = vals.total_bonded || 0;
  const pctOfBonded = bonded > 0 ? (nf.net_atom / bonded) * 100 : 0;

  if (!nf.live) {
    return (
      <ConsolePage>
        <ConsoleModule lead>
          <Soon title="Delegation flow" note="Delegate and undelegate flow lands here as the indexer accumulates a window. No estimates until then." />
        </ConsoleModule>
      </ConsolePage>
    );
  }

  const gross = nf.delegate_atom + nf.unbond_atom;
  const dPct = gross > 0 ? (nf.delegate_atom / gross) * 100 : 50;
  const uPct = 100 - dPct;
  const bonding = nf.net_atom >= 0;

  return (
    <ConsolePage>
      <ConsoleModule lead dot="var(--moss)" title="Stakers · Delegation flow" meta={`${span} · live from the indexer`}>
        <div className="console-grid">
          <div className="span-3">
            <MetricCard label="Net staking" value={fmtSigned(nf.net_atom)} unit="ATOM" series={[]} color={bonding ? "var(--moss)" : "var(--iron)"} trendLabel={span} footnote={`${bonding ? "net bonding" : "net unbonding"}${bonded > 0 ? ` · ${pctOfBonded >= 0 ? "+" : "−"}${Math.abs(pctOfBonded).toFixed(2)}% of staked` : ""}`} />
          </div>
          <div className="span-3">
            <MetricCard label="Delegated" value={fmtCompact(nf.delegate_atom)} unit="ATOM" series={[]} color="var(--moss)" trendLabel={span} footnote="gross, staked in" />
          </div>
          <div className="span-3">
            <MetricCard label="Undelegated" value={fmtCompact(nf.unbond_atom)} unit="ATOM" series={[]} color="var(--iron)" trendLabel={span} footnote="gross, unstaked out" />
          </div>
          <div className="span-3">
            <MetricCard
              label="Net · last 24h"
              value={nf24.live ? fmtSigned(nf24.net_atom) : "·"}
              unit="ATOM"
              series={[]}
              color={nf24.net_atom >= 0 ? "var(--moss)" : "var(--iron)"}
              trendLabel={span24}
              footnote={!nf24.live ? "24h window" : accelerating ? "above the 7-day pace" : "in line with 7-day pace"}
            />
          </div>

          {/* Flow balance: gross bonding vs unbonding, the tug-of-war behind the net */}
          <div className="span-12">
            <div className="surface" style={{ padding: "18px 22px" }}>
              <div className="data" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)", marginBottom: 10 }}>Bonding vs unbonding · {span}</div>
              <div className="gbar" style={{ height: 22, display: "flex" }}>
                <div className="gbar-seg" style={{ width: `${dPct}%`, "--gbar-c": "var(--moss)" } as React.CSSProperties} title={`Delegated ${fmtCompact(nf.delegate_atom)} ATOM`} />
                <div className="gbar-seg" style={{ width: `${uPct}%`, "--gbar-c": "var(--iron)" } as React.CSSProperties} title={`Undelegated ${fmtCompact(nf.unbond_atom)} ATOM`} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, flexWrap: "wrap", gap: 8 }}>
                <span className="data" style={{ fontSize: 11.5, color: "var(--moss)" }}>Delegated {dPct.toFixed(0)}% · {fmtCompact(nf.delegate_atom)}</span>
                <span className="data" style={{ fontSize: 11.5, color: "var(--iron)" }}>Undelegated {uPct.toFixed(0)}% · {fmtCompact(nf.unbond_atom)}</span>
              </div>
              <div style={{ fontSize: 10.5, color: "var(--ink-40)", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--ink-10)", display: "flex", flexDirection: "column", gap: 4 }}>
                <span>
                  {fmtCompact(nf.redelegate_atom)} ATOM redelegated (moved between validators, still bonded)
                  {(gaining > 0 || losing > 0) && <> · {gaining} validators gained stake, {losing} lost over {span}</>}
                </span>
                {totalInflow > 0 && (
                  <span>
                    Concentration · the top validator drew {top1Share.toFixed(0)}% of net new stake, the top 5 drew {top5Share.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Where the stake is flowing: validators attracting vs shedding stake */}
          {inflows.length > 0 && (
            <div className="span-6">
              <FlowList title={`Attracting stake · ${span}`} rows={inflows} accent="var(--moss)" />
            </div>
          )}
          {outflows.length > 0 && (
            <div className="span-6">
              <FlowList title={`Shedding stake · ${span}`} rows={outflows} accent="var(--iron)" />
            </div>
          )}

          {/* Live per-event feed. Filters + paging run server-side over the whole
              window, so a large old event is never hidden behind recent small ones. */}
          {feedEvents.length > 0 && (
            <div className="span-12">
              <DelegationFeed initialEvents={feedEvents} initialTotal={feed.total} />
            </div>
          )}
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
