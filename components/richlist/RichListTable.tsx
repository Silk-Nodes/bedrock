"use client";

// The Rich List table: sortable by any column. The # column is the wallet's
// fixed holdings position (rank among real holders), so it stays with the row
// no matter which column you sort by — click "Claimed" to see the biggest
// claimers, the # still tells you where each sits by size. Client-side so the
// re-sort is instant with no round trip.

import { useState } from "react";
import { AddressLink } from "@/components/address/AddressLink";
import type { WhaleBoardRow } from "@/lib/whaleBoardFixture";

type SortKey = "held" | "staked" | "claimed" | "delegated" | "undelegated" | "toCex" | "fromCex";

const COLS: { key: SortKey; label: string; tone: string }[] = [
  { key: "held", label: "Held", tone: "var(--ink)" },
  { key: "staked", label: "Staked", tone: "var(--ink-80)" },
  { key: "claimed", label: "Claimed", tone: "var(--sand)" },
  { key: "delegated", label: "Delegated", tone: "var(--moss)" },
  { key: "undelegated", label: "Undeleg", tone: "var(--iron)" },
  { key: "toCex", label: "→ CEX", tone: "var(--iron)" },
  { key: "fromCex", label: "← CEX", tone: "var(--moss)" },
];

function compact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `${Math.round(n / 1_000)}k`;
  return n === 0 ? "·" : `${Math.round(n)}`;
}

function stance(r: WhaleBoardRow): { label: string; color: string } {
  // A conduit's flows are exchange plumbing, not a holder stance, so it never
  // reads as buying or selling — it reads as what it is.
  if (r.conduit) return { label: "conduit", color: "var(--hub-2)" };
  const netStake = r.delegated - r.undelegated;
  const netCex = r.fromCex - r.toCex;
  const active = r.delegated + r.undelegated + r.toCex + r.fromCex + r.claimed;
  if (active < 1) return { label: "dormant", color: "var(--ink-40)" };
  if (r.toCex > 0 && r.claimed > 0 && r.toCex >= r.claimed * 0.8 && r.toCex >= Math.abs(netStake)) return { label: "selling rewards", color: "var(--iron)" };
  if (netCex < -0.05 * r.held || r.toCex > Math.max(1, r.fromCex) * 1.5) return { label: "distributing", color: "var(--iron)" };
  if (netStake > 0 || netCex > 0) return { label: "accumulating", color: "var(--moss)" };
  return { label: "active", color: "var(--sand)" };
}

export function RichListTable({ rows }: { rows: WhaleBoardRow[] }) {
  const [sort, setSort] = useState<SortKey>("held");
  const [asc, setAsc] = useState(false);

  const sorted = [...rows].sort((a, b) => (asc ? a[sort] - b[sort] : b[sort] - a[sort]));

  const onSort = (k: SortKey) => {
    if (k === sort) setAsc((v) => !v);
    else { setSort(k); setAsc(false); }
  };

  const arrow = (k: SortKey) => (k === sort ? (asc ? " ↑" : " ↓") : "");

  return (
    // Page-level sticky header: the column labels pin below the nav as you
    // scroll the whole page through the 100 rows, so you never lose which number
    // is which. NO overflow wrapper here on purpose — an overflow-x/y container
    // would capture the scroll and anchor the sticky to itself instead of the
    // viewport, breaking it. The table sizes to the content width instead.
    // Below 920px (.bigtable-wrap media rule) the wrapper scrolls the table
    // horizontally so the page never does.
    <div className="bigtable-wrap">
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            <th style={thL}>#</th>
            <th style={thL}>Wallet</th>
            {COLS.map((c) => (
              <th
                key={c.key}
                onClick={() => onSort(c.key)}
                style={{ ...thR, color: sort === c.key ? c.tone : "var(--ink-50)", cursor: "pointer", userSelect: "none" }}
                title={`Sort by ${c.label}`}
              >
                {c.label}{arrow(c.key)}
              </th>
            ))}
            <th style={thL}>Stance</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const s = stance(r);
            const stakedPct = r.held > 0 ? Math.round((r.staked / r.held) * 100) : 0;
            return (
              <tr key={r.address} style={{ borderBottom: "1px solid var(--card-line)" }}>
                <td style={{ ...tdL, color: "var(--ink-40)" }}>{r.pos}</td>
                <td style={tdL}>
                  {r.label ? (
                    <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <span style={{ color: "var(--ink)", fontWeight: 500 }}>{r.label}</span>
                      <AddressLink addr={r.address}>
                        <span className="data" style={{ fontSize: 10.5, color: "var(--ink-40)" }}>{r.address.slice(0, 14)}…{r.address.slice(-5)}</span>
                      </AddressLink>
                    </span>
                  ) : (
                    <AddressLink addr={r.address}>
                      <span className="data" style={{ fontSize: 12, color: "var(--hub-2)" }}>{r.address.slice(0, 16)}…{r.address.slice(-6)}</span>
                    </AddressLink>
                  )}
                </td>
                <td style={{ ...tdR, color: "var(--ink)", fontWeight: 500 }}>{compact(r.held)}</td>
                <td style={tdR}>
                  <span style={{ color: "var(--ink-80)" }}>{compact(r.staked)}</span>
                  <span className="data" style={{ marginLeft: 6, fontSize: 10, color: "var(--ink-40)" }}>{stakedPct}%</span>
                </td>
                {(["claimed", "delegated", "undelegated", "toCex", "fromCex"] as const).map((k) => {
                  const tone = COLS.find((c) => c.key === k)!.tone;
                  const v = r[k];
                  return (
                    <td key={k} style={{ ...tdR, color: v > 0 ? tone : "var(--ink-30)" }}>{compact(v)}</td>
                  );
                })}
                <td style={tdL}>
                  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 3, fontSize: 11, color: s.color, border: `1px solid ${s.color}`, whiteSpace: "nowrap" }}>
                    {s.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const thBase: React.CSSProperties = { padding: "8px 10px", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" };
const thL: React.CSSProperties = { ...thBase, textAlign: "left", color: "var(--ink-50)" };
const thR: React.CSSProperties = { ...thBase, textAlign: "right" };
const tdBase: React.CSSProperties = { padding: "9px 10px", fontVariantNumeric: "tabular-nums" };
const tdL: React.CSSProperties = { ...tdBase, textAlign: "left" };
const tdR: React.CSSProperties = { ...tdBase, textAlign: "right" };
