// Top-wallet intelligence: for the latest snapshot's top 100 holders, combine
// on-chain vintage (auth account_number), label, staked posture, and indexed
// staking + exchange-send history into a behavioral read. Answers: who are the
// biggest holders, are they genesis accounts, and are they staking or selling.
// All real data; the over-time/first-seen caveats follow the backfill coverage.
import { ConsolePage, ConsoleModule, IntelCard } from "@/components/console/Console";
import { StatCard } from "@/components/console/StatCard";
import { AddressLink } from "@/components/address/AddressLink";
import { HoverTip } from "@/components/HoverTip";
import { getWhaleIntel, type WhaleRow } from "@/lib/indexer";
import { getLiveAtomMarket } from "@/lib/price";
import { seo } from "@/lib/seo";

export const revalidate = 600;
export const metadata = seo({ title: "ATOM Whale Intelligence", description: "The top 100 ATOM wallets profiled: account vintage, staking conviction, exchange-send history, and how much of supply the biggest holders control.", path: "/atom/whales", keywords: ["ATOM whales", "Cosmos Hub largest holders", "ATOM top wallets"], ogImage: "/card/whales" });

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}
function short(a: string): string {
  return a.length > 16 ? `${a.slice(0, 11)}…${a.slice(-5)}` : a;
}
function ymd(s: string | null): string {
  return s ? s.slice(0, 10) : "·";
}
function usd(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

// Account-vintage buckets for the histogram (by account number = order of first
// appearance; lower is earlier). Labels avoid claiming exact years.
const VBUCKETS: { label: string; max: number; color: string }[] = [
  { label: "< 5K", max: 5_000, color: "var(--hub)" },
  { label: "5K-100K", max: 100_000, color: "var(--moss)" },
  { label: "100K-600K", max: 600_000, color: "var(--sand)" },
  { label: "600K-2M", max: 2_000_000, color: "var(--hub-2)" },
  { label: "2M+", max: Infinity, color: "var(--slate)" },
];

// On-chain vintage from the account_number (assigned in order of first
// appearance). Thresholds are coarse; the raw number is always shown too.
function vintage(n: number | null): { label: string; color: string } {
  if (n == null) return { label: "unknown", color: "var(--ink-40)" };
  if (n < 5000) return { label: "Genesis-era", color: "var(--hub)" };
  if (n < 100000) return { label: "2019-20", color: "var(--moss)" };
  if (n < 600000) return { label: "2021-22", color: "var(--sand)" };
  return { label: "Recent", color: "var(--slate)" };
}

const isCex = (cat: string) => cat === "cex" || cat === "cex_ops";

// One-sentence explanation of what an address is, for the hover tooltip.
function entityNote(label: string, category: string): string {
  if (isCex(category)) return `${label}: an exchange custody wallet. Customer deposits and withdrawals flow through it, so its balance is customer ATOM, not the exchange's own.`;
  if (category === "protocol" || category === "ibc_escrow") return `${label}: a Cosmos Hub protocol account, not a personal wallet.`;
  if (category.startsWith("validator")) return `${label}: a validator-operated wallet.`;
  if (label) return `${label}.`;
  return "A personal ATOM wallet. Click to open its full on-chain position, flows and counterparties.";
}

// Behavioral tag from posture + indexed history.
function behavior(r: WhaleRow): { tag: string; color: string } {
  const stakedPct = r.atom > 0 ? (r.staked_atom / r.atom) * 100 : 0;
  const sentCexPct = r.atom > 0 ? (r.sent_cex_atom / r.atom) * 100 : 0;
  if (isCex(r.category)) return { tag: "Exchange", color: "var(--slate)" };
  if (sentCexPct >= 25) return { tag: "Net seller", color: "var(--iron)" };
  if (stakedPct >= 90) return { tag: "Diamond staker", color: "var(--moss)" };
  if (r.redelegate_atom >= r.atom * 0.5 && r.redelegate_atom > 0) return { tag: "Validator-hopper", color: "var(--sand)" };
  if (stakedPct < 10) return { tag: "Liquid treasury", color: "var(--hub-2)" };
  return { tag: "Active holder", color: "var(--slate)" };
}

export default async function WhalesPage() {
  const [wi, market] = await Promise.all([getWhaleIntel(100), getLiveAtomMarket()]);
  const price = market.usd || 0;

  if (!wi.available || wi.rows.length === 0) {
    return (
      <ConsolePage>
        <ConsoleModule lead title="ATOM · Whale intelligence" dot="var(--hub)" meta="analysis pending">
          <div className="console-grid">
                        <div className="span-12">
              <IntelCard title="Top-wallet analysis is being prepared" accent>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-80)", margin: 0 }}>
                  This page enriches the top 100 holders with on-chain account vintage and their indexed
                  staking and exchange-send history. It populates shortly after the holder snapshot, once
                  the vintage lookup completes. Check back in a few minutes.
                </p>
              </IntelCard>
            </div>
          </div>
        </ConsoleModule>
      </ConsolePage>
    );
  }

  const rows = wi.rows;
  const n = rows.length;
  const genesis = rows.filter((r) => r.account_number != null && r.account_number < 5000).length;
  const exchanges = rows.filter((r) => isCex(r.category)).length;
  const diamond = rows.filter((r) => r.atom > 0 && r.staked_atom / r.atom >= 0.9).length;
  const sellers = rows.filter((r) => r.atom > 0 && r.sent_cex_atom / r.atom >= 0.25).length;
  const totalSentCex = rows.reduce((s, r) => s + r.sent_cex_atom, 0);
  const oldest = rows.reduce<number | null>((m, r) => (r.account_number != null && (m == null || r.account_number < m) ? r.account_number : m), null);

  const top100Atom = rows.reduce((s, r) => s + r.atom, 0);
  const top100Usd = top100Atom * price;

  // Vintage histogram + behavior mix, computed from the rows.
  const vintageCounts = VBUCKETS.map((b, i) => {
    const lo = i === 0 ? 0 : VBUCKETS[i - 1].max;
    return rows.filter((r) => r.account_number != null && r.account_number >= lo && r.account_number < b.max).length;
  });
  const vintageMax = Math.max(1, ...vintageCounts);
  const behaviorMix = (() => {
    const m = new Map<string, { count: number; color: string }>();
    for (const r of rows) {
      const b = behavior(r);
      const cur = m.get(b.tag) ?? { count: 0, color: b.color };
      m.set(b.tag, { count: cur.count + 1, color: b.color });
    }
    return [...m.entries()].map(([tag, v]) => ({ tag, ...v })).sort((a, b) => b.count - a.count);
  })();
  const behaviorMax = Math.max(1, ...behaviorMix.map((b) => b.count));

  return (
    <ConsolePage>
      <ConsoleModule lead dot="var(--hub)" title="ATOM · Whale intelligence" meta={`top ${n} holders · as of ${wi.day} · on-chain + indexed history`}>
        <div className="console-grid">
          
          {/* Lede */}
          <div className="span-12">
            <IntelCard title="Who the biggest holders really are" meta={`as of ${wi.day}`} accent>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-80)", margin: 0 }}>
                The top {n} wallets, cross-referenced with their on-chain account vintage and their indexed staking and
                exchange-send history. <strong style={{ color: "var(--ink)" }}>{genesis}</strong> of them are genesis-era accounts
                (among the first ~5,000 ever created on the Hub), <strong style={{ color: "var(--ink)" }}>{diamond}</strong> hold
                ~all of their ATOM staked (conviction), and <strong style={{ color: sellers > 0 ? "var(--iron)" : "var(--ink)" }}>{sellers}</strong> have
                moved a meaningful share onto exchanges. Together they hold{" "}
                <strong style={{ color: "var(--ink)" }}>{compact(top100Atom)} ATOM</strong>
                {price > 0 ? <> worth <strong style={{ color: "var(--ink)" }}>{usd(top100Usd)}</strong> at today&rsquo;s price</> : null}.
                Vintage comes from the auth account number; behavior from indexed staking + transfers, accurate within the backfilled range.
              </p>
            </IntelCard>
          </div>

          {/* Summary KPIs */}
          <div className="span-2"><StatCard label="Genesis-era" value={`${genesis}`} accent="var(--hub)" sub={`of top ${n} · acct # < 5,000`} /></div>
          <div className="span-2"><StatCard label="Diamond stakers" value={`${diamond}`} accent="var(--moss)" sub="~all ATOM staked" /></div>
          <div className="span-2"><StatCard label="Net sellers" value={`${sellers}`} accent="var(--iron)" sub="≥25% sent to exchanges" /></div>
          <div className="span-2"><StatCard label="Exchanges" value={`${exchanges}`} accent="var(--slate)" sub="labeled CEX wallets" /></div>
          <div className="span-2"><StatCard label="Oldest account" value={oldest != null ? `#${compact(oldest)}` : "·"} accent="var(--hub-2)" sub="lowest account number" /></div>
          <div className="span-2"><StatCard label="Sent to CEX" value={compact(totalSentCex)} unit="ATOM" accent="var(--sand)" sub="top 100, indexed history" /></div>

          {/* Account vintage histogram */}
          <div className="span-6">
            <IntelCard title="Account vintage" meta="when the top 100 first appeared · earlier → newer">
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {VBUCKETS.map((b, i) => {
                  const c = vintageCounts[i];
                  return (
                    <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div className="data" style={{ width: 84, fontSize: 11, color: "var(--ink-50)", textAlign: "right" }}>{b.label}</div>
                      <div style={{ flex: 1, height: 20, background: "var(--ink-05)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${Math.max(c > 0 ? 3 : 0, (c / vintageMax) * 100)}%`, height: "100%", background: b.color }} />
                      </div>
                      <div style={{ width: 30, fontSize: 12.5, textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{c}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 11, fontSize: 11, color: "var(--ink-40)" }}>by auth account number (order of first appearance on the Hub)</div>
            </IntelCard>
          </div>

          {/* Behavior mix */}
          <div className="span-6">
            <IntelCard title="Behavior mix" meta="how the top 100 split by conduct">
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {behaviorMix.map((b) => (
                  <div key={b.tag} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="data" style={{ width: 110, fontSize: 11, color: "var(--ink-50)", textAlign: "right" }}>{b.tag}</div>
                    <div style={{ flex: 1, height: 20, background: "var(--ink-05)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${Math.max(3, (b.count / behaviorMax) * 100)}%`, height: "100%", background: b.color }} />
                    </div>
                    <div style={{ width: 30, fontSize: 12.5, textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{b.count}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 11, fontSize: 11, color: "var(--ink-40)" }}>diamond staker · net seller · liquid treasury · exchange · active</div>
            </IntelCard>
          </div>

          {/* Intel table */}
          <div className="span-12">
            <IntelCard title="Top wallet breakdown" meta="click a wallet for its full timeline · vintage · posture · behavior">
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "var(--ink-40)", fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase" }}>
                      <th style={{ padding: "8px 8px" }}>#</th>
                      <th style={{ padding: "8px 8px" }}>Wallet</th>
                      <th style={{ padding: "8px 8px", textAlign: "right" }}>Combined</th>
                      <th style={{ padding: "8px 8px", textAlign: "right" }}>Value</th>
                      <th style={{ padding: "8px 8px", textAlign: "right" }}>Staked</th>
                      <th style={{ padding: "8px 8px", textAlign: "right" }}>Rewards</th>
                      <th style={{ padding: "8px 8px" }}>Vintage</th>
                      <th style={{ padding: "8px 8px" }}>Behavior</th>
                      <th style={{ padding: "8px 8px", textAlign: "right" }}>Sent → CEX</th>
                      <th style={{ padding: "8px 8px", textAlign: "right" }}>First seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const v = vintage(r.account_number);
                      const b = behavior(r);
                      const stakedPct = r.atom > 0 ? (r.staked_atom / r.atom) * 100 : 0;
                      return (
                        <tr key={r.rank} style={{ borderTop: "1px solid var(--ink-10)" }}>
                          <td style={{ padding: "8px 8px", color: "var(--ink-40)", fontVariantNumeric: "tabular-nums" }}>{r.rank}</td>
                          <td style={{ padding: "8px 8px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <HoverTip tip={entityNote(r.label, r.category)} sub={r.address}>
                              <AddressLink addr={r.address} style={{ color: r.label ? "var(--ink)" : "var(--ink-70)", fontWeight: r.label ? 500 : 400 }}>{r.label || short(r.address)}</AddressLink>
                            </HoverTip>
                          </td>
                          <td style={{ padding: "8px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{compact(r.atom)}</td>
                          <td style={{ padding: "8px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ink-50)" }}>{price > 0 ? usd(r.atom * price) : "·"}</td>
                          <td style={{ padding: "8px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: stakedPct >= 90 ? "var(--moss)" : "var(--ink-50)" }}>{stakedPct.toFixed(0)}%</td>
                          <td style={{ padding: "8px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: r.reward_atom > 0 ? "var(--moss)" : "var(--ink-30)" }}>{r.reward_atom > 0 ? compact(r.reward_atom) : "·"}</td>
                          <td style={{ padding: "8px 8px" }}>
                            <span style={{ color: v.color, fontWeight: 500 }}>{v.label}</span>
                            {r.account_number != null ? <span style={{ color: "var(--ink-30)", marginLeft: 6, fontVariantNumeric: "tabular-nums" }}>#{r.account_number.toLocaleString("en-US")}</span> : null}
                          </td>
                          <td style={{ padding: "8px 8px" }}>
                            <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 11, color: b.color, border: `1px solid ${b.color}`, background: `color-mix(in srgb, ${b.color} 10%, transparent)` }}>{b.tag}</span>
                          </td>
                          <td style={{ padding: "8px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: r.sent_cex_atom > 0 ? "var(--iron)" : "var(--ink-30)" }}>{r.sent_cex_atom > 0 ? compact(r.sent_cex_atom) : "·"}</td>
                          <td style={{ padding: "8px 8px", textAlign: "right", color: "var(--ink-50)", fontVariantNumeric: "tabular-nums" }}>{ymd(r.first_seen)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </IntelCard>
          </div>

          {/* Methodology */}
          <div className="span-12">
            <div className="surface" style={{ padding: "16px 20px", fontSize: 11.5, color: "var(--ink-50)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--ink-70)" }}>Method.</strong> Vintage is the auth-module <code>account_number</code>, assigned in
              order of first appearance on the Hub, so a low number is an early / genesis-era account. Staked posture is from the holder
              snapshot. Behavior (staking events, redelegations, ATOM sent to labeled exchanges, first/last seen) is aggregated from the
              indexer&rsquo;s own transaction history. Coverage runs from genesis forward as the backfill climbs, so first-seen is exact for
              early accounts; an account that first appeared mid-history may show a later date until the backfill reaches it. No estimates.
            </div>
          </div>
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
