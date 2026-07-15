// /signals/cohorts · Accumulation vs Distribution. A two-sided read of what each
// wealth cohort is actually doing: ATOM sold to exchanges vs bought back
// (withdrawn), and net staked (delegate minus unbond). Exchange flow is measured
// NET per wallet, so pass-through routers and cross-exchange churn cancel to zero
// and never masquerade as distribution. The likelihood-weighted sell-pressure
// attribution is kept below as supporting detail. All real, from the indexer.

import { ConsolePage, ConsoleModule, IntelCard } from "@/components/console/Console";
import { MetricCard } from "@/components/console/MetricCard";
import { Soon } from "@/components/console/Soon";
import { LineChart } from "@/components/charts/LineChart";
import { WeeklyFlowChart } from "@/components/charts/WeeklyFlowChart";
import { SellPressureDisclaimer } from "@/components/exchanges/SellPressureDisclaimer";
import { TipCard } from "@/components/charts/TipCard";
import { getCohortFlows, getCohortSellPressure } from "@/lib/indexer";
import { ShareBars, ShareColumns } from "@/components/share/ShareCharts";
import { seo } from "@/lib/seo";

export const revalidate = 600;
export const metadata = seo({
  title: "Accumulation vs Distribution",
  description: "Are ATOM holders accumulating or distributing? A two-sided, cohort-level read: net exchange flow (bought minus sold) and net staking (delegate minus unbond) by wealth tier (mega-whale, whale, HNW, mid, retail), weekly, from the Bedrock indexer.",
  path: "/signals/cohorts",
  keywords: ["ATOM accumulation distribution", "are whales buying ATOM", "Cosmos Hub staking flows", "ATOM cohort net flow"],
});

function fmt(n: number): string {
  const s = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${s}${(a / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `${s}${(a / 1_000).toFixed(0)}k`;
  return `${s}${Math.round(a)}`;
}
function fmtSigned(n: number): string {
  return `${n >= 0 ? "+" : ""}${fmt(n)}`;
}
function fmtWeek(ts: string): string {
  return new Date(ts).toLocaleDateString("en-US", { day: "2-digit", month: "short" });
}

const ACC = "var(--moss)";   // accumulation (green)
const DIST = "var(--iron)";  // distribution (red/rust)

const COHORT: Record<string, { label: string; color: string; note: string }> = {
  mega_whale: { label: "Mega-whale", color: "var(--iron)", note: "holdings > 1M ATOM" },
  whale: { label: "Whale", color: "var(--hub)", note: "holdings 100k-1M ATOM" },
  hnw: { label: "HNW / fund", color: "var(--hub-2)", note: "holdings 10k-100k ATOM" },
  mid: { label: "Mid-tier", color: "var(--sand)", note: "holdings 1k-10k ATOM" },
  retail: { label: "Retail", color: "var(--slate)", note: "holdings < 1k ATOM" },
};

// A diverging bar centered on zero: green to the right for accumulation, rust to
// the left for distribution. `value` and `max` are in ATOM; width scales to half
// the track so the two directions are symmetric. The zero axis is drawn once by
// the parent block (a single continuous line) rather than per bar, so bars just
// render the fill. `hero` gives the net bar more height and a stronger glow.
function DivergeBar({ value, max, hero, tipTitle, tipNote }: { value: number; max: number; hero?: boolean; tipTitle?: string; tipNote?: string }) {
  const w = max > 0 ? Math.min(50, (Math.abs(value) / max) * 50) : 0;
  const pos = value >= 0;
  const c = pos ? ACC : DIST;
  return (
    <div className="tipwrap" style={{ position: "relative", height: hero ? 13 : 7 }}>
      {tipTitle && (
        <TipCard title={tipTitle} rows={[
          { label: "net", value: `${fmtSigned(value)} ATOM`, valueColor: c },
          ...(tipNote ? [{ label: "measure", value: tipNote }] : []),
          { label: "reads as", value: pos ? "accumulating" : "distributing", valueColor: c, total: true },
        ]} />
      )}
      <div style={{
        position: "absolute", top: 0, bottom: 0,
        [pos ? "left" : "right"]: "50%",
        width: `${Math.max(w, value === 0 ? 0 : 0.6)}%`,
        borderRadius: 4,
        background: pos
          ? `linear-gradient(90deg, color-mix(in srgb, ${c} 40%, transparent), ${c})`
          : `linear-gradient(270deg, color-mix(in srgb, ${c} 40%, transparent), ${c})`,
        boxShadow: hero
          ? `0 0 14px color-mix(in srgb, ${c} 55%, transparent)`
          : `0 0 7px color-mix(in srgb, ${c} 28%, transparent)`,
      } as React.CSSProperties} />
    </div>
  );
}

export default async function CohortsPage() {
  const [f, c] = await Promise.all([getCohortFlows(16), getCohortSellPressure(16)]);

  if (!f.live || f.weeks.length === 0) {
    return (
      <ConsolePage>
        <ConsoleModule>
          <Soon title="Accumulation vs distribution" note="Cohort-level accumulation and distribution lands here once the indexer has captured a window of exchange and staking flow. No estimates until then." />
        </ConsoleModule>
      </ConsolePage>
    );
  }

  const span = `${fmtWeek(f.weeks[0].week)} to ${fmtWeek(f.weeks[f.weeks.length - 1].week)}`;
  // Label the window we ACTUALLY have, never the window we asked for. The query
  // requests 16 weeks but the indexer only returns the weeks it has continuous
  // data for (the historical backfill is still filling the middle years), so a
  // hardcoded "16 weeks" would overstate the sample on every card.
  const nWeeks = f.weeks.length;
  const weeksLabel = `${nWeeks} week${nWeeks === 1 ? "" : "s"}`;
  const accumulating = f.cohorts.filter((co) => co.net > 0);
  const distributing = f.cohorts.filter((co) => co.net < 0);
  // Largest single distributor and accumulator, for the narrative.
  const topDist = [...distributing].sort((a, b) => a.net - b.net)[0];
  const topAcc = [...accumulating].sort((a, b) => b.net - a.net)[0];
  const overall = f.net; // net exchange + net staked, all cohorts

  // Scale for the diverging bars: the largest absolute value across net, exchange
  // and staking of any cohort, so every bar shares one axis and stays comparable.
  const maxAll = Math.max(1, ...f.cohorts.flatMap((co) => [Math.abs(co.net), Math.abs(co.netExchange), Math.abs(co.netStaked)]));

  // ── Supporting sell-pressure detail (kept below) ──
  const spOrder = ["mega_whale", "whale", "hnw", "mid", "retail", "protocol", "conduit"];
  const SP: Record<string, { label: string; color: string }> = {
    mega_whale: { label: "Mega-whale", color: "var(--iron)" }, whale: { label: "Whale", color: "var(--hub)" },
    hnw: { label: "HNW / fund", color: "var(--hub-2)" }, mid: { label: "Mid-tier", color: "var(--sand)" },
    retail: { label: "Retail", color: "var(--slate)" }, protocol: { label: "Protocol", color: "var(--moss)" },
    conduit: { label: "Conduit & churn", color: "var(--ink-40)" },
  };
  const spTotals = c.live ? new Map(c.totals.map((t) => [t.cohort, t])) : new Map();

  return (
    <ConsolePage>
      <ConsoleModule lead dot={overall >= 0 ? ACC : DIST} title="Signals · Accumulation vs distribution" meta={`${span} · weekly · live from the indexer`}>
        <div className="console-grid">
          {/* Thesis lede */}
          <div className="span-12">
            <IntelCard title="Are holders accumulating or distributing?" meta={span} accent>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-80)", margin: 0 }}>
                Two forces, netted per wallet so churn cancels: ATOM moved <strong>to</strong> exchanges (sell intent) against ATOM <strong>withdrawn</strong> from them (buy intent), plus net staking (delegate minus unbond). Over <strong>{span}</strong>, the holder base is{" "}
                <strong style={{ color: overall >= 0 ? ACC : DIST }}>{overall >= 0 ? "net accumulating" : "net distributing"}</strong> by{" "}
                <strong style={{ color: overall >= 0 ? ACC : DIST }}>{fmtSigned(overall)} ATOM</strong>{" "}
                (net exchange {fmtSigned(f.netExchange)}, net staked {fmtSigned(f.netStaked)}).{" "}
                {topDist && topAcc ? (
                  <>The split is by wealth tier: <strong style={{ color: DIST }}>{COHORT[topDist.cohort]?.label ?? topDist.cohort}s</strong> are distributing ({fmtSigned(topDist.net)}), while <strong style={{ color: ACC }}>{COHORT[topAcc.cohort]?.label ?? topAcc.cohort}s</strong> lead the accumulation ({fmtSigned(topAcc.net)}). {accumulating.length} of {f.cohorts.length} cohorts are net accumulating.</>
                ) : null}
              </p>
            </IntelCard>
          </div>

          {/* Disclaimer */}
          <div className="span-12"><SellPressureDisclaimer /></div>

          {/* Headline stance metrics */}
          <div className="span-3"><MetricCard label="Net stance" value={fmtSigned(overall)} unit="ATOM" series={[]} color={overall >= 0 ? ACC : DIST} trendLabel={span} footnote={overall >= 0 ? "net accumulation" : "net distribution"} /></div>
          <div className="span-3"><MetricCard label="Net exchange flow" value={fmtSigned(f.netExchange)} unit="ATOM" series={[]} color={f.netExchange >= 0 ? ACC : DIST} trendLabel={span} footnote={`bought ${fmt(f.bought)} · sold ${fmt(f.sold)}`} /></div>
          <div className="span-3"><MetricCard label="Net staked" value={fmtSigned(f.netStaked)} unit="ATOM" series={[]} color={f.netStaked >= 0 ? ACC : DIST} trendLabel={span} footnote={`delegated ${fmt(f.staked)} · unbonded ${fmt(f.unstaked)}`} /></div>
          <div className="span-3"><MetricCard label="Cohorts accumulating" value={`${accumulating.length} / ${f.cohorts.length}`} series={[]} color="var(--hub)" trendLabel={span} footnote={distributing.length > 0 ? `${distributing.map((d) => COHORT[d.cohort]?.label ?? d.cohort).join(", ")} distributing` : "all tiers accumulating"} /></div>

          {/* Per-cohort net stance: ONE bar per cohort (the sum of both forces),
              with the exchange/staking breakdown as a plain-language line under
              it. Five bars, no abbreviations: readable at a glance. */}
          <div className="span-6">
            <IntelCard title="Who is accumulating, who is distributing" meta={`net ATOM per cohort · ${weeksLabel}`} shareFilename="bedrock-cohort-stance" share={{ title: "Accumulation vs distribution · Cosmos HUB", subtitle: `Net ATOM per wealth cohort · ${weeksLabel}`, big: fmtSigned(overall), unit: "ATOM net", deltaPositive: overall >= 0, delta: overall >= 0 ? "net accumulation" : "net distribution", context: "Net exchange flow plus net staking per wallet, by wealth tier. Green = net accumulating, rust = net distributing.", body: <ShareBars diverging positiveColor={ACC} negativeColor={DIST} rows={f.cohorts.map((co) => ({ label: COHORT[co.cohort]?.label ?? co.cohort, value: co.net }))} /> }}>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, gap: 18, position: "relative" }}>
                <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--ink-40)", opacity: 0.3 }} />
                {f.cohorts.map((co) => {
                  const meta = COHORT[co.cohort] ?? { label: co.cohort, color: "var(--ink-40)", note: "" };
                  const pos = co.net >= 0;
                  const c = pos ? ACC : DIST;
                  const part = (label: string, v: number) => (
                    <span style={{ color: "var(--ink-40)" }}>
                      {label} <span style={{ color: v >= 0 ? ACC : DIST }}>{fmtSigned(v)}</span>
                    </span>
                  );
                  return (
                    <div key={co.cohort}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 13, marginBottom: 7 }}>
                        <span style={{ color: "var(--ink)", fontWeight: 600 }}>{meta.label} <span className="data" style={{ color: "var(--ink-40)", fontSize: 11, fontWeight: 400 }}>· {meta.note}</span></span>
                        <span className="data" style={{ fontSize: 13.5, fontWeight: 700, color: c }}>{fmtSigned(co.net)} <span style={{ fontSize: 9.5, fontWeight: 400, letterSpacing: "0.07em" }}>{pos ? "ACCUMULATING" : "DISTRIBUTING"}</span></span>
                      </div>
                      <DivergeBar value={co.net} max={maxAll} hero tipTitle={`${meta.label} · net stance`} tipNote="exchange + staking" />
                      <div className="data" style={{ display: "flex", gap: 18, fontSize: 11, marginTop: 6 }}>
                        {part(co.netExchange >= 0 ? "bought on exchanges" : "sold to exchanges", co.netExchange)}
                        {part(co.netStaked >= 0 ? "staked" : "unstaked", co.netStaked)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </IntelCard>
          </div>

          {/* Weekly two-sided. Sized to fill the card so this column matches the
              cohort panel's height exactly: no dead space below the charts. */}
          <div className="span-6">
            <IntelCard title="Weekly · net stance" meta="above zero = accumulation · below = distribution" shareFilename="bedrock-weekly-stance" share={{ title: "Weekly net stance · Cosmos HUB", subtitle: "Accumulation vs distribution, week by week", big: fmtSigned(overall), unit: `ATOM · ${nWeeks}w`, deltaPositive: overall >= 0, context: "Combined net exchange flow and net staking per week. Above zero = the holder base accumulated that week.", body: <ShareColumns height={190} positiveColor={ACC} negativeColor={DIST} points={f.weeks.map((w) => ({ label: fmtWeek(w.week), value: w.net }))} /> }}>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "calc(100% - 30px)", gap: 14 }}>
                <WeeklyFlowChart
                  series={[{ label: "Net stance", color: ACC, points: f.weeks.map((w) => ({ date: fmtWeek(w.week), value: w.net })) }]}
                  colorBySign height={300} yLabel="ATOM"
                />
                <div style={{ borderTop: "1px solid var(--card-line)", paddingTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span className="data" style={{ fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--ink-60)" }}>Composition</span>
                    <span style={{ display: "flex", gap: 14, fontSize: 11 }}>
                      <span style={{ color: "var(--ink-60)" }}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--hub)", marginRight: 5 }} />exchange</span>
                      <span style={{ color: "var(--ink-60)" }}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--moss)", marginRight: 5 }} />staking</span>
                    </span>
                  </div>
                  <WeeklyFlowChart
                    series={[
                      { label: "Net exchange", color: "var(--hub)", points: f.weeks.map((w) => ({ date: fmtWeek(w.week), value: w.netExchange })) },
                      { label: "Net staked", color: "var(--moss)", points: f.weeks.map((w) => ({ date: fmtWeek(w.week), value: w.netStaked })) },
                    ]}
                    height={260} yLabel="ATOM"
                  />
                </div>
              </div>
            </IntelCard>
          </div>

          {/* Methodology */}
          <div className="span-12">
            <IntelCard title="How accumulation and distribution are measured" meta="methodology">
              <div style={{ fontSize: 12.5, lineHeight: 1.7, color: "var(--ink-60)" }}>
                Two independent signals, both netted per wallet and attributed to the wallet&rsquo;s real wealth tier (on-chain liquid + staked holdings, refreshed daily, floored by its largest single deposit / withdrawal / delegation):
                <strong style={{ color: "var(--ink-80)" }}> net exchange flow</strong> = ATOM withdrawn from verified exchanges minus ATOM deposited to them, and{" "}
                <strong style={{ color: "var(--ink-80)" }}> net staked</strong> = delegated minus unbonded (redelegations and reward withdrawals excluded). Netting per wallet is deliberate: a pass-through router or a trader cycling between venues deposits and withdraws in near-equal measure, so its net is ~0 and it can never read as distribution, no conduit filter required.{" "}
                Exchange-operated wallets (all custody / ops / validator roles) and protocol / IBC-escrow module accounts are excluded on both sides, so only end-holder behaviour is counted.{" "}
                Tiers: <strong style={{ color: "var(--ink-80)" }}>mega-whale</strong> &gt; 1M, <strong style={{ color: "var(--ink-80)" }}>whale</strong> 100k-1M, <strong style={{ color: "var(--ink-80)" }}>HNW</strong> 10k-100k, <strong style={{ color: "var(--ink-80)" }}>mid</strong> 1k-10k, else <strong style={{ color: "var(--ink-80)" }}>retail</strong>.{" "}
                Exchange staking is left out of net staked because it holds customer ATOM, not the exchange&rsquo;s conviction, so this undercounts holder staking rather than overstating it. Deposits and withdrawals are sell / buy <em>intent</em>, not confirmed trades.
              </div>
            </IntelCard>
          </div>
        </div>
      </ConsoleModule>

      {/* ── Supporting detail: likelihood-weighted sell-pressure attribution ── */}
      {c.live && c.weeks.length > 0 && (
        <ConsoleModule dot="var(--iron)" title="Detail · Sell-pressure attribution" meta="likelihood-weighted exchange-bound flow, by cohort">
          <div className="console-grid">
            <div className="span-4">
              <IntelCard title="Sell pressure by cohort" meta="share of weighted exchange-bound flow">
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {spOrder.map((co) => {
                    const t = spTotals.get(co);
                    const meta = SP[co] ?? { label: co, color: "var(--ink-40)" };
                    const pct = t?.pct ?? 0;
                    return (
                      <div key={co}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                          <span style={{ color: "var(--ink-80)" }}>{meta.label}</span>
                          <span className="data" style={{ color: "var(--ink-60)" }}>{fmt(t?.weighted ?? 0)} · {pct.toFixed(0)}%</span>
                        </div>
                        <div className="gbar" style={{ height: 7 }}>
                          <div className="gbar-fill" style={{ width: `${Math.max(1, pct)}%`, "--gbar-c": meta.color } as React.CSSProperties} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </IntelCard>
            </div>
            <div className="span-8">
              <IntelCard title="Weekly sell pressure, by cohort" meta="weighted ATOM per week">
                <LineChart
                  series={spOrder.map((co) => ({
                    label: SP[co]?.label ?? co,
                    color: SP[co]?.color ?? "var(--ink-40)",
                    points: c.weeks.map((w) => ({ date: fmtWeek(w.week), value: c.series.find((p) => p.week === w.week && p.cohort === co)?.weighted ?? 0 })),
                  }))}
                  yLabel="ATOM" height={280}
                />
              </IntelCard>
            </div>
            <div className="span-12">
              <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--ink-40)" }}>
                Sell pressure weights each exchange-bound transfer by likelihood (direct deposit ×0.95, IBC-out with swap memo ×1.00, IBC-out without ×0.25) and attributes it to the sender&rsquo;s cohort. It is a one-sided view (outflow only) shown here for depth; the accumulation stance above is the net, two-sided read.
              </div>
            </div>
          </div>
        </ConsoleModule>
      )}
    </ConsolePage>
  );
}
