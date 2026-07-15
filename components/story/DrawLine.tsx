"use client";

// Self-drawing line: the path draws itself (stroke-dashoffset) when it
// scrolls into view, then the end dot and area fade in. Uses pathLength="1"
// so no measuring is needed. Respects prefers-reduced-motion.

import { useEffect, useRef, useState } from "react";

type Pt = { date: string; value: number };

export function DrawLine({
  points,
  color = "var(--hub)",
  height = 220,
  duration = 1700,
}: {
  points: Pt[];
  color?: string;
  height?: number;
  duration?: number;
}) {
  const ref = useRef<SVGSVGElement | null>(null);
  const [draw, setDraw] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setDraw(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setDraw(true); io.disconnect(); }
    }, { threshold: 0.4 });
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

  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
  const areaD = `${d} L${x(points.length - 1)},${H - pad} L${x(0)},${H - pad} Z`;
  const lastX = x(points.length - 1);
  const lastY = y(points[points.length - 1].value);

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} width="100%" height={height} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id="draw-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* area fades in after the line draws */}
      <path
        d={areaD}
        fill="url(#draw-area)"
        style={{ opacity: draw ? 1 : 0, transition: `opacity 700ms ease ${duration * 0.6}ms` }}
      />

      {/* the drawing line */}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        style={{
          strokeDasharray: 1,
          strokeDashoffset: draw ? 0 : 1,
          transition: `stroke-dashoffset ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          filter: `drop-shadow(0 0 4px ${color})`,
        }}
      />

      {/* end marker appears once drawn */}
      <circle
        cx={lastX}
        cy={lastY}
        r={5}
        fill={color}
        style={{ opacity: draw ? 1 : 0, transition: `opacity 400ms ease ${duration}ms`, filter: `drop-shadow(0 0 5px ${color})` }}
      />
      <circle
        cx={lastX}
        cy={lastY}
        r={5}
        fill="none"
        stroke={color}
        strokeWidth={2}
        style={{
          opacity: draw ? 0 : 0,
          transformOrigin: `${lastX}px ${lastY}px`,
          animation: draw ? `draw-pulse 1.8s ease-out ${duration}ms infinite` : "none",
        }}
      />
    </svg>
  );
}
