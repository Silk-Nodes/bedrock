"use client";

// Burn trend: daily burn bars (left axis) + cumulative burn line (right axis).
// Range toggle, terminal palette. Mirrors the Smart Stake "Burn Trend".

import { useState } from "react";
import type { BurnDay } from "@/data/atom-burn";
import { TipCard } from "@/components/charts/TipCard";

const W = 900;
const H = 320;
const PAD = { top: 16, right: 54, bottom: 28, left: 48 };

const RANGES = [
  { id: "30", label: "30D", n: 30 },
  { id: "90", label: "90D", n: 90 },
  { id: "365", label: "1Y", n: 365 },
  { id: "all", label: "ALL", n: 99999 },
] as const;

function fmtK(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(0);
}

export function BurnChart({ daily, cumulative }: { daily: BurnDay[]; cumulative: BurnDay[] }) {
  const [range, setRange] = useState<string>("90");
  const n = RANGES.find((r) => r.id === range)!.n;

  const d = daily.slice(-n);
  const c = cumulative.slice(-n);

  const maxDaily = Math.max(...d.map((x) => x.v), 1);
  const cumMin = Math.min(...c.map((x) => x.v));
  const cumMax = Math.max(...c.map((x) => x.v));
  const cumRange = cumMax - cumMin || 1;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const bw = Math.max(1, (innerW / d.length) * 0.62);
  const x = (i: number) => PAD.left + (i + 0.5) * (innerW / d.length);
  const yBar = (v: number) => PAD.top + innerH - (v / maxDaily) * innerH;
  const yCum = (v: number) => PAD.top + innerH - ((v - cumMin) / cumRange) * innerH;

  const cumLine = c.map((p, i) => `${x(i)},${yCum(p.v)}`).join(" ");

  const ticks = d.map((p, i) => ({ i, label: p.d.slice(5) })).filter((_, i) => i % Math.ceil(d.length / 6) === 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 14, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink-60)" }}>
          <span><span style={{ display: "inline-block", width: 9, height: 9, background: "var(--moss)", marginRight: 6, verticalAlign: "middle" }} />Daily burn</span>
          <span><span style={{ display: "inline-block", width: 14, height: 2, background: "var(--sand)", marginRight: 6, verticalAlign: "middle" }} />Cumulative</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className="burn-range"
              style={{
                borderColor: range === r.id ? "var(--ink)" : "var(--ink-20)",
                color: range === r.id ? "var(--ink)" : "var(--ink-60)",
                fontWeight: range === r.id ? 700 : 500,
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: "relative" }}>
      {/* per-day hover strips: styled TipCard (date, daily burn, cumulative).
          CSS tooltips can't attach to SVG, so a transparent strip overlays each
          bar's column across the plot area.
          Only the LEFT/RIGHT padding aligns the strips with the plot columns
          (percentage padding is width-relative, which is correct for x). The
          strips run the FULL height so they cover the bars themselves: any
          vertical padding here would be width-relative too, lifting the strip
          bottoms off the bars and killing the tooltip when you hover a candle. */}
      <div style={{ position: "absolute", inset: 0, display: "flex",
        paddingLeft: `${(PAD.left / W) * 100}%`, paddingRight: `${(PAD.right / W) * 100}%` }}>
        {d.map((p, i) => (
          <div key={p.d} className="tipwrap" style={{ flex: 1 }}>
            <TipCard title={p.d} rows={[
              { label: "burned", value: `${p.v.toFixed(1)} ATOM`, valueColor: "var(--moss)" },
              { label: "cumulative", value: `${fmtK(c[i]?.v ?? 0)} ATOM`, total: true },
            ]} />
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {/* daily bars */}
        {d.map((p, i) => (
          <rect
            key={p.d}
            x={x(i) - bw / 2}
            y={yBar(p.v)}
            width={bw}
            height={PAD.top + innerH - yBar(p.v)}
            fill="var(--moss)"
            opacity={0.85}
          />
        ))}

        {/* cumulative line */}
        <polyline points={cumLine} fill="none" stroke="var(--sand)" strokeWidth={2} style={{ filter: "drop-shadow(0 0 4px var(--sand))" }} />

        {/* left axis (daily) */}
        <text x={PAD.left - 8} y={PAD.top + 6} fontSize="9" fill="var(--ink-40)" fontFamily="var(--font-mono)" textAnchor="end">{fmtK(maxDaily)}</text>
        <text x={PAD.left - 8} y={PAD.top + innerH} fontSize="9" fill="var(--ink-40)" fontFamily="var(--font-mono)" textAnchor="end">0</text>

        {/* right axis (cumulative) */}
        <text x={W - PAD.right + 8} y={PAD.top + 6} fontSize="9" fill="var(--sand)" fontFamily="var(--font-mono)" textAnchor="start">{fmtK(cumMax)}</text>
        <text x={W - PAD.right + 8} y={PAD.top + innerH} fontSize="9" fill="var(--sand)" fontFamily="var(--font-mono)" textAnchor="start">{fmtK(cumMin)}</text>

        {/* x labels */}
        {ticks.map((t) => (
          <text key={t.i} x={x(t.i)} y={H - 8} fontSize="9" fill="var(--ink-40)" fontFamily="var(--font-mono)" textAnchor="middle">{t.label}</text>
        ))}
      </svg>
      </div>
    </div>
  );
}
