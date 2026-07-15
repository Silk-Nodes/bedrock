"use client";

// The "core sample": a fixed left-edge gauge that drills downward as you
// scroll. The fill grows with global story progress, era bands are fossilized
// along the shaft, and a readout chip rides the drill head showing the year +
// block depth. Pure DOM mutation on scroll (no re-render). Decorative.

import { useEffect, useRef } from "react";
import { useScene } from "./StoryScene";

// Approximate progress positions of each era down the shaft (0 = top / 2019).
const ERAS = [
  { p: 0.02, year: "2019", label: "Genesis" },
  { p: 0.30, year: "2021", label: "IBC" },
  { p: 0.52, year: "2022", label: "ATOM 2.0" },
  { p: 0.78, year: "2024", label: "Institutions" },
  { p: 0.99, year: "now", label: "Bedrock" },
];

export function CoreSample() {
  const scene = useScene();
  const fillRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!scene) return;
    return scene.subscribe((p) => {
      const pct = (p * 100).toFixed(2);
      if (fillRef.current) fillRef.current.style.height = `${pct}%`;
      if (headRef.current) headRef.current.style.top = `${pct}%`;
      if (yearRef.current) yearRef.current.textContent = p >= 0.992 ? "now" : String(Math.round(2019 + p * 7));
    });
  }, [scene]);

  return (
    <aside className="story-rail" aria-hidden>
      <div className="story-rail-cap">CORE</div>
      <div className="story-rail-track">
        <div ref={fillRef} className="story-rail-fill" style={{ height: "0%" }} />
        {ERAS.map((e) => (
          <div key={e.year} className="story-rail-era" style={{ top: `${e.p * 100}%` }}>
            <span className="story-rail-era-dot" />
            <span className="story-rail-era-label">{e.year}</span>
          </div>
        ))}
        <div ref={headRef} className="story-rail-head" style={{ top: "0%" }}>
          <span className="story-rail-head-dot" />
          <span className="story-rail-readout">
            <span ref={yearRef} className="story-rail-year">2019</span>
          </span>
        </div>
      </div>
      <div className="story-rail-cap">BEDROCK</div>
    </aside>
  );
}
