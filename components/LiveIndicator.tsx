"use client";

import { useEffect, useState } from "react";

// Cosmos HUB: ~6s block time. We tick a fake-real block height
// starting from a recent measured value, advancing by 1 every ~6.2s.
// This sells the "continuously updating" feel on the static mock.

const ANCHOR_HEIGHT = 31_317_000;
const ANCHOR_AT = Date.parse("2026-05-28T07:08:00Z");
const BLOCK_TIME_MS = 6_200;

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function relative(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  return `${m}m`;
}

export function LiveIndicator() {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = Math.max(0, now - ANCHOR_AT);
  const height = ANCHOR_HEIGHT + Math.floor(elapsed / BLOCK_TIME_MS);
  const indexedAgo = Math.floor((elapsed % BLOCK_TIME_MS) / 1000);

  return (
    <div
      className="data"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        color: "var(--ink-80)",
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "var(--moss)",
          display: "inline-block",
          boxShadow: "0 0 0 2px rgba(47,74,50,0.12)",
        }}
      />
      <span style={{ color: "var(--moss)", fontWeight: 600, letterSpacing: 0.4 }}>
        LIVE
      </span>
      <span style={{ color: "var(--ink-60)" }}>·</span>
      <span style={{ color: "var(--ink)" }}>
        BLOCK {fmt(height)}
      </span>
      <span style={{ color: "var(--ink-60)" }}>·</span>
      <span style={{ color: "var(--ink-60)" }}>
        {relative(indexedAgo)} AGO
      </span>
    </div>
  );
}
