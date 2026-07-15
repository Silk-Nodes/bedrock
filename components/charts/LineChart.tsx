"use client";

// Multi-line chart, pure SVG, luminous treatment: each series is a bright
// stroke with a translucent same-hue area fill beneath it, over faint
// gridlines, ending in a glowing endpoint dot (the "live" marker).

import { useState, useMemo, useId } from "react";

const W = 1180;
const PAD = { top: 24, right: 24, bottom: 36, left: 72 };

function fmtCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toString();
}

export type Series = {
  label: string;
  color: string;
  points: { date: string; value: number }[];
  emphasis?: boolean; // draw thicker and on top (the hero line, e.g. ATOM)
};

export type TimeWindow = { id: string; label: string; takeLast: number };

const DEFAULT_WINDOWS: TimeWindow[] = [
  { id: "30d",  label: "30D",  takeLast: 30 },
  { id: "90d",  label: "90D",  takeLast: 90 },
  { id: "1y",   label: "1Y",   takeLast: 12 },   // for monthly series
  { id: "all",  label: "ALL",  takeLast: 9999 },
];

export function LineChart({
  series,
  yLabel,
  windows,
  height = 320,
  legend = true,
}: {
  series: Series[];
  yLabel?: string;
  windows?: TimeWindow[];
  height?: number;
  legend?: boolean;
}) {
  const H = height;
  const gradId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const availableWindows = windows;
  const [winIdx, setWinIdx] = useState<number>(availableWindows ? availableWindows.length - 1 : 0);

  // Apply time window (clip from the end)
  const filteredSeries = useMemo(() => {
    if (!availableWindows) return series;
    const take = availableWindows[winIdx].takeLast;
    return series.map((s) => ({
      ...s,
      points: s.points.slice(-take),
    }));
  }, [series, availableWindows, winIdx]);

  const { dates, yMin, yMax } = useMemo(() => {
    const dates = filteredSeries[0]?.points.map((p) => p.date) || [];
    let mn = Infinity;
    let mx = -Infinity;
    for (const s of filteredSeries) {
      for (const p of s.points) {
        if (p.value < mn) mn = p.value;
        if (p.value > mx) mx = p.value;
      }
    }
    if (!isFinite(mn)) mn = 0;
    if (!isFinite(mx)) mx = 1;
    // Pad y range so the lines don't kiss the top/bottom
    const pad = (mx - mn) * 0.1 || 1;
    return { dates, yMin: mn - pad, yMax: mx + pad };
  }, [filteredSeries]);

  // Use the filteredSeries from here down
  const renderSeries = filteredSeries;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const yRange = yMax - yMin || 1;
  const xStep = plotW / Math.max(1, dates.length - 1);

  const xy = (i: number, v: number) => ({
    x: PAD.left + i * xStep,
    y: PAD.top + plotH - ((v - yMin) / yRange) * plotH,
  });

  // Y-axis ticks (4 horizontal lines)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const v = yMin + t * yRange;
    return { y: PAD.top + plotH - t * plotH, label: fmtCompact(Math.round(v)) };
  });

  // X-axis ticks - one label per ~6 points
  const xTickEvery = Math.max(1, Math.floor(dates.length / 6));
  const xTicks = dates
    .map((d, i) => ({ i, d }))
    .filter(({ i }) => i % xTickEvery === 0 || i === dates.length - 1);

  const hoverX = hoverIdx !== null ? PAD.left + hoverIdx * xStep : 0;

  return (
    <div>
      <div
        style={{
          background: "var(--paper-2)",
          border: "1px solid var(--card-line)",
          position: "relative",
        }}
        onMouseLeave={() => setHoverIdx(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * W;
          if (x < PAD.left || x > W - PAD.right) {
            setHoverIdx(null);
            return;
          }
          const i = Math.round((x - PAD.left) / xStep);
          if (i >= 0 && i < dates.length) setHoverIdx(i);
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", height: "auto", display: "block" }}
        >
          {/* Y grid */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={t.y}
                y2={t.y}
                stroke="var(--grid)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={t.y + 4}
                textAnchor="end"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fill: "var(--ink-60)",
                  letterSpacing: 0.4,
                }}
              >
                {t.label}
              </text>
            </g>
          ))}

          {/* Bedrock wordmark watermark · sits behind the data lines */}
          <text
            x={W - PAD.right - 6}
            y={PAD.top + plotH - 8}
            textAnchor="end"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: 15,
              letterSpacing: "-0.02em",
              fill: "var(--ink)",
              opacity: 0.14,
              textTransform: "uppercase",
              userSelect: "none",
            }}
            aria-hidden
          >
            BEDROCK
          </text>

          {/* Same-hue translucent gradients for the area fills */}
          <defs>
            {renderSeries.map((s, si) => (
              <linearGradient key={si} id={`${gradId}-${si}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.16} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>

          {/* Lines: bright stroke + soft same-hue fill + glowing endpoint. The
              emphasized series (the hero, e.g. ATOM) is drawn LAST so it sits on
              top, and thicker, so it never blends into the pack. */}
          {renderSeries
            .map((s, si) => ({ s, si }))
            .sort((a, b) => (a.s.emphasis ? 1 : 0) - (b.s.emphasis ? 1 : 0))
            .map(({ s, si }) => {
            const path = s.points
              .map((p, i) => {
                const c = xy(i, p.value);
                return `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`;
              })
              .join(" ");
            const first = xy(0, s.points[0]?.value ?? 0);
            const last = xy(s.points.length - 1, s.points[s.points.length - 1]?.value ?? 0);
            const area = `${path} L ${last.x} ${PAD.top + plotH} L ${first.x} ${PAD.top + plotH} Z`;
            const dot = s.emphasis ? s.color : "var(--glow)";
            return (
              <g key={s.label}>
                <path d={area} fill={`url(#${gradId}-${si})`} stroke="none" opacity={s.emphasis ? 1 : 0.85} />
                <path className="chart-line" d={path} fill="none" stroke={s.color} strokeWidth={s.emphasis ? 3.4 : 1.9} style={{ filter: `drop-shadow(0 0 ${s.emphasis ? 6 : 3}px ${s.color})`, opacity: s.emphasis ? 1 : 0.92 }} />
                {/* Endpoint: the live value glows */}
                <circle cx={last.x} cy={last.y} r={s.emphasis ? 11 : 8} fill={dot} opacity={0.18} />
                <circle cx={last.x} cy={last.y} r={s.emphasis ? 5.5 : 4.5} fill={dot} opacity={0.36} />
                <circle cx={last.x} cy={last.y} r={s.emphasis ? 3.4 : 2.4} fill={dot} style={{ filter: `drop-shadow(0 0 7px ${dot})` }} />
              </g>
            );
          })}

          {/* X-axis labels */}
          {xTicks.map(({ i, d }) => (
            <text
              key={i}
              x={PAD.left + i * xStep}
              y={H - 12}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fill: "var(--ink-60)",
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              {d.length === 7 ? `${d.slice(5)}/${d.slice(2, 4)}` : d}
            </text>
          ))}

          {/* Hover guide */}
          {hoverIdx !== null && (
            <>
              <line
                x1={hoverX}
                x2={hoverX}
                y1={PAD.top}
                y2={H - PAD.bottom}
                stroke="var(--ink)"
                strokeWidth={1}
                strokeDasharray="2 3"
              />
              {renderSeries.map((s, i) => {
                const p = s.points[hoverIdx];
                if (!p) return null;
                const c = xy(hoverIdx, p.value);
                return (
                  <circle
                    key={i}
                    cx={c.x}
                    cy={c.y}
                    r={4}
                    fill={s.color}
                    stroke="var(--paper-2)"
                    strokeWidth={1.5}
                  />
                );
              })}
            </>
          )}

          {/* Y axis label */}
          {yLabel && (
            <text
              x={16}
              y={PAD.top + plotH / 2}
              textAnchor="middle"
              transform={`rotate(-90, 16, ${PAD.top + plotH / 2})`}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fill: "var(--ink-60)",
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              {yLabel}
            </text>
          )}
        </svg>

        {hoverIdx !== null && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "var(--ink)",
              color: "var(--paper)",
              padding: "10px 14px",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              lineHeight: 1.5,
              letterSpacing: 0.4,
              minWidth: 180,
              pointerEvents: "none",
            }}
          >
            <div style={{ marginBottom: 6, fontWeight: 600, letterSpacing: 1 }}>
              {dates[hoverIdx].toUpperCase()}
            </div>
            {renderSeries.map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: "color-mix(in srgb, var(--paper) 72%, var(--ink))",
                  }}
                >
                  <span style={{ width: 8, height: 8, background: s.color }} />
                  {s.label}
                </span>
                <span style={{ color: "var(--paper)" }}>
                  {fmtCompact(s.points[hoverIdx]?.value || 0)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend + Time window toggle */}
      {legend && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {renderSeries.map((s) => (
            <div
              key={s.label}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <span
                style={{
                  width: 14,
                  height: 2,
                  background: s.color,
                  display: "inline-block",
                }}
              />
              <span className="data" style={{ fontSize: 11, color: "var(--ink-80)" }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
        {availableWindows && (
          <div style={{ display: "inline-flex", gap: 4 }}>
            {availableWindows.map((w, i) => (
              <button
                key={w.id}
                onClick={() => setWinIdx(i)}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: 1.5,
                  fontWeight: 600,
                  background: winIdx === i ? "var(--ink)" : "transparent",
                  color: winIdx === i ? "var(--paper)" : "var(--ink-60)",
                  border: "1px solid var(--ink-20)",
                  padding: "4px 10px",
                  cursor: "pointer",
                }}
              >
                {w.label}
              </button>
            ))}
          </div>
        )}
      </div>}
    </div>
  );
}
