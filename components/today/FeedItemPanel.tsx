"use client";

// Side drawer for reading an X post or blog item in place, without leaving Today.
import { useEffect, useRef } from "react";
import { useFocusTrap } from "@/components/useFocusTrap";

export type FeedItem = {
  source: "x" | "blog" | "forum" | "chain";
  title: string;
  sub?: string;
  url?: string;
  ts: string;
  severity: "normal" | "high";
  tag: string;
  body?: string;
  bodyHtml?: string;
  author?: string;
};

function fmtWhen(ts: string): string {
  try {
    return new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function FeedItemPanel({ item, onClose }: { item: FeedItem | null; onClose: () => void }) {
  const panelRef = useRef<HTMLElement>(null);
  useFocusTrap(panelRef, !!item);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  if (!item) return null;
  const accent = item.source === "x" ? "var(--hub)" : "var(--moss)";
  const srcLabel = item.source === "x" ? "X / Twitter" : item.source === "blog" ? "Cosmos blog" : "Forum";

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "color-mix(in srgb, #06080F 55%, transparent)", backdropFilter: "blur(2px)", zIndex: 200 }}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Feed item"
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: "min(460px, 92vw)", zIndex: 201,
          background: "var(--paper)", borderLeft: "1px solid var(--ink-10)", boxShadow: "var(--elev-2)",
          display: "flex", flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", width: "100%", height: 4, background: accent, flexShrink: 0 }} />
        <div style={{ padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--ink-10)" }}>
          <span className="data" style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: accent }}>{srcLabel}</span>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: "1px solid var(--ink-15)", borderRadius: 6, width: 28, height: 28, cursor: "pointer", color: "var(--ink-60)", fontSize: 15, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px 40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 11.5, color: "var(--ink-50)" }}>
            {item.author && <span style={{ color: "var(--ink-70)", fontWeight: 500 }}>{item.author}</span>}
            <span>{fmtWhen(item.ts)}</span>
          </div>
          <div style={{ fontSize: 16, lineHeight: 1.5, color: "var(--ink)", fontWeight: 500, marginBottom: 14 }}>{item.title}</div>
          {item.body && item.body !== item.title && (
            <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--ink-80)", margin: 0, whiteSpace: "pre-wrap" }}>{item.body}</p>
          )}
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 22, fontSize: 12.5, color: accent, textDecoration: "none", fontWeight: 500 }}>
              Open original &rarr;
            </a>
          )}
        </div>
      </aside>
    </>
  );
}
