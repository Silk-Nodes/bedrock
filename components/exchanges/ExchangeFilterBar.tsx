"use client";

// Minimal shared filter for the Exchanges section: the two questions users
// actually ask. Which exchange (compact dropdown) and which direction (flow).
// State is URL query (ex, dir), so it persists across tabs and is shareable.
// Deliberately NOT here: size/window (contextual, live in the tabs that
// aggregate) and confidence (topline is always High+; the inferred tier is
// explorable on /labels). Keeping this to two controls is the point.

import { Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export const EXCHANGES = ["Coinbase", "Kraken", "Binance", "Upbit", "OKX", "Coinone"] as const;
const DIRECTIONS = [
  { v: "", label: "All" },
  { v: "deposit", label: "Deposits", color: "var(--iron)" },
  { v: "withdrawal", label: "Withdrawals", color: "var(--moss)" },
];
// Flow window (?w, hours). 30D is the default and the current cap of indexed
// hot-wallet history; longer ranges become meaningful as the backfill deepens.
const WINDOWS = [
  { v: "24", label: "24H" },
  { v: "168", label: "7D" },
  { v: "", label: "30D" },
];

// Which controls actually drive data on each route. Routes absent from this
// map (sell-pressure: cohort decomposition; destinations: IBC outflow by
// chain) have nothing exchange- or direction-scoped, so the bar hides there
// instead of showing controls that do nothing. `win`: flow-window control
// (recent is a rolling live feed; balance-trend charts carry their own ranges).
const ROUTE_CAPS: Record<string, { dir: boolean; win: boolean }> = {
  "/exchanges": { dir: true, win: true },
  "/exchanges/recent": { dir: true, win: false },
  "/exchanges/top-movers": { dir: true, win: true },
  "/exchanges/per-exchange": { dir: true, win: true },
  "/exchanges/balance-trend": { dir: false, win: false },
};

function Bar() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const ex = sp.get("ex") ?? "";
  const dir = sp.get("dir") ?? "";
  const win = sp.get("w") ?? "";
  const caps = ROUTE_CAPS[pathname];

  function set(k: string, v: string) {
    const next = new URLSearchParams(sp.toString());
    if (v === "") next.delete(k);
    else next.set(k, v);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  if (!caps) return null;

  const H = 34; // shared control height for alignment
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap",
        padding: "12px 16px", marginBottom: 16,
        border: "1px solid var(--card-line)", background: "var(--paper)",
        boxShadow: "var(--card-glow)",
      }}
    >
      {/* Exchange: refined dropdown */}
      <label style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        <span className="data" style={{ fontSize: 9.5, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--ink-40)" }}>Exchange</span>
        <select
          value={ex}
          onChange={(e) => set("ex", e.target.value)}
          className="data filter-select"
          style={{
            height: H, fontSize: 12.5, fontWeight: 600, letterSpacing: 0.2,
            color: ex ? "var(--hub)" : "var(--ink-80)",
            background: "var(--paper-2)", border: "1px solid var(--card-line)",
            padding: "0 30px 0 12px", cursor: "pointer", appearance: "none",
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'><path d='M2 3.5L5 6.5L8 3.5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/></svg>\")",
            backgroundRepeat: "no-repeat", backgroundPosition: "right 11px center",
          }}
        >
          <option value="">All exchanges</option>
          {EXCHANGES.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </label>

      {/* Flow direction: inset-track segmented control. Hidden on routes whose
          data has no deposit/withdrawal axis (e.g. balance-trend is custody). */}
      {caps.dir && (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        <span className="data" style={{ fontSize: 9.5, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--ink-40)" }}>Flow</span>
        <div
          role="tablist"
          style={{
            display: "inline-flex", alignItems: "center", gap: 3, height: H,
            padding: 3, background: "var(--paper-2)", border: "1px solid var(--card-line)",
          }}
        >
          {DIRECTIONS.map((d) => {
            const on = dir === d.v;
            const c = d.color ?? "var(--hub)";
            return (
              <button
                key={d.v || "all"}
                role="tab"
                aria-selected={on}
                onClick={() => set("dir", d.v)}
                className="data filter-seg"
                style={{
                  height: "100%", display: "inline-flex", alignItems: "center",
                  fontSize: 11, letterSpacing: 0.7, fontWeight: on ? 700 : 600, textTransform: "uppercase",
                  padding: "0 14px", cursor: "pointer", border: "none",
                  color: on ? c : "var(--ink-60)",
                  background: on ? "var(--paper)" : "transparent",
                  boxShadow: on ? `var(--elev-1), inset 0 0 0 1px color-mix(in srgb, ${c} 32%, transparent)` : "none",
                  transition: "color 140ms ease, background 140ms ease, box-shadow 140ms ease, transform 160ms cubic-bezier(0.2,0.7,0.2,1)",
                }}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* Flow window: how far back the flow aggregates look. */}
      {caps.win && (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        <span className="data" style={{ fontSize: 9.5, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--ink-40)" }}>Window</span>
        <div
          role="tablist"
          style={{
            display: "inline-flex", alignItems: "center", gap: 3, height: H,
            padding: 3, background: "var(--paper-2)", border: "1px solid var(--card-line)",
          }}
        >
          {WINDOWS.map((wd) => {
            const on = win === wd.v;
            return (
              <button
                key={wd.v || "30d"}
                role="tab"
                aria-selected={on}
                onClick={() => set("w", wd.v)}
                className="data filter-seg"
                style={{
                  height: "100%", display: "inline-flex", alignItems: "center",
                  fontSize: 11, letterSpacing: 0.7, fontWeight: on ? 700 : 600, textTransform: "uppercase",
                  padding: "0 14px", cursor: "pointer", border: "none",
                  color: on ? "var(--hub)" : "var(--ink-60)",
                  background: on ? "var(--paper)" : "transparent",
                  boxShadow: on ? "var(--elev-1), inset 0 0 0 1px color-mix(in srgb, var(--hub) 32%, transparent)" : "none",
                  transition: "color 140ms ease, background 140ms ease, box-shadow 140ms ease, transform 160ms cubic-bezier(0.2,0.7,0.2,1)",
                }}
              >
                {wd.label}
              </button>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}

export function ExchangeFilterBar() {
  return (
    <Suspense fallback={<div style={{ height: 44, marginBottom: 16 }} />}>
      <Bar />
    </Suspense>
  );
}
