"use client";

// Relative performance chart (hl.eco style): every series rebased to 0% at the
// start of the selected window, so the lines show pure relative performance.
// Raw daily closes come from the server; rebasing happens here per window.

import { useMemo, useState } from "react";
import { LineChart, type Series } from "@/components/charts/LineChart";
import { RelPerfShareChart } from "@/components/atom/RelPerfShareChart";
import { ShareButton } from "@/components/share/ShareButton";
import type { PerfSeries } from "@/lib/relperf";

const RANGES = [
  { id: "7D", days: 7 },
  { id: "30D", days: 30 },
  { id: "90D", days: 90 },
  { id: "1Y", days: 365 },
];

export function RelPerfChart({ series, shareBlock }: { series: PerfSeries[]; shareBlock?: number }) {
  const [range, setRange] = useState("90D");
  const days = RANGES.find((r) => r.id === range)!.days;

  // The share card is built HERE, from the range currently on screen. It used
  // to be passed into IntelCard from the server page with days hardcoded to
  // 365, so selecting 30D still produced a one-year snapshot. Label the window
  // from the points actually plotted, not from `days`: the series can be
  // sparse, so the last N points may span more calendar time than N days.
  const shownPts = series[0]?.points.slice(-days) ?? [];
  const shownWindow = shownPts.length > 1
    ? `${shownPts[0].date} → ${shownPts[shownPts.length - 1].date}`
    : "the live window";

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
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <ShareButton
            filename="bedrock-atom-relative"
            card={{
              title: "ATOM vs the majors · Cosmos HUB",
              subtitle: `Relative performance · ${shownWindow}, rebased to 0% at the start`,
              body: <RelPerfShareChart series={series} days={days} />,
              blockHeight: shareBlock,
            }}
          />
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
