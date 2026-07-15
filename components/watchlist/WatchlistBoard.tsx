"use client";

// /watchlist · the wallets and validators you've starred, saved locally in this
// browser (no account needed). Each row opens its live card. This is a saved
// list; push alerts on big moves are a separate backend project.

import { useEffect, useState } from "react";
import { getWatchlist, toggleWatch, onWatchlistChange, type WatchItem } from "@/lib/watchlist";
import { useAddressPanel } from "@/components/address/AddressPanelProvider";
import { useValidatorPanel } from "@/components/validator/ValidatorPanelProvider";

function short(id: string): string {
  if (id.startsWith("cosmosvaloper")) return `${id.slice(0, 16)}…`;
  return `${id.slice(0, 12)}…${id.slice(-6)}`;
}

export function WatchlistBoard() {
  const { open: openAddr } = useAddressPanel();
  const { open: openVal } = useValidatorPanel();
  const [items, setItems] = useState<WatchItem[] | null>(null);

  useEffect(() => {
    const sync = () => setItems(getWatchlist());
    sync();
    return onWatchlistChange(sync);
  }, []);

  const wallets = (items ?? []).filter((w) => w.type === "address");
  const validators = (items ?? []).filter((w) => w.type === "validator");

  return (
    <div className="page" style={{ paddingTop: 24 }}>
      <div className="surface" style={{ padding: "18px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--sand)", boxShadow: "0 0 6px var(--sand)" }} aria-hidden />
          <h1 className="data" style={{ fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--ink)", fontWeight: 700, margin: 0, display: "inline" }}>Watchlist</h1>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ink-40)", marginBottom: 18 }}>
          Starred wallets and validators, saved in this browser. Open any to see its live card. Star anything from its panel.
        </div>

        {items === null ? (
          <div className="data" style={{ fontSize: 12, color: "var(--ink-60)" }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--ink-60)", lineHeight: 1.6, padding: "12px 0" }}>
            Nothing starred yet. Open any wallet or validator card (search with ⌘K, or click a name anywhere) and tap the star in its header.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 28px" }}>
            <Section title={`Wallets · ${wallets.length}`} items={wallets} onOpen={(id) => openAddr(id)} />
            <Section title={`Validators · ${validators.length}`} items={validators} onOpen={(id) => openVal(id)} />
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, items, onOpen }: { title: string; items: WatchItem[]; onOpen: (id: string) => void }) {
  if (items.length === 0) {
    return (
      <div>
        <div className="data" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)", marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--ink-40)" }}>None yet.</div>
      </div>
    );
  }
  return (
    <div>
      <div className="data" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)", marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((w) => (
          <div key={`${w.type}-${w.id}`} className="cp-click" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 8px", margin: "0 -8px", borderRadius: 3 }}>
            <button type="button" onClick={() => onOpen(w.id)} style={{ background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "left", flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.label || short(w.id)}</div>
              {w.label ? <div className="data" style={{ fontSize: 10.5, color: "var(--ink-40)" }}>{short(w.id)}</div> : null}
            </button>
            <button
              type="button"
              onClick={() => toggleWatch({ type: w.type, id: w.id, label: w.label })}
              aria-label="Remove from watchlist"
              title="Remove"
              style={{ background: "transparent", border: "1px solid var(--ink-20)", color: "var(--ink-40)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 12, padding: "2px 8px", flexShrink: 0 }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
