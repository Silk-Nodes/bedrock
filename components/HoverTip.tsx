"use client";

import { useState } from "react";

// Lightweight hover tooltip. Renders the bubble with position:fixed anchored to
// the hovered element's viewport rect, so it escapes table/overflow clipping.
// Wrap any inline content; the children stay interactive (click still works).
export function HoverTip({ tip, sub, children }: { tip: string; sub?: string; children: React.ReactNode }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const show = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPos({ x: r.left + r.width / 2, y: r.top });
  };

  return (
    <span onMouseEnter={show} onMouseLeave={() => setPos(null)} style={{ position: "relative" }}>
      {children}
      {pos && (
        <span
          role="tooltip"
          style={{
            position: "fixed",
            left: pos.x,
            top: pos.y - 9,
            transform: "translate(-50%, -100%)",
            zIndex: 9999,
            maxWidth: 300,
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
