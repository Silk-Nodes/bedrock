// /validators/commission - Commission distribution, live from chain.

import { MetricCard } from "@/components/console/MetricCard";
import { ShareBars } from "@/components/share/ShareCharts";
import {
  ConsolePage, ConsoleModule, IntelCard,
} from "@/components/console/Console";
import { Soon } from "@/components/console/Soon";
import { getLiveValidators } from "@/lib/validators";
import { seo } from "@/lib/seo";

// Build a sparkline from the live cross-sectional distribution (not time):
// the commission rate of every validator, sorted, is the actual live shape of
// the set. Honest live data, used as the card's curve.

// The Hub enforces a 5% minimum commission (chain param min_commission_rate),
// so there is no 0-5% band: the first band is the floor itself, which is the
// interesting number (how much of the set prices at the minimum). The catch-all
// upper bound is 1.01 so validators at exactly 100% are counted, not dropped.
const BANDS = [
  { label: "5% · floor", min: 0, max: 0.0501 },
  { label: "5-7%", min: 0.0501, max: 0.0701 },
  { label: "7-10%", min: 0.0701, max: 0.1001 },
  { label: "> 10%", min: 0.1001, max: 1.01 },
];

export const metadata = seo({ title: "Validator Commission", description: "Commission rates across the Cosmos Hub validator set: what each validator charges on ATOM staking rewards and how rates compare.", path: "/validators/commission", keywords: ["validator commission", "ATOM staking commission", "Cosmos Hub commission rates"] });
export const revalidate = 300;

export default async function ValidatorsCommission() {
  const live = await getLiveValidators(0); // no logos needed here, just commissions
  const liveOn = live.live && live.validators.length > 0;

  const rows = liveOn
    ? live.validators.map((v) => ({ commission: v.commission, voting_power: v.voting_power }))
    : [];

  if (!liveOn) {
    return (
      <ConsolePage>
        <ConsoleModule title="Commission" lead dot="var(--slate)">
          <div className="console-grid">
            <div className="span-12">
              <Soon
                title="Commission distribution"
                note="Live, verified data lands here when the chain is reachable. We do not show estimates or placeholder numbers."
              />
            </div>
          </div>
        </ConsoleModule>
      </ConsolePage>
    );
  }

  const commissions = rows.map((v) => v.commission);
  const avg = (commissions.reduce((s, c) => s + c, 0) / Math.max(commissions.length, 1)) * 100;
  const min = Math.min(...commissions) * 100;
  const max = Math.max(...commissions) * 100;
  const median = (() => {
    const s = [...commissions].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) * 100;
  })();

  const banded = BANDS.map((b) => {
    const vals = rows.filter((v) => v.commission >= b.min && v.commission < b.max);
    return { ...b, count: vals.length, vp: vals.reduce((s, v) => s + v.voting_power, 0) };
  });
  const maxCount = Math.max(...banded.map((b) => b.count), 1);

  // Live distributions as card sparklines (sorted cross-sections of the set).
  const commAsc = rows.map((v) => v.commission * 100).sort((a, b) => a - b);
  // Effective commission weighted by stake, per validator sorted by VP.
  const byVp = [...rows].sort((a, b) => b.voting_power - a.voting_power);
  const totalVp = byVp.reduce((s, v) => s + v.voting_power, 0) || 1;
  const vpWeightedComm = byVp.map((v) => v.commission * 100);
  const stakeWeightedAvg = (byVp.reduce((s, v) => s + v.commission * v.voting_power, 0) / totalVp) * 100;
  const bandCounts = banded.map((b) => b.count);

  return (
    <ConsolePage>
      <ConsoleModule lead title="Commission" dot="var(--slate)" meta={`${rows.length} live`}>
      <div className="console-grid">
        {/* All series are cross-sectional distributions, not timelines, so the
            auto delta badge is suppressed (delta={false}). */}
        <div className="span-3">
          <MetricCard label="Average commission" value={`${avg.toFixed(1)}%`} series={commAsc} delta={false} color="var(--hub)" trendLabel="low → high across set" footnote="simple mean across the set" />
        </div>
        <div className="span-3">
          <MetricCard label="Median" value={`${median.toFixed(1)}%`} series={commAsc} delta={false} color="var(--moss)" trendLabel="sorted distribution" footnote="typical validator" />
        </div>
        <div className="span-3">
          <MetricCard label="Stake-weighted" value={`${stakeWeightedAvg.toFixed(1)}%`} series={vpWeightedComm} delta={false} color="var(--sand)" trendLabel="by voting power, high → low" footnote="fee delegators actually pay" />
        </div>
        <div className="span-3">
          <MetricCard label="Range" value={`${min.toFixed(0)}-${max.toFixed(0)}%`} series={bandCounts} delta={false} color="var(--hub-2)" trendLabel="validators per band" footnote="low to high" />
        </div>

        <div className="span-6">
          <IntelCard title="Commission distribution" meta="validators per band" shareFilename="bedrock-commission-distribution"
            share={{
              title: "Validator commission · Cosmos HUB",
              subtitle: "Validators in each commission band",
              big: `${median.toFixed(1)}%`, unit: "median commission",
              context: `Mean ${avg.toFixed(1)}% · stake-weighted ${stakeWeightedAvg.toFixed(1)}%, which is what delegators actually pay · range ${min.toFixed(0)} to ${max.toFixed(0)}%. Self-declared on-chain.`,
              body: <ShareBars unit="validators" rows={banded.map((b) => ({ label: b.label, value: b.count, display: String(b.count) }))} />,
            }}>
            {banded.map((b, i) => (
              <div key={b.label} style={{
                display: "grid", gridTemplateColumns: "90px 1fr 50px", alignItems: "center", gap: 12,
                padding: "10px 0", borderTop: i === 0 ? "none" : "1px dotted var(--ink-20)",
              }}>
                <span className="data" style={{ fontSize: 12, color: "var(--ink)" }}>{b.label}</span>
                <div className="gbar" style={{ height: 14 }}>
                  <div className="gbar-fill" style={{ width: `${(b.count / maxCount) * 100}%`, "--gbar-c": "var(--hub)" } as React.CSSProperties} />
                </div>
                <span className="data" style={{ fontSize: 12, color: "var(--ink-80)", textAlign: "right" }}>{b.count}</span>
              </div>
            ))}
          </IntelCard>
        </div>
        <div className="span-6">
          <IntelCard title="By voting power" meta="stake in each band" accent shareFilename="bedrock-commission-by-power"
            share={{
              title: "Where the stake pays commission · Cosmos HUB",
              subtitle: "Share of voting power in each commission band",
              big: `${stakeWeightedAvg.toFixed(1)}%`, unit: "stake-weighted commission",
              context: "The fee delegators actually pay, weighted by where the stake sits, rather than the simple mean across the set.",
              body: <ShareBars unit="" rows={banded.map((b) => ({ label: b.label, value: (b.vp / totalVp) * 100, display: `${((b.vp / totalVp) * 100).toFixed(0)}%`, color: "var(--sand)" }))} />,
            }}>
            {banded.map((b, i) => {
              const pct = (b.vp / totalVp) * 100;
              return (
                <div key={b.label} style={{
                  display: "grid", gridTemplateColumns: "90px 1fr 50px", alignItems: "center", gap: 12,
                  padding: "10px 0", borderTop: i === 0 ? "none" : "1px dotted var(--ink-20)",
                }}>
                  <span className="data" style={{ fontSize: 12, color: "var(--ink)" }}>{b.label}</span>
                  <div className="gbar" style={{ height: 14 }}>
                    <div className="gbar-fill" style={{ width: `${pct}%`, "--gbar-c": "var(--sand)" } as React.CSSProperties} />
                  </div>
                  <span className="data" style={{ fontSize: 12, color: "var(--ink-80)", textAlign: "right" }}>{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </IntelCard>
        </div>
      </div>
          </ConsoleModule>
    </ConsolePage>
  );
}
