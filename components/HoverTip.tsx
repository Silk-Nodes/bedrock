"use client";

import { useState } from "react";

// Lightweight hover tooltip. Renders the bubble with position:fixed anchored to
// the hovered element's viewport rect, so it escapes table/overflow clipping.
// Wrap any inline content; the children stay interactive (click still works).
//
// Edge-aware: flips BELOW the anchor when there isn't room above (e.g. a title
// tucked under the sticky nav) and clamps horizontally so it never spills off
// the viewport. Without this, a tooltip on a near-top-left element renders up
// into the nav and off-screen, unreadable.
const MAX_W = 300;
const HALF = MAX_W / 2;

export function HoverTip({ tip, sub, children }: { tip: string; sub?: string; children: React.ReactNode }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  const show = (e: React.MouseEvent) => setRect((e.currentTarget as HTMLElement).getBoundingClientRect());

  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  // Open BELOW the anchor whenever rendering ABOVE would collide with the sticky
  // nav. The bubble can be ~180px tall, the nav bottom is ~122px, so anything
  // whose top is within ~310px of the viewport top flips below. Below-mode is
  // LEFT-ALIGNED to the anchor (not centred), then clamped, so a title near the
  // left edge never spills off-screen — the previous centred+above behaviour put
  // it up into the nav and off the left edge.
  const below = rect ? rect.top < 310 : false;
  const leftAligned = rect ? Math.max(8, Math.min(rect.left, vw - MAX_W - 8)) : 0;
  const centred = rect ? Math.max(HALF + 8, Math.min(rect.left + rect.width / 2, vw - HALF - 8)) : 0;

  return (
    <span onMouseEnter={show} onMouseLeave={() => setRect(null)} style={{ position: "relative" }}>
      {children}
      {rect && (
        <span
          role="tooltip"
          style={{
            position: "fixed",
            left: below ? leftAligned : centred,
            top: below ? rect.bottom + 9 : rect.top - 9,
            transform: below ? "none" : "translate(-50%, -100%)",
            zIndex: 9999,
            maxWidth: MAX_W,
            width: "max-content",
            padding: "9px 12px",
            borderRadius: 9,
            background: "var(--paper-3)",
            border: "1px solid var(--ink-20)",
            boxShadow: "var(--elev-2)",
            pointerEvents: "none",
            whiteSpace: "normal",
            textAlign: "left",
            letterSpacing: 0,
            textTransform: "none",
          }}
        >
          <span style={{ display: "block", fontFamily: "var(--font-hanken)", fontSize: 12, lineHeight: 1.45, fontWeight: 400, color: "var(--ink-80)" }}>{tip}</span>
          {sub ? <span style={{ display: "block", marginTop: 5, fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--ink-40)", wordBreak: "break-all" }}>{sub}</span> : null}
        </span>
      )}
    </span>
  );
}
