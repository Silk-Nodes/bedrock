"use client";

// Address side panel: live on-chain position for any Cosmos Hub wallet.
// Current state only (staked / liquid / unbonding / rewards / validators).
// History is the indexer's job and lands later. No external explorer links.

import { useEffect, useRef, useState } from "react";
import { useAddressPanel } from "./AddressPanelProvider";
import { FlowClassBadge, type FlowClass } from "./FlowClassBadge";
import { useFocusTrap } from "@/components/useFocusTrap";
import { ShareButton } from "@/components/share/ShareButton";
import type { SocialCardProps } from "@/components/share/SocialCard";
import { WatchStar } from "@/components/WatchStar";
import { CopyButton } from "@/components/CopyButton";

type Deleg = { validator: string; oper: string; atom: number; pct: number };
type Unb = { validator: string; oper: string; atom: number; completion: string };
type AddrData = {
  address: string;
  live: boolean;
  block?: number;      // height the route read this position at; stamped on the card
  total_atom?: number;
  total_usd?: number;
  staked?: number;
  liquid?: number;
  unbonding?: number;
  rewards?: number;
  top_validator_pct?: number;
  delegations?: Deleg[];
  unbonding_entries?: Unb[];
  activity?: ActivityEvent[];
  activity_live?: boolean;
  flow_summary?: FlowSummary | null;
  counterparties?: Counterparty[];
  exchange_flow?: { to_cex: number; from_cex: number };
  flow_class?: FlowClass | null;
  lifetime?: Lifetime | null;
  tags?: { label: string; tone: string }[];
};

type Counterparty = { addr: string; label: string; cat: string; in: number; out: number; count: number };

type Lifetime = {
  first_seen: string | null;
  last_seen: string | null;
  delegated: number;
  undelegated: number;
  redelegated: number;
  claimed: number;
  sent: number;
  received: number;
  events: number;
};

type FlowSummary = {
  received: number;
  sent: number;
  net_transfer: number;
  delegated: number;
  undelegated: number;
  claimed: number;
  biggest: { kind: string; cp_label: string; atom: number } | null;
  moves: number;
};

type ActivityEvent = {
  time: string;
  height: number;
  tx_hash: string;
  kind: string;
  amount_uatom: string;
  counterparty: string;
  is_ibc: boolean;
  cp_label?: string;
  cp_cat?: string;
};

const TONE: Record<string, string> = {
  hub: "var(--hub)", moss: "var(--moss)", iron: "var(--iron)", sand: "var(--sand)", slate: "var(--slate)",
};

const KIND_LABEL: Record<string, string> = {
  delegate: "Delegated",
  unbond: "Undelegated",
  redelegate: "Redelegated",
  reward_withdraw: "Claimed reward",
  transfer_in: "Received",
  transfer_out: "Sent",
};
function kindColor(kind: string): string {
  if (kind === "delegate" || kind === "transfer_in" || kind === "reward_withdraw") return "var(--moss)";
  if (kind === "unbond" || kind === "transfer_out") return "var(--iron)";
  return "var(--hub)";
}
function atomFromUatom(s: string): string {
  const n = Number(s) / 1e6;
  if (!Number.isFinite(n)) return s;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
  if (Math.abs(n) >= 1) return n.toFixed(2);
  return n.toFixed(4);
}
function shortCp(a: string): string {
  if (!a) return "·";
  if (a.startsWith("cosmosvaloper")) return `${a.slice(0, 14)}…`;
  return `${a.slice(0, 10)}…${a.slice(-4)}`;
}

function fmtN(n?: number): string {
  return n === undefined ? "·" : n.toLocaleString("en-US");
}
function fmtCompact(n?: number): string {
  if (n === undefined) return "·";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

export function AddressPanel() {
  const { addr, open, close } = useAddressPanel();
  const isOpen = !!addr;
  const [data, setData] = useState<AddrData | null>(null);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  useFocusTrap(panelRef, isOpen);

  useEffect(() => {
    if (!addr) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setData(null);
    fetch(`/api/address/${addr}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData({ address: addr, live: false });
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [addr]);

  // Branded PNG card for the wallet (reuses the site-wide share camera).
  const shareCard: SocialCardProps | null =
    addr && data?.live
      ? {
          title: "Cosmos Hub wallet",
          subtitle: `${addr.slice(0, 12)}…${addr.slice(-6)}${data.tags?.length ? "   ·   " + data.tags.map((t) => t.label).join("   ·   ") : ""}`,
          big: fmtN(data.total_atom),
          unit: "ATOM",
          context: [
            data.staked ? `Staked ${fmtN(data.staked)}${data.delegations?.length ? ` across ${data.delegations.length} validator${data.delegations.length > 1 ? "s" : ""}` : ""}.` : null,
            data.lifetime?.first_seen ? `Active since ${data.lifetime.first_seen.slice(0, 10)}.` : null,
            data.counterparties?.length ? `Moves ATOM most with ${data.counterparties[0].label}.` : null,
          ]
            .filter(Boolean)
            .join("  "),
          blockHeight: data.block,
        }
      : null;

  return (
    <>
      <div
        onClick={close}
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(8,10,14,0.42)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 180ms ease",
          zIndex: 1000,
        }}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Address position"
        data-open={isOpen ? "true" : "false"}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(480px, 100vw)",
          transform: isOpen ? "translateX(0)" : "translateX(102%)",
          transition: "transform 220ms cubic-bezier(0.2,0.7,0.2,1)",
          background: "color-mix(in srgb, var(--paper) 84%, transparent)",
          backdropFilter: "blur(22px) saturate(160%)",
          WebkitBackdropFilter: "blur(22px) saturate(160%)",
          borderLeft: "1px solid var(--ink-20)",
          boxShadow: "-12px 0 40px color-mix(in srgb, var(--ink) 22%, transparent)",
          zIndex: 1001,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {isOpen && (
          <>
            {/* Header */}
            <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--ink-20)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span className="data" style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--hub)", fontWeight: 700 }}>
                Address · live position
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {addr && <WatchStar type="address" id={addr} />}
                {shareCard && <ShareButton card={shareCard} filename={`bedrock-wallet-${addr!.slice(0, 10)}`} />}
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  style={{ background: "transparent", border: "1px solid var(--ink-20)", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-80)", padding: "4px 10px", cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "22px 22px 60px" }}>
              {/* Address + copy */}
              <div style={{ marginBottom: 22 }}>
                <div className="data" style={{ fontSize: 12, color: "var(--ink-80)", wordBreak: "break-all", lineHeight: 1.5 }}>{addr}</div>
                <div style={{ marginTop: 8 }}>
                  <CopyButton text={addr!} label="Copy address" />
                </div>
              </div>

              {loading && <div className="data" style={{ fontSize: 12, color: "var(--ink-60)" }}>Reading the chain…</div>}

              {!loading && data && !data.live && (
                <div style={{ fontSize: 13, color: "var(--ink-60)", lineHeight: 1.5 }}>
                  This address has no on-chain position, or the chain is unreachable right now.
                </div>
              )}

              {!loading && data && data.live && (
                <>
                  {/* Hero total */}
                  <div style={{ marginBottom: 20 }}>
                    <div className="eyebrow" style={{ marginBottom: 8 }}>Total ATOM</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 46, lineHeight: 1, letterSpacing: "-0.025em", color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
                        {fmtN(data.total_atom)}
                      </span>
                      {data.total_usd !== undefined && (
                        <span className="data" style={{ fontSize: 13, color: "var(--ink-60)" }}>${fmtCompact(data.total_usd)}</span>
                      )}
                    </div>
                  </div>

                  {/* Position tiles */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--ink-20)", border: "1px solid var(--ink-20)", marginBottom: 24 }}>
                    <Tile label="Staked" value={fmtN(data.staked)} />
                    <Tile label="Liquid" value={fmtN(data.liquid)} />
                    <Tile label="Unbonding" value={fmtN(data.unbonding)} tone={data.unbonding ? "var(--iron)" : undefined} />
                    <Tile label="Rewards" value={fmtN(data.rewards)} tone={data.rewards ? "var(--moss)" : undefined} />
                  </div>

                  {/* Behaviour tags */}
                  {!!data.tags?.length && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 24 }}>
                      {data.tags.map((t) => (
                        <span
                          key={t.label}
                          className="data"
                          style={{
                            fontSize: 9.5, letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 700,
                            padding: "4px 9px", borderRadius: 3, color: TONE[t.tone] ?? "var(--ink-60)",
                            border: `1px solid color-mix(in srgb, ${TONE[t.tone] ?? "var(--ink-40)"} 45%, transparent)`,
                            background: `color-mix(in srgb, ${TONE[t.tone] ?? "var(--ink-40)"} 10%, transparent)`,
                          }}
                        >
                          {t.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Account age (Tier 2, full history) */}
                  {data.lifetime?.first_seen && (
                    <div className="data" style={{ fontSize: 11, color: "var(--ink-40)", marginBottom: 22, marginTop: -8, display: "flex", flexWrap: "wrap", gap: "2px 8px" }}>
                      <span>Active since <strong style={{ color: "var(--ink-60)", fontWeight: 600 }}>{data.lifetime.first_seen.slice(0, 10)}</strong></span>
                      <span style={{ color: "var(--ink-20)" }}>·</span>
                      <span>{fmtN(data.lifetime.events)} indexed events</span>
                    </div>
                  )}

                  {/* Net-flow behavior class (distributor / router / accumulator) */}
                  {data.flow_class && (
                    <div style={{ marginBottom: 14 }}>
                      <FlowClassBadge fc={data.flow_class} />
                    </div>
                  )}

                  {/* Flow summary (from recent indexed activity) */}
                  {data.flow_summary && (
                    <Section title={`Flow · last ${data.flow_summary.moves} moves`}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "var(--ink-20)", border: "1px solid var(--ink-20)" }}>
                        <Tile label="Received" value={fmtCompact(data.flow_summary.received)} tone={data.flow_summary.received ? "var(--moss)" : undefined} />
                        <Tile label="Sent" value={fmtCompact(data.flow_summary.sent)} tone={data.flow_summary.sent ? "var(--iron)" : undefined} />
                        <Tile label="Net" value={(data.flow_summary.net_transfer >= 0 ? "+" : "−") + fmtCompact(Math.abs(data.flow_summary.net_transfer))} tone={data.flow_summary.net_transfer >= 0 ? "var(--moss)" : "var(--iron)"} />
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-60)", lineHeight: 1.6, marginTop: 10 }}>
                        {data.flow_summary.delegated ? <>Staked <strong style={{ color: "var(--ink-80)" }}>{fmtCompact(data.flow_summary.delegated)}</strong>, </> : null}
                        {data.flow_summary.undelegated ? <>unstaked <strong style={{ color: "var(--ink-80)" }}>{fmtCompact(data.flow_summary.undelegated)}</strong>, </> : null}
                        {data.flow_summary.claimed ? <>claimed <strong style={{ color: "var(--ink-80)" }}>{fmtCompact(data.flow_summary.claimed)}</strong> in rewards. </> : null}
                        {data.flow_summary.biggest ? <>Biggest move: <strong style={{ color: "var(--ink-80)" }}>{fmtCompact(data.flow_summary.biggest.atom)} ATOM</strong> ({KIND_LABEL[data.flow_summary.biggest.kind] ?? data.flow_summary.biggest.kind}{data.flow_summary.biggest.cp_label !== "·" ? ` · ${data.flow_summary.biggest.cp_label}` : ""}).</> : null}
                        {data.exchange_flow && (data.exchange_flow.to_cex || data.exchange_flow.from_cex) ? (
                          <> <span style={{ color: "var(--iron)" }}>Exchange flow: {fmtCompact(data.exchange_flow.to_cex)} out, {fmtCompact(data.exchange_flow.from_cex)} in.</span></>
                        ) : null}
                      </div>
                    </Section>
                  )}

                  {/* Counterparties (who this wallet moves ATOM with) */}
                  {!!data.counterparties?.length && (
                    <Section title="Top counterparties">
                      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                        {data.counterparties.map((c, i) => {
                          const cex = c.cat === "cex" || c.cat === "cex_ops";
                          const openable = c.addr?.startsWith("cosmos1");
                          return (
                            <div
                              key={i}
                              className={openable ? "cp-click" : undefined}
                              role={openable ? "button" : undefined}
                              tabIndex={openable ? 0 : undefined}
                              onClick={openable ? () => open(c.addr) : undefined}
                              onKeyDown={openable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(c.addr); } } : undefined}
                              title={openable ? `Open ${c.addr}` : undefined}
                              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 12, cursor: openable ? "pointer" : "default", padding: "2px 4px", margin: "0 -4px", borderRadius: 3 }}
                            >
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, overflow: "hidden", color: "var(--ink-80)" }}>
                                {cex && <span style={{ fontSize: 10, letterSpacing: 0.5, padding: "1px 4px", borderRadius: 2, border: "1px solid color-mix(in srgb, var(--iron) 45%, transparent)", color: "var(--iron)" }}>CEX</span>}
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderBottom: openable ? "1px dotted var(--ink-20)" : undefined }}>{c.label}</span>
                              </span>
                              <span className="data" style={{ flexShrink: 0, fontSize: 11, color: "var(--ink-60)" }}>
                                {c.in ? <span style={{ color: "var(--moss)" }}>+{fmtCompact(c.in)}</span> : null}
                                {c.in && c.out ? " / " : null}
                                {c.out ? <span style={{ color: "var(--iron)" }}>−{fmtCompact(c.out)}</span> : null}
                                {" "}<span style={{ color: "var(--ink-40)" }}>· {c.count}×</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </Section>
                  )}

                  {/* Lifetime totals (Tier 2, full history) */}
                  {data.lifetime && (data.lifetime.delegated > 0 || data.lifetime.claimed > 0 || data.lifetime.received > 0 || data.lifetime.sent > 0) && (
                    <Section title="Lifetime">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <Tile label="Staked" value={fmtCompact(data.lifetime.delegated)} tone={data.lifetime.delegated ? "var(--moss)" : undefined} />
                        <Tile label="Unstaked" value={fmtCompact(data.lifetime.undelegated)} tone={data.lifetime.undelegated ? "var(--iron)" : undefined} />
                        <Tile label="Rewards claimed" value={fmtCompact(data.lifetime.claimed)} />
                        <Tile label="Net received" value={(data.lifetime.received - data.lifetime.sent >= 0 ? "+" : "−") + fmtCompact(Math.abs(data.lifetime.received - data.lifetime.sent))} tone={data.lifetime.received - data.lifetime.sent >= 0 ? "var(--moss)" : "var(--iron)"} />
                      </div>
                    </Section>
                  )}

                  {/* Standing */}
                  {!!data.delegations?.length && (
                    <Section title="Standing">
                      <div style={{ fontSize: 13, color: "var(--ink-80)", lineHeight: 1.55 }}>
                        Staked to <strong style={{ color: "var(--ink)" }}>{data.delegations.length}</strong>{" "}
                        validator{data.delegations.length === 1 ? "" : "s"}
                        {data.top_validator_pct ? <>, <strong style={{ color: "var(--ink)" }}>{data.top_validator_pct}%</strong> on its largest</> : null}.
                        {data.liquid !== undefined && data.staked !== undefined && data.total_atom ? (
                          <> {Math.round(((data.staked) / data.total_atom) * 100)}% of the position is bonded.</>
                        ) : null}
                      </div>
                    </Section>
                  )}

                  {/* Delegations */}
                  {!!data.delegations?.length && (
                    <Section title="Delegations">
                      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                        {data.delegations.slice(0, 8).map((d) => (
                          <div key={d.oper}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-80)", marginBottom: 4 }}>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}>{d.validator}</span>
                              <span className="data" style={{ color: "var(--ink-60)" }}>{fmtN(d.atom)} · {d.pct}%</span>
                            </div>
                            <div className="gbar" style={{ height: 6 }}>
                              <div className="gbar-fill" style={{ width: `${d.pct}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Unbonding */}
                  {!!data.unbonding_entries?.length && (
                    <Section title="Currently unbonding">
                      <table className="broadsheet">
                        <tbody>
                          {data.unbonding_entries.slice(0, 8).map((e, i) => (
                            <tr key={i}>
                              <td style={{ color: "var(--ink)" }}>{e.validator}</td>
                              <td className="num" style={{ color: "var(--iron)", fontWeight: 600 }}>{fmtN(e.atom)}</td>
                              <td className="num" style={{ color: "var(--ink-60)" }}>{e.completion}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Section>
                  )}

                  {/* Activity timeline (from the Bedrock indexer) */}
                  {!!data.activity?.length && (
                    <Section title="Recent activity">
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {data.activity.slice(0, 25).map((e, i) => (
                          <div
                            key={`${e.tx_hash}-${i}`}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "92px 1fr auto",
                              alignItems: "center",
                              gap: 10,
                              padding: "8px 0",
                              borderTop: i === 0 ? "none" : "1px solid var(--ink-10)",
                            }}
                          >
                            <span style={{ fontSize: 12, color: kindColor(e.kind), fontWeight: 600 }}>
                              {KIND_LABEL[e.kind] ?? e.kind}
                            </span>
                            <span className="data" style={{ fontSize: 11, color: (e.cp_cat === "cex" || e.cp_cat === "cex_ops") ? "var(--iron)" : "var(--ink-60)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6 }}>
                              {(e.cp_cat === "cex" || e.cp_cat === "cex_ops") && <span style={{ fontSize: 10, letterSpacing: 0.5, padding: "1px 4px", borderRadius: 2, border: "1px solid color-mix(in srgb, var(--iron) 45%, transparent)", color: "var(--iron)" }}>CEX</span>}
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.cp_label ?? shortCp(e.counterparty)}</span>
                              {e.is_ibc ? " · IBC" : ""}
                            </span>
                            <span className="data" style={{ fontSize: 12, color: "var(--ink-80)", textAlign: "right" }}>
                              {atomFromUatom(e.amount_uatom)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  <div style={{ marginTop: 24, fontSize: 11, color: "var(--ink-60)", lineHeight: 1.5 }}>
                    Position read live from the Cosmos Hub. Activity is indexed by Bedrock&apos;s own indexer
                    {data.activity_live === false ? " (connecting…)" : data.activity?.length ? "" : " (history backfilling; recent events appear first)"}.
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{ background: "var(--paper-2)", padding: "14px 16px" }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 23, lineHeight: 1, letterSpacing: "-0.02em", color: tone ?? "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 26 }}>
      <div style={{ borderTop: "1px solid var(--ink-20)", paddingTop: 12, marginBottom: 12 }}>
        <span className="data" style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--hub)", fontWeight: 700 }}>{title}</span>
      </div>
      {children}
    </section>
  );
}
