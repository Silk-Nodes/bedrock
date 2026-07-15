"use client";

// Cinematic scroll engine for the landing. ONE passive scroll listener,
// rAF-throttled, fans a 0..1 global progress out to subscribers and mutates
// the DOM directly (no React re-render on scroll). Honors reduced-motion.

import { createContext, useCallback, useContext, useEffect, useRef } from "react";

type Sub = (globalProgress: number) => void;
type Scene = { subscribe: (fn: Sub) => () => void };

const SceneCtx = createContext<Scene | null>(null);

export function StoryScene({ children }: { children: React.ReactNode }) {
  const subs = useRef<Set<Sub>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const frame = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      subs.current.forEach((fn) => fn(p));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    frame(); // initial paint
    if (!reduce) {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const subscribe = useCallback((fn: Sub) => {
    subs.current.add(fn);
    return () => {
      subs.current.delete(fn);
    };
  }, []);

  return (
    <SceneCtx.Provider value={{ subscribe }}>
      <div ref={containerRef} className="story">
        {children}
      </div>
    </SceneCtx.Provider>
  );
}

export function useScene() {
  return useContext(SceneCtx);
}

// Drift an element opposite to scroll for parallax depth. Returns a ref to
// attach to the layer you want to move (usually an absolutely-positioned bg).
export function useParallax<T extends HTMLElement>(speed = 0.12) {
  const scene = useScene();
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!scene) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    return scene.subscribe(() => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const fromCenter = rect.top + rect.height / 2 - window.innerHeight / 2;
      el.style.transform = `translate3d(0, ${(-fromCenter * speed).toFixed(1)}px, 0)`;
    });
  }, [scene, speed]);
  return ref;
}
