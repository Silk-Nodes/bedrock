// /validators/concentration - Top-10 share, Nakamoto, VP distribution (live).

import { MetricCard } from "@/components/console/MetricCard";
import { ShareBars } from "@/components/share/ShareCharts";
import {
  ConsolePage, ConsoleModule, IntelCard,
} from "@/components/console/Console";
import { Soon } from "@/components/console/Soon";
import { ValidatorLink } from "@/components/validator/ValidatorLink";
import { getLiveValidators } from "@/lib/validators";
import { seo } from "@/lib/seo";

export const revalidate = 300;

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toString();
}

type Row = { rank: number; operator: string; moniker: string; voting_power: number; voting_power_pct: number };

export const metadata = seo({ title: "Validator Concentration", description: "How concentrated Cosmos Hub stake is: the Nakamoto coefficient, top-10 voting power, and how decentralized the validator set really is.", path: "/validators/concentration", keywords: ["Cosmos Hub decentralization", "Nakamoto coefficient", "validator concentration"] });

export default async function ValidatorsConcentration() {
  const live = await getLiveValidators(40);
  const liveOn = live.live && live.validators.length > 0;

  const rows: Row[] = liveOn
    ? live.validators.map((v) => ({ rank: v.rank, operator: v.operator, moniker: v.moniker, voting_power: v.voting_power, voting_power_pct: v.voting_power_pct }))
    : [];

  const top10 = rows.slice(0, 10);
  const maxVP = top10.length ? top10[0].voting_power : 1;
  const nakamoto = liveOn ? live.nakamoto : 0;
  const top10share = liveOn ? live.top10_pct : 0;
  const largestPct = top10.length ? top10[0].voting_power_pct : 0;

  // Live cross-sectional shapes (not time): the actual VP curve of the set.
  const vpDesc = rows.map((v) => v.voting_power);
  const vpPctDesc = rows.map((v) => v.voting_power_pct);
  // Cumulative VP share, validator by validator: the Lorenz-style climb whose
  // 33.34% crossing IS the Nakamoto coefficient.
  const cumShare = (() => {
    let c = 0;
    return rows.map((v) => +(c += v.voting_power_pct).toFixed(3));
  })();
  // Bottom-set share = inverse of concentration; a single honest figure.
  const restShare = liveOn ? +(100 - top10share).toFixed(1) : 0;

  return (
    <ConsolePage>
      <ConsoleModule title="Concentration" lead dot="var(--slate)" meta={liveOn ? "source on-chain" : "source offline"}>
      <div className="console-grid">
        <div className="span-3">
          <MetricCard label="Nakamoto coefficient" value={liveOn ? `${nakamoto}` : "n/a"} series={cumShare} delta={false} color="var(--hub)" trendLabel="cumulative VP climb" footnote="validators to halt the chain" />
        </div>
        <div className="span-3">
          <MetricCard label="Top-10 share" value={liveOn ? `${top10share.toFixed(1)}%` : "n/a"} series={vpPctDesc} delta={false} color="var(--hub-2)" trendLabel="VP per validator, high → low" footnote="of voting power, live" />
        </div>
        <div className="span-3">
          <MetricCard label="Largest validator" value={liveOn ? `${largestPct.toFixed(1)}%` : "n/a"} series={vpDesc} delta={false} color="var(--sand)" trendLabel="stake per validator" footnote={top10.length ? top10[0].moniker : "n/a"} />
        </div>
        <div className="span-3">
          <MetricCard label="Rest of set" value={liveOn ? `${restShare.toFixed(1)}%` : "n/a"} series={vpPctDesc.slice(10)} delta={false} color="var(--moss)" trendLabel="VP outside the top 10" footnote="held by validators 11+" />
        </div>

        <div className="span-12">
          <IntelCard title="Voting power, top 10" meta="share of total stake" shareFilename="bedrock-voting-power-concentration"
            share={liveOn ? {
              title: "Cosmos Hub voting power concentration",
              subtitle: `Top ${top10.length} validators by share of total stake`,
              big: String(nakamoto), unit: "Nakamoto coefficient",
              context: `The top ${top10.length} hold ${top10share.toFixed(1)}% · the largest single validator ${largestPct.toFixed(1)}% · everyone below the top ten holds ${restShare.toFixed(1)}%. Live on-chain.`,
              body: <ShareBars rows={top10.map((v) => ({ label: `${v.rank}. ${v.moniker}`, value: v.voting_power, note: `· ${v.voting_power_pct.toFixed(1)}%` }))} />,
            } : undefined}>
            {liveOn ? top10.map((v, i) => (
              <div key={v.rank} style={{
                display: "grid", gridTemplateColumns: "150px 1fr 80px", alignItems: "center", gap: 12,
                padding: "8px 0", borderTop: i === 0 ? "none" : "1px dotted var(--ink-20)",
              }}>
                <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: 600 }}>
                  <span style={{ color: "var(--ink-40)", marginRight: 8 }}>{v.rank}</span>
                  <ValidatorLink oper={v.operator} className="cp-click" style={{ fontWeight: 600, borderBottom: "1px dotted var(--ink-20)", borderRadius: 2 }}>{v.moniker}</ValidatorLink>
                </span>
                <div className="gbar" style={{ height: 12 }}>
                  <div className="gbar-fill" style={{ width: `${(v.voting_power / maxVP) * 100}%`, "--gbar-c": i === 0 ? "var(--hub)" : "var(--slate)" } as React.CSSProperties} />
                </div>
                <span className="data" style={{ fontSize: 12, color: "var(--ink-80)", textAlign: "right" }}>{fmtCompact(v.voting_power)}</span>
              </div>
            )) : (
              <Soon title="Voting power distribution" note="Live, verified data lands here when the chain is reachable. We do not show estimates or placeholder numbers." />
            )}
          </IntelCard>
        </div>
      </div>
          </ConsoleModule>
    </ConsolePage>
  );
}
