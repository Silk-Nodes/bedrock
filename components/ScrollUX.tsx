"use client";

// Site-wide scroll affordances, mounted once in the root layout:
//  · a thin progress line at the very top that fills as you read a page
//  · a back-to-top button that fades in after the first screen and smooth-
//    scrolls to the top (thumb-zone friendly on mobile, bottom-right so it
//    clears the centered mobile "Browse" launcher)
import { useEffect, useState } from "react";

export function ScrollUX() {
  const [pct, setPct] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const y = window.scrollY || el.scrollTop || 0;
      setPct(max > 4 ? Math.min(100, Math.max(0, (y / max) * 100)) : 0);
      setShow(y > 700);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div
        aria-hidden
        style={{
          position: "fixed", top: 0, left: 0, height: 3, width: `${pct}%`,
          background: "linear-gradient(90deg, var(--hub), var(--hub-2))",
          zIndex: 200, transition: "width 90ms linear", pointerEvents: "none",
          opacity: pct > 0.5 ? 1 : 0,
        }}
      />
      <button
        type="button"
        aria-label="Back to top"
        className="backtotop"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        style={{
          opacity: show ? 1 : 0,
          transform: show ? "translateY(0)" : "translateY(12px)",
          pointerEvents: show ? "auto" : "none",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>
      </button>
    </>
  );
}
