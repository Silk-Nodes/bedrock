// Hero · unified page hero block.
// Replaces the inline duplicated hero pattern across all entity pages.
// Eyebrow + 96px display number + subtitle + optional meta strip + optional delta pill.

import type { ReactNode } from "react";

export function Hero({
  eyebrow,
  big,
  bigColor,
  subtitle,
  meta,
  delta,
  maxWidth = 1100,
}: {
  eyebrow: string;
  big: string;
  bigColor?: string;
  subtitle?: ReactNode;
  meta?: ReactNode;       // small "CIRCULATING · ... · APR ... · INFL ..." strip below
  delta?: ReactNode;      // inline pill beside subtitle (e.g. <DeltaPill ... />)
  maxWidth?: number;
}) {
  return (
    <section
      style={{
        paddingTop: 32,
        paddingBottom: 16,
        maxWidth,
      }}
    >
      <div className="eyebrow" style={{ marginBottom: 12 }}>
        {eyebrow}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: "clamp(46px, 11vw, 96px)",
            lineHeight: 0.95,
            letterSpacing: "-0.03em",
            margin: "0 0 8px",
            color: bigColor ?? "var(--ink)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {big}
        </h1>
        {delta && <div>{delta}</div>}
      </div>
      {subtitle && (
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            lineHeight: 1.45,
            color: "var(--ink-80)",
            maxWidth: 760,
            marginTop: 4,
            marginBottom: meta ? 14 : 0,
          }}
        >
          {subtitle}
        </div>
      )}
      {meta && (
        <div
          className="data"
          style={{
            color: "var(--ink-60)",
            display: "flex",
            gap: 20,
            flexWrap: "wrap",
            fontSize: 11,
          }}
        >
          {meta}
        </div>
      )}
    </section>
  );
}
