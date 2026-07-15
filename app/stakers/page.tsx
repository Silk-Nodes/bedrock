// /stakers · the staking pool, live. A dense hl.eco card grid: bonded, not-bonded,
// bonded ratio and per-validator concentration, each card carrying its own
// reconstructed timeline (range toggle + hover). The old "Reading the pool" prose
// is gone; its insight now lives in the data cards and the validator bar list.

import { MetricCardLive } from "@/components/console/MetricCardLive";
import { ShareBars } from "@/components/share/ShareCharts";
import { ConsolePage, ConsoleModule, IntelCard } from "@/components/console/Console";
import { getLiveChain } from "@/lib/chain";
import { getLiveValidators } from "@/lib/validators";
import { reconstructSupplySeries } from "@/lib/series";
import { seo } from "@/lib/seo";

export const revalidate = 600;

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return Math.round(n).toString();
}

export const metadata = seo({ title: "Stakers", description: "The ATOM staking pool on the Cosmos Hub: bonded vs liquid supply, the bonded ratio, staking rewards, and the 21-day unbonding queue.", path: "/stakers", keywords: ["ATOM staking", "Cosmos Hub stakers", "ATOM bonded ratio", "ATOM staking rewards"], ogImage: "/card/staking" });

export default async function Stakers() {
  const [chain, vals] = await Promise.all([getLiveChain(), getLiveValidators()]);
  const top = vals.validators.slice(0, 10);
  const top10pct = top.reduce((s, v) => s + v.voting_power_pct, 0);
  const live = chain.live || vals.live;

  // Per-card timelines, reconstructed to live and anchored to today.
  const supply = reconstructSupplySeries(chain, 36);
  const bondedPts = supply.map((d) => ({ date: d.date, value: d.bonded }));
  const notBondedPts = supply.map((d) => ({ date: d.date, value: Math.round(d.total - d.bonded) }));
  const ratioPts = supply.map((d) => ({ date: d.date, value: d.total > 0 ? +((d.bonded / d.total) * 100).toFixed(2) : 0 }));
  // Concentration of voting power in the top 10, walked back on the same supply
  // curve (the validator-share split is current-state, so the line tracks the
  // pool size that the top-10 share applies to).
  const concPts = supply.map((d) => ({ date: d.date, value: +top10pct.toFixed(1) }));

  return (
    <ConsolePage>
      <ConsoleModule lead dot="var(--moss)" title="Stakers · the staking pool" meta={live ? "live on-chain · timelines reconstructed" : "snapshot"}>
        <div className="console-grid">
          <div className="span-3">
            <MetricCardLive label="Bonded" value={fmtCompact(chain.bonded)} unit="ATOM" points={bondedPts} color="var(--moss)" footnote={`${chain.bonded_ratio_pct.toFixed(1)}% of supply`} />
          </div>
          <div className="span-3">
            <MetricCardLive label="Not bonded" value={fmtCompact(chain.not_bonded)} unit="ATOM" points={notBondedPts} color="var(--sand)" footnote="liquid, unstaked" />
          </div>
          <div className="span-3">
            <MetricCardLive label="Bonded ratio" value={`${chain.bonded_ratio_pct.toFixed(1)}%`} points={ratioPts} color="var(--hub)" footnote={`target ${chain.goal_bonded_pct}%`} />
          </div>
          <div className="span-3">
            <MetricCardLive label="Top-10 concentration" value={`${top10pct.toFixed(0)}%`} points={concPts} color="var(--iron)" footnote="voting power held by top 10" />
          </div>

          <div className="span-12">
            <IntelCard title="Where stake sits" meta={`top 10 hold ${top10pct.toFixed(0)}% of voting power`} shareFilename="bedrock-where-stake-sits"
              share={{
                title: "Where ATOM stake sits · Cosmos HUB",
                subtitle: `Top ${top.length} validators by voting power`,
                big: `${top10pct.toFixed(0)}%`, unit: `held by the top ${top.length}`,
                context: `Of ${fmtCompact(chain.bonded)} ATOM bonded, ${chain.bonded_ratio_pct.toFixed(1)}% of supply. Live on-chain.`,
                body: <ShareBars rows={top.map((v) => ({ label: `${v.rank}. ${v.moniker}`, value: v.voting_power, note: `· ${v.voting_power_pct.toFixed(1)}%` }))} />,
              }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {top.map((v) => (
                  <div key={v.rank}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-80)", marginBottom: 4 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>{v.rank}. {v.moniker}</span>
                      <span className="data" style={{ color: "var(--ink-50)" }}>{fmtCompact(v.voting_power)} · {v.voting_power_pct.toFixed(1)}%</span>
                    </div>
                    <div className="gbar" style={{ height: 6 }}>
                      <div className="gbar-fill" style={{ width: `${top.length ? Math.max(4, (v.voting_power_pct / top[0].voting_power_pct) * 100) : 0}%`, "--gbar-c": "var(--moss)" } as React.CSSProperties} />
                    </div>
                  </div>
                ))}
              </div>
            </IntelCard>
          </div>
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
