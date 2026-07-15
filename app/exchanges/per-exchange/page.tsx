// /exchanges/per-exchange · the per-CEX hub. With no exchange selected, an
// overview of every exchange's verified staked custody. Pick one (dropdown or a
// card) and it becomes that exchange's profile: custody, its validators, its
// verified addresses with confidence, and its live flow. Reads ?ex from the
// shared filter bar; everything is verified high+ confidence on-chain data.

import Link from "next/link";
import { ConsolePage, ConsoleModule, IntelCard } from "@/components/console/Console";
import { MetricCard } from "@/components/console/MetricCard";
import { AddressLink } from "@/components/address/AddressLink";
import { Soon } from "@/components/console/Soon";
import { LiveExchangeFeed } from "@/components/exchanges/LiveExchangeFeed";
import { getExchangeCustody } from "@/lib/exchanges";
import { getLabels, getExchangeNetFlow } from "@/lib/indexer";
import { seo } from "@/lib/seo";

export const revalidate = 600;
export const metadata = seo({ title: "Per-Exchange Breakdown", description: "ATOM custody and flow broken down by exchange: Coinbase, Kraken, Binance, Upbit, and more, with each venue's staked balance and net flow.", path: "/exchanges/per-exchange", keywords: ["ATOM by exchange", "Coinbase ATOM", "Kraken ATOM", "Binance ATOM"] });

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return Math.round(n).toString();
}
const CONF_COLOR: Record<string, string> = { certain: "var(--moss)", high: "var(--hub)", inferred: "var(--sand)" };
const CAT_LABEL: Record<string, string> = {
  cex_validator: "Validator", cex_ops: "Operational", cex: "Hot / deposit", cex_custody: "Staking custody",
};
function shortAddr(a: string): string {
  if (a.startsWith("cosmosvaloper")) return `${a.slice(0, 16)}…${a.slice(-5)}`;
  return `${a.slice(0, 11)}…${a.slice(-5)}`;
}

export default async function PerExchangePage({ searchParams }: { searchParams: Promise<{ ex?: string; dir?: string; w?: string }> }) {
  const sp = await searchParams;
  const ex = sp?.ex ?? "";
  const dirQ = sp?.dir === "deposit" || sp?.dir === "withdrawal" ? sp.dir : "";
  const wQ = sp?.w === "24" ? 24 : sp?.w === "168" ? 168 : 720;
  const winLabel = wQ === 24 ? "24h" : wQ === 168 ? "7d" : "~30d";
  const [custody, labelsRes, netflow] = await Promise.all([getExchangeCustody(), getLabels(), getExchangeNetFlow(wQ)]);
  const flowOf = (entity: string) => netflow.rows.find((r) => r.entity === entity);

  if (!custody.live) {
    return (
      <ConsolePage><ConsoleModule><Soon title="Per-exchange custody" note="Each exchange's verified staked custody loads here from chain. Connecting…" /></ConsoleModule></ConsolePage>
    );
  }

  // ── Overview (no exchange selected) ──────────────────────────────────────
  // The Flow filter switches what the cards measure: staked custody (All),
  // deposits over the window, or withdrawals over the window. The card set
  // stays the full exchange list so the grid never leaves holes.
  if (!ex) {
    const metricOf = (entity: string, bonded: number) => {
      if (!dirQ) return bonded;
      const f = flowOf(entity);
      return f ? (dirQ === "deposit" ? f.deposit_atom : f.withdraw_atom) : 0;
    };
    const cards = custody.byEntity.map((e) => ({ entity: e.entity, v: metricOf(e.entity, e.bonded_atom) }));
    const max = Math.max(1, ...cards.map((c) => c.v));
    const barColor = dirQ === "deposit" ? "var(--iron)" : dirQ === "withdrawal" ? "var(--moss)" : "var(--hub)";
    const modeMeta = dirQ
      ? `${dirQ === "deposit" ? "deposits onto" : "withdrawals off"} each venue · last ${winLabel} · verified hot wallets`
      : `${fmt(custody.total_atom)} ATOM staked custody · live, on-chain`;
    return (
      <ConsolePage>
        <ConsoleModule lead dot={barColor} title="Per exchange · overview" meta={`${custody.byEntity.length} exchanges · ${modeMeta} · pick one for its profile`}>
          <div className="console-grid">
            {cards.map((c) => (
              <div key={c.entity} className="span-4">
                <Link href={`/exchanges/per-exchange?ex=${c.entity}${dirQ ? `&dir=${dirQ}` : ""}${sp?.w ? `&w=${sp.w}` : ""}`} style={{ textDecoration: "none", display: "block" }}>
                  <div className="surface surface-lift" style={{ padding: "16px 18px" }}>
                    <div className="data" style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "var(--ink-60)", marginBottom: 8 }}>{c.entity}</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 400, color: "var(--ink)", letterSpacing: "-0.025em" }}>
                      {dirQ && c.v < 1 ? "·" : fmt(c.v)}
                      <span style={{ fontSize: 13, color: "var(--ink-40)", marginLeft: 6 }}>{dirQ && c.v < 1 ? "no verified flow" : "ATOM"}</span>
                    </div>
                    <div className="gbar" style={{ height: 5, marginTop: 12 }}>
                      <div className="gbar-fill" style={{ width: `${Math.max(3, (c.v / max) * 100)}%`, "--gbar-c": barColor } as React.CSSProperties} />
                    </div>
                  </div>
                </Link>
              </div>
            ))}
            <div className="span-12">
              <div className="data" style={{ fontSize: 11, color: "var(--ink-40)" }}>
                {dirQ
                  ? `Flow is verified hot-wallet ${dirQ === "deposit" ? "deposits" : "withdrawals"} over the last ${winLabel}. Venues showing "no verified flow" are awaiting hot-wallet confirmation by the label pipeline.`
                  : "Staked custody: customer ATOM delegated to each exchange's own validators, read live from chain."}
              </div>
            </div>
          </div>
        </ConsoleModule>
      </ConsolePage>
    );
  }

  // ── Single exchange profile ──────────────────────────────────────────────
  const vals = custody.validators.filter((v) => v.entity === ex);
  const staked = custody.byEntity.find((e) => e.entity === ex)?.bonded_atom ?? 0;
  const share = custody.total_atom > 0 ? (staked / custody.total_atom) * 100 : 0;
  const addrs = (labelsRes.labels ?? []).filter((l) => l.label === ex).sort((a, b) => a.category.localeCompare(b.category));
  const exFlow = flowOf(ex);
  const hasFlow = !!exFlow && (exFlow.deposit_atom >= 1 || exFlow.withdraw_atom >= 1);

  return (
    <ConsolePage>
      <ConsoleModule lead dot="var(--hub)" title={`${ex} · on the Hub`} meta="verified staked custody, validators, addresses, and live flow">
        <div className="console-grid">
          <div className="span-4"><MetricCard label="Staked custody" value={fmt(staked)} unit="ATOM" series={[]} color="var(--moss)" footnote={`via ${vals.length} validator${vals.length === 1 ? "" : "s"}`} /></div>
          <div className="span-4"><MetricCard label="Share of CEX custody" value={share.toFixed(1)} unit="%" series={[]} color="var(--hub-2)" footnote="of tracked exchange staking" /></div>
          <div className="span-4"><MetricCard label="Verified addresses" value={String(addrs.length)} series={[]} color="var(--sand)" footnote="in the labels registry" /></div>

          {/* Hot-wallet flow over the selected window (responds to the Window
              control; the Flow control also filters the live feed below). */}
          <div className="span-4"><MetricCard label={`Deposits · ${winLabel}`} value={hasFlow ? fmt(exFlow!.deposit_atom) : "·"} unit={hasFlow ? "ATOM" : undefined} series={[]} color="var(--iron)" footnote={hasFlow ? "onto the exchange · sell-side" : "no verified flow in window"} /></div>
          <div className="span-4"><MetricCard label={`Withdrawals · ${winLabel}`} value={hasFlow ? fmt(exFlow!.withdraw_atom) : "·"} unit={hasFlow ? "ATOM" : undefined} series={[]} color="var(--moss)" footnote={hasFlow ? "off the exchange · self-custody" : "hot wallets awaiting confirmation"} /></div>
          <div className="span-4"><MetricCard label={`Net flow · ${winLabel}`} value={hasFlow ? `${exFlow!.net_atom >= 0 ? "+" : "−"}${fmt(Math.abs(exFlow!.net_atom))}` : "·"} unit={hasFlow ? "ATOM" : undefined} series={[]} color={hasFlow && exFlow!.net_atom >= 0 ? "var(--iron)" : "var(--hub-2)"} footnote={hasFlow ? (exFlow!.net_atom >= 0 ? "net onto · sell-side" : "net off · accumulation") : "verified labels only"} /></div>

          {vals.length > 0 && (
            <div className="span-6">
              <IntelCard title="Validators" meta={`${ex} runs these`}>
                <table className="broadsheet">
                  <thead><tr><th>Moniker</th><th style={{ textAlign: "right" }}>Bonded ATOM</th></tr></thead>
                  <tbody>
                    {vals.sort((a, b) => b.bonded_atom - a.bonded_atom).map((v) => (
                      <tr key={v.operator}><td className="data" style={{ fontSize: 12.5, color: "var(--ink)" }}>{v.moniker}</td><td className="num" style={{ fontWeight: 600 }}>{fmt(v.bonded_atom)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </IntelCard>
            </div>
          )}

          {addrs.length > 0 && (
            <div className="span-6">
              <IntelCard title="Verified addresses" meta="role · confidence">
                <table className="broadsheet">
                  <thead><tr><th>Address</th><th>Role</th><th style={{ width: 70 }}>Conf.</th></tr></thead>
                  <tbody>
                    {addrs.map((a) => (
                      <tr key={a.address}>
                        <td className="data" style={{ fontSize: 11.5 }}>
                          {a.address.startsWith("cosmos1") && !a.address.startsWith("cosmosvaloper")
                            ? <AddressLink addr={a.address} style={{ color: "var(--ink-80)" }}>{shortAddr(a.address)}</AddressLink>
                            : <span style={{ color: "var(--ink-60)" }}>{shortAddr(a.address)}</span>}
                        </td>
                        <td style={{ fontSize: 11.5, color: "var(--ink-60)" }}>{CAT_LABEL[a.category] ?? a.category}</td>
                        <td><span className="data" style={{ fontSize: 9.5, letterSpacing: 0.6, textTransform: "uppercase", fontWeight: 700, color: CONF_COLOR[a.confidence] ?? "var(--ink-40)" }}>{a.confidence}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </IntelCard>
            </div>
          )}

          <div className="span-12">
            <IntelCard title={`${ex} · live flow`} meta="recent deposits and withdrawals">
              <LiveExchangeFeed exchangeOnly />
            </IntelCard>
          </div>
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
