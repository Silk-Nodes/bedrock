// Console panel: monitor surface tile. Designed for dense grid use, not for hero treatment.
//
// Anatomy (top to bottom):
//   - Tiny label row (eyebrow + optional right-side meta like "24H" or "30D")
//   - Big number (medium display, not hero size)
//   - Optional inline delta chip + unit
//   - Optional sparkline strip
//   - Optional one-line context

import type { ReactNode } from "react";
import { Sparkline } from "@/components/charts/Sparkline";
import { CountUp } from "@/components/console/CountUp";
import { ShareButton } from "@/components/share/ShareButton";
import { stampCard } from "@/components/share/stampCard";
import type { SocialCardProps } from "@/components/share/SocialCard";

export async function Panel({
  label,
  meta,
  number,
  unit,
  delta,
  deltaTone = "neutral",
  spark,
  sparkColor = "var(--hub)",
  context,
  tone = "default",
  size = "default",
  share,
  shareFilename,
}: {
  label: string;
  meta?: string;
  number: string;
  unit?: string;
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
  spark?: number[];
  sparkColor?: string;
  context?: ReactNode;
  href?: string;
  tone?: "default" | "accent";
  size?: "default" | "primary";
  share?: SocialCardProps;
  shareFilename?: string;
}) {
  const deltaColor =
    deltaTone === "up"   ? "var(--moss)" :
    deltaTone === "down" ? "var(--iron)" :
                           "var(--ink-60)";

  const accent = tone === "accent";
  const primary = size === "primary";
  const numberSize = primary ? 52 : 30;

  const body = (
    <div
      style={{
        background: accent ? "var(--paper-3)" : "var(--paper)",
        padding: "12px 14px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        height: "100%",
        position: "relative",
      }}
      className={`console-panel surface surface-lift${accent ? " is-accent" : ""}`}
    >
      {/* Label row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span
          className="data"
          style={{
            fontSize: 10,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            color: "var(--ink-60)",
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        {meta && (
          <span
            className="data"
            style={{
              fontSize: 9,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: "var(--ink-40)",
            }}
          >
            {meta}
          </span>
        )}
      </div>

      {/* Number + unit + delta inline */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span
          className={primary ? "stat-num" : "stat-num-sm"}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            // Lower optical size = sturdier strokes (less hairline contrast) so
            // the big numbers hit harder instead of reading delicate.
            fontOpticalSizing: "none",
            fontVariationSettings: '"opsz" 30, "wght" 900',
            fontSize: numberSize,
            lineHeight: 1,
            letterSpacing: primary ? "-2px" : "-1px",
            color: "var(--ink)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <CountUp value={number} />
        </span>
        {unit && (
          <span
            className="data"
            style={{ fontSize: 10, letterSpacing: 1.2, color: "var(--ink-60)", textTransform: "uppercase" }}
          >
            {unit}
          </span>
        )}
        {delta && (
          <span
            className="data"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: deltaColor,
              fontVariantNumeric: "tabular-nums",
              marginLeft: "auto",
            }}
          >
            {delta}
          </span>
        )}
      </div>

      {/* Sparkline */}
      {spark && spark.length > 1 && (
        <div style={{ marginTop: 4 }}>
          <Sparkline values={spark} width={240} height={28} stroke={sparkColor} dot={sparkColor} />
        </div>
      )}

      {/* Context one-liner */}
      {context && (
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            lineHeight: 1.4,
            color: "var(--ink-60)",
            marginTop: 2,
          }}
        >
          {context}
        </div>
      )}
    </div>
  );

  // Data boxes are not navigation: they are never wrapped in a link.
  // (`href` is still accepted in props for call-site compatibility but ignored.)
  const inner = body;

  // When shareable, wrap so the camera sits ABOVE the link (button-in-anchor is invalid).
  if (share) {
    const shareCard = await stampCard(share);
    return (
      <div className="share-host" style={{ position: "relative", height: "100%" }}>
        {inner}
        <span style={{ position: "absolute", top: 8, right: 8, zIndex: 2 }}>
          <ShareButton card={shareCard} filename={shareFilename} />
        </span>
      </div>
    );
  }
  return inner;
}
