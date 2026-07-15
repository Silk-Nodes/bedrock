// /validators/set - The full validator set table, live from chain (with logos).

import { Fragment } from "react";
import { MetricCard } from "@/components/console/MetricCard";
import {
  ConsolePage, ConsoleModule, IntelCard,
} from "@/components/console/Console";
import { Soon } from "@/components/console/Soon";
import { getLiveValidators, getValidatorLogoMap, type LiveValidator } from "@/lib/validators";
import { getLiveChain } from "@/lib/chain";
import { getLiveAtomPrice } from "@/lib/price";
import { ValidatorAvatar } from "@/components/console/ValidatorAvatar";
import { ValidatorLink } from "@/components/validator/ValidatorLink";
import { seo } from "@/lib/seo";

export const metadata = seo({ title: "Validator Set", description: "The full active Cosmos Hub validator set: each validator's voting power, commission, uptime, and estimated monthly commission income, ranked by stake.", path: "/validators/set", keywords: ["Cosmos Hub validator set", "ATOM validator list", "active validators", "validator income"] });

export const revalidate = 300;

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return Math.round(n).toString();
}

// USD income: whole dollars below 1k, one decimal through 10k ($1.6k), then compact.
function fmtUsd(n: number): string {
  if (n < 1_000) return Math.round(n).toString();
  if (n < 10_000) return `${(n / 1_000).toFixed(1)}k`;
  return fmtCompact(n);
}

export default async function ValidatorsSet() {
  const [live, logos, chain, price] = await Promise.all([
    getLiveValidators(0), getValidatorLogoMap(), getLiveChain(), getLiveAtomPrice(),
  ]);
  const liveOn = live.live && live.validators.length > 0;

  // Validator income: what the operator earns from commission on its delegated
  // stake. income/mo = stake x staking APR (already net of community tax) x
  // commission / 12. Derived from live chain params only; shown only when the
  // APR is live so we never print a stale-rate estimate as fact.
  const aprLive = chain.live && chain.staking_apr_pct > 0;
  const incomeAtomMo = (v: LiveValidator) =>
    v.voting_power * (chain.staking_apr_pct / 100) * v.commission / 12;

  if (!liveOn) {
    return (
      <ConsolePage>
        <ConsoleModule title="Validator set" lead dot="var(--slate)">
          <div className="console-grid">
            <div className="span-12">
              <Soon
                title="The validator set"
                note="Live, verified data lands here when the chain is reachable. We do not show estimates or placeholder numbers."
              />
            </div>
          </div>
        </ConsoleModule>
      </ConsolePage>
    );
  }

  const rows: LiveValidator[] = live.validators;

  const totalVP = rows.reduce((s, v) => s + v.voting_power, 0);
  let cum = 0;

  // Live cross-sectional shapes (the actual curve of the set, not time).
  const vpDesc = rows.map((v) => v.voting_power);
  const uptimes = rows.map((v) => v.uptime_pct).filter((u): u is number => u !== null).sort((a, b) => a - b);
  const jailed = rows.filter((v) => v.jailed).length;
  const medianVp = (() => {
    const s = [...vpDesc].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  })();

  // Sticky header cells so the long list scrolls inside the card.
  const thS: React.CSSProperties = { position: "sticky", top: 0, background: "var(--paper)", zIndex: 1 };

  return (
    <ConsolePage>
      <ConsoleModule lead title="Validator set" dot="var(--slate)" meta="source on-chain">
        <div className="console-grid">
          <div className="span-3">
            <MetricCard label="Active validators" value={`${live.active}`} series={vpDesc} delta={false} color="var(--hub)" trendLabel="VP per validator, high → low" footnote="bonded set · permissionless entry" />
          </div>
          <div className="span-3">
            <MetricCard label="Total bonded" value={fmtCompact(live.total_bonded)} unit="ATOM" series={vpDesc} delta={false} color="var(--slate)" trendLabel="stake per validator" footnote="securing the Hub" />
          </div>
          <div className="span-3">
            <MetricCard label="Median stake" value={fmtCompact(medianVp)} unit="ATOM" series={[...vpDesc].sort((a, b) => a - b)} delta={false} color="var(--sand)" trendLabel="set, low → high" footnote={`vs ${fmtCompact(vpDesc[0] ?? 0)} at the top`} />
          </div>
          <div className="span-3">
            <MetricCard label="Avg uptime" value={live.avg_uptime_pct !== null ? `${live.avg_uptime_pct}%` : "n/a"} series={uptimes} delta={false} color="var(--moss)" trendLabel="signers, low → high" footnote={jailed > 0 ? `${jailed} jailed · ${live.signed_blocks_window.toLocaleString("en-US")}-block window` : `${live.signed_blocks_window.toLocaleString("en-US")}-block window`} />
          </div>

          <div className="span-12">
            <IntelCard title="The set" meta={`${rows.length} bonded validators, live`}>
              <div style={{ maxHeight: 560, overflowY: "auto" }}>
              <table className="broadsheet mcols-4">
                <thead>
                  <tr>
                    <th style={{ ...thS, width: 40 }}>#</th>
                    <th style={thS}>Validator</th>
                    <th style={{ ...thS, textAlign: "right" }}>Voting power</th>
                    <th style={{ ...thS, textAlign: "right" }}>Share</th>
                    <th style={{ ...thS, textAlign: "right" }}>Cumulative</th>
                    <th style={{ ...thS, textAlign: "right" }}>Comm.</th>
                    {aprLive && <th style={{ ...thS, textAlign: "right" }}>Income</th>}
                    <th style={{ ...thS, textAlign: "right" }}>Uptime</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((v) => {
                    cum += v.voting_power;
                    const cumPct = (cum / totalVP) * 100;
                    return (
                      <Fragment key={v.rank}>
                        <tr className={v.rank <= 10 ? "top" : ""}>
                          <td className="num" style={{ color: "var(--ink-60)" }}>{v.rank}</td>
                          <td style={{ color: "var(--ink)", fontWeight: 600 }}>
                            <ValidatorLink oper={v.operator} className="cp-click" style={{ display: "inline-flex", alignItems: "center", gap: 9, fontWeight: 600, borderRadius: 3 }}>
                              <ValidatorAvatar operator={v.operator} logo={logos[v.operator] ?? v.logo} moniker={v.moniker} />
                              <span style={{ borderBottom: "1px dotted var(--ink-20)" }}>{v.moniker}</span>
                              {v.jailed ? <span style={{ color: "var(--iron)", marginLeft: 4, fontSize: 10 }}>JAILED</span> : null}
                            </ValidatorLink>
                          </td>
                          <td className="num" style={{ color: "var(--ink)" }}>{fmtCompact(v.voting_power)}</td>
                          <td className="num" style={{ color: "var(--ink-60)" }}>{v.voting_power_pct.toFixed(2)}%</td>
                          <td className="num" style={{ color: "var(--ink-60)" }}>{cumPct.toFixed(1)}%</td>
                          <td className="num" style={{ color: "var(--ink-80)" }}>{(v.commission * 100).toFixed(0)}%</td>
                          {aprLive && (
                            <td className="num" style={{ color: "var(--ink)" }}>
                              {fmtCompact(incomeAtomMo(v))}
                              <span style={{ color: "var(--ink-40)", fontSize: 11 }}>
                                {" "}ATOM/mo{price.live ? ` · ~$${fmtUsd(incomeAtomMo(v) * price.usd)}` : ""}
                              </span>
                            </td>
                          )}
                          <td className="num" style={{ color: v.uptime_pct === null ? "var(--ink-40)" : v.uptime_pct >= 99 ? "var(--moss)" : v.uptime_pct >= 95 ? "var(--ink-80)" : "var(--iron)" }}>
                            {v.uptime_pct === null ? "n/a" : `${v.uptime_pct.toFixed(1)}%`}
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              </div>
              {aprLive && (
                <div className="data" style={{ fontSize: 11, color: "var(--ink-40)", marginTop: 10, letterSpacing: 0.2 }}>
                  Income = the operator&rsquo;s commission on its delegated stake: stake × {chain.staking_apr_pct.toFixed(1)}% staking APR (live, net of community tax) × commission, monthly{price.live ? `, at $${price.usd.toFixed(2)}/ATOM` : ""}. Before infrastructure costs and any self-bond share.
                </div>
              )}
            </IntelCard>
          </div>
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
