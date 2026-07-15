"use client";

// Sediment chart: an area that rises from the bottom (clip-path reveal) when
// it scrolls into view, with faint horizontal strata lines, so the bonded
// supply reads as a foundation accreting rather than a line being drawn.

import { useEffect, useRef, useState } from "react";

type Pt = { date: string; value: number };

export function SedimentArea({
  points,
  color = "var(--moss)",
  height = 220,
}: {
  points: Pt[];
  color?: string;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [rise, setRise] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRise(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setRise(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const W = 1000;
  const H = height;
  const pad = 12;
  const min = Math.min(...points.map((p) => p.value));
  const max = Math.max(...points.map((p) => p.value));
  const range = max - min || 1;
  const x = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / range) * (H - pad * 2);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},${H - pad} L${x(0)},${H - pad} Z`;
  const strata = [0.25, 0.5, 0.75].map((f) => pad + f * (H - pad * 2));
  const lastX = x(points.length - 1);
  const lastY = y(points[points.length - 1].value);

  return (
    <div ref={ref} className={`sediment${rise ? " rise" : ""}`}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="sediment-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.30" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {strata.map((sy, i) => (
          <line key={i} x1={pad} x2={W - pad} y1={sy} y2={sy} stroke="var(--ink-10)" strokeWidth={1} />
        ))}
        <path d={area} fill="url(#sediment-fill)" />
        <path d={line} fill="none" stroke={color} strokeWidth={2} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
        <circle cx={lastX} cy={lastY} r={4} fill={color} style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
      </svg>
    </div>
  );
}
