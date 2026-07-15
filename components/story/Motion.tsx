"use client";

// Terminal-native scrollytelling primitives.
//   - useInView: fire once when an element scrolls into view
//   - CountUp: animate a number into place (respects reduced motion)
//   - Reveal: fade/slide children up when they enter view

import { useEffect, useRef, useState } from "react";

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useInView<T extends HTMLElement>(opts?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect(); // fire once
        }
      },
      { threshold: 0.35, ...opts }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [opts]);

  return { ref, inView };
}

export function CountUp({
  to,
  duration = 1100,
  decimals = 0,
  prefix = "",
  suffix = "",
  start,
}: {
  to: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  start: boolean;
}) {
  // Seed with the real value so SSR/no-JS/crawlers never see a "0" headline;
  // the in-view animation still counts up from zero on the client.
  const [value, setValue] = useState(to);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!start || startedRef.current) return;
    startedRef.current = true;

    if (prefersReducedMotion()) {
      setValue(to);
      return;
    }

    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(to * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setValue(to);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, to, duration]);

  const formatted =
    Math.abs(value) >= 1000
      ? value.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })
      : value.toFixed(decimals);

  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}{formatted}{suffix}
    </span>
  );
}

export function Reveal({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(12px)",
        transition: `opacity 600ms ease ${delay}ms, transform 600ms cubic-bezier(0.2,0.7,0.2,1) ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
