"use client";

// Theme switch · square, sharp-cornered to match the rest of the UI.
// A square knob slides between two equal halves; the active icon rides
// inside the knob, the destination icon sits faint on the empty half.
// Geometry is exact: knob centers land on each half's center.

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const W = 56;                 // track width (even → exact half-centering)
const H = 28;                 // track height
const PAD = 3;
const KNOB = H - PAD * 2;     // 22 · square knob
const SLIDE = W - PAD * 2 - KNOB; // travel distance
const HALF = W / 2;

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const attr = document.documentElement.getAttribute("data-theme");
    setTheme(attr === "light" ? "light" : "dark");
    setMounted(true);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("bedrock-theme", next); } catch {}
  };

  const dark = mounted ? theme === "dark" : true;

  const centerBox: React.CSSProperties = {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: HALF,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 0,
  };

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      style={{
        position: "relative",
        width: W,
        height: H,
        flexShrink: 0,
        alignSelf: "center",
        marginLeft: 12,
        padding: 0,
        border: "1px solid var(--ink-20)",
        background: "var(--paper-2)",
        cursor: "pointer",
      }}
    >
      {/* faint destination icon, centered on the empty half */}
      <span aria-hidden style={{ ...centerBox, left: dark ? 0 : HALF, color: "var(--ink-40)" }}>
        {dark ? <Surface /> : <Bedrock />}
      </span>

      {/* sliding square knob carrying the active icon */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: PAD,
          left: PAD,
          width: KNOB,
          height: KNOB,
          background: "var(--ink)",
          color: "var(--paper)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 0,
          transform: `translateX(${dark ? SLIDE : 0}px)`,
          transition: "transform 280ms cubic-bezier(0.4, 0.9, 0.3, 1)",
        }}
      >
        {dark ? <Bedrock /> : <Surface />}
      </span>
    </button>
  );
}

// Surface (light) · the sun above the ground line.
function Surface() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ display: "block" }}>
      <circle cx="12" cy="8" r="3.4" />
      <rect x="3.5" y="14.6" width="17" height="2.3" />
    </svg>
  );
}

// Bedrock (dark) · the ground line with strata layers stacked below it.
function Bedrock() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ display: "block" }}>
      <rect x="3.5" y="6"  width="17" height="2.3" />
      <rect x="3.5" y="11" width="17" height="2.3" />
      <rect x="6.5" y="16" width="11" height="2.3" />
    </svg>
  );
}
