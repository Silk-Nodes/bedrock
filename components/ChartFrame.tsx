"use client";

// ChartFrame · small wrapper that adds an "as-of" timestamp corner to any chart.
// Reuses the LiveIndicator anchor math so the timestamp drifts with the live block.
//
// Usage:
//   <ChartFrame label="DAILY · NET ATOM" peak="peak · 12.4M · 2024-03-14">
//     <CohortFlowChart />
//   </ChartFrame>

import { useEffect, useState, type ReactNode } from "react";

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

export function ChartFrame({
  label,
  peak,
  children,
}: {
  label?: string;
  peak?: string;
  children: ReactNode;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = Math.max(0, now - ANCHOR_AT);
  const height = ANCHOR_HEIGHT + Math.floor(elapsed / BLOCK_TIME_MS);
  const ago = Math.floor((elapsed % BLOCK_TIME_MS) / 1000);

  return (
    <div style={{ position: "relative" }}>
      {(label || peak) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: 1.5,
            color: "var(--ink-60)",
            textTransform: "uppercase",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <span>{label}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            {peak && <span style={{ color: "var(--ink-80)" }}>{peak}</span>}
            <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--moss)" }} />
            <span>BLOCK {fmt(height)}</span>
            <span style={{ color: "var(--ink-40)" }}>·</span>
            <span>{relative(ago)} AGO</span>
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
