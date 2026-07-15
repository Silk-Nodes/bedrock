// ATOM Holders: who holds ATOM and how the base shifts between retail and whales.
// Holder counts are wallets by COMBINED balance (liquid bank + bonded stake),
// captured daily by the indexer's snapshot job from the bank DenomOwners and
// staking delegations LCD queries. Real on-chain data, no estimates. The
// over-time charts and 24h / all-time-high deltas accrue forward from first
// capture, so they fill in as daily snapshots accumulate.
import { ConsolePage, ConsoleModule, IntelCard } from "@/components/console/Console";
import { LineChart, type Series } from "@/components/charts/LineChart";
import { StatCard } from "@/components/console/StatCard";
import { AddressLink } from "@/components/address/AddressLink";
import { HoverTip } from "@/components/HoverTip";
import { getHolders, type HolderSnap } from "@/lib/indexer";
import { getLiveAtomMarket } from "@/lib/price";
import { getLiveChain } from "@/lib/chain";
import { seo } from "@/lib/seo";

export const revalidate = 600;
export const metadata = seo({ title: "ATOM Holders", description: "Cosmos Hub holder analytics: total ATOM wallets, holder tiers, the distribution pyramid, and the leaderboard of largest addresses.", path: "/atom/holders", keywords: ["ATOM holders", "Cosmos Hub wallets", "ATOM rich list", "ATOM holder count"], ogImage: "/card/holders" });

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}
function signed(n: number): string {
  return `${n >= 0 ? "+" : "−"}${fmt(Math.abs(n))}`;
}
function short(a: string): string {
  return a.length > 16 ? `${a.slice(0, 11)}…${a.slice(-5)}` : a;
}

// Tier thresholds, mirroring the snapshot job (whole ATOM).
const TIERS: { key: keyof HolderSnap["tiers"]; label: string; threshold: number }[] = [
  { key: "t10", label: "≥ 10 ATOM", threshold: 10 },
  { key: "t100", label: "≥ 100 ATOM", threshold: 100 },
  { key: "t1k", label: "≥ 1K ATOM", threshold: 1000 },
  { key: "t10k", label: "≥ 10K ATOM", threshold: 10000 },
  { key: "t100k", label: "≥ 100K ATOM", threshold: 100000 },
  { key: "t1m", label: "≥ 1M ATOM", threshold: 1000000 },
];

// Pyramid bands, largest first. dust (<10) is excluded from the bands.
const BANDS: { key: keyof HolderSnap["bands"]; label: string; color: string }[] = [
  { key: "b1m", label: "1M+", color: "var(--hub)" },
  { key: "b100k", label: "100K - 1M", color: "var(--hub-2)" },
  { key: "b10k", label: "10K - 100K", color: "var(--moss)" },
  { key: "b1k", label: "1K - 10K", color: "var(--sand)" },
  { key: "b100", label: "100 - 1K", color: "var(--slate)" },
  { key: "b10", label: "10 - 100", color: "var(--ink-40)" },
];

function usd(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

export default async function HoldersPage() {
  const [h, market, chain] = await Promise.all([getHolders(), getLiveAtomMarket(), getLiveChain()]);
  const price = market.usd || 0;

  if (!h.available || !h.latest) {
    return (
      <ConsolePage>
        <ConsoleModule lead title="ATOM · Holders" dot="var(--hub)" meta="building first snapshot">
          <div className="console-grid">
            <div className="span-12">
              <IntelCard title="Holder snapshot is being built" accent>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-80)", margin: 0 }}>
                  The first daily snapshot of the ATOM holder base is being captured. It walks every
                  uatom holder (about 2.9M wallets) plus every bonded delegation, sums each wallet&rsquo;s
                  liquid and staked ATOM, and rolls it into tiers, bands and a leaderboard. This takes a
                  few minutes and runs once a day. Check back shortly.
                </p>
              </IntelCard>
            </div>
          </div>
        </ConsoleModule>
      </ConsolePage>
    );
  }

  const L = h.latest;
  const prev = h.history.length >= 2 ? h.history[h.history.length - 2] : null;

  // ATH per tier across all captured history (so "vs ATH" is honest as it grows).
  const tierATH = (key: keyof HolderSnap["tiers"]) =>
    h.history.reduce((m, s) => Math.max(m, s.tiers[key]), 0);

  const whaleSharePct = L.holders_total > 0 ? (L.tiers.t10k / L.holders_total) * 100 : 0;
  const top10Pct = L.total_atom > 0 ? (L.top10_atom / L.total_atom) * 100 : 0;
  const top50Pct = L.total_atom > 0 ? (L.top50_atom / L.total_atom) * 100 : 0;
  const top100Pct = L.total_atom > 0 ? (L.top100_atom / L.total_atom) * 100 : 0;

  // Base economics: USD value, average holding, % of held ATOM that's staked,
  // and the median band among non-dust holders (the "typical real holder").
  const baseValueUsd = L.total_atom * price;
  const avgHolding = L.holders_total > 0 ? L.total_atom / L.holders_total : 0;
  const pctStaked = L.total_atom > 0 && chain.bonded > 0 ? (chain.bonded / L.total_atom) * 100 : 0;
  const banded = L.holders_total - L.bands.dust;
  const bandSeq: { key: keyof HolderSnap["bands"]; label: string }[] = [
    { key: "b10", label: "10-100" }, { key: "b100", label: "100-1K" }, { key: "b1k", label: "1K-10K" },
    { key: "b10k", label: "10K-100K" }, { key: "b100k", label: "100K-1M" }, { key: "b1m", label: "1M+" },
  ];
  let cum = 0;
  let medianBand = "10-100";
  for (const b of bandSeq) { cum += L.bands[b.key]; if (cum >= banded / 2) { medianBand = b.label; break; } }

  const dHolders = prev ? L.holders_total - prev.holders_total : null;
  const dRetail = prev ? L.tiers.t10 - prev.tiers.t10 : null;
  const dWhale = prev ? L.tiers.t10k - prev.tiers.t10k : null;
  const dStakers = prev ? L.stakers_total - prev.stakers_total : null;

  // Whales-vs-retail over time (forward-filling history).
  const showTrend = h.history.length >= 2;
  const retailSeries: Series[] = [
    { label: "Retail ≥ 10", color: "var(--ink-40)", points: h.history.map((s) => ({ date: s.day, value: s.tiers.t10 })) },
  ];
  const whaleSeries: Series[] = [
    { label: "Whales ≥ 10K", color: "var(--hub)", points: h.history.map((s) => ({ date: s.day, value: s.tiers.t10k })) },
  ];

  const pyramidMax = Math.max(1, ...BANDS.map((b) => L.bands[b.key]));
  const bandedTotal = BANDS.reduce((s, b) => s + L.bands[b.key], 0);

  return (
    <ConsolePage>
      <ConsoleModule
        lead
        dot="var(--hub)"
        title="ATOM · Holders"
        meta={`${fmt(L.holders_total)} wallets · as of ${L.day} · combined liquid + staked · live`}
      >
        <div className="console-grid">
          
          {/* Lede */}
          <div className="span-12">
            <IntelCard title="Who holds ATOM" meta={`as of ${L.day}`} accent>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-80)", margin: 0 }}>
                Holder counts are wallets by total ATOM held, liquid plus staked. Right now{" "}
                <strong style={{ color: "var(--ink)" }}>{fmt(L.holders_total)}</strong> wallets hold ATOM;{" "}
                <strong style={{ color: "var(--ink)" }}>{fmt(L.tiers.t10k)}</strong> of them are whales (≥ 10K), and{" "}
                <strong style={{ color: "var(--ink)" }}>{fmt(L.tiers.t1m)}</strong> are mega-holders (≥ 1M). The top 100 wallets control{" "}
                <strong style={{ color: top100Pct >= 40 ? "var(--iron)" : "var(--ink)" }}>{top100Pct.toFixed(1)}%</strong> of all held ATOM.{" "}
                {h.history.length < 2
                  ? "Over-time trends and 24h / all-time-high deltas build forward from this first snapshot."
                  : "Tier counts and concentration are tracked daily below."}
              </p>
            </IntelCard>
          </div>

          {/* Base economics */}
          <div className="span-2"><StatCard label="Base value" value={price > 0 ? usd(baseValueUsd) : "·"} accent="var(--moss)" sub="held ATOM at today's price" /></div>
          <div className="span-2"><StatCard label="Avg holding" value={compact(avgHolding)} unit="ATOM" accent="var(--hub)" sub={price > 0 ? `${usd(avgHolding * price)} per wallet` : "mean per wallet"} /></div>
          <div className="span-2"><StatCard label="Typical holder" value={medianBand} unit="ATOM" accent="var(--sand)" sub="median wallet above dust" /></div>
          <div className="span-2"><StatCard label="Staked share" value={`${pctStaked.toFixed(0)}`} unit="%" accent="var(--hub-2)" sub="of held ATOM is bonded" /></div>
          <div className="span-2"><StatCard label="Inequality" value={L.gini != null ? L.gini.toFixed(2) : "·"} accent="var(--iron)" sub="Gini · 0 equal, 1 concentrated" /></div>
          <div className="span-2"><StatCard label="On exchanges" value={L.cex_atom > 0 && L.total_atom > 0 ? `${((L.cex_atom / L.total_atom) * 100).toFixed(1)}` : "·"} unit={L.cex_atom > 0 ? "%" : ""} accent="var(--slate)" sub="of held ATOM on CEX wallets" /></div>

          {/* KPI row */}
          <div className="span-2"><StatCard label="Total holders" value={compact(L.holders_total)} accent="var(--hub)" sub={dHolders != null ? `${signed(dHolders)} · 24h` : "wallets holding ATOM"} /></div>
          <div className="span-2"><StatCard label="Retail ≥ 10" value={compact(L.tiers.t10)} accent="var(--sand)" sub={dRetail != null ? `${signed(dRetail)} · 24h` : "retail wallets"} /></div>
          <div className="span-2"><StatCard label="Whales ≥ 10K" value={fmt(L.tiers.t10k)} accent="var(--moss)" sub={dWhale != null ? `${signed(dWhale)} · 24h` : "whale wallets"} /></div>
          <div className="span-2"><StatCard label="Mega ≥ 1M" value={fmt(L.tiers.t1m)} accent="var(--hub-2)" sub="≥ 1M ATOM wallets" /></div>
          <div className="span-2"><StatCard label="Whale share" value={`${whaleSharePct.toFixed(2)}`} unit="%" accent="var(--iron)" sub="≥ 10K of all wallets" /></div>
          <div className="span-2"><StatCard label="Stakers" value={compact(L.stakers_total)} accent="var(--slate)" sub={dStakers != null ? `${signed(dStakers)} · 24h` : "wallets staking ATOM"} /></div>

          {/* Whales vs retail over time */}
          {showTrend ? (
            <>
              <div className="span-6">
                <div className="surface" style={{ padding: "18px 22px" }}>
                  <div className="data" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)", marginBottom: 4 }}>Retail ≥ 10 ATOM · daily</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", marginBottom: 12, fontVariantNumeric: "tabular-nums" }}>{fmt(L.tiers.t10)}</div>
                  <LineChart series={retailSeries} yLabel="wallets" height={200} />
                </div>
              </div>
              <div className="span-6">
                <div className="surface" style={{ padding: "18px 22px" }}>
                  <div className="data" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)", marginBottom: 4 }}>Whales ≥ 10K ATOM · daily</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: "var(--hub)", marginBottom: 12, fontVariantNumeric: "tabular-nums" }}>{fmt(L.tiers.t10k)}</div>
                  <LineChart series={whaleSeries} yLabel="wallets" height={200} />
                </div>
              </div>
            </>
          ) : (
            <div className="span-12">
              <div className="surface" style={{ padding: "18px 22px", fontSize: 12.5, color: "var(--ink-50)", lineHeight: 1.6 }}>
                <strong style={{ color: "var(--ink-70)" }}>Whales vs retail over time</strong> builds here once there are at least two daily
                snapshots. The base is captured once a day, so a second day of data unlocks the trend lines and the 24h deltas.
              </div>
            </div>
          )}

          {/* Tier breakdown table */}
          <div className="span-12">
            <IntelCard title="Tier breakdown" meta="holders at each balance threshold">
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "var(--ink-40)", fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase" }}>
                      <th style={{ padding: "8px 10px" }}>Tier</th>
                      <th style={{ padding: "8px 10px", textAlign: "right" }}>Holders</th>
                      <th style={{ padding: "8px 10px", textAlign: "right" }}>24h</th>
                      <th style={{ padding: "8px 10px", textAlign: "right" }}>vs ATH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...TIERS].reverse().map((t) => {
                      const cur = L.tiers[t.key];
                      const d = prev ? cur - prev.tiers[t.key] : null;
                      const ath = tierATH(t.key);
                      const vsAth = ath > 0 ? ((cur - ath) / ath) * 100 : 0;
                      return (
                        <tr key={t.key} style={{ borderTop: "1px solid var(--ink-10)" }}>
                          <td style={{ padding: "9px 10px", color: "var(--ink-80)" }}>{t.label}</td>
                          <td style={{ padding: "9px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{fmt(cur)}</td>
                          <td style={{ padding: "9px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: d == null ? "var(--ink-30)" : d >= 0 ? "var(--moss)" : "var(--iron)" }}>{d == null ? "·" : signed(d)}</td>
                          <td style={{ padding: "9px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ink-50)" }}>{vsAth >= -0.05 ? "ATH" : `${vsAth.toFixed(1)}%`}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </IntelCard>
          </div>

          {/* Holder pyramid */}
          <div className="span-6">
            <IntelCard title="Holder pyramid" meta="wallets in each balance band">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {BANDS.map((b) => {
                  const n = L.bands[b.key];
                  const w = (n / pyramidMax) * 100;
                  return (
                    <div key={b.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div className="data" style={{ width: 78, fontSize: 11, color: "var(--ink-50)", textAlign: "right" }}>{b.label}</div>
                      <div style={{ flex: 1, height: 22, background: "var(--ink-05)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${Math.max(1.5, w)}%`, height: "100%", background: b.color }} />
                      </div>
                      <div style={{ width: 64, fontSize: 12.5, textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{fmt(n)}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: "var(--ink-40)" }}>
                dust &lt; 10 ATOM excluded from bands · {compact(L.bands.dust)} wallets · {fmt(bandedTotal)} in bands
              </div>
            </IntelCard>
          </div>

          {/* Concentration */}
          <div className="span-6">
            <IntelCard title="Concentration" meta="share of all held ATOM">
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { label: "Top 10 wallets", pct: top10Pct, atom: L.top10_atom, color: "var(--iron)" },
                  { label: "Top 50 wallets", pct: top50Pct, atom: L.top50_atom, color: "var(--sand)" },
                  { label: "Top 100 wallets", pct: top100Pct, atom: L.top100_atom, color: "var(--hub)" },
                ].map((r) => (
                  <div key={r.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12.5 }}>
                      <span style={{ color: "var(--ink-70)" }}>{r.label}</span>
                      <span style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{r.pct.toFixed(1)}% · {compact(r.atom)} ATOM</span>
                    </div>
                    <div style={{ height: 10, background: "var(--ink-05)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, r.pct)}%`, height: "100%", background: r.color }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, fontSize: 11, color: "var(--ink-40)" }}>
                of {compact(L.total_atom)} ATOM held across {fmt(L.holders_total)} wallets
              </div>
            </IntelCard>
          </div>

          {/* CTA: deep whale analysis */}
          {h.top.length > 0 && (
            <div className="span-12">
              <a href="/atom/whales" style={{ textDecoration: "none", display: "block" }}>
                <div className="surface" style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, borderColor: "var(--line-accent)" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Analyze the top 100 wallets &rarr;</div>
                    <div style={{ fontSize: 12, color: "var(--ink-50)", marginTop: 3 }}>Who is genesis-era, who is staking vs selling, and each wallet&rsquo;s on-chain vintage and history.</div>
                  </div>
                  <span style={{ color: "var(--hub)", fontSize: 20, flexShrink: 0 }}>&rarr;</span>
                </div>
              </a>
            </div>
          )}

          {/* Leaderboard */}
          {h.top.length > 0 && (
            <div className="span-12">
              <IntelCard title="Largest holders" meta={`top ${h.top.length} by combined balance · liquid + staked`}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ textAlign: "left", color: "var(--ink-40)", fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase" }}>
                        <th style={{ padding: "8px 10px" }}>#</th>
                        <th style={{ padding: "8px 10px" }}>Wallet</th>
                        <th style={{ padding: "8px 10px", textAlign: "right" }}>Combined</th>
                        <th style={{ padding: "8px 10px", textAlign: "right" }}>Staked %</th>
                        <th style={{ padding: "8px 10px", textAlign: "right" }}>Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {h.top.slice(0, 50).map((t) => {
                        const stakedPct = t.atom > 0 ? (t.staked_atom / t.atom) * 100 : 0;
                        const share = L.total_atom > 0 ? (t.atom / L.total_atom) * 100 : 0;
                        return (
                          <tr key={t.rank} style={{ borderTop: "1px solid var(--ink-10)" }}>
                            <td style={{ padding: "9px 10px", color: "var(--ink-40)", fontVariantNumeric: "tabular-nums" }}>{t.rank}</td>
                            <td style={{ padding: "9px 10px", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><HoverTip tip="A personal ATOM wallet. Click to open its full on-chain position, flows and counterparties." sub={t.address}><AddressLink addr={t.address} style={{ color: "var(--ink-80)" }}>{short(t.address)}</AddressLink></HoverTip></td>
                            <td style={{ padding: "9px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{compact(t.atom)}</td>
                            <td style={{ padding: "9px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ink-50)" }}>{stakedPct.toFixed(0)}%</td>
                            <td style={{ padding: "9px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ink-50)" }}>{share.toFixed(2)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </IntelCard>
            </div>
          )}

          {/* Methodology */}
          <div className="span-12">
            <div className="surface" style={{ padding: "16px 20px", fontSize: 11.5, color: "var(--ink-50)", lineHeight: 1.6 }}>
              A &ldquo;holder&rdquo; is any wallet whose combined ATOM, liquid bank balance plus bonded delegations, clears the tier
              threshold. Captured daily by Bedrock&rsquo;s indexer from the bank <code>DenomOwners</code> and staking delegations on
              chain, no estimates. The &ldquo;stakers&rdquo; figure is the separate count of wallets with an active bonded delegation.
              Over-time charts and 24h / all-time-high deltas build forward from first capture.
            </div>
          </div>
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
