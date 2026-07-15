"use client";

// Gross vs retail-adjusted basis for sell-pressure analytics (?basis=retail).
// Retail-adjusted excludes flows sent by exchange-operated addresses (custody
// shuffles, exchange validators claiming their own commission), separating
// customer selling from exchange infrastructure. Isolated Suspense so the
// useSearchParams consumer doesn't de-opt the page out of static HTML.

import { Suspense, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

const OPTIONS = [
  { v: "", label: "Gross" },
  { v: "retail", label: "Retail-adjusted" },
];

function Segmented() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const cur = sp.get("basis") ?? "";
  // The re-render behind a basis switch recomputes the window server-side
  // (several seconds cold). Without a pending state the click looks dead, so
  // surface the transition explicitly.
  const [pending, startTransition] = useTransition();

  function set(v: string) {
    const next = new URLSearchParams(sp.toString());
    if (v === "") next.delete("basis");
    else next.set("basis", v);
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <span className="data" aria-live="polite" style={{ fontSize: 9.5, letterSpacing: 1.4, textTransform: "uppercase", color: pending ? "var(--hub)" : "var(--ink-40)" }}>
        {pending ? "Recomputing…" : "Basis"}
      </span>
      <div
        role="tablist"
        aria-label="Sell-pressure basis"
        aria-busy={pending}
        style={{
          display: "inline-flex", alignItems: "center", gap: 3, height: 34, padding: 3,
          background: "var(--paper-2)", border: "1px solid var(--card-line)",
          opacity: pending ? 0.55 : 1, transition: "opacity 140ms ease",
        }}
      >
        {OPTIONS.map((o) => {
          const on = cur === o.v;
          return (
            <button
              key={o.v || "gross"}
              role="tab"
              aria-selected={on}
              disabled={pending}
              onClick={() => set(o.v)}
              className="data filter-seg"
              style={{
                height: "100%", display: "inline-flex", alignItems: "center",
                fontSize: 11, letterSpacing: 0.7, fontWeight: on ? 700 : 600, textTransform: "uppercase",
                padding: "0 14px", cursor: pending ? "wait" : "pointer", border: "none",
                color: on ? "var(--hub)" : "var(--ink-60)",
                background: on ? "var(--paper)" : "transparent",
                boxShadow: on ? "var(--elev-1), inset 0 0 0 1px color-mix(in srgb, var(--hub) 32%, transparent)" : "none",
                transition: "color 140ms ease, background 140ms ease, box-shadow 140ms ease, transform 160ms cubic-bezier(0.2,0.7,0.2,1)",
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BasisToggle() {
  return (
    <Suspense fallback={null}>
      <Segmented />
    </Suspense>
  );
}
