"use client";

// Exchange-linked holders, grouped by venue. Click a venue to expand its
// individual wallets.
//
// This is CUSTODIED ATOM — customer deposits the exchange controls keys to, not
// the exchange's own treasury. The parent page states that above the table; do
// not let a caller render this without that context.
//
// Columns are deliberately different from the Rich List: deposits/withdrawals
// are meaningless for a wallet that IS the exchange, so this shows only what
// applies — wallet count, holdings, staked share, and share of exchange-held
// ATOM. The staked share is the interesting column: it reveals which venues
// stake customer ATOM (earning yield on it) and which leave it idle.

import { Fragment, useState } from "react";
import { AddressLink } from "@/components/address/AddressLink";
import type { ExchangeVenue } from "@/lib/indexer";

function compact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `${Math.round(n / 1_000)}k`;
  return n === 0 ? "·" : `${Math.round(n)}`;
}

export function ExchangeHoldersTable({ venues, total }: { venues: ExchangeVenue[]; total: number }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="bigtable-wrap">
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            <th style={thL}>Venue</th>
            <th style={thR}>Wallets</th>
            <th style={thR}>Held</th>
            <th style={thR}>Staked</th>
            <th style={thR}>Staked %</th>
            <th style={thR}>Share</th>
          </tr>
        </thead>
        <tbody>
          {venues.map((v) => {
            const isOpen = open === v.venue;
            const stakePct = v.held > 0 ? Math.round((v.staked / v.held) * 100) : 0;
            // Fragment must be keyed (React.Fragment, not <>): an unkeyed
            // fragment inside .map() drops its children, which silently hid
            // every expanded wallet row.
            return (
              <Fragment key={v.venue}>
                <tr
                  onClick={() => setOpen(isOpen ? null : v.venue)}
                  style={{ borderBottom: "1px solid var(--card-line)", cursor: "pointer" }}
                  title={isOpen ? "Hide wallets" : "Show wallets"}
                >
                  <td style={{ ...tdL, color: "var(--ink)", fontWeight: 500 }}>
                    <span style={{ display: "inline-block", width: 14, color: "var(--ink-40)" }}>{isOpen ? "−" : "+"}</span>
                    {v.venue}
                  </td>
                  <td style={tdR}>{v.wallets}</td>
                  <td style={{ ...tdR, color: "var(--ink)", fontWeight: 500 }}>{compact(v.held)}</td>
                  <td style={{ ...tdR, color: "var(--moss)" }}>{compact(v.staked)}</td>
                  <td style={{ ...tdR, color: stakePct >= 50 ? "var(--moss)" : "var(--ink-60)" }}>{stakePct}%</td>
                  <td style={{ ...tdR, color: "var(--ink-60)" }}>
                    {total > 0 ? `${Math.round((v.held / total) * 100)}%` : "·"}
                  </td>
                </tr>
                {isOpen &&
                  v.rows.map((r) => (
                    <tr key={r.address} style={{ borderBottom: "1px solid var(--card-line)", background: "var(--paper-2)" }}>
                      <td style={{ ...tdL, paddingLeft: 28 }}>
                        <AddressLink addr={r.address}>
                          <span className="data" style={{ fontSize: 11.5, color: "var(--hub-2)" }}>
                            {r.address.slice(0, 18)}…{r.address.slice(-6)}
                          </span>
                        </AddressLink>
                        <span className="data" style={{ marginLeft: 10, fontSize: 10, color: "var(--ink-40)" }}>&nbsp;{r.category}</span>
                      </td>
                      <td style={tdR} />
                      <td style={{ ...tdR, color: "var(--ink-80)" }}>{compact(r.held)}</td>
                      <td style={{ ...tdR, color: r.staked > 0 ? "var(--ink-60)" : "var(--ink-40)" }}>{r.staked > 0 ? compact(r.staked) : "0"}</td>
                      <td style={{ ...tdR, color: "var(--ink-40)" }}>
                        {r.held > 0 ? `${Math.round((r.staked / r.held) * 100)}%` : "·"}
                      </td>
                      <td style={tdR} />
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const thBase: React.CSSProperties = { padding: "8px 10px", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-50)" };
const thL: React.CSSProperties = { ...thBase, textAlign: "left" };
const thR: React.CSSProperties = { ...thBase, textAlign: "right" };
const tdBase: React.CSSProperties = { padding: "9px 10px", fontVariantNumeric: "tabular-nums" };
const tdL: React.CSSProperties = { ...tdBase, textAlign: "left" };
const tdR: React.CSSProperties = { ...tdBase, textAlign: "right" };
