"use client";

// MethodologyTip · the (?) icon beside chart titles.
// Click opens a small floating popover with:
//   - one-paragraph definition
//   - source
//   - link to the full methodology page anchor

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export function MethodologyTip({
  title,
  definition,
  source,
  href = "/methodology",
}: {
  title: string;
  definition: string;
  source: string;
  href?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click + ESC
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label={`Methodology for ${title}`}
        aria-expanded={open}
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: "1px solid var(--ink-20)",
          background: open ? "var(--hub)" : "transparent",
          color: open ? "var(--paper)" : "var(--ink-60)",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 600,
          cursor: "pointer",
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginLeft: 8,
          verticalAlign: "middle",
        }}
      >
        ?
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={`${title} methodology`}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            zIndex: 50,
            width: 360,
            background: "var(--paper)",
            border: "1px solid var(--ink)",
            boxShadow: "0 8px 32px rgba(21,20,15,0.18)",
            padding: 20,
          }}
        >
          <div className="eyebrow" style={{ color: "var(--hub)", marginBottom: 8, fontWeight: 600 }}>
            Methodology
          </div>
          <h4
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: 16,
              letterSpacing: "-0.5px",
              color: "var(--ink)",
              margin: "0 0 10px",
            }}
          >
            {title}
          </h4>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              lineHeight: 1.55,
              color: "var(--ink-80)",
              margin: "0 0 12px",
            }}
          >
            {definition}
          </p>
          <div
            className="data"
            style={{
              fontSize: 11,
              color: "var(--ink-60)",
              borderTop: "1px dotted var(--ink-20)",
              paddingTop: 10,
            }}
          >
            <span style={{ color: "var(--ink-40)" }}>SOURCE</span>{" "}
            <span style={{ color: "var(--ink-80)" }}>{source}</span>
          </div>
          <Link
            href={href}
            onClick={() => setOpen(false)}
            className="data"
            style={{
              display: "inline-block",
              marginTop: 12,
              fontSize: 11,
              color: "var(--hub)",
              textDecoration: "underline",
              textUnderlineOffset: 4,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            Read full methodology →
          </Link>
        </div>
      )}
    </span>
  );
}
