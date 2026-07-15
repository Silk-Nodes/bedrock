"use client";

// A live-ticking counter (hypeburn-style): starts from an on-chain base value
// captured at `fetchedAt` and advances at `ratePerSec`, so the number moves the
// way the chain actually moves (ATOM mints every ~6s block; the tick rate is
// the mint module's live annual provisions spread per second). Honest pacing,
// not an estimate dressed as a reading: the base is real and re-anchors on
// every revalidation.

import { useEffect, useState } from "react";

export function SupplyTicker({
  base,
  ratePerSec,
  fetchedAt,
  decimals = 2,
  fontSize = 40,
  color = "var(--ink)",
}: {
  base: number;        // ATOM at fetchedAt
  ratePerSec: number;  // ATOM per second (can be negative)
  fetchedAt: string;   // ISO timestamp of the base reading
  decimals?: number;
  fontSize?: number;
  color?: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const t0 = new Date(fetchedAt).getTime();
  const elapsed = now === null ? 0 : Math.max(0, (now - t0) / 1000);
  const value = base + ratePerSec * elapsed;

  return (
    <span
      className="data"
      suppressHydrationWarning
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 450,
        fontSize: `clamp(${Math.round(fontSize * 0.62)}px, 3vw, ${fontSize}px)`,
        letterSpacing: "-0.01em",
        lineHeight: 1,
        color,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  );
}
