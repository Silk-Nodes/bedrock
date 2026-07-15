// Mark.tsx · Bedrock mark (new brand handoff, May 2026).
// A bold "B" seated on layered bedrock strata with a violet accent ridge.
//
// Theme-adaptive: the glyph + strata use currentColor (driven by --ink),
// so the mark reverses automatically between dark and light terminal modes.
// The accent ridge uses --hub (electric violet). Legacy props from the old
// multi-variant mark are accepted but ignored so existing callers keep working.

import type { CSSProperties } from "react";

interface MarkProps {
  size?: number;            // rendered height in px
  title?: string;
  style?: CSSProperties;
  className?: string;
  // legacy / ignored:
  variant?: string;
  brick?: string;
  cutout?: string;
  highlight?: string;
  radius?: number;
}

export function Mark({ size = 36, title = "Bedrock", style, className }: MarkProps) {
  const width = Math.round((size * 200) / 244);
  return (
    <svg
      role="img"
      aria-label={title}
      viewBox="0 0 200 244"
      width={width}
      height={size}
      className={className}
      style={{ color: "var(--ink)", display: "block", flexShrink: 0, ...style }}
    >
      <title>{title}</title>
      <text
        x="100"
        y="174"
        textAnchor="middle"
        fill="currentColor"
        style={{
          fontFamily: "var(--font-display), 'Archivo Black', system-ui, sans-serif",
          fontWeight: 900,
          fontSize: 220,
          letterSpacing: "-9px",
        }}
      >
        B
      </text>
      <g transform="translate(10, 194)">
        <path
          d="M0,46 L0,28 L18,20 L36,30 L52,14 L70,26 L88,10 L106,22 L124,6 L142,18 L158,12 L180,22 L180,46 Z"
          fill="currentColor"
          fillOpacity={0.3}
        />
        <path
          d="M0,46 L0,34 L20,30 L38,38 L56,22 L74,32 L92,20 L110,30 L128,16 L146,26 L164,20 L180,30 L180,46 Z"
          fill="currentColor"
          fillOpacity={0.55}
        />
        <path
          d="M0,46 L0,40 L22,38 L40,44 L58,32 L76,40 L94,30 L112,38 L130,28 L148,34 L166,30 L180,38 L180,46 Z"
          fill="currentColor"
        />
        <polyline
          points="0,40 22,38 40,44 58,32 76,40 94,30 112,38 130,28 148,34 166,30 180,38"
          fill="none"
          stroke="var(--hub)"
          strokeWidth={2}
        />
      </g>
    </svg>
  );
}
