"use client";

import { useEffect } from "react";

// Run once after the component mounts in the browser, with optional cleanup.
// The one sanctioned place for an effect: browser-only reads (localStorage,
// a status fetch) that must not run on the server or change the first render.
export function useMountEffect(fn: () => void | (() => void)) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(fn, []);
}
