"use client";

// Time-window control for the whale intel cards (biggest exchange depositors +
// largest transfers). State is the URL query `w` (hours), same convention as
// the Exchanges section, so it is shareable and survives navigation. Isolated
// in its own Suspense boundary: a useSearchParams consumer that shares the
// page's boundary would de-opt the whole route out of static HTML.

import { Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

const WINDOWS = [
  { v: "24", label: "24H" },
  { v: "168", label: "7D" },
  { v: "720", label: "30D" },
];
const DEFAULT = "720";

function Segmented() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const cur = sp.get("w") ?? DEFAULT;

  function set(v: string) {
    const next = new URLSearchParams(sp.toString());
    if (v === DEFAULT) next.delete("w");
    else next.set("w", v);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <span className="data" style={{ fontSize: 9.5, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--ink-40)" }}>Window</span>
      <div
        role="tablist"
        aria-label="Time window"
        style={{ display: "inline-flex", alignItems: "center", gap: 3, height: 34, padding: 3, background: "var(--paper-2)", border: "1px solid var(--card-line)" }}
      >
        {WINDOWS.map((w) => {
          const on = cur === w.v;
          return (
            <button
              key={w.v}
              role="tab"
              aria-selected={on}
              onClick={() => set(w.v)}
              className="data filter-seg"
              style={{
                height: "100%", display: "inline-flex", alignItems: "center",
                fontSize: 11, letterSpacing: 0.7, fontWeight: on ? 700 : 600, textTransform: "uppercase",
                padding: "0 14px", cursor: "pointer", border: "none",
                color: on ? "var(--hub)" : "var(--ink-60)",
                background: on ? "var(--paper)" : "transparent",
                boxShadow: on ? "var(--elev-1), inset 0 0 0 1px color-mix(in srgb, var(--hub) 32%, transparent)" : "none",
                transition: "color 140ms ease, background 140ms ease, box-shadow 140ms ease, transform 160ms cubic-bezier(0.2,0.7,0.2,1)",
              }}
            >
              {w.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function WhaleWindow() {
  return (
    <Suspense fallback={null}>
      <Segmented />
    </Suspense>
  );
}
