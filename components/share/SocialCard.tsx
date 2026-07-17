// SocialCard · fixed-size renderable card for PNG export.
// 1200×675 (matches Twitter/OG image dimensions).
//
// Used by ShareModal: rendered off-screen with the data the user wants to share,
// then html-to-image converts the DOM to PNG.

import { Mark } from "../Mark";

const W = 1200;
const H = 675;

export type SocialCardProps = {
  title: string;             // e.g. "ATOM bonded supply"
  subtitle?: string;         // e.g. "68.4% of circulating · Cosmos HUB"
  big?: string;              // e.g. "212,481,392"
  unit?: string;             // e.g. "ATOM"
  delta?: string;            // e.g. "+2.1M · 30d"
  deltaPositive?: boolean;
  context?: string;          // small editorial line below the big number
  body?: React.ReactNode;    // optional chart or table body
  blockHeight?: number;      // shown in the watermark strip
};

export function SocialCard({
  title,
  subtitle,
  big,
  unit,
  delta,
  deltaPositive,
  context,
  body,
  blockHeight,
}: SocialCardProps) {
  return (
    <div
      style={{
        width: W,
        height: H,
        background: "var(--paper)",
        color: "var(--ink)",
        fontFamily: "var(--font-sans)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        padding: 56,
        boxSizing: "border-box",
        border: "1px solid var(--ink)",
      }}
    >
      {/* Top brand strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 24,
          borderBottom: "1px solid var(--ink)",
          marginBottom: 32,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Mark variant="hv1" size={48} radius={4} />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: 28,
              letterSpacing: "-0.04em",
              color: "var(--ink)",
            }}
          >
            BEDROCK
          </span>
        </div>
        {/* Top-right: the site URL (must always live here, never bottom-left). */}
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 15,
            letterSpacing: 0.5,
            color: "var(--ink-80)",
          }}
        >
          bedrock.silknodes.io
        </span>
      </div>

      {/* Title block */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            letterSpacing: 1.5,
            color: "var(--hub)",
            textTransform: "uppercase",
            marginBottom: 12,
            fontWeight: 600,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 18,
              color: "var(--ink-80)",
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      {/* Big number + delta. When the card also carries a body (a chart or
          table), the hero shrinks: at 124px it ate 114px of a 675px canvas and
          left the chart ~186px, which is why chart bodies used to overrun the
          watermark. A slightly smaller hero + a readable chart beats a huge
          number over a broken one. */}
      {big && (
        <div style={{ marginBottom: body ? 16 : 24 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 24, flexWrap: "wrap" }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 900,
                fontSize: body ? 92 : 124,
                lineHeight: 0.92,
                letterSpacing: body ? "-3px" : "-4px",
                color: "var(--ink)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {big}
            </span>
            {unit && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 18,
                  color: "var(--ink-60)",
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                }}
              >
                {unit}
              </span>
            )}
          </div>
          {delta && (
            <div style={{ marginTop: 16 }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "6px 12px",
                  border: `1px solid ${deltaPositive === false ? "var(--iron)" : "var(--moss)"}`,
                  color: deltaPositive === false ? "var(--iron)" : "var(--moss)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: 0.4,
                }}
              >
                {delta}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Context line. Rendered independently of `big` (it was previously nested
          inside the big block, so cards without a headline number came out
          empty). Larger when it carries the card alone. */}
      {context && (
        <div
          style={{
            marginTop: big ? 4 : 8,
            marginBottom: body ? 8 : 12,
            fontFamily: "var(--font-sans)",
            fontSize: big ? (body ? 16 : 18) : 26,
            color: "var(--ink-80)",
            lineHeight: 1.45,
            maxWidth: 1000,
          }}
        >
          {context}
        </div>
      )}

      {/* Optional body.
          overflow:hidden is a hard clamp, not decoration: the body slot is
          whatever the text above leaves (as little as ~190px), and a body that
          asserts a taller fixed height used to paint straight through the
          watermark strip and off the canvas. Bodies size themselves to THIS box
          (see ShareLineChart), and if one ever misbehaves it gets cropped here
          rather than shipped on top of the colophon. */}
      {body && (
        <div style={{ flex: 1, marginTop: 8, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {body}
        </div>
      )}

      {/* Watermark strip */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 56,
          right: 56,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 16,
          borderTop: "1px solid var(--ink-20)",
        }}
      >
        {/* Bottom-left: the observatory tagline (the URL is NEVER here, it lives
            top-right). Bottom-right: the block/preview colophon. */}
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--ink-60)",
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          Cosmos HUB · economic observatory
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--ink-60)",
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          {/* Never "PREVIEW DATA": these cards carry real live figures, and calling
              them a preview was a lie that shipped on every share. Stamp the block
              when a caller passes one, otherwise the export date. SocialCard only
              renders client-side inside ShareModal, so new Date() is safe here. */}
          {blockHeight
            ? `BLOCK ${blockHeight.toLocaleString("en-US")}`
            : `EXPORTED ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}`}
        </span>
      </div>
    </div>
  );
}
