"use client";

// Multi-line chart, pure SVG, luminous treatment: each series is a bright
// stroke with a translucent same-hue area fill beneath it, over faint
// gridlines, ending in a glowing endpoint dot (the "live" marker).

import { useState, useMemo, useId } from "react";
import { matchGapOverride, type GapOverride } from "./gaps";

const W = 1180;
const PAD = { top: 24, right: 24, bottom: 36, left: 72 };

function fmtCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toString();
}

export type { GapOverride };

export type Series = {
  label: string;
  color: string;
  points: { date: string; value: number }[];
  emphasis?: boolean; // draw thicker and on top (the hero line, e.g. ATOM)
};

// A point is only plotted where its date sits in real time, so a hole in the
// data reads as a hole. Series arrive with one row per day that HAS data, so a
// stretch the indexer has not reached yet simply has no rows: indistinguishable,
// from the data alone, from a stretch where nothing happened. Positioning by
// array index (the old behaviour) collapsed those holes to zero width and drew
// a straight line across them, which claimed continuity the data never had. On
// an evenly-spaced series index and time agree exactly, so this is a no-op
// everywhere except where a real gap exists.
//
// A break is declared at GAP_FACTOR x the median step, so ordinary quiet days
// stay connected and only structural holes split the line.
const GAP_FACTOR = 4;


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
  gapLabel = "NO DATA",
  gapOverrides,
}: {
  series: Series[];
  yLabel?: string;
  windows?: TimeWindow[];
  height?: number;
  legend?: boolean;
  /** Shown inside a gap band when no override matches. Say WHY the data is
   *  missing when you know; the default claims nothing beyond absence. */
  gapLabel?: string;
  /**
   * Holes whose cause is known and specific, matched by date.
   *
   * Needed because holes on one chart can have DIFFERENT causes, and only some
   * of them resolve: "we have not read this yet" closes as the backfill runs,
   * "no blocks were ever produced here" never will. One label across both
   * promises data that is never coming.
   */
  gapOverrides?: GapOverride[];
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

  // Time scale, with an index fallback. Not every caller plots real dates (a
  // series could be labelled by month bucket or anything else), so if a single
  // label fails to parse we keep the old index spacing rather than render NaN.
  const time = useMemo(() => {
    const ts = dates.map((d) => Date.parse(d));
    const ok = ts.length > 1 && ts.every(Number.isFinite) && ts[ts.length - 1] > ts[0];
    if (!ok) return { ok: false as const, ts, gapMs: Infinity };
    // Median step, so one huge hole cannot drag the threshold up past itself.
    const steps = ts.slice(1).map((t, i) => t - ts[i]).filter((s) => s > 0).sort((a, b) => a - b);
    const median = steps.length ? steps[Math.floor(steps.length / 2)] : 0;
    return { ok: true as const, ts, gapMs: median > 0 ? median * GAP_FACTOR : Infinity };
  }, [dates]);

  const xAtTime = (t: number) =>
    PAD.left + ((t - time.ts[0]) / (time.ts[time.ts.length - 1] - time.ts[0] || 1)) * plotW;

  const xAt = (i: number) => (time.ok ? xAtTime(time.ts[i]) : PAD.left + i * xStep);

  const xy = (i: number, v: number) => ({
    x: xAt(i),
    y: PAD.top + plotH - ((v - yMin) / yRange) * plotH,
  });

  // Structural holes: stretches the chart must not draw across.
  const gaps = useMemo(() => {
    if (!time.ok) return [];
    const out: { x0: number; x1: number; days: number; label: string }[] = [];
    for (let i = 1; i < time.ts.length; i++) {
      const d = time.ts[i] - time.ts[i - 1];
      if (d > time.gapMs) {
        out.push({
          x0: xAtTime(time.ts[i - 1]),
          x1: xAtTime(time.ts[i]),
          days: Math.round(d / 86_400_000),
          label: matchGapOverride(dates[i - 1], dates[i], gapOverrides) ?? gapLabel,
        });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, plotW, dates, gapLabel, gapOverrides]);

  const brokenAt = (i: number) => time.ok && i > 0 && time.ts[i] - time.ts[i - 1] > time.gapMs;

  // Y-axis ticks (4 horizontal lines)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const v = yMin + t * yRange;
    return { y: PAD.top + plotH - t * plotH, label: fmtCompact(Math.round(v)) };
  });

  // X-axis ticks. On a time scale these step by equal TIME, not by equal row
  // count: stepping every N rows put "2022-10-17" and "2026-07-15" one tick
  // apart at the same spacing as a 199-day step, because the rows between them
  // did not exist.
  const xTicks = useMemo(() => {
    if (!time.ok) {
      const every = Math.max(1, Math.floor(dates.length / 6));
      return dates
        .map((d, i) => ({ x: PAD.left + i * xStep, d }))
        .filter((_, i) => i % every === 0 || i === dates.length - 1);
    }
    const t0 = time.ts[0];
    const t1 = time.ts[time.ts.length - 1];
    const n = 6;
    return Array.from({ length: n + 1 }, (_, k) => {
      const t = t0 + ((t1 - t0) * k) / n;
      return { x: xAtTime(t), d: new Date(t).toISOString().slice(0, 10) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, dates, xStep, plotW]);

  const hoverX = hoverIdx !== null ? xAt(hoverIdx) : 0;

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
          if (!time.ok) {
            const i = Math.round((x - PAD.left) / xStep);
            if (i >= 0 && i < dates.length) setHoverIdx(i);
            return;
          }
          // Points are no longer evenly spaced, so walk to the nearest one.
          let best = -1;
          let bestD = Infinity;
          for (let i = 0; i < time.ts.length; i++) {
            const d = Math.abs(xAtTime(time.ts[i]) - x);
            if (d < bestD) { bestD = d; best = i; }
          }
          // Inside a hole there is no reading to show, so show none rather than
          // snapping to a day that may be years from the cursor.
          setHoverIdx(bestD <= Math.max(6, plotW / 60) ? best : null);
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

          {/* Gap bands · drawn under the data. An empty stretch alone reads as
              "nothing happened"; the label is what distinguishes "we have not
              read this yet" from "flow was zero". */}
          {gaps.map((g, i) => (
            <g key={`gap-${i}`}>
              <rect
                x={g.x0}
                y={PAD.top}
                width={Math.max(0, g.x1 - g.x0)}
                height={plotH}
                fill={`url(#${gradId}-hatch)`}
                stroke="var(--ink-20)"
                strokeWidth={1}
                strokeDasharray="2 3"
              />
              {g.x1 - g.x0 > 90 && (
                <text
                  x={(g.x0 + g.x1) / 2}
                  y={PAD.top + plotH / 2}
                  textAnchor="middle"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    fill: "var(--ink-60)",
                    letterSpacing: 1.4,
                    textTransform: "uppercase",
                    userSelect: "none",
                  }}
                >
                  {g.label}
                </text>
              )}
              {g.x1 - g.x0 > 90 && (
                <text
                  x={(g.x0 + g.x1) / 2}
                  y={PAD.top + plotH / 2 + 14}
                  textAnchor="middle"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    fill: "var(--ink-40)",
                    letterSpacing: 1,
                    userSelect: "none",
                  }}
                >
                  {g.days.toLocaleString("en-US")} DAYS
                </text>
              )}
            </g>
          ))}

          {/* Same-hue translucent gradients for the area fills */}
          <defs>
            <pattern id={`${gradId}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="var(--paper-3)" opacity={0.5} />
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--ink-20)" strokeWidth={1} />
            </pattern>
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
            // Split into runs of contiguous data. Each run strokes and fills on
            // its own so neither the line nor the area closes over a hole.
            const runs: number[][] = [];
            let run: number[] = [];
            s.points.forEach((_, i) => {
              if (brokenAt(i) && run.length) { runs.push(run); run = []; }
              run.push(i);
            });
            if (run.length) runs.push(run);

            const last = xy(s.points.length - 1, s.points[s.points.length - 1]?.value ?? 0);
            const dot = s.emphasis ? s.color : "var(--glow)";
            return (
              <g key={s.label}>
                {runs.map((idxs, ri) => {
                  const path = idxs
                    .map((i, k) => {
                      const c = xy(i, s.points[i].value);
                      return `${k === 0 ? "M" : "L"} ${c.x} ${c.y}`;
                    })
                    .join(" ");
                  const a = xy(idxs[0], s.points[idxs[0]].value);
                  const b = xy(idxs[idxs.length - 1], s.points[idxs[idxs.length - 1]].value);
                  const area = `${path} L ${b.x} ${PAD.top + plotH} L ${a.x} ${PAD.top + plotH} Z`;
                  return (
                    <g key={ri}>
                      <path d={area} fill={`url(#${gradId}-${si})`} stroke="none" opacity={s.emphasis ? 1 : 0.85} />
                      <path className="chart-line" d={path} fill="none" stroke={s.color} strokeWidth={s.emphasis ? 3.4 : 1.9} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 ${s.emphasis ? 6 : 3}px ${s.color})`, opacity: s.emphasis ? 1 : 0.92 }} />
                    </g>
                  );
                })}
                {/* Endpoint: the live value glows */}
                <circle cx={last.x} cy={last.y} r={s.emphasis ? 11 : 8} fill={dot} opacity={0.18} />
                <circle cx={last.x} cy={last.y} r={s.emphasis ? 5.5 : 4.5} fill={dot} opacity={0.36} />
                <circle cx={last.x} cy={last.y} r={s.emphasis ? 3.4 : 2.4} fill={dot} style={{ filter: `drop-shadow(0 0 7px ${dot})` }} />
              </g>
            );
          })}

          {/* X-axis labels */}
          {xTicks.map(({ x, d }, ti) => (
            <text
              key={ti}
              x={x}
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
