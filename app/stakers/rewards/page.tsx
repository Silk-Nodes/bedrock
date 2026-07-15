// /stakers/rewards · reward claims and what delegators DO with them, live from
// the indexer. Window KPIs (24h/7d/30d), then the behavioral core: claimers
// bucketed by stake tier, each tier's claim cadence and the split of claimed
// ATOM into restaked (re-delegated within 48h), sold (sent to a verified
// exchange within 48h, sell intent), and held. Top claimants table below.

import { MetricCard } from "@/components/console/MetricCard";
import { ConsolePage, ConsoleModule, IntelCard } from "@/components/console/Console";
import { Soon } from "@/components/console/Soon";
import { AddressLink } from "@/components/address/AddressLink";
import { getRewardClaims, getRewardBehavior, type RewardTierBehavior } from "@/lib/indexer";
import { TipCard } from "@/components/charts/TipCard";
import { ShareStack } from "@/components/share/ShareCharts";
import { seo } from "@/lib/seo";

export const revalidate = 600;

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return Math.round(n).toString();
}
function shortAddr(a: string): string { return `${a.slice(0, 12)}…${a.slice(-5)}`; }

export const metadata = seo({ title: "Staking Rewards", description: "ATOM staking rewards on the Cosmos Hub: claims over 24h/7d/30d, and what each delegator tier does after claiming: restake, hold, or sell to an exchange.", path: "/stakers/rewards", keywords: ["ATOM staking rewards", "reward claim behavior", "do stakers sell rewards", "Cosmos restaking"] });

const TIER: Record<string, { label: string; note: string }> = {
  "500k+": { label: "500k+ ATOM", note: "mega-stakers" },
  "100k-500k": { label: "100k-500k", note: "large stakers" },
  "10k-100k": { label: "10k-100k", note: "significant" },
  "1k-10k": { label: "1k-10k", note: "mid-size" },
  under_1k: { label: "Under 1k", note: "retail" },
};

const C_RESTAKE = "var(--moss)";
const C_SOLD = "var(--iron)";
const C_HELD = "var(--slate)";

// One horizontal stacked bar: restaked / sold / held shares of claimed rewards.
// Each tier's bar is one hover target showing a structured card: the tier's
// full split with amounts and wallet counts, so the table rows stay clean.
function SplitBar({ t, label }: { t: RewardTierBehavior; label: string }) {
  const total = Math.max(1, t.claimed);
  const pc = (v: number) => `${((v / total) * 100).toFixed(0)}%`;
  const segs: [number, string][] = [[t.restaked, C_RESTAKE], [t.sold, C_SOLD], [t.held, C_HELD]];
  const last = segs.length - 1;
  return (
    <div className="tipwrap" style={{ display: "flex", height: 12, borderRadius: 3, background: "var(--paper-2)" }}>
      <TipCard title={`${label} · ${fmtCompact(t.claimed)} ATOM claimed`} rows={[
        { label: "restaked", value: `${pc(t.restaked)} · ${fmtCompact(t.restaked)}`, color: C_RESTAKE },
        { label: "to exchange", value: `${pc(t.sold)} · ${fmtCompact(t.sold)}`, color: C_SOLD },
        { label: "held liquid", value: `${pc(t.held)} · ${fmtCompact(t.held)}`, color: C_HELD },
        { label: "wallets", value: `${t.restakers.toLocaleString("en-US")} / ${t.sellers.toLocaleString("en-US")} / ${t.holders.toLocaleString("en-US")}`, total: true },
      ]} />
      {segs.map(([v, c], i) => (
        <div key={i} style={{
          width: `${(v / total) * 100}%`, background: c,
          borderRadius: i === 0 ? "3px 0 0 3px" : i === last ? "0 3px 3px 0" : 0,
          boxShadow: `0 0 6px color-mix(in srgb, ${c} 30%, transparent)`,
        }} />
      ))}
    </div>
  );
}

export default async function StakersRewards() {
  const [claims, b] = await Promise.all([getRewardClaims(168, 12), getRewardBehavior()]);

  if (!b.live || b.w30d.claims === 0) {
    return (
      <ConsolePage>
        <ConsoleModule lead>
          <Soon title="Reward claims" note="Reward-withdrawal events land here as the indexer accumulates a window. No estimates until then." />
        </ConsoleModule>
      </ConsolePage>
    );
  }

  // Narrative: which tier claims most often, and where the selling concentrates.
  const tiers = b.tiers.filter((t) => t.wallets > 0);
  const totalClaimed = tiers.reduce((s, t) => s + t.claimed, 0);
  const totalSold = tiers.reduce((s, t) => s + t.sold, 0);
  const totalRestaked = tiers.reduce((s, t) => s + t.restaked, 0);
  const topSeller = [...tiers].sort((a, x) => (x.sold / Math.max(1, x.claimed)) - (a.sold / Math.max(1, a.claimed)))[0];

  const top12Atom = claims.live ? claims.top.reduce((s, c) => s + c.total_atom, 0) : 0;

  return (
    <ConsolePage>
      <ConsoleModule lead dot="var(--moss)" title="Stakers · Rewards" meta="claims & post-claim behavior · live from the indexer">
        <div className="console-grid">
          {/* Thesis lede */}
          <div className="span-12">
            <IntelCard title="What stakers do with their rewards" meta="last 30 days · post-claim behavior" accent>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-80)", margin: 0 }}>
                Over the last 30 days, <strong style={{ color: "var(--ink)" }}>{b.w30d.claimers.toLocaleString("en-US")}</strong> wallets claimed{" "}
                <strong style={{ color: "var(--ink)" }}>{fmtCompact(b.w30d.atom)} ATOM</strong> in staking rewards. Within 48 hours of claiming,{" "}
                <strong style={{ color: C_RESTAKE }}>{((totalRestaked / Math.max(1, totalClaimed)) * 100).toFixed(0)}%</strong> was re-delegated (compounding) and only{" "}
                <strong style={{ color: C_SOLD }}>{((totalSold / Math.max(1, totalClaimed)) * 100).toFixed(0)}%</strong> moved to an exchange.{" "}
                {topSeller ? (
                  <>Reward-selling concentrates at the top: the <strong style={{ color: "var(--ink)" }}>{TIER[topSeller.tier]?.label ?? topSeller.tier}</strong> tier sends{" "}
                  <strong style={{ color: C_SOLD }}>{((topSeller.sold / Math.max(1, topSeller.claimed)) * 100).toFixed(0)}%</strong> of claimed rewards toward exchanges, while every smaller tier sells almost none of theirs.</>
                ) : null}
              </p>
            </IntelCard>
          </div>

          {/* Window KPIs: 24h / 7d / 30d / cadence */}
          <div className="span-3"><MetricCard label="Claimed · 24h" value={fmtCompact(b.w24h.atom)} unit="ATOM" series={[]} color="var(--moss)" trendLabel={`${b.w24h.claims.toLocaleString("en-US")} claims`} footnote={`${b.w24h.claimers.toLocaleString("en-US")} wallets`} /></div>
          <div className="span-3"><MetricCard label="Claimed · 7d" value={fmtCompact(b.w7d.atom)} unit="ATOM" series={[]} color="var(--hub)" trendLabel={`${b.w7d.claims.toLocaleString("en-US")} claims`} footnote={`${b.w7d.claimers.toLocaleString("en-US")} wallets`} /></div>
          <div className="span-3"><MetricCard label="Claimed · 30d" value={fmtCompact(b.w30d.atom)} unit="ATOM" series={[]} color="var(--sand)" trendLabel={`${b.w30d.claims.toLocaleString("en-US")} claims`} footnote={`${b.w30d.claimers.toLocaleString("en-US")} wallets`} /></div>
          <div className="span-3"><MetricCard label="Restaked share" value={`${((totalRestaked / Math.max(1, totalClaimed)) * 100).toFixed(0)}%`} series={[]} color={C_RESTAKE} trendLabel="within 48h of a claim" footnote={`vs ${((totalSold / Math.max(1, totalClaimed)) * 100).toFixed(0)}% sent to exchanges`} /></div>

          {/* Behavior by tier: one aligned table, detail in segment tooltips */}
          <div className="span-12">
            <IntelCard title="Post-claim behavior by stake tier" meta="last 30d · within 48h of a claim · hover a bar for detail" shareFilename="bedrock-reward-behavior" share={{ title: "What stakers do with rewards · Cosmos HUB", subtitle: "Post-claim behavior by stake tier · last 30 days", context: `${((totalRestaked / Math.max(1, totalClaimed)) * 100).toFixed(0)}% of claimed ATOM is restaked within 48h; only ${((totalSold / Math.max(1, totalClaimed)) * 100).toFixed(0)}% reaches an exchange. Per tier: restaked, sent to an exchange, or held liquid.`, body: <ShareStack rows={tiers.map((t) => ({ label: TIER[t.tier]?.label ?? t.tier, segments: [{ label: "restaked", value: t.restaked, color: C_RESTAKE }, { label: "to exchange", value: t.sold, color: C_SOLD }, { label: "held liquid", value: t.held, color: C_HELD }] }))} /> }}>
              {/* legend */}
              <div style={{ display: "flex", gap: 18, marginBottom: 12, fontSize: 11.5, color: "var(--ink-60)" }}>
                {[["restaked", C_RESTAKE], ["to exchange", C_SOLD], ["held liquid", C_HELD]].map(([l, c]) => (
                  <span key={l}><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: c, marginRight: 6 }} />{l}</span>
                ))}
              </div>
              <table className="broadsheet">
                <thead>
                  <tr>
                    <th>Stake tier</th>
                    <th style={{ textAlign: "right" }}>Wallets</th>
                    <th style={{ textAlign: "right" }}>Claims/wallet</th>
                    <th style={{ textAlign: "right" }}>Claimed</th>
                    <th style={{ width: "34%" }}>Where it went</th>
                    <th style={{ textAlign: "right" }}>Restaked</th>
                    <th style={{ textAlign: "right" }}>Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {b.tiers.map((t) => {
                    const meta = TIER[t.tier] ?? { label: t.tier, note: "" };
                    const pc = (v: number) => ((v / Math.max(1, t.claimed)) * 100).toFixed(0);
                    return (
                      <tr key={t.tier}>
                        <td style={{ color: "var(--ink)", fontWeight: 600, whiteSpace: "nowrap" }}>
                          {meta.label} <span className="data" style={{ color: "var(--ink-40)", fontSize: 11, fontWeight: 400 }}>· {meta.note}</span>
                        </td>
                        <td className="num" style={{ color: "var(--ink-60)" }}>{t.wallets.toLocaleString("en-US")}</td>
                        <td className="num" style={{ color: "var(--ink-60)" }}>{t.claimsPerWallet.toFixed(1)}</td>
                        <td className="num" style={{ color: "var(--ink)" }}>{fmtCompact(t.claimed)}</td>
                        <td><SplitBar t={t} label={meta.label} /></td>
                        <td className="num" style={{ color: C_RESTAKE, fontWeight: 600 }}>{pc(t.restaked)}%</td>
                        <td className="num" style={{ color: t.sold > 0 ? C_SOLD : "var(--ink-40)", fontWeight: 600 }}>{pc(t.sold)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </IntelCard>
          </div>

          {/* Top claimants (existing view, kept) */}
          {claims.live && claims.top.length > 0 && (
            <div className="span-12">
              <IntelCard title="Top claimants" meta={`last 7d · ${fmtCompact(top12Atom)} ATOM across the top ${claims.top.length}`}>
                <table className="broadsheet">
                  <thead><tr><th>Wallet</th><th style={{ textAlign: "right" }}>Claimed</th><th style={{ textAlign: "right" }}>Claims</th></tr></thead>
                  <tbody>
                    {claims.top.map((c) => (
                      <tr key={c.address}>
                        <td className="data" style={{ fontSize: 12 }}><AddressLink addr={c.address} style={{ color: "var(--ink-80)" }}>{shortAddr(c.address)}</AddressLink></td>
                        <td className="num" style={{ color: "var(--moss)", fontWeight: 600 }}>{fmtCompact(c.total_atom)}</td>
                        <td className="num" style={{ color: "var(--ink-60)" }}>{c.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </IntelCard>
            </div>
          )}

          {/* Methodology */}
          <div className="span-12">
            <IntelCard title="How post-claim behavior is measured" meta="methodology">
              <div style={{ fontSize: 12.5, lineHeight: 1.7, color: "var(--ink-60)" }}>
                Every <strong style={{ color: "var(--ink-80)" }}>reward_withdraw</strong> event in the last 30 days is attributed to its delegator (exchange-operated wallets excluded). A wallet&rsquo;s rewards count as{" "}
                <strong style={{ color: "var(--ink-80)" }}>restaked</strong> if it re-delegated within 48 hours of a claim, and as{" "}
                <strong style={{ color: "var(--ink-80)" }}>sold</strong> if it sent ATOM to a verified exchange within 48 hours of a claim (a sell-intent proxy, not a confirmed sale); the remainder is{" "}
                <strong style={{ color: "var(--ink-80)" }}>held</strong>. Both are capped at the amount claimed, so unrelated large transfers cannot inflate the shares. Stake tiers use the wallet&rsquo;s real on-chain staked balance where fetched (refreshed daily, largest wallets first); wallets not yet fetched are tiered by their claim run-rate annualized at the live staking APR, which lands them in the correct band.
              </div>
            </IntelCard>
          </div>
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
