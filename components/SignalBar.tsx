// SignalBar · terminal-density inline signal strip.
// Sits below a section head, above a chart.
// Single-line collection of ↑/↓/· signals with short editorial markers.
//
// Replaces the paragraph-style InsightLede in chart contexts.
// (Keep InsightLede where prose actually carries weight, e.g. table reads.)

import type { ReactNode } from "react";

type Signal = {
  kind: "up" | "down" | "neutral";
  text: ReactNode;
};

export function SignalBar({
  signals,
  label,
}: {
  signals: Signal[];
  label?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 0,
        padding: "8px 12px",
        marginBottom: 10,
        background: "var(--paper-2)",
        borderLeft: "3px solid var(--hub)",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        lineHeight: 1.35,
        letterSpacing: -0.05,
      }}
    >
      {label && (
        <span
          className="eyebrow"
          style={{
            color: "var(--hub)",
            fontWeight: 600,
            marginRight: 14,
            flexShrink: 0,
          }}
        >
          {label}
        </span>
      )}
      {signals.map((s, i) => (
        <span
          key={i}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginRight: i === signals.length - 1 ? 0 : 18,
            color: "var(--ink)",
            whiteSpace: "nowrap",
          }}
        >
          <span
            aria-hidden
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              fontWeight: 600,
              color:
                s.kind === "up"
                  ? "var(--moss)"
                  : s.kind === "down"
                  ? "var(--iron)"
                  : "var(--ink-40)",
              flexShrink: 0,
            }}
          >
            {s.kind === "up" ? "▲" : s.kind === "down" ? "▼" : "·"}
          </span>
          <span style={{ whiteSpace: "normal" }}>{s.text}</span>
        </span>
      ))}
    </div>
  );
}
