"use client";

// Counts a pre-formatted number string up from zero on mount, then stops.
// Works on values like "$1.2B", "62.2%", "230.11M", "1,234 ATOM", "21 days".
// It preserves the prefix ($), suffix (%, M, k, B, text), decimal places, and
// comma grouping of the original string. Values with no numeric core (e.g.
// "Osmosis", "n/a") are rendered unchanged. Respects reduced-motion.

import { useEffect, useRef, useState } from "react";

// prefix = leading non-numeric (e.g. "$"); then optional sign + digits/commas
// /decimal; then everything else as suffix.
const PARSE = /^([^0-9.\-−]*)([-−]?[\d,]*\.?\d+)(.*)$/;

export function CountUp({ value, duration = 1000 }: { value: string; duration?: number }) {
  // Seed with the final value so SSR, no-JS, and hydration all show the real
  // number; the animation (client-only) then runs from zero.
  const [display, setDisplay] = useState(value);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const m = PARSE.exec(value);
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (!m || reduce) {
      setDisplay(value);
      return;
    }

    const prefix = m[1];
    const numStr = m[2];
    const suffix = m[3];
    const target = parseFloat(numStr.replace(/,/g, "").replace("−", "-"));
    if (!Number.isFinite(target)) {
      setDisplay(value);
      return;
    }

    const dot = numStr.indexOf(".");
    const decimals = dot === -1 ? 0 : numStr.length - dot - 1;
    const grouped = numStr.includes(",");
    const fmt = (n: number) =>
      prefix +
      n.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: grouped,
      }) +
      suffix;

    let start: number | null = null;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      setDisplay(fmt(target * easeOut(t)));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, duration]);

  return <>{display}</>;
}
