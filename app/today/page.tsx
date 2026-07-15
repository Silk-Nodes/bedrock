// Today: the Cosmos Hub at a glance, as a DATA WALL (hl.eco-style). Every card
// is a self-contained story: a big serif number, a delta chip, and a real chart
// from live endpoints. The editorial feed is demoted to a compact strip at the
// bottom (the full stream lives at /today/feed).

import Link from "next/link";
import { ConsolePage, ConsoleModule, IntelCard } from "@/components/console/Console";
import { HappeningFeed } from "@/components/today/HappeningFeed";
import { LineChart } from "@/components/charts/LineChart";
import { WeeklyFlowChart } from "@/components/charts/WeeklyFlowChart";
import { getTodayFeed } from "@/lib/todayFeed";
import { getLiveChain } from "@/lib/chain";
import { getLiveAtomPrice, getAtomPriceHistory } from "@/lib/price";
import { getCohortFlows, getRewardDaily, getExchangeNetFlow, getValidatorFlow, windowLabel, spanLabel } from "@/lib/indexer";
import { getLiveUndelegations } from "@/lib/undelegations";
import { getProposalList } from "@/lib/gov";
import { getLiveValidators } from "@/lib/validators";
import { seo } from "@/lib/seo";

export const revalidate = 300;
export const metadata = seo({ title: "Today", description: "The Cosmos Hub right now: ATOM price and range, staking economy, net exchange flow, accumulation vs distribution, the unbonding queue, live governance, and validator momentum, all on-chain.", path: "/today", keywords: ["Cosmos Hub today", "ATOM price", "ATOM staking APR", "ATOM exchange flow", "Cosmos Hub dashboard"] });

function fmt(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}
function fmtSigned(n: number): string { return `${n >= 0 ? "+" : "−"}${fmt(Math.abs(n))}`; }
function fmtWeek(ts: string): string { return new Date(ts).toLocaleDateString("en-US", { day: "2-digit", month: "short" }); }

// hl.eco-style delta chip: a small pill, green up / rust down.
function Chip({ v, suffix = "· 24h" }: { v: number; suffix?: string }) {
  const up = v >= 0;
  const c = up ? "var(--moss)" : "var(--iron)";
  return (
    <span className="data" style={{
      display: "inline-block", padding: "2.5px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700,
      color: c, background: `color-mix(in srgb, ${c} 13%, transparent)`,
    }}>
      {up ? "+" : ""}{v.toFixed(1)}% {suffix}
    </span>
  );
}

// A small caps stat used inside cards (label over value), hl.eco grid style.
function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="data" style={{ fontSize: 9.5, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--ink-40)", marginBottom: 3 }}>{label}</div>
      <div className="data" style={{ fontSize: 14, fontWeight: 600, color: color ?? "var(--ink)" }}>{value}</div>
    </div>
  );
}

const BIG: React.CSSProperties = { fontFamily: "var(--font-display)", fontWeight: 450, fontSize: "clamp(30px, 3vw, 40px)", letterSpacing: "-0.02em", lineHeight: 1, color: "var(--ink)" };

export default async function Console() {
  const [chain, price, hist, flows, rewards, netflow, valflow, gov, undel, live, happening] = await Promise.all([
    getLiveChain(), getLiveAtomPrice(), getAtomPriceHistory(90), getCohortFlows(12), getRewardDaily(30),
    getExchangeNetFlow(24), getValidatorFlow(168, 400), getProposalList(3), getLiveUndelegations(),
    getLiveValidators(0), getTodayFeed(),
  ]);

  // Windows named from what each source returned, not from what was requested.
  // Every one of these was hardcoded, and /validators was already deriving the
  // same validator-flow window correctly from the same call.
  const priceDays = hist.points.length;                       // getAtomPriceHistory(90) can return fewer
  const rewardDays = rewards.points.length;                   // getRewardDaily(30) likewise
  const netflowLabel = windowLabel(netflow.hours);            // the indexer echoes the hours it aggregated
  const valflowSpan = spanLabel(valflow.window_start, valflow.window_end);

  // Price range over the window.
  const prices = hist.points.map((p) => p.value);
  const hi = prices.length ? Math.max(...prices) : 0;
  const lo = prices.length ? Math.min(...prices) : 0;

  // Rewards: 30d daily claims, peak annotated.
  const peakReward = rewards.points.reduce((m, p) => (p.atom > m.atom ? p : m), { day: "", atom: 0, claims: 0 });

  // Exchange net flow 24h: totals + biggest movers.
  const netTotal = netflow.rows.reduce((s, r) => s + r.net_atom, 0);
  const movers = [...netflow.rows].sort((a, b) => Math.abs(b.net_atom) - Math.abs(a.net_atom)).slice(0, 4);
  const maxMover = Math.max(1, ...movers.map((m) => Math.abs(m.net_atom)));

  // Validator momentum 7d.
  const monikers = new Map(live.validators.map((v) => [v.operator, v.moniker]));
  const vname = (o: string) => monikers.get(o) ?? `${o.slice(0, 14)}…`;
  const vRows = valflow.rows;
  const gainers = vRows.filter((r) => r.net_atom > 0).slice(0, 3);
  const losers = vRows.filter((r) => r.net_atom < 0).slice(-3).reverse();

  // Governance: voting proposal first, else the latest.
  const voting = gov.items.find((p) => p.voting);
  const govItems = voting ? [voting, ...gov.items.filter((p) => p !== voting).slice(0, 2)] : gov.items.slice(0, 3);

  // Unbonding: next 7 days of the schedule.
  const sched7 = undel.schedule.slice(0, 7);

  return (
    <ConsolePage>
      <ConsoleModule lead dot="var(--hub)" title="Today · Cosmos Hub" meta={`${chain.bonded_ratio_pct.toFixed(1)}% bonded · live on-chain`}>
        <div className="console-grid">

          {/* ── Hero row: price + staking economy ── */}
          <div className="span-6">
            <IntelCard title="ATOM price" meta={`${priceDays} days · daily close`}>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
              <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
                <span style={BIG}>${price.usd.toFixed(2)}</span>
                <Chip v={price.change_24h_pct} />
              </div>
              <div className="data" style={{ fontSize: 11, color: "var(--ink-40)", marginBottom: 34 }}>
                high ${hi.toFixed(2)} · low ${lo.toFixed(2)} · mcap ${fmt(price.mcap_usd)}
              </div>
              </div>
              <LineChart series={[{ label: "ATOM/USD", color: "var(--hub)", points: hist.points }]} height={311} legend={false} />
              </div>
            </IntelCard>
          </div>

          <div className="span-6">
            <IntelCard title="Staking economy" meta={`live params · daily reward claims, ${rewardDays}d`}>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
              <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
                <span style={BIG}>{chain.staking_apr_pct.toFixed(1)}%</span>
                <span className="data" style={{ fontSize: 11, letterSpacing: 1, color: "var(--ink-40)" }}>STAKING APR</span>
              </div>
              <div style={{ display: "flex", gap: 26, margin: "10px 0 14px" }}>
                <Stat label="Bonded" value={`${chain.bonded_ratio_pct.toFixed(1)}%`} color="var(--moss)" />
                <Stat label="Real yield" value={`${chain.real_yield_pct.toFixed(1)}%`} />
                <Stat label="Inflation" value={`${chain.inflation_pct.toFixed(1)}%`} />
                <Stat label="Claimed · peak day" value={`${fmt(peakReward.atom)} ATOM`} color="var(--sand)" />
              </div>
              </div>
              <WeeklyFlowChart
                series={[{ label: "Rewards claimed", color: "var(--moss)", points: rewards.points.map((p) => ({ date: p.day.slice(5), value: p.atom })) }]}
                colorBySign height={190} yLabel="ATOM"
              />
              </div>
            </IntelCard>
          </div>

          {/* ── Flows row ── */}
          <div className="span-4">
            <IntelCard title="Net exchange flow" meta="weekly · buy − sell">
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
                <span style={{ ...BIG, fontSize: 28, color: flows.netExchange >= 0 ? "var(--moss)" : "var(--iron)" }}>{fmtSigned(flows.netExchange)}</span>
                {/* Label the window we actually got back, not the one we asked
                    for: the indexer returns only the weeks it has continuous
                    data for while the historical backfill is still running. */}
                <span className="data" style={{ fontSize: 10.5, color: "var(--ink-40)" }}>ATOM · {flows.weeks.length} week{flows.weeks.length === 1 ? "" : "s"}</span>
              </div>
              <WeeklyFlowChart
                series={[{ label: "Net exchange", color: "var(--moss)", points: flows.weeks.map((w) => ({ date: fmtWeek(w.week), value: w.netExchange })) }]}
                colorBySign height={190}
              />
              <Link href="/exchanges/sell-pressure" className="data" style={{ display: "block", marginTop: "auto", paddingTop: 12, fontSize: 10, letterSpacing: 1, color: "var(--hub)", textDecoration: "none" }}>SELL PRESSURE →</Link>
            </div>
            </IntelCard>
          </div>

          <div className="span-4">
            <IntelCard title="Accumulation vs distribution" meta="weekly net stance">
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
                <span style={{ ...BIG, fontSize: 28, color: flows.net >= 0 ? "var(--moss)" : "var(--iron)" }}>{fmtSigned(flows.net)}</span>
                <span className="data" style={{ fontSize: 10.5, color: "var(--ink-40)" }}>ATOM · {flows.net >= 0 ? "net accumulation" : "net distribution"}</span>
              </div>
              <WeeklyFlowChart
                series={[{ label: "Net stance", color: "var(--moss)", points: flows.weeks.map((w) => ({ date: fmtWeek(w.week), value: w.net })) }]}
                colorBySign height={190}
              />
              <Link href="/signals/cohorts" className="data" style={{ display: "block", marginTop: "auto", paddingTop: 12, fontSize: 10, letterSpacing: 1, color: "var(--hub)", textDecoration: "none" }}>BY COHORT →</Link>
            </div>
            </IntelCard>
          </div>

          <div className="span-4">
            <IntelCard title="Unbonding queue" meta="completing · next 7 days">
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
                <span style={{ ...BIG, fontSize: 28 }}>{fmt(undel.completing_7d_atom)}</span>
                <span className="data" style={{ fontSize: 10.5, color: "var(--ink-40)" }}>ATOM · of {fmt(undel.total_atom)} queued</span>
              </div>
              <WeeklyFlowChart
                series={[{ label: "Completes", color: "var(--moss)", points: sched7.map((d) => ({ date: d.date.slice(5), value: d.value })) }]}
                colorBySign highlightMax height={190}
              />
              <Link href="/stakers/unbonding" className="data" style={{ display: "block", marginTop: "auto", paddingTop: 12, fontSize: 10, letterSpacing: 1, color: "var(--hub)", textDecoration: "none" }}>FULL SCHEDULE →</Link>
            </div>
            </IntelCard>
          </div>

          {/* ── Pulse row ── */}
          <div className="span-4">
            <IntelCard title="Governance" meta={voting ? "voting now" : "latest proposals"}>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {govItems.map((p) => (
                  <Link key={p.id} href={`/atom/governance/${p.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ fontSize: 12.5, color: "var(--ink)", fontWeight: 600, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      #{p.id} · {p.title}
                    </div>
                    <div className="gbar" style={{ height: 7, marginBottom: 4 }}>
                      <div className="gbar-fill" style={{ width: `${Math.max(1, p.yesPct)}%`, "--gbar-c": p.voting ? "var(--hub)" : "var(--moss)" } as React.CSSProperties} />
                    </div>
                    <div className="data" style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--ink-40)" }}>
                      <span>{p.statusLabel}</span>
                      <span style={{ color: "var(--ink-60)" }}>{p.yesPct.toFixed(0)}% yes</span>
                    </div>
                  </Link>
                ))}
              </div>
              <Link href="/atom/governance" className="data" style={{ display: "block", marginTop: "auto", paddingTop: 14, fontSize: 10, letterSpacing: 1, color: "var(--hub)", textDecoration: "none" }}>ALL PROPOSALS →</Link>
            </div>
            </IntelCard>
          </div>

          <div className="span-4">
            <IntelCard title={`Exchange netflow · ${netflowLabel}`} meta="per exchange · deposits − withdrawals">
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
                <span style={{ ...BIG, fontSize: 28, color: netTotal <= 0 ? "var(--moss)" : "var(--iron)" }}>{fmtSigned(netTotal)}</span>
                <span className="data" style={{ fontSize: 10.5, color: "var(--ink-40)" }}>ATOM {netTotal <= 0 ? "· leaving exchanges" : "· onto exchanges"}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {movers.map((m) => {
                  const pos = m.net_atom <= 0; // off-exchange = green
                  const c = pos ? "var(--moss)" : "var(--iron)";
                  return (
                    <div key={m.entity}>
                      <div className="data" style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}>
                        <span style={{ color: "var(--ink-80)" }}>{m.entity}</span>
                        <span style={{ color: c, fontWeight: 600 }}>{fmtSigned(m.net_atom)}</span>
                      </div>
                      <div style={{ position: "relative", height: 6, background: "var(--paper-2)", borderRadius: 3 }}>
                        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--ink-40)", opacity: 0.4 }} />
                        <div style={{ position: "absolute", top: 0, bottom: 0, [m.net_atom >= 0 ? "left" : "right"]: "50%", width: `${(Math.abs(m.net_atom) / maxMover) * 48}%`, background: c, borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <Link href="/exchanges" className="data" style={{ display: "block", marginTop: "auto", paddingTop: 12, fontSize: 10, letterSpacing: 1, color: "var(--hub)", textDecoration: "none" }}>ALL EXCHANGES →</Link>
            </div>
            </IntelCard>
          </div>

          <div className="span-4">
            <IntelCard title="Validator momentum" meta={`net delegation · last ${valflowSpan}`}>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <div className="data" style={{ fontSize: 9.5, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--moss)" }}>Gaining</div>
                {gainers.map((r) => (
                  <div key={r.validator} className="data" style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                    <span style={{ color: "var(--ink-80)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 190 }}>{vname(r.validator)}</span>
                    <span style={{ color: "var(--moss)", fontWeight: 600 }}>{fmtSigned(r.net_atom)}</span>
                  </div>
                ))}
                <div className="data" style={{ fontSize: 9.5, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--iron)", marginTop: 8 }}>Losing</div>
                {losers.map((r) => (
                  <div key={r.validator} className="data" style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                    <span style={{ color: "var(--ink-80)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 190 }}>{vname(r.validator)}</span>
                    <span style={{ color: "var(--iron)", fontWeight: 600 }}>{fmtSigned(r.net_atom)}</span>
                  </div>
                ))}
              </div>
              <Link href="/validators" className="data" style={{ display: "block", marginTop: "auto", paddingTop: 14, fontSize: 10, letterSpacing: 1, color: "var(--hub)", textDecoration: "none" }}>ALL VALIDATORS →</Link>
            </div>
            </IntelCard>
          </div>

          {/* ── Compact feed strip ── */}
          <div className="span-12">
            <HappeningFeed initialItems={happening.items.slice(0, 5)} />
          </div>
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
