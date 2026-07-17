// Static chart bodies for the shareable PNG cards. Server-rendered, pure
// SVG/divs (no hooks) so html-to-image can capture them, following the
// RelPerfShareChart pattern. Each takes the same data the live chart on the
// page already has in scope, so wiring a card is one `body:` prop.

import type { Series } from "../charts/LineChart";
import { matchGapOverride, type GapOverride } from "../charts/gaps";

export function fmtShare(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  if (abs > 0 && abs < 10) return n.toFixed(2);
  return Math.round(n).toLocaleString("en-US");
}

const W = 1088;

// ── ShareLineChart · multi-series line with legend, absolute values ─────────
export function ShareLineChart({
  series,
  height = 300,
  unit,
  prefix = "",
  suffix = "",
  takeLast,
  gapLabel = "NO DATA",
  gapOverrides,
}: {
  series: Series[];
  height?: number;
  unit?: string;
  prefix?: string;   // e.g. "$"
  suffix?: string;   // e.g. "%"
  takeLast?: number;
  /** Shown inside a gap band when no override matches. */
  gapLabel?: string;
  /** Holes whose cause is known and specific, matched by date. See LineChart. */
  gapOverrides?: GapOverride[];
}) {
  const H = height;
  const PAD = { top: 16, right: 20, bottom: 30, left: 64 };
  const clipped = series
    .filter((s) => s.points.length > 1)
    .map((s) => ({ ...s, points: takeLast ? s.points.slice(-takeLast) : s.points }));
  if (!clipped.length) return null;

  const all = clipped.flatMap((s) => s.points.map((p) => p.value));
  const mn = Math.min(...all), mx = Math.max(...all);
  const pad = (mx - mn) * 0.08 || Math.abs(mx) * 0.08 || 1;
  const yMin = mn - pad, yMax = mx + pad, yRange = yMax - yMin || 1;
  const n = Math.max(...clipped.map((s) => s.points.length));
  const plotW = W - PAD.left - PAD.right, plotH = H - PAD.top - PAD.bottom;

  // Same time scale as the live LineChart, and for the same reason: the card is
  // the artifact that gets posted, so it is the last place that should imply a
  // continuity the data lacks. Index spacing hid a 1,168-day hole at zero width
  // and drew straight through it. Falls back to index spacing when the labels
  // are not parseable dates. See the note in components/charts/LineChart.tsx.
  const ts = clipped[0].points.map((p) => Date.parse(p.date));
  const timeOk = ts.length > 1 && ts.every(Number.isFinite) && ts[ts.length - 1] > ts[0];
  const steps = timeOk ? ts.slice(1).map((t, i) => t - ts[i]).filter((s) => s > 0).sort((a, b) => a - b) : [];
  const median = steps.length ? steps[Math.floor(steps.length / 2)] : 0;
  const gapMs = timeOk && median > 0 ? median * 4 : Infinity;
  const xAtTime = (t: number) => PAD.left + ((t - ts[0]) / (ts[ts.length - 1] - ts[0] || 1)) * plotW;
  const x = (i: number, len: number) =>
    timeOk && i < ts.length ? xAtTime(ts[i]) : PAD.left + (i / Math.max(1, len - 1)) * plotW;
  const y = (v: number) => PAD.top + plotH - ((v - yMin) / yRange) * plotH;

  const gaps = timeOk
    ? ts.slice(1).flatMap((t, i) => {
        if (t - ts[i] <= gapMs) return [];
        return [{
          x0: xAtTime(ts[i]),
          x1: xAtTime(t),
          days: Math.round((t - ts[i]) / 86_400_000),
          label: matchGapOverride(clipped[0].points[i].date, clipped[0].points[i + 1].date, gapOverrides) ?? gapLabel,
        }];
      })
    : [];
  const ticks = [yMax, (yMax + yMin) / 2, yMin];
  const first = clipped[0].points[0]?.date ?? "";
  const last = clipped[0].points[clipped[0].points.length - 1]?.date ?? "";
  const fmtV = (v: number) => `${prefix}${fmtShare(v)}${suffix}`;

  // Fill the slot SocialCard gives us instead of asserting a pixel height.
  // `height` is now the chart's NATURAL height (the viewBox), not a promise the
  // card can honour: the body slot is only ~190-240px once the hero number and
  // context have taken their share, so a fixed 235px SVG used to paint straight
  // through the watermark. The svg holder is flex:1, and preserveAspectRatio
  // scales the chart down to fit whatever is left. Roomy cards render it at full
  // size; tight ones shrink it. Either way it is complete and inside the canvas.
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minHeight: 0 }}>
      <div style={{ flexShrink: 0, display: "flex", gap: 22, flexWrap: "wrap", fontFamily: "var(--font-mono)", fontSize: 15 }}>
        {clipped.map((s) => {
          const end = s.points[s.points.length - 1]?.value ?? 0;
          return (
            <span key={s.label} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: s.emphasis ? 22 : 16, height: s.emphasis ? 5 : 3, background: s.color, borderRadius: 2 }} />
              <span style={{ color: "var(--ink)", fontWeight: 700 }}>{s.label}</span>
              <span style={{ color: "var(--ink-60)" }}>{fmtV(end)}{unit ? ` ${unit}` : ""}</span>
            </span>
          );
        })}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--card-line)" strokeWidth={1} />
            <text x={PAD.left - 10} y={y(v) + 5} textAnchor="end" fontFamily="var(--font-mono)" fontSize="13" fill="var(--ink-40)">
              {fmtV(v)}
            </text>
          </g>
        ))}
        {yMin < 0 && yMax > 0 && (
          <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} stroke="var(--ink-40)" strokeWidth={1.25} />
        )}
        {/* Un-indexed stretches, marked. Empty space alone would read as "flow
            was zero" on a card with no page around it to explain otherwise. */}
        {gaps.map((g, i) => (
          <g key={`gap-${i}`}>
            <rect
              x={g.x0}
              y={PAD.top}
              width={Math.max(0, g.x1 - g.x0)}
              height={plotH}
              fill="var(--paper-3)"
              opacity={0.55}
              stroke="var(--ink-20)"
              strokeWidth={1}
              strokeDasharray="3 4"
            />
            {g.x1 - g.x0 > 150 && (
              <text
                x={(g.x0 + g.x1) / 2}
                y={PAD.top + plotH / 2 + 4}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize="12"
                fill="var(--ink-40)"
                letterSpacing="1.4"
              >
                {g.label} · {g.days.toLocaleString("en-US")} DAYS
              </text>
            )}
          </g>
        ))}
        {[...clipped].sort((a, b) => (a.emphasis ? 1 : 0) - (b.emphasis ? 1 : 0)).map((s) => {
          // One polyline per contiguous run, so the stroke never crosses a hole.
          const runs: number[][] = [];
          let run: number[] = [];
          s.points.forEach((_, i) => {
            if (timeOk && i > 0 && ts[i] - ts[i - 1] > gapMs && run.length) { runs.push(run); run = []; }
            run.push(i);
          });
          if (run.length) runs.push(run);
          return runs.map((idxs, ri) => (
            <polyline
              key={`${s.label}-${ri}`}
              points={idxs.map((i) => `${x(i, s.points.length)},${y(s.points[i].value)}`).join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth={s.emphasis ? 3.4 : 2.2}
              opacity={s.emphasis ? 1 : 0.92}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ));
        })}
        <text x={PAD.left} y={H - 8} fontFamily="var(--font-mono)" fontSize="13" fill="var(--ink-40)">{first}</text>
        <text x={W - PAD.right} y={H - 8} textAnchor="end" fontFamily="var(--font-mono)" fontSize="13" fill="var(--ink-40)">{last}</text>
        {n < 2 && null}
      </svg>
      </div>
    </div>
  );
}

// ── ShareBars · horizontal bars, optional center-out diverging ──────────────
export type ShareBarRow = {
  label: string;
  value: number;
  color?: string;      // fixed color; diverging rows default to moss/iron by sign
  display?: string;    // right-column text; defaults to fmtShare(value) + unit
  note?: string;       // faint suffix after display
};

export function ShareBars({
  rows,
  diverging = false,
  unit = "ATOM",
  positiveColor = "var(--iron)",
  negativeColor = "var(--moss)",
  maxRows = 8,
}: {
  rows: ShareBarRow[];
  diverging?: boolean;
  unit?: string;
  positiveColor?: string;  // diverging: color for value >= 0
  negativeColor?: string;
  maxRows?: number;
}) {
  const shown = rows.slice(0, maxRows);
  const maxAbs = Math.max(...shown.map((r) => Math.abs(r.value)), 1);
  return (
    // gap 8, not 12: the densest card (big number + delta + context + 5 rows,
    // e.g. cohort stance) overflowed the 675px card and the last bar was sliced
    // by the watermark strip. 4 gaps x 4px reclaims the 7px overlap with room.
    <div style={{ display: "flex", flexDirection: "column", gap: 8, position: "relative" }}>
      {shown.map((r) => {
        const signed = r.value >= 0;
        const color = r.color ?? (diverging ? (signed ? positiveColor : negativeColor) : "var(--hub)");
        const display = r.display ?? `${diverging && signed ? "+" : ""}${fmtShare(r.value)}${unit ? ` ${unit}` : ""}`;
        const w = (Math.abs(r.value) / maxAbs) * (diverging ? 50 : 100);
        return (
          <div key={r.label} style={{ display: "grid", gridTemplateColumns: "170px 1fr 210px", alignItems: "center", gap: 16 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--ink)", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.label}</span>
            <div style={{ position: "relative", height: 20, background: "var(--ink-10)", borderRadius: 2, overflow: "hidden" }}>
              {diverging && <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, background: "var(--ink-40)" }} />}
              <div
                style={{
                  position: "absolute", top: 0, bottom: 0,
                  left: diverging ? (signed ? "50%" : `${50 - w}%`) : 0,
                  width: `${Math.max(0.6, w)}%`,
                  background: color,
                }}
              />
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color, textAlign: "right", fontWeight: 600, whiteSpace: "nowrap" }}>
              {display}{r.note && <span style={{ color: "var(--ink-40)", fontWeight: 400 }}> {r.note}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── ShareStack · 100% stacked rows with a shared legend ─────────────────────
export type ShareStackSegment = { label: string; value: number; color: string };

export function ShareStack({
  rows,
  legend = true,
}: {
  rows: { label: string; segments: ShareStackSegment[] }[];
  legend?: boolean;
}) {
  const legendItems = rows[0]?.segments.map((s) => ({ label: s.label, color: s.color })) ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {legend && (
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap", fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--ink-80)" }}>
          {legendItems.map((s) => (
            <span key={s.label} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 12, height: 12, background: s.color, borderRadius: 2 }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      {rows.map((r) => {
        const total = r.segments.reduce((a, s) => a + s.value, 0) || 1;
        return (
          <div key={r.label} style={{ display: "grid", gridTemplateColumns: r.label ? "170px 1fr" : "1fr", alignItems: "center", gap: 16 }}>
            {r.label && <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--ink)", fontWeight: 700 }}>{r.label}</span>}
            <div style={{ display: "flex", height: 26, borderRadius: 2, overflow: "hidden", border: "1px solid var(--card-line)" }}>
              {r.segments.map((s) => {
                const pct = (s.value / total) * 100;
                return pct > 0 ? (
                  <div key={s.label} style={{ width: `${pct}%`, background: s.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {pct >= 9 && (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--paper)" }}>{pct.toFixed(0)}%</span>
                    )}
                  </div>
                ) : null;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── ShareRange · where a live value sits inside a low/high band ─────────────
export function ShareRange({
  low,
  high,
  value,
  fmt = (n: number) => `$${n.toFixed(2)}`,
  lowLabel = "52w low",
  highLabel = "52w high",
}: {
  low: number;
  high: number;
  value: number;
  fmt?: (n: number) => string;
  lowLabel?: string;
  highLabel?: string;
}) {
  const pos = high > low ? Math.max(0, Math.min(100, ((value - low) / (high - low)) * 100)) : 50;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 24 }}>
      <div style={{ position: "relative", height: 18, background: "var(--ink-10)", borderRadius: 3 }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, var(--iron), var(--sand), var(--moss))", opacity: 0.3, borderRadius: 3 }} />
        <div style={{ position: "absolute", top: -7, left: `calc(${pos}% - 2px)`, width: 4, height: 32, background: "var(--ink)", boxShadow: "0 0 10px var(--hub)", borderRadius: 2 }} />
        <div style={{ position: "absolute", top: -44, left: `${pos}%`, transform: `translateX(-${pos}%)`, fontFamily: "var(--font-mono)", fontSize: 17, fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap" }}>
          {fmt(value)} · {pos.toFixed(0)}% of range
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 15 }}>
        <span style={{ color: "var(--iron)" }}>{fmt(low)} {lowLabel}</span>
        <span style={{ color: "var(--moss)" }}>{fmt(high)} {highLabel}</span>
      </div>
    </div>
  );
}

// ── ShareColumns · vertical diverging columns over a zero axis ──────────────
export function ShareColumns({
  points,
  height = 280,
  positiveColor = "var(--moss)",
  negativeColor = "var(--iron)",
  unit = "ATOM",
}: {
  points: { label: string; value: number }[];
  height?: number;
  positiveColor?: string;
  negativeColor?: string;
  unit?: string;
}) {
  const H = height;
  const PAD = { top: 16, right: 20, bottom: 34, left: 64 };
  if (!points.length) return null;
  const mx = Math.max(0, ...points.map((p) => p.value));
  const mn = Math.min(0, ...points.map((p) => p.value));
  const pad = (mx - mn) * 0.08 || 1;
  const yMax = mx + pad, yMin = mn - pad, yRange = yMax - yMin || 1;
  const plotW = W - PAD.left - PAD.right, plotH = H - PAD.top - PAD.bottom;
  const bw = plotW / points.length;
  const y = (v: number) => PAD.top + plotH - ((v - yMin) / yRange) * plotH;
  const zeroY = y(0);
  const ticks = [yMax, 0, yMin];
  const labelEvery = Math.max(1, Math.ceil(points.length / 8));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--card-line)" strokeWidth={1} />
          <text x={PAD.left - 10} y={y(v) + 5} textAnchor="end" fontFamily="var(--font-mono)" fontSize="13" fill="var(--ink-40)">
            {v > 0 ? "+" : ""}{fmtShare(v)}{v === 0 && unit ? ` ${unit}` : ""}
          </text>
        </g>
      ))}
      {points.map((p, i) => {
        const pos = p.value >= 0;
        const top = pos ? y(p.value) : zeroY;
        const h = Math.max(1, Math.abs(y(p.value) - zeroY));
        return (
          <rect
            key={i}
            x={PAD.left + i * bw + bw * 0.14}
            y={top}
            width={bw * 0.72}
            height={h}
            fill={pos ? positiveColor : negativeColor}
            opacity={0.92}
            rx={1.5}
          />
        );
      })}
      <line x1={PAD.left} x2={W - PAD.right} y1={zeroY} y2={zeroY} stroke="var(--ink-40)" strokeWidth={1.25} />
      {points.map((p, i) =>
        i % labelEvery === 0 ? (
          <text key={i} x={PAD.left + i * bw + bw / 2} y={H - 10} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="12" fill="var(--ink-40)">
            {p.label}
          </text>
        ) : null
      )}
    </svg>
  );
}
