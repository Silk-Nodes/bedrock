"use client";

// Relative performance chart (hl.eco style): every series rebased to 0% at the
// start of the selected window, so the lines show pure relative performance.
// Raw daily closes come from the server; rebasing happens here per window.

import { useMemo, useState } from "react";
import { LineChart, type Series } from "@/components/charts/LineChart";
import type { PerfSeries } from "@/lib/relperf";

const RANGES = [
  { id: "7D", days: 7 },
  { id: "30D", days: 30 },
  { id: "90D", days: 90 },
  { id: "1Y", days: 365 },
];

export function RelPerfChart({ series }: { series: PerfSeries[] }) {
  const [range, setRange] = useState("90D");
  const days = RANGES.find((r) => r.id === range)!.days;

  const rebased: Series[] = useMemo(() => series.map((s) => {
    const pts = s.points.slice(-days);
    const base = pts[0]?.value || 1;
    return {
      label: s.symbol,
      color: s.color,
      emphasis: s.symbol === "ATOM",
      points: pts.map((p) => ({ date: p.date, value: +(((p.value / base) - 1) * 100).toFixed(2) })),
    };
  }), [series, days]);

  // End-of-window verdict per coin, for the legend chips.
  const endVals = rebased.map((s) => ({ label: s.label, color: s.color, v: s.points[s.points.length - 1]?.value ?? 0 }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {endVals.map((e) => (
            <span key={e.label} className="data" style={{ fontSize: 12 }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: e.color, marginRight: 6 }} />
              <span style={{ color: "var(--ink-80)", fontWeight: 700 }}>{e.label}</span>{" "}
              <span style={{ color: e.v >= 0 ? "var(--moss)" : "var(--iron)" }}>{e.v >= 0 ? "+" : ""}{e.v.toFixed(1)}%</span>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {RANGES.map((r) => (
            <button key={r.id} onClick={() => setRange(r.id)} className="data" style={{
              padding: "3px 10px", fontSize: 10.5, letterSpacing: 1, cursor: "pointer",
              background: range === r.id ? "color-mix(in srgb, var(--hub) 18%, transparent)" : "transparent",
              color: range === r.id ? "var(--hub)" : "var(--ink-40)",
              border: "1px solid " + (range === r.id ? "color-mix(in srgb, var(--hub) 45%, transparent)" : "var(--card-line)"),
              borderRadius: 4,
            }}>{r.id}</button>
          ))}
        </div>
      </div>
      <LineChart series={rebased} yLabel="% VS START" height={330} legend={false} />
    </div>
  );
}
