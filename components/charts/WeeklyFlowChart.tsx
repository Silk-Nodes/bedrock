// A compact diverging bar chart for weekly net-flow series that cross zero. Bars
// rise from a bold zero baseline: up for accumulation, down for distribution.
// With one series and colorBySign, each bar is coloured by its own sign (green /
// rust); with several series the bars are grouped per week in the series colours.
// Static SVG, no interactivity, so it renders on the server. All ATOM values.

import { TipCard, type TipRow } from "./TipCard";

type Point = { date: string; value: number };
export type FlowSeries = { label: string; color: string; points: Point[] };

const W = 720;
const PAD = { top: 14, right: 12, bottom: 22, left: 46 };

function fmtCompact(n: number): string {
  const s = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${s}${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${s}${Math.round(a / 1_000)}k`;
  return `${s}${Math.round(a)}`;
}

export function WeeklyFlowChart({
  series,
  height = 200,
  colorBySign = false,
  posColor = "var(--moss)",
  negColor = "var(--iron)",
  highlightMax = false,
  yLabel,
}: {
  series: FlowSeries[];
  height?: number;
  colorBySign?: boolean;
  posColor?: string;
  negColor?: string;
  highlightMax?: boolean; // amber the biggest bar (peak day), colorBySign mode
  yLabel?: string;
}) {
  const H = height;
  const dates = series[0]?.points.map((p) => p.date) ?? [];
  const n = dates.length;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  // Symmetric-ish range: from min(0, min) to max(0, max) so the zero line sits
  // where the data actually crosses it, then pad a touch.
  let mn = 0, mx = 0;
  for (const s of series) for (const p of s.points) { if (p.value < mn) mn = p.value; if (p.value > mx) mx = p.value; }
  const pad = (mx - mn) * 0.12 || 1;
  const yMax = mx + pad, yMin = mn - pad;
  const yRange = yMax - yMin || 1;
  const yOf = (v: number) => PAD.top + plotH - ((v - yMin) / yRange) * plotH;
  const zeroY = yOf(0);

  const band = plotW / Math.max(1, n);
  const ns = series.length;
  const groupW = band * 0.64;
  const barW = colorBySign ? groupW : Math.min(groupW / ns, 16);

  const xTickEvery = n > 8 ? Math.ceil(n / 6) : 1;
  const maxVal = highlightMax ? Math.max(...(series[0]?.points.map((p) => p.value) ?? [0])) : Infinity;

  // Per-week hover strips (HTML overlay): CSS tooltips cannot attach to SVG
  // elements, so a transparent strip over each week band shows a structured
  // TipCard for every series that week (and highlights the hovered band).
  const weekRows = (i: number): TipRow[] => {
    const rows: TipRow[] = series.map((s) => {
      const v = s.points[i]?.value ?? 0;
      return {
        label: s.label,
        value: `${v >= 0 ? "+" : ""}${fmtCompact(v)} ATOM`,
        color: colorBySign ? undefined : s.color,
        valueColor: v >= 0 ? posColor : negColor,
      };
    });
    if (colorBySign) {
      const v = series[0]?.points[i]?.value ?? 0;
      rows.push({ label: "week reads as", value: v >= 0 ? "accumulation" : "distribution", valueColor: v >= 0 ? posColor : negColor, total: true });
    } else if (series.length > 1) {
      const t = series.reduce((s2, s) => s2 + (s.points[i]?.value ?? 0), 0);
      rows.push({ label: "total", value: `${t >= 0 ? "+" : ""}${fmtCompact(t)} ATOM`, valueColor: t >= 0 ? posColor : negColor, total: true });
    }
    return rows;
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", paddingLeft: `${(PAD.left / W) * 100}%`, paddingRight: `${(PAD.right / W) * 100}%` }}>
        {dates.map((d, i) => (
          <div key={d + i} className="tipwrap" style={{ flex: 1 }}>
            <TipCard title={d} rows={weekRows(i)} />
          </div>
        ))}
      </div>
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <linearGradient id="wf-up" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="color-mix(in srgb, var(--moss) 30%, transparent)" />
          <stop offset="100%" stopColor="var(--moss)" />
        </linearGradient>
        <linearGradient id="wf-dn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="color-mix(in srgb, var(--iron) 30%, transparent)" />
          <stop offset="100%" stopColor="var(--iron)" />
        </linearGradient>
      </defs>

      {/* y label + max/min ticks (minimal) */}
      {[yMax, (yMax + yMin) / 2, yMin].map((v, i) => (
        <text key={i} x={PAD.left - 8} y={yOf(v) + 3} textAnchor="end"
          style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, fill: "var(--ink-40)" }}>
          {fmtCompact(v)}
        </text>
      ))}
      {yLabel && (
        <text x={12} y={PAD.top + plotH / 2} textAnchor="middle"
          transform={`rotate(-90 12 ${PAD.top + plotH / 2})`}
          style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, fill: "var(--ink-40)", letterSpacing: 0.5 }}>
          {yLabel}
        </text>
      )}

      {/* bars */}
      {series.map((s, si) =>
        s.points.map((p, i) => {
          const cx = PAD.left + i * band + band / 2;
          const x = colorBySign ? cx - barW / 2 : cx - groupW / 2 + si * (groupW / ns) + (groupW / ns - barW) / 2;
          const y = p.value >= 0 ? yOf(p.value) : zeroY;
          const h = Math.max(1, Math.abs(zeroY - yOf(p.value)));
          const pos = p.value >= 0;
          const isPeak = highlightMax && p.value === maxVal && p.value > 0;
          const fill = isPeak ? "var(--sand)" : colorBySign ? (pos ? "url(#wf-up)" : "url(#wf-dn)") : s.color;
          const glow = isPeak ? "var(--sand)" : colorBySign ? (pos ? posColor : negColor) : s.color;
          return (
            <rect key={`${si}-${i}`} x={x} y={y} width={barW} height={h} rx={2}
              fill={fill}
              style={{ filter: `drop-shadow(0 0 5px color-mix(in srgb, ${glow} 45%, transparent))` }} />
          );
        })
      )}

      {/* zero baseline (bold, on top of bars' base) */}
      <line x1={PAD.left} x2={W - PAD.right} y1={zeroY} y2={zeroY} stroke="var(--ink-60)" strokeWidth={1.25} />

      {/* x labels */}
      {dates.map((d, i) =>
        (i % xTickEvery === 0 || i === n - 1) ? (
          <text key={i} x={PAD.left + i * band + band / 2} y={H - 6} textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, fill: "var(--ink-40)" }}>
            {d}
          </text>
        ) : null
      )}
    </svg>
    </div>
  );
}
