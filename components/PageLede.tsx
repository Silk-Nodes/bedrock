// PageLede · the uniform opener for deep-read sub-pages.
// Replaces the old 96px editorial hero with a compact, console-aligned lede
// so every sub-page opens the same way: eyebrow, medium number, optional
// delta, one-line context. Charts/tables follow below via SectionHead.

import type { ReactNode } from "react";
import { DeltaPill } from "@/components/DeltaPill";

export function PageLede({
  eyebrow,
  value,
  unit,
  deltaValue,
  deltaPeriod,
  context,
  valueColor = "var(--ink)",
}: {
  eyebrow: string;
  value: string;
  unit?: string;
  deltaValue?: number;
  deltaPeriod?: string;
  context?: ReactNode;
  valueColor?: string;
}) {
  return (
    <section style={{ paddingTop: 4, paddingBottom: 16, maxWidth: 1000 }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>{eyebrow}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: "clamp(32px, 8vw, 48px)",
            lineHeight: 1,
            letterSpacing: "-0.03em",
            color: valueColor,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            className="data"
            style={{ fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--ink-60)" }}
          >
            {unit}
          </span>
        )}
        {deltaValue !== undefined && <DeltaPill value={deltaValue} period={deltaPeriod ?? ""} />}
      </div>
      {context && (
        <div style={{ maxWidth: 760, color: "var(--ink-80)", fontSize: 14, lineHeight: 1.5, marginTop: 10 }}>
          {context}
        </div>
      )}
    </section>
  );
}
