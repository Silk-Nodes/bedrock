"use client";

// MetricCardLive · the interactive, hl.eco-grade stat card. Same serif-number +
// glowing-timeline look as MetricCard, but each card carries its OWN time-range
// filter (3M / 6M / 1Y / All) that slices its series, and hovering the line
// reveals the exact value and date at that point with a guide + dot + tooltip.
// The trend delta recomputes for the selected range. Client component.

import { memo, useEffect, useMemo, useRef, useState } from "react";

export type LivePoint = { date: string; value: number };

const RANGES = [
  { id: "3m", label: "3M", take: 3 },
  { id: "6m", label: "6M", take: 6 },
  { id: "1y", label: "1Y", take: 12 },
  { id: "all", label: "ALL", take: 9999 },
];

function fmtPct(p: number): string {
  const s = p >= 0 ? "+" : "−";
  return `${s}${Math.abs(p).toFixed(Math.abs(p) >= 10 ? 0 : 1)}%`;
}
function fmtVal(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(Math.abs(n) < 100 ? 1 : 0);
}
function shortDate(d: string): string {
  // "2026-06" or "2026-06-15" -> "Jun '26"
  const [y, m] = d.split("-");
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m) - 1] ?? m;
  return `${mon} '${y.slice(2)}`;
}

export const MetricCardLive = memo(function MetricCardLive({
  label, value, unit, points, color = "var(--hub)", footnote, labelNode, delta = true,
}: {
  label: string;
  value: string;
  unit?: string;
  points: LivePoint[];
  color?: string;
  footnote?: string;
  // Pass false when `points` is not a historical timeline (e.g. a forward
  // schedule or cumulative curve): a first→last delta is meaningless there.
  delta?: boolean;
  // Optional node rendered in place of the text label (e.g. a filter dropdown).
  labelNode?: React.ReactNode;
}) {
  // Default to the widest range that the data supports.
  const [rangeId, setRangeId] = useState("all");
  const [hover, setHover] = useState<number | null>(null);
  const rafRef = useRef(0);
  // Cancel any pending hover frame on unmount so it can't fire setHover after
  // the component is gone (e.g. when a range/filter change swaps the card out).
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);
  // Stable gradient id per label (was a regex run twice on every render).
  const gid = useMemo(() => "mcl-" + label.replace(/[^a-z0-9]/gi, ""), [label]);

  const sliced = useMemo(() => {
    const take = RANGES.find((r) => r.id === rangeId)?.take ?? 9999;
    return points.slice(-take);
  }, [points, rangeId]);

  const has = sliced.length >= 2;
  const first = has ? sliced[0].value : 0;
  const last = has ? sliced[sliced.length - 1].value : 0;
  const pct = has && first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
  const up = pct >= 0;

  const W = 300, H = 64;
  const geo = useMemo(() => {
    if (!has) return null;
    const vals = sliced.map((p) => p.value);
    const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
    const xs = W / (sliced.length - 1);
    const xy = (v: number, i: number) => [i * xs, H - 4 - ((v - min) / range) * (H - 8)] as const;
    const pts = sliced.map((p, i) => xy(p.value, i));
    const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    const area = `${path} L ${pts[pts.length - 1][0].toFixed(1)} ${H} L ${pts[0][0].toFixed(1)} ${H} Z`;
    return { pts, path, area, xs };
  }, [sliced, has]);

  const hi = hover != null && geo ? Math.max(0, Math.min(sliced.length - 1, hover)) : null;

  return (
    <div className="surface" style={{ minHeight: has ? 188 : 118, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        {labelNode ?? <div className="data" style={{ fontSize: 9.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--ink-40)" }}>{label}</div>}
        {has && (
          <div style={{ display: "inline-flex", gap: 1, flexShrink: 0 }}>
            {RANGES.map((r) => {
              const on = r.id === rangeId;
              const enabled = points.length >= r.take || r.id === "all" || points.length > r.take * 0.5;
              return (
                <button
                  key={r.id}
                  onClick={() => enabled && setRangeId(r.id)}
                  className="data mcl-range pressable"
                  style={{
                    fontSize: 8.5, letterSpacing: 0.5, fontWeight: 700, padding: "2px 5px", cursor: enabled ? "pointer" : "default",
                    border: "none", background: "transparent",
                    color: on ? color : enabled ? "var(--ink-40)" : "var(--ink-20)",
                    borderBottom: on ? `1px solid ${color}` : "1px solid transparent",
                  }}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span className="stat-num" style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 40, lineHeight: 1, letterSpacing: "-0.025em", color: "var(--ink)" }}>{value}</span>
        {unit && <span style={{ fontSize: 12, color: "var(--ink-40)", letterSpacing: 0.5 }}>{unit}</span>}
      </div>
      {has && delta && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5 }}>
          <span style={{ color: up ? "var(--moss)" : "var(--iron)", fontWeight: 600 }}>{up ? "▲" : "▼"} {fmtPct(pct)}</span>
          <span style={{ color: "var(--ink-40)" }}>{RANGES.find((r) => r.id === rangeId)?.label.toLowerCase()}</span>
        </div>
      )}

      {has && geo ? (
        <div style={{ position: "relative", marginTop: "auto" }}>
          {/* Hover readout */}
          {hi != null && (
            <div style={{ position: "absolute", top: -34, left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 2 }}>
              <span className="data" style={{ fontSize: 10, background: "var(--ink)", color: "var(--paper)", padding: "3px 8px", whiteSpace: "nowrap" }}>
                {shortDate(sliced[hi].date)} · {fmtVal(sliced[hi].value)}{unit ? "" : ""}
              </span>
            </div>
          )}
          <svg
            viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
            style={{ width: "100%", height: H, display: "block", overflow: "visible", cursor: "crosshair" }}
            onMouseMove={(e) => {
              // Coalesce to one layout read per frame; avoids getBoundingClientRect
              // thrashing against the hover-guide DOM update on every mouse event.
              if (rafRef.current) return;
              const { clientX, currentTarget } = e;
              rafRef.current = requestAnimationFrame(() => {
                rafRef.current = 0;
                const rect = currentTarget.getBoundingClientRect();
                const idx = Math.round((((clientX - rect.left) / rect.width) * W) / geo.xs);
                const clamped = Math.max(0, Math.min(sliced.length - 1, idx));
                setHover((h) => (h === clamped ? h : clamped));
              });
            }}
            onMouseLeave={() => {
              if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
              setHover(null);
            }}
          >
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={geo.area} fill={`url(#${gid})`} stroke="none" />
            <path d={geo.path} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
            {hi != null && (
              <>
                <line x1={geo.pts[hi][0]} x2={geo.pts[hi][0]} y1={0} y2={H} stroke="var(--ink-40)" strokeWidth={1} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
                <circle cx={geo.pts[hi][0]} cy={geo.pts[hi][1]} r={3.4} fill={color} stroke="var(--paper)" strokeWidth={1.5} />
              </>
            )}
            {hi == null && (
              <>
                <circle cx={geo.pts[geo.pts.length - 1][0]} cy={geo.pts[geo.pts.length - 1][1]} r={7} fill="var(--glow)" opacity={0.20} />
                <circle cx={geo.pts[geo.pts.length - 1][0]} cy={geo.pts[geo.pts.length - 1][1]} r={3} fill="var(--glow)" style={{ filter: "drop-shadow(0 0 7px var(--glow))" }} />
              </>
            )}
          </svg>
        </div>
      ) : (
        <div style={{ fontSize: 10, color: "var(--ink-40)", letterSpacing: 0.2, marginTop: "auto" }}>{footnote ?? "timeline accruing"}</div>
      )}

      {has && footnote && <div style={{ fontSize: 10, color: "var(--ink-40)", letterSpacing: 0.2 }}>{footnote}</div>}
    </div>
  );
});
