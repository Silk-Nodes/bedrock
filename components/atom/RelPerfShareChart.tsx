// Static relative-performance chart for the shareable PNG card. Server-rendered
// pure SVG (no hooks) so html-to-image can capture it. Rebases each series to 0%
// at the window start and draws them with a color legend, ATOM emphasized.

import type { PerfSeries } from "@/lib/relperf";

const W = 1088;
const H = 340;
const PAD = { top: 20, right: 20, bottom: 30, left: 56 };

export function RelPerfShareChart({ series, days = 365 }: { series: PerfSeries[]; days?: number }) {
  const rebased = series.map((s) => {
    const pts = s.points.slice(-days);
    const base = pts[0]?.value || 1;
    return {
      symbol: s.symbol,
      color: s.color,
      emphasis: s.symbol === "ATOM",
      pts: pts.map((p) => ((p.value / base) - 1) * 100),
    };
  });
  const all = rebased.flatMap((s) => s.pts);
  const mn = Math.min(0, ...all), mx = Math.max(0, ...all);
  const pad = (mx - mn) * 0.08 || 1;
  const yMin = mn - pad, yMax = mx + pad, yRange = yMax - yMin || 1;
  const n = Math.max(...rebased.map((s) => s.pts.length), 1);
  const plotW = W - PAD.left - PAD.right, plotH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / Math.max(1, n - 1)) * plotW;
  const y = (v: number) => PAD.top + plotH - ((v - yMin) / yRange) * plotH;
  const zeroY = y(0);

  const ticks = [yMax, (yMax + yMin) / 2, yMin];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* legend: color = token */}
      <div style={{ display: "flex", gap: 22, flexWrap: "wrap", fontFamily: "var(--font-mono)", fontSize: 16 }}>
        {rebased.map((s) => {
          const end = s.pts[s.pts.length - 1] ?? 0;
          return (
            <span key={s.symbol} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: s.emphasis ? 22 : 16, height: s.emphasis ? 5 : 3, background: s.color, borderRadius: 2 }} />
              <span style={{ color: "var(--ink)", fontWeight: 700 }}>{s.symbol}</span>
              <span style={{ color: end >= 0 ? "var(--moss)" : "var(--iron)" }}>{end >= 0 ? "+" : ""}{end.toFixed(1)}%</span>
            </span>
          );
        })}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--card-line)" strokeWidth={1} />
            <text x={PAD.left - 10} y={y(v) + 5} textAnchor="end" fontFamily="var(--font-mono)" fontSize="13" fill="var(--ink-40)">
              {v >= 0 ? "+" : ""}{Math.round(v)}%
            </text>
          </g>
        ))}
        <line x1={PAD.left} x2={W - PAD.right} y1={zeroY} y2={zeroY} stroke="var(--ink-40)" strokeWidth={1.25} />
        {/* non-emphasized first, ATOM on top */}
        {[...rebased].sort((a, b) => (a.emphasis ? 1 : 0) - (b.emphasis ? 1 : 0)).map((s) => (
          <polyline
            key={s.symbol}
            points={s.pts.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
            fill="none"
            stroke={s.color}
            strokeWidth={s.emphasis ? 3.4 : 1.8}
            opacity={s.emphasis ? 1 : 0.9}
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </div>
  );
}
