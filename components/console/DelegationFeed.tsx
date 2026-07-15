"use client";

// Live delegation feed with client-side filters. The server hands us a generous
// window of recent staking events (already labelled with validator monikers);
// we filter by type and minimum size in memory, so it's instant with no refetch.

import { useState } from "react";
import { ValidatorAvatar } from "./ValidatorAvatar";
import { useAddressPanel } from "@/components/address/AddressPanelProvider";
import { ValidatorLink } from "@/components/validator/ValidatorLink";

export type FeedEvent = {
  tx_hash: string;
  height: number;
  type: "delegate" | "unbond" | "redelegate";
  delegator: string;
  validator: string;
  valName: string;
  logo?: string | null;
  amount_atom: number;
  time: string;
};

const TYPES = [
  { k: "all", label: "All" },
  { k: "delegate", label: "Delegate" },
  { k: "unbond", label: "Unbond" },
  { k: "redelegate", label: "Redeleg" },
] as const;

const SIZES = [
  { k: 0, label: "All" },
  { k: 100, label: "≥100" },
  { k: 1000, label: "≥1k" },
  { k: 10000, label: "≥10k" },
] as const;

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(n < 100 ? 1 : 0);
}
function fmtAgo(iso: string): string {
  const sec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h`;
  return `${Math.round(sec / 86400)}d`;
}
function shortAddr(a: string): string {
  return a.length > 14 ? `${a.slice(0, 9)}…${a.slice(-4)}` : a;
}

function Chips<T extends string | number>({
  label, options, value, onChange,
}: { label: string; options: readonly { k: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span className="data" style={{ fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)" }}>{label}</span>
      <div role="tablist" style={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: 2, padding: 2, background: "var(--paper-2)", border: "1px solid var(--card-line)" }}>
        {options.map((o) => {
          const on = o.k === value;
          return (
            <button
              key={String(o.k)}
              role="tab"
              aria-selected={on}
              onClick={() => onChange(o.k)}
              className="data"
              style={{
                minHeight: 28, padding: "5px 12px", fontSize: 10, letterSpacing: 0.6, fontWeight: on ? 800 : 600,
                textTransform: "uppercase", cursor: "pointer", border: "none", borderRadius: 3,
                color: on ? "var(--hub)" : "var(--ink-40)",
                background: on ? "color-mix(in srgb, var(--hub) 16%, var(--paper))" : "transparent",
                boxShadow: on
                  ? "inset 0 0 0 1px color-mix(in srgb, var(--hub) 60%, transparent), 0 0 10px color-mix(in srgb, var(--hub) 22%, transparent)"
                  : "none",
                transition: "color 130ms ease, background 130ms ease, box-shadow 130ms ease",
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DelegationFeed({ events }: { events: FeedEvent[] }) {
  const { open } = useAddressPanel();
  const [type, setType] = useState<(typeof TYPES)[number]["k"]>("all");
  const [min, setMin] = useState<number>(0);

  const rows = events
    .filter((e) => (type === "all" || e.type === type) && e.amount_atom >= min)
    .slice(0, 60);

  return (
    <div className="surface" style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
        <div className="data" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--moss)", boxShadow: "0 0 6px var(--moss)" }} aria-hidden />
          Live delegation feed
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <Chips label="Type" options={TYPES} value={type} onChange={setType} />
          <Chips label="Size" options={SIZES} value={min} onChange={setMin} />
        </div>
      </div>

      <div className="table-scroll" style={{ maxHeight: 480 }}>
        {rows.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--ink-40)", padding: "20px 0", textAlign: "center" }}>
            No events match this filter in the recent window.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {rows.map((e, i) => {
              const tone = e.type === "delegate" ? "var(--moss)" : e.type === "unbond" ? "var(--iron)" : "var(--slate)";
              const verb = e.type === "delegate" ? "staked to" : e.type === "unbond" ? "unstaked from" : "redelegated to";
              return (
                <div
                  key={`${e.tx_hash}-${e.height}-${e.type}-${i}`}
                  className="feed-row feed-row-click"
                  role="button"
                  tabIndex={0}
                  onClick={() => open(e.delegator)}
                  onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); open(e.delegator); } }}
                  title={`Open ${e.delegator}`}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", borderBottom: "1px solid var(--ink-10)", fontSize: 12.5, cursor: "pointer" }}
                >
                  <span className="data feed-type" style={{ flexShrink: 0, width: 62, fontSize: 9, letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 700, color: tone }}>{e.type}</span>
                  <span className="feed-amt" style={{ flexShrink: 0, width: 92, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--ink)", textAlign: "right" }}>
                    {fmtCompact(e.amount_atom)} <span style={{ fontSize: 9, color: "var(--ink-40)" }}>ATOM</span>
                  </span>
                  <span className="feed-mid" style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span className="data" style={{ fontSize: 11, color: "var(--ink-40)", borderBottom: "1px dotted var(--ink-40)" }}>{shortAddr(e.delegator)}</span>
                    <span style={{ color: "var(--ink-40)" }}>{verb}</span>
                  </span>
                  <ValidatorLink oper={e.validator} className="cp-click" style={{ display: "inline-flex", alignItems: "center", gap: 7, flex: 1, minWidth: 0, color: "var(--ink)", fontWeight: 600, borderRadius: 3 }}>
                    <ValidatorAvatar operator={e.validator} logo={e.logo} moniker={e.valName} size={18} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderBottom: "1px dotted var(--ink-20)" }}>{e.valName}</span>
                  </ValidatorLink>
                  <span className="data feed-ago" style={{ flexShrink: 0, fontSize: 10.5, color: "var(--ink-40)" }}>{fmtAgo(e.time)}<span className="feed-ago-suffix"> ago</span></span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ fontSize: 10, color: "var(--ink-40)", marginTop: 8 }}>
        Showing {rows.length} of the latest {events.length} events. Individual on-chain delegation messages from the Bedrock indexer.
      </div>
    </div>
  );
}
