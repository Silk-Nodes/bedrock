"use client";

// Site-wide strip pointing to /incidents/keplr while the Keplr social login
// incident is live. One line under the nav, dismissible per browser, and off by
// itself after END. The status words come from the same cached read the page
// uses (/api/incidents/keplr), so the strip can never contradict the page.
//
// It renders nothing on the server and on the first client pass, so it cannot
// cause a hydration mismatch or slow any page: the fetch happens after load.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useMountEffect } from "@/components/useMountEffect";

const END = Date.UTC(2026, 11, 10, 0, 0); // shown through Dec 9 2026, UTC
const KEY = "bedrock:strip:keplr-recovery";
const HREF = "/incidents/keplr";

type Totals = { tracked: number; outflowChains: string[]; unreadChains?: string[] };
type State = { status: "clear" | "moved" | "partial" | "unknown" };

function read(t: Totals | null): State {
  if (!t) return { status: "unknown" };
  if (t.outflowChains.length) return { status: "moved" };
  if ((t.unreadChains ?? []).length) return { status: "partial" };
  return { status: "clear" };
}

export function IncidentStrip() {
  const pathname = usePathname();
  const [state, setState] = useState<State | null>(null);

  useMountEffect(() => {
    if (Date.now() >= END) return;
    try {
      if (localStorage.getItem(KEY) === "dismissed") return;
    } catch {
      // storage blocked: show the strip, it just will not stay closed
    }
    let alive = true;
    fetch("/api/incidents/keplr")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { totals?: Totals } | null) => alive && setState(read(j?.totals ?? null)))
      .catch(() => alive && setState(read(null)));
    return () => {
      alive = false;
    };
  });

  if (!state || pathname === HREF) return null;

  const dismiss = () => {
    setState(null);
    try {
      localStorage.setItem(KEY, "dismissed");
    } catch {
      // nothing to persist into
    }
  };

  // A move out of a recovery wallet is not automatically bad news: returns to
  // their owners will look exactly like this. So "moved" is neutral, not red.
  const tone = state.status === "moved" ? "var(--sand)" : "var(--moss)";
  const status =
    state.status === "clear" ? " Nothing has left so far."
    : state.status === "partial" ? " Nothing has left the wallets read so far."
    : state.status === "moved" ? " Funds have moved out of a recovery wallet."
    : "";

  return (
    <div className="page" style={{ paddingTop: 12, width: "100%", boxSizing: "border-box" }}>
      <div
        role="status"
        style={{
          display: "flex", alignItems: "center", gap: 12,
          border: `1px solid color-mix(in srgb, ${tone} 40%, transparent)`,
          background: `color-mix(in srgb, ${tone} 8%, var(--paper))`,
          color: "var(--ink)", borderRadius: 4, padding: "8px 8px 8px 14px", fontSize: 13, lineHeight: 1.45,
        }}
      >
        <Link href={HREF} style={{ color: "inherit", textDecoration: "none", flex: 1, minWidth: 0 }}>
          <strong style={{ fontWeight: 700 }}>Keplr social login incident.</strong>{" "}
          <span style={{ color: "var(--ink-80)" }}>We&apos;re watching Web3Auth&apos;s recovery wallets live.{status}</span>{" "}
          <span style={{ color: "var(--ink)", whiteSpace: "nowrap", borderBottom: "1px solid var(--ink-40)" }}>See the wallets</span>
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          style={{ flex: "none", width: 28, height: 28, display: "grid", placeItems: "center", background: "none", border: "none",
            color: "var(--ink-60)", cursor: "pointer", fontSize: 18, lineHeight: 1, borderRadius: 4 }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
