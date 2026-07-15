// /signals · the trader board, slimmed to canonical owners. The one signal that
// is trade-native and lives ONLY here is the largest on-chain moves (whales).
// Every other signal has a canonical home in its own section; this board frames
// them and routes there, never restating their numbers. Not financial advice.

import Link from "next/link";
import { ConsolePage, ConsoleModule, IntelCard } from "@/components/console/Console";
import { MetricCard } from "@/components/console/MetricCard";
import { ShareBars } from "@/components/share/ShareCharts";
import { AddressLink } from "@/components/address/AddressLink";
import { getRecentFlows, getLabels, getExchangeNetFlow, type LabelRow } from "@/lib/indexer";
import { seo } from "@/lib/seo";

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toFixed(0);
}

export const revalidate = 60;

const KIND_LABEL: Record<string, string> = {
  delegate: "Delegate", undelegate: "Undelegate", redelegate: "Redelegate",
  reward_withdraw: "Reward", transfer: "Transfer", ibc_out: "IBC out", ibc_in: "IBC in",
};
function kindColor(kind: string): string {
  if (kind === "delegate" || kind === "ibc_in") return "var(--moss)";
  if (kind === "undelegate" || kind === "transfer" || kind === "ibc_out") return "var(--iron)";
  return "var(--hub)";
}
function atomFromUatom(s: string): string {
  const n = Number(s) / 1e6;
  if (!Number.isFinite(n)) return s;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(2);
}
function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}
function shortAddr(a: string): string {
  if (!a) return "·";
  if (a.startsWith("cosmosvaloper")) return `${a.slice(0, 15)}…`;
  return `${a.slice(0, 10)}…${a.slice(-4)}`;
}
// A cex_* label whose ATOM movement is a real deposit/withdrawal (custody/ops),
// as opposed to a validator the exchange runs (which moves via delegate, not a
// transfer). Used to tag a flow as onto / off an exchange.
function isExchangeWallet(cat?: string): boolean {
  return cat === "cex" || cat === "cex_custody" || cat === "cex_ops";
}
function AddrCell({ a, lbl }: { a: string; lbl?: LabelRow }) {
  const exch = lbl && lbl.category.startsWith("cex");
  const name = lbl ? lbl.label : shortAddr(a);
  const color = exch ? "var(--hub-2)" : lbl ? "var(--ink-80)" : "var(--ink-60)";
  if (a.startsWith("cosmos1") && !a.startsWith("cosmosvaloper")) return <AddressLink addr={a} style={{ color, fontWeight: lbl ? 600 : 400 }}>{name}</AddressLink>;
  return <span style={{ color, fontWeight: lbl ? 600 : 400 }}>{name}</span>;
}

export const metadata = seo({ title: "Signals", description: "The Cosmos Hub trader board: the on-chain signals that move ATOM, including whale accumulation, exchange flow, supply pressure, and staking carry.", path: "/signals", keywords: ["ATOM signals", "Cosmos Hub trading signals", "ATOM whale tracking", "ATOM on-chain signals"] });

// Each non-whale signal's canonical home (no numbers restated here, just routing).
const ELSEWHERE = [
  { href: "/stakers/delegation", title: "Net staking flow", blurb: "Delegate vs undelegate, what's locking up or coming loose.", color: "var(--moss)" },
  { href: "/stakers/unbonding", title: "Undelegation supply", blurb: "ATOM in the 21-day queue, future liquid supply.", color: "var(--iron)" },
  { href: "/atom/supply", title: "Staking carry", blurb: "Real yield after inflation, the cost of staying liquid.", color: "var(--hub)" },
  { href: "/exchanges", title: "Exchange flow", blurb: "Net ATOM onto vs off exchanges, deposit-side pressure.", color: "var(--hub-2)" },
];

export default async function Signals() {
  const [{ flows, live }, { labels }, netflow] = await Promise.all([
    getRecentFlows(10000, 80),
    getLabels(),
    getExchangeNetFlow(24),
  ]);
  const top = [...flows].sort((a, b) => Number(b.amount_uatom) - Number(a.amount_uatom)).slice(0, 10);

  // Address -> label map, so every move reads as "whale -> Coinbase", and we can
  // tag each flow as moving onto or off an exchange.
  const labelMap = new Map<string, LabelRow>(labels.map((l) => [l.address, l]));
  const atomOf = (s: string) => Number(s) / 1e6;
  const largest = flows.length ? atomOf(top[0].amount_uatom) : 0;

  // 24h exchange flow, the headline read: ATOM onto exchanges (deposit-side, a
  // sell-intent proxy) vs off (accumulation). Summed across labeled entities.
  const toExch = netflow.rows.reduce((s, r) => s + r.deposit_atom, 0);
  const fromExch = netflow.rows.reduce((s, r) => s + r.withdraw_atom, 0);
  const netExch = toExch - fromExch;

  // Per-flow exchange tag: the Type cell becomes "-> Coinbase" / "<- Binance"
  // when an exchange wallet is on one side of a transfer.
  function flowTag(from: string, to: string, kind: string): { label: string; color: string } {
    const fromL = labelMap.get(from), toL = labelMap.get(to);
    if (isExchangeWallet(toL?.category)) return { label: `→ ${toL!.label}`, color: "var(--iron)" };
    if (isExchangeWallet(fromL?.category)) return { label: `← ${fromL!.label}`, color: "var(--moss)" };
    return { label: KIND_LABEL[kind] ?? kind, color: kindColor(kind) };
  }

  return (
    <ConsolePage>
      <ConsoleModule lead dot="var(--hub)" title="Signals · trader board" meta="largest on-chain moves · not financial advice">
        <div className="console-grid">
          {/* Lead: the 24h exchange-flow read (deposit-side = sell pressure) */}
          <div className="span-3">
            <MetricCard label="Net to exchanges" value={`${netExch >= 0 ? "+" : "−"}${fmtCompact(Math.abs(netExch))}`} unit="ATOM" series={[]} color={netExch >= 0 ? "var(--iron)" : "var(--moss)"} footnote={`24h · ${netExch >= 0 ? "onto exchanges" : "off exchanges"}`} />
          </div>
          <div className="span-3">
            <MetricCard label="To exchanges" value={fmtCompact(toExch)} unit="ATOM" series={[]} color="var(--iron)" footnote="24h · deposits (sell-side)" />
          </div>
          <div className="span-3">
            <MetricCard label="From exchanges" value={fmtCompact(fromExch)} unit="ATOM" series={[]} color="var(--moss)" footnote="24h · withdrawals" />
          </div>
          <div className="span-3">
            <MetricCard label="Largest move" value={fmtCompact(largest)} unit="ATOM" series={[]} color="var(--hub)" footnote="biggest single ≥10k flow" />
          </div>

          {/* The owned signal: largest moves, labeled + tagged by exchange direction */}
          <div className="span-12">
            <IntelCard title="Largest moves" meta={`≥ 10k ATOM · ${live ? "live from the indexer" : "indexer offline"}`} shareFilename="bedrock-largest-moves"
              share={{
                title: "Largest ATOM moves · Cosmos HUB",
                subtitle: "Transfers of 10k ATOM or more, most recent blocks",
                big: fmtCompact(largest), unit: "ATOM · biggest single move",
                context: `${fmtCompact(toExch)} ATOM moved onto exchanges against ${fmtCompact(fromExch)} moving off. A deposit is sell intent, not a confirmed sale.`,
                body: <ShareBars rows={top.slice(0, 7).map((f) => ({ label: flowTag(f.from, f.to, f.kind).label, value: atomOf(f.amount_uatom), color: flowTag(f.from, f.to, f.kind).color, note: `· ${ago(f.time)}` }))} />,
              }}>
              {top.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "var(--ink-50)", padding: "6px 0" }}>
                  No moves above 10,000 ATOM in the most recent blocks yet, they surface here as they happen. Full list on{" "}
                  <Link href="/signals/whales" style={{ color: "var(--hub)" }}>Whales</Link>.
                </div>
              ) : (
                <>
                  <table className="broadsheet mfit mhide3 mhide4">
                    <thead>
                      <tr>
                        <th style={{ width: 50 }}>Ago</th>
                        <th style={{ width: 130 }}>Flow</th>
                        <th>From</th>
                        <th>To</th>
                        <th style={{ textAlign: "right" }}>ATOM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {top.map((f, i) => {
                        const tag = flowTag(f.from, f.to, f.kind);
                        return (
                          <tr key={`${f.tx_hash}-${i}`}>
                            <td className="data" style={{ fontSize: 11, color: "var(--ink-60)" }}>{ago(f.time)}</td>
                            <td><span className="data" style={{ fontSize: 11, fontWeight: 700, color: tag.color, textTransform: "uppercase", letterSpacing: 0.4 }}>{tag.label}</span></td>
                            <td className="data" style={{ fontSize: 12 }}><AddrCell a={f.from} lbl={labelMap.get(f.from)} /></td>
                            <td className="data" style={{ fontSize: 12 }}><AddrCell a={f.to} lbl={labelMap.get(f.to)} /></td>
                            <td className="num" style={{ fontWeight: 700, color: "var(--ink)" }}>{atomFromUatom(f.amount_uatom)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="data" style={{ marginTop: 12, fontSize: 11, color: "var(--ink-50)", lineHeight: 1.6 }}>
                    <span style={{ color: "var(--iron)", fontWeight: 700 }}>→ exchange</span> = ATOM moving onto an exchange (often sell intent).{" "}
                    <span style={{ color: "var(--moss)", fontWeight: 700 }}>← exchange</span> = moving off (accumulation). Exchange names come from our labeled address registry.{" "}
                    <Link href="/signals/whales" style={{ color: "var(--hub)", textDecoration: "underline" }}>See all whale moves →</Link>
                  </div>
                </>
              )}
            </IntelCard>
          </div>

          {/* Where every other signal lives */}
          <div className="span-12">
            <div className="data" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)", margin: "8px 0 4px" }}>Other signals, at their source</div>
          </div>
          {ELSEWHERE.map((s) => (
            <div key={s.href} className="span-3">
              <Link href={s.href} style={{ textDecoration: "none", display: "block", height: "100%" }}>
                <div className="surface surface-lift" style={{ padding: "14px 16px", height: "100%", borderTop: `2px solid ${s.color}` }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 14.5, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-60)", lineHeight: 1.5, marginTop: 7 }}>{s.blurb}</div>
                  <div className="data" style={{ fontSize: 9.5, letterSpacing: 1, textTransform: "uppercase", color: s.color, marginTop: 10 }}>Open →</div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
