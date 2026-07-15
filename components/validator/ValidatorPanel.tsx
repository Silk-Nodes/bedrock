"use client";

// Validator side panel: live card for any Cosmos Hub validator. Standing
// (rank, voting power, commission, uptime) from the live set, plus net
// delegation flow over the indexed window. Opens from any ValidatorLink.

import { useEffect, useRef, useState } from "react";
import { useValidatorPanel } from "./ValidatorPanelProvider";
import { useFocusTrap } from "@/components/useFocusTrap";
import { ValidatorAvatar } from "@/components/console/ValidatorAvatar";
import { ShareButton } from "@/components/share/ShareButton";
import type { SocialCardProps } from "@/components/share/SocialCard";
import { WatchStar } from "@/components/WatchStar";

type Flow7 = { net: number; delegate: number; unbond: number; start: string | null; end: string | null };
type ValData = {
  operator: string;
  live: boolean;
  moniker?: string;
  logo?: string | null;
  rank?: number;
  active?: number;
  voting_power?: number;
  voting_power_pct?: number;
  voting_power_usd?: number;
  commission_pct?: number | null;
  jailed?: boolean;
  uptime_pct?: number | null;
  missed_blocks?: number | null;
  pct_of_bonded?: number;
  flow7?: Flow7;
  flow24?: { net: number };
};

function fmtN(n?: number): string {
  if (n == null || !Number.isFinite(n)) return "·";
  return Math.round(n).toLocaleString("en-US");
}
function fmtCompact(n?: number): string {
  if (n == null || !Number.isFinite(n)) return "·";
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return Math.round(n).toString();
}
function fmtSigned(n?: number): string {
  if (n == null || !Number.isFinite(n)) return "·";
  return (n >= 0 ? "+" : "−") + fmtCompact(Math.abs(n));
}
function spanLabel(s: string | null | undefined, e: string | null | undefined): string {
  if (!s || !e) return "recent";
  const h = (new Date(e).getTime() - new Date(s).getTime()) / 3_600_000;
  if (h < 36) return `last ${Math.max(1, Math.round(h))}h`;
  return `last ${Math.round(h / 24)}d`;
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{ border: "1px solid var(--ink-10)", padding: "12px 14px" }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: tone ?? "var(--ink)" }}>{value}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--ink-10)" }}>
      <div className="data" style={{ fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--hub)", fontWeight: 700, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

export function ValidatorPanel() {
  const { oper, open: _open, close } = useValidatorPanel();
  const isOpen = !!oper;
  const [data, setData] = useState<ValData | null>(null);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  useFocusTrap(panelRef, isOpen);

  useEffect(() => {
    if (!oper) { setData(null); return; }
    let cancelled = false;
    setLoading(true);
    setData(null);
    fetch(`/api/validator/${oper}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) { setData({ operator: oper, live: false }); setLoading(false); } });
    return () => { cancelled = true; };
  }, [oper]);

  const bonding = (data?.flow7?.net ?? 0) >= 0;
  const flowSpan = spanLabel(data?.flow7?.start, data?.flow7?.end);

  const shareCard: SocialCardProps | null =
    oper && data?.live
      ? {
          title: "Cosmos Hub validator",
          subtitle: `${data.moniker ?? oper}   ·   rank #${data.rank}${data.active ? ` of ${data.active}` : ""}`,
          big: fmtCompact(data.voting_power),
          unit: "ATOM bonded",
          context: [
            data.voting_power_pct != null ? `${data.voting_power_pct.toFixed(2)}% of voting power.` : null,
            data.commission_pct != null ? `${data.commission_pct}% commission.` : null,
            data.flow7 ? `${fmtSigned(data.flow7.net)} ATOM net delegation over ${flowSpan}.` : null,
          ].filter(Boolean).join("  "),
        }
      : null;

  return (
    <>
      <div
        onClick={close}
        aria-hidden
        style={{ position: "fixed", inset: 0, background: "rgba(8,10,14,0.42)", opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none", transition: "opacity 180ms ease", zIndex: 1002 }}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Validator card"
        data-open={isOpen ? "true" : "false"}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: "min(480px, 100vw)",
          transform: isOpen ? "translateX(0)" : "translateX(102%)",
          transition: "transform 220ms cubic-bezier(0.2,0.7,0.2,1)",
          background: "color-mix(in srgb, var(--paper) 84%, transparent)",
          backdropFilter: "blur(22px) saturate(160%)", WebkitBackdropFilter: "blur(22px) saturate(160%)",
          borderLeft: "1px solid var(--ink-20)", boxShadow: "-12px 0 40px color-mix(in srgb, var(--ink) 22%, transparent)",
          zIndex: 1003, display: "flex", flexDirection: "column",
        }}
      >
        {isOpen && (
          <>
            <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--ink-20)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span className="data" style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--hub)", fontWeight: 700 }}>Validator · live</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {oper && <WatchStar type="validator" id={oper} label={data?.moniker} />}
                {shareCard && <ShareButton card={shareCard} filename={`bedrock-validator-${(data?.moniker ?? oper ?? "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`} />}
                <button type="button" onClick={close} aria-label="Close" style={{ background: "transparent", border: "1px solid var(--ink-20)", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-80)", padding: "4px 10px", cursor: "pointer" }}>✕</button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "22px 22px 60px" }}>
              {/* Identity */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <ValidatorAvatar operator={oper!} logo={data?.logo} moniker={data?.moniker ?? ""} size={40} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data?.moniker ?? "Validator"}</div>
                  {data?.live && <div className="data" style={{ fontSize: 11, color: "var(--ink-40)" }}>Rank #{data.rank}{data.active ? ` of ${data.active}` : ""}{data.jailed ? " · JAILED" : ""}</div>}
                </div>
              </div>

              {loading && <div className="data" style={{ fontSize: 12, color: "var(--ink-60)" }}>Reading the set…</div>}

              {!loading && data && !data.live && (
                <div style={{ fontSize: 13, color: "var(--ink-60)", lineHeight: 1.5 }}>This operator is not in the active set, or the set is unreachable right now.</div>
              )}

              {!loading && data && data.live && (
                <>
                  {/* Hero: voting power */}
                  <div style={{ marginBottom: 18 }}>
                    <div className="eyebrow" style={{ marginBottom: 8 }}>Voting power</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 40, fontWeight: 600, color: "var(--ink)", lineHeight: 1 }}>{fmtCompact(data.voting_power)}</span>
                      <span className="data" style={{ fontSize: 13, color: "var(--ink-60)" }}>ATOM · {data.voting_power_pct?.toFixed(2)}%</span>
                    </div>
                    {data.jailed && <div style={{ marginTop: 8, display: "inline-block", fontSize: 9.5, letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 700, color: "var(--iron)", border: "1px solid color-mix(in srgb, var(--iron) 45%, transparent)", background: "color-mix(in srgb, var(--iron) 10%, transparent)", padding: "4px 9px", borderRadius: 3 }}>Jailed</div>}
                  </div>

                  {/* Standing tiles */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <Tile label="Commission" value={data.commission_pct != null ? `${data.commission_pct}%` : "·"} />
                    <Tile label="Uptime" value={data.uptime_pct != null ? `${data.uptime_pct.toFixed(1)}%` : "·"} tone={data.uptime_pct != null && data.uptime_pct < 95 ? "var(--iron)" : undefined} />
                    <Tile label="Rank" value={`#${data.rank}`} />
                    <Tile label="Share of bonded" value={data.pct_of_bonded != null ? `${data.pct_of_bonded}%` : "·"} />
                  </div>

                  {/* Delegation flow */}
                  {data.flow7 && (
                    <Section title={`Delegation flow · ${flowSpan}`}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                        <Tile label="Delegated" value={fmtCompact(data.flow7.delegate)} tone={data.flow7.delegate ? "var(--moss)" : undefined} />
                        <Tile label="Unbonded" value={fmtCompact(data.flow7.unbond)} tone={data.flow7.unbond ? "var(--iron)" : undefined} />
                        <Tile label="Net" value={fmtSigned(data.flow7.net)} tone={bonding ? "var(--moss)" : "var(--iron)"} />
                      </div>
                      <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--ink-80)", lineHeight: 1.5 }}>
                        {bonding ? "Attracting" : "Shedding"} stake over {flowSpan}
                        {data.flow24 ? <> · <strong style={{ color: data.flow24.net >= 0 ? "var(--moss)" : "var(--iron)" }}>{fmtSigned(data.flow24.net)}</strong> in the last 24h</> : null}.
                      </div>
                    </Section>
                  )}

                  <div style={{ marginTop: 22, fontSize: 10.5, color: "var(--ink-40)", lineHeight: 1.5 }}>
                    Standing is live from the chain. Delegation flow is from the Bedrock indexer over the window shown, which the live tip-follower covers; deep history fills in as the backfill advances.
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
