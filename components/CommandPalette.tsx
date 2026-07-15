"use client";

// Command palette (⌘K / Ctrl+K). Fuzzy-jump to any page. Terminal-styled.
// Open via the keyboard shortcut or by dispatching window event "bedrock:cmdk".

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAddressPanel } from "@/components/address/AddressPanelProvider";
import { useValidatorPanel } from "@/components/validator/ValidatorPanelProvider";
import { useFocusTrap } from "@/components/useFocusTrap";

type Dest = { label: string; href: string; group: string; keywords?: string };
// A palette row: either navigates (href) or runs an action (open a panel).
type Result = { label: string; href: string; group?: string; keywords?: string; action?: () => void };

const DESTS: Dest[] = [
  { label: "Story", href: "/", group: "Pages", keywords: "home landing atom" },
  { label: "Watchlist", href: "/watchlist", group: "Pages", keywords: "watchlist starred saved follow track favourites bookmarks alerts" },
  { label: "Today", href: "/today", group: "Pages", keywords: "console overview live" },
  { label: "Today · Feed", href: "/today/feed", group: "Pages", keywords: "activity live stream events burns flows" },
  { label: "Signals · Board", href: "/signals", group: "Signals", keywords: "traders trader board overview pressure" },
  { label: "Signals · Whales", href: "/signals/whales", group: "Signals", keywords: "large moves whales notable deposits" },
  { label: "Exchanges · Net flow", href: "/exchanges", group: "Exchanges", keywords: "exchange net flow deposits withdrawals signal pressure" },
  { label: "Stakers · Undelegation queue", href: "/stakers/unbonding", group: "Stakers", keywords: "undelegations unbonding queue supply unlock schedule signal" },
  { label: "ATOM · Staking carry", href: "/atom/supply", group: "ATOM", keywords: "real yield staking apr inflation carry issuance burn signal" },
  { label: "Methodology", href: "/methodology", group: "Pages", keywords: "provenance labels sources" },

  { label: "ATOM · Overview", href: "/atom", group: "ATOM" },
  { label: "ATOM · Supply & burn", href: "/atom/supply", group: "ATOM", keywords: "emission" },
  { label: "ATOM · Distribution", href: "/atom/distribution", group: "ATOM", keywords: "holders genesis gini" },
  { label: "ATOM · Governance", href: "/atom/governance", group: "ATOM", keywords: "proposals votes" },
  { label: "ATOM · Market & liquidity", href: "/atom/market", group: "ATOM", keywords: "price venues" },

  { label: "Stakers · Population", href: "/stakers/population", group: "Stakers", keywords: "count growth retention" },
  { label: "Stakers · Cohorts", href: "/stakers/cohorts", group: "Stakers" },
  { label: "Stakers · Delegation flow", href: "/stakers/delegation", group: "Stakers", keywords: "redelegate undelegate" },
  { label: "Stakers · Unbonding queue", href: "/stakers/unbonding", group: "Stakers", keywords: "21 day exit" },
  { label: "Stakers · Rewards", href: "/stakers/rewards", group: "Stakers", keywords: "compound sell claim" },
  { label: "Stakers · Loyalty", href: "/stakers/loyalty", group: "Stakers", keywords: "bond age diamond hands" },

  { label: "Exchanges · Today", href: "/exchanges", group: "Exchanges", keywords: "flows cex" },
  { label: "Exchanges · Sell pressure", href: "/exchanges/sell-pressure", group: "Exchanges", keywords: "sell pressure concentration whales bursts inflation deposits cohort size band" },
  { label: "Exchanges · Where it goes", href: "/exchanges/destinations", group: "Exchanges" },
  { label: "Exchanges · Per exchange", href: "/exchanges/per-exchange", group: "Exchanges" },
  { label: "Exchanges · Top movers", href: "/exchanges/top-movers", group: "Exchanges" },
  { label: "Exchanges · Recent flows", href: "/exchanges/recent", group: "Exchanges", keywords: "live feed" },
  { label: "Exchanges · Balance trend", href: "/exchanges/balance-trend", group: "Exchanges" },

  { label: "Validators · Overview", href: "/validators", group: "Validators", keywords: "set concentration nakamoto" },
  { label: "Validators · Set", href: "/validators/set", group: "Validators", keywords: "table list" },
  { label: "Validators · Concentration", href: "/validators/concentration", group: "Validators", keywords: "nakamoto top10 decentralization" },
  { label: "Validators · Commission", href: "/validators/commission", group: "Validators", keywords: "fees rate" },
];

// subsequence fuzzy match; returns score (lower = better) or null
function fuzzy(q: string, text: string): number | null {
  if (!q) return 0;
  let qi = 0, score = 0, prev = -1;
  const t = text.toLowerCase();
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      score += prev >= 0 ? i - prev : 0;
      prev = i; qi++;
    }
  }
  return qi === q.length ? score + (t.startsWith(q) ? -50 : 0) : null;
}

export function CommandPalette() {
  const router = useRouter();
  const { open: openAddr } = useAddressPanel();
  const { open: openVal } = useValidatorPanel();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Trap focus in the palette while open; the input is the first focusable
  // element inside, so the trap's initial focus lands on it.
  useFocusTrap(dialogRef, open);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("bedrock:cmdk", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("bedrock:cmdk", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) { setQ(""); setSel(0); setTimeout(() => inputRef.current?.focus(), 20); }
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const query = q.trim().toLowerCase();
    const out: Result[] = [];
    // A full validator operator opens its card; a full wallet opens its account
    // card. Both use the side panels directly (no page navigation).
    if (/^cosmosvaloper1[0-9a-z]{38,}$/.test(query)) {
      out.push({ label: `Open validator card`, href: "", group: "Validator", action: () => openVal(query) });
    } else if (/^cosmos1[0-9a-z]{38,}$/.test(query)) {
      out.push({ label: `Open account ${query.slice(0, 12)}…${query.slice(-4)}`, href: "", group: "Account", action: () => openAddr(query) });
    }
    const scored = DESTS
      .map((d) => ({ d, s: fuzzy(query, `${d.label} ${d.keywords ?? ""}`) }))
      .filter((x) => x.s !== null)
      .sort((a, b) => (a.s as number) - (b.s as number));
    out.push(...scored.map((x) => x.d));
    return out.slice(0, 9);
  }, [q, openAddr, openVal]);

  useEffect(() => { setSel(0); }, [q]);

  const choose = (r: Result) => { setOpen(false); if (r.action) r.action(); else router.push(r.href); };

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Jump to anything"
      onClick={() => setOpen(false)}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "color-mix(in srgb, var(--paper) 55%, transparent)",
        backdropFilter: "blur(3px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "12vh",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
          else if (e.key === "Enter" && results[sel]) { e.preventDefault(); choose(results[sel]); }
        }}
        style={{
          width: "min(560px, 92vw)",
          background: "var(--paper-2)",
          border: "1px solid var(--ink)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid var(--ink-20)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--ink-60)" }}>
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Jump to a page, metric, section…"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="cmdk-listbox"
            aria-autocomplete="list"
            aria-activedescendant={results.length > 0 ? `cmdk-opt-${sel}` : undefined}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--ink)", letterSpacing: 0.3,
            }}
          />
          <kbd className="data" style={{ fontSize: 10, color: "var(--ink-40)", border: "1px solid var(--ink-20)", padding: "1px 5px" }}>ESC</kbd>
        </div>

        <div id="cmdk-listbox" role="listbox" aria-label="Results" style={{ maxHeight: "52vh", overflowY: "auto", padding: 6 }}>
          {results.length === 0 && (
            <div className="data" style={{ padding: "18px 12px", color: "var(--ink-60)", fontSize: 13 }}>No match for “{q}”.</div>
          )}
          {results.map((d, i) => (
            <button
              key={d.href || d.label}
              type="button"
              role="option"
              id={`cmdk-opt-${i}`}
              aria-selected={i === sel}
              onMouseEnter={() => setSel(i)}
              onClick={() => choose(d)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                padding: "9px 12px",
                background: i === sel ? "var(--ink)" : "transparent",
                color: i === sel ? "var(--paper)" : "var(--ink)",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500 }}>{d.label}</span>
              <span className="data" style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: i === sel ? "var(--paper)" : "var(--ink-40)" }}>{d.group}</span>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 14, padding: "8px 14px", borderTop: "1px solid var(--ink-20)" }}>
          <span className="data" style={{ fontSize: 10, color: "var(--ink-40)" }}>↑↓ navigate</span>
          <span className="data" style={{ fontSize: 10, color: "var(--ink-40)" }}>↵ open</span>
          <span className="data" style={{ fontSize: 10, color: "var(--ink-40)", marginLeft: "auto" }}>⌘K toggle</span>
        </div>
      </div>
    </div>
  );
}
