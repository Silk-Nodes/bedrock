"use client";

import { useEffect, useState } from "react";

/**
 * True only after the first client render.
 *
 * Gate anything derived from Date.now() on this. The server bakes one value into
 * the HTML and the client computes another when it hydrates, and because these
 * pages are prerendered and served with a long max-age (the delegation page sits
 * behind max-age=14400), the HTML a browser receives is routinely hours old. The
 * mismatch is therefore guaranteed, not a race that usually wins.
 *
 * React answers a text mismatch with error #418, abandons hydration for that
 * subtree, and every control inside it stops responding while still LOOKING
 * correct. That is the failure mode to watch for: a feed that renders perfectly
 * and ignores its own filters is almost always this.
 *
 * Pair it with utcClock (or another value derived purely from the data) so the
 * first paint still shows something useful.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

/**
 * UTC HH:MM taken straight off an ISO timestamp. No Date.now(), no locale and no
 * time zone, so server and client always produce the same string and it is safe
 * to hydrate against. Postgres-style "2026-07-14 08:22:49.2+00" is normalized so
 * it parses in every browser.
 */
export function utcClock(ts: string): string {
  const d = new Date(ts.replace(" ", "T").replace(/\+00(:?00)?$/, "Z"));
  if (!Number.isFinite(d.getTime())) return "";
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** UTC calendar date off an ISO timestamp, for day-granularity labels. */
export function utcDate(ts: string): string {
  const d = new Date(ts.replace(" ", "T").replace(/\+00(:?00)?$/, "Z"));
  if (!Number.isFinite(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
