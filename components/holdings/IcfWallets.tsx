"use client";

// Expandable ICF wallet rows. Click a row and a detail drawer unfolds beneath
// it (accordion, one open at a time): the four ATOM buckets from props, plus
// the validators it delegates to, fetched live on expand. "View full account"
// opens the shared address side panel for the deep activity timeline.

import { useEffect, useState } from "react";
import { AddressLink } from "@/components/address/AddressLink";

type Wallet = {
  label: string;
  address: string;
  liquid: number;
  delegated: number;
  unbonding: number;
  rewards: number;
  total: number;
};
type Deleg = { validator: string; oper: string; atom: number; pct: number };

function fmtN(n: number): string { return Math.round(n).toLocaleString("en-US"); }
function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return Math.round(n).toString();
}

export function IcfWallets({ wallets }: { wallets: Wallet[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div style={{ border: "1px solid var(--ink-15)" }}>
      {wallets.map((w, i) => (
        <WalletRow
          key={w.address}
          w={w}
          first={i === 0}
          isOpen={open === w.address}
          onToggle={() => setOpen(open === w.address ? null : w.address)}
        />
      ))}
    </div>
  );
}

function WalletRow({ w, first, isOpen, onToggle }: { w: Wallet; first: boolean; isOpen: boolean; onToggle: () => void }) {
  const [dels, setDels] = useState<Deleg[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && dels === null && !loading) {
      setLoading(true);
      fetch(`/api/address/${w.address}`)
        .then((r) => r.json())
        .then((d) => setDels((d.delegations ?? []) as Deleg[]))
        .catch(() => setDels([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, dels, loading, w.address]);

  const topDels = (dels ?? []).slice(0, 6);

  return (
    <div style={{ borderTop: first ? "none" : "1px solid var(--ink-10)" }}>
      {/* Header row (toggles the drawer) */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{
          width: "100%",
          background: isOpen ? "var(--paper-2)" : "transparent",
          border: "none",
          cursor: "pointer",
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) auto 130px 22px",
          alignItems: "center",
          gap: 14,
          padding: "13px 16px",
          textAlign: "left",
          transition: "background 140ms ease",
        }}
      >
        <span style={{ color: "var(--ink)", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ display: "inline-block", width: 8, height: 8, background: "var(--hub)", flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.label}</span>
        </span>
        <span className="data" style={{ fontSize: 11, color: "var(--ink-50)" }}>{w.address.slice(0, 10)}…{w.address.slice(-5)}</span>
        <span className="num" style={{ color: "var(--ink)", fontWeight: 700, textAlign: "right" }}>{fmtCompact(w.total)} ATOM</span>
        <span aria-hidden style={{ color: "var(--hub)", fontFamily: "var(--font-mono)", fontSize: 13, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 200ms ease", justifySelf: "center" }}>▸</span>
      </button>

      {/* Drawer (animated open/close via grid-template-rows) */}
      <div style={{ display: "grid", gridTemplateRows: isOpen ? "1fr" : "0fr", transition: "grid-template-rows 240ms ease" }}>
        <div style={{ overflow: "hidden" }}>
          <div style={{ padding: "4px 16px 20px", background: "var(--paper-2)" }}>
            {/* Four ATOM buckets */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "var(--ink-15)", border: "1px solid var(--ink-15)" }}>
              <Bucket label="Liquid" v={w.liquid} />
              <Bucket label="Staked" v={w.delegated} accent />
              <Bucket label="Unbonding" v={w.unbonding} />
              <Bucket label="Rewards" v={w.rewards} />
            </div>

            {/* Validators it delegates to */}
            <div style={{ marginTop: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>Delegated to</div>
              {loading ? (
                <div style={{ fontSize: 12, color: "var(--ink-50)" }}>Loading validators…</div>
              ) : topDels.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--ink-50)" }}>No active delegations.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {topDels.map((d) => (
                    <div key={d.oper}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-80)", marginBottom: 4 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>{d.validator}</span>
                        <span className="data" style={{ color: "var(--ink-50)" }}>{fmtN(d.atom)} · {d.pct}%</span>
                      </div>
                      <div className="gbar" style={{ height: 5 }}>
                        <div className="gbar-fill" style={{ width: `${Math.min(100, d.pct)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              <AddressLink addr={w.address} style={{ fontSize: 12, color: "var(--hub)", fontWeight: 600 }}>
                View full account →
              </AddressLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bucket({ label, v, accent }: { label: string; v: number; accent?: boolean }) {
  return (
    <div style={{ background: "var(--paper)", padding: "12px 14px" }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, color: accent ? "var(--hub)" : "var(--ink)", letterSpacing: "-0.4px" }}>{fmtCompact(v)}</span>
        <span className="data" style={{ fontSize: 9, color: "var(--ink-50)" }}>ATOM</span>
      </div>
    </div>
  );
}
