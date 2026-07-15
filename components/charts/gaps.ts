// Gap vocabulary shared by the live chart and the exported card.
//
// This module is deliberately NOT "use client". It was originally exported from
// LineChart.tsx, which is a Client Component, and ShareCharts.tsx is a Server
// Component: importing a function across that line makes it a client reference,
// and calling it on the server throws "Attempted to call matchGapOverride() from
// the server but matchGapOverride is on the client". Plain shared logic with no
// hooks and no DOM belongs in a plain module that either side can import.

/** A known window whose absence has a specific cause, matched against a hole in
 *  the data by date. Plain data, not a function: the live chart is a Client
 *  Component and RSC cannot pass a function across the boundary. */
export type GapOverride = { from: string; to: string; label: string };

/**
 * Names a hole when a known override covers it, else null.
 *
 * A data hole runs from the last row BEFORE it to the first row AFTER it, so it
 * is always at least as wide as the real window inside it. Matched with a day of
 * tolerance at each edge rather than by equality, because the bounding rows are
 * whatever the series happened to have, not the bounding blocks.
 */
export function matchGapOverride(from: string, to: string, overrides?: GapOverride[]): string | null {
  if (!overrides?.length) return null;
  const DAY = 86_400_000;
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  for (const o of overrides) {
    if (a <= Date.parse(o.from) + DAY && b >= Date.parse(o.to) - DAY) return o.label;
  }
  return null;
}
