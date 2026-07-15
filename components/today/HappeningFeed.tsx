"use client";

// What's happening: a tight, scannable activity feed merging Cosmos news + X
// posts + on-chain whale moves. Each row is source-differentiated by a colored
// icon chip, with one-line title + context, so the eye can scan rather than
// read. X and blog rows open a drawer to read in place.
import Link from "next/link";
import { useEffect, useState } from "react";
import { FeedItemPanel, type FeedItem } from "./FeedItemPanel";

const PANEL_SOURCES = new Set(["x", "blog"]);

function relTime(ts: string): string {
  const ms = Date.now() - new Date(ts).getTime();
  if (ms < 0 || !Number.isFinite(ms)) return "";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const ICON: Record<string, React.ReactNode> = {
  x: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" /></svg>,
  blog: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>,
  forum: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" /></svg>,
  chain: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3 8 4-16 3 8h4" /></svg>,
};

function sourceMeta(source: string): { label: string; color: string } {
  switch (source) {
    case "x": return { label: "X", color: "var(--hub)" };
    case "blog": return { label: "Cosmos", color: "var(--moss)" };
    case "forum": return { label: "Forum", color: "var(--sand)" };
    case "chain": return { label: "Whale", color: "var(--iron)" };
    default: return { label: source, color: "var(--slate)" };
  }
}

export function HappeningFeed({ initialItems }: { initialItems?: FeedItem[] }) {
  const [items, setItems] = useState<FeedItem[] | null>(initialItems ?? null);
  const [panel, setPanel] = useState<FeedItem | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/today/feed", { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { items: FeedItem[] }) => setItems(j.items || []))
      .catch((e: unknown) => {
        if (!(e instanceof DOMException && e.name === "AbortError") && initialItems == null) setItems([]);
      });
    return () => ctrl.abort();
  }, [initialItems]);

  return (
    <section className="surface" style={{ padding: "16px 18px", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div className="data" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--hub)", boxShadow: "0 0 8px var(--hub)" }} />
          What&rsquo;s happening
        </div>
        <span className="data" style={{ fontSize: 9.5, letterSpacing: 0.5, color: "var(--ink-30)" }}>news · X · whale moves</span>
      </div>

      {items == null && <div style={{ fontSize: 12.5, color: "var(--ink-40)", padding: "12px 0" }}>Loading activity…</div>}
      {items != null && items.length === 0 && <div style={{ fontSize: 12.5, color: "var(--ink-40)", padding: "12px 0" }}>No recent activity yet.</div>}

      {items != null && items.length > 0 && (() => {
        // The first news item (not a whale move) becomes a featured hero card;
        // the rest are tight scannable rows.
        const featured = items.find((it) => it.source !== "chain") ?? items[0];
        const rest = items.filter((it) => it !== featured);

        const wrap = (it: FeedItem, node: React.ReactNode) => {
          if (PANEL_SOURCES.has(it.source)) {
            return <button type="button" onClick={() => setPanel(it)} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: 0, padding: 0, cursor: "pointer" }}>{node}</button>;
          }
          if (it.url) {
            const ext = /^https?:\/\//.test(it.url);
            return ext
              ? <a href={it.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block" }}>{node}</a>
              : <Link href={it.url} style={{ textDecoration: "none", display: "block" }}>{node}</Link>;
          }
          return <>{node}</>;
        };

        const fm = sourceMeta(featured.source);
        const fsub = featured.source === "x" ? (featured.author || "X post") : featured.sub;

        return (
          <>
            {wrap(featured, (
              <div className="feed-row" style={{ display: "flex", gap: 13, padding: "14px 14px", borderRadius: 13, marginBottom: 8, border: `1px solid color-mix(in srgb, ${fm.color} 30%, var(--card-line))`, background: `color-mix(in srgb, ${fm.color} 7%, transparent)` }}>
                <span style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: `color-mix(in srgb, ${fm.color} 18%, transparent)`, color: fm.color, marginTop: 1 }}>
                  {ICON[featured.source] ?? ICON.chain}
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span className="data" style={{ fontSize: 9.5, letterSpacing: 0.7, textTransform: "uppercase", color: fm.color, fontWeight: 700 }}>{fm.label}</span>
                    <span className="data" style={{ fontSize: 8, letterSpacing: 0.6, color: "var(--ink-40)", border: "1px solid var(--ink-15)", borderRadius: 3, padding: "0 5px", lineHeight: 1.6 }}>{featured.severity === "high" ? "TOP STORY" : "LATEST"}</span>
                    <span style={{ flex: 1 }} />
                    <span suppressHydrationWarning className="data" style={{ fontSize: 9.5, color: "var(--ink-30)", flexShrink: 0 }}>{relTime(featured.ts)}</span>
                  </span>
                  <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 15.5, lineHeight: 1.35, color: "var(--ink)", fontWeight: 600 }}>{featured.title}</span>
                  {fsub && <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 12.5, lineHeight: 1.45, color: "var(--ink-60)", marginTop: 5 }}>{fsub}</span>}
                </span>
              </div>
            ))}

            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {rest.map((it, i) => {
                const meta = sourceMeta(it.source);
                const sub = it.source === "x" ? (it.author || "X post") : it.sub;
                return (
                  <li key={i}>
                    {wrap(it, (
                      <div className="feed-row" style={{ display: "flex", gap: 11, padding: "10px 8px", borderRadius: 10, alignItems: "flex-start" }}>
                        <span style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: `color-mix(in srgb, ${meta.color} 14%, transparent)`, color: meta.color, marginTop: 1 }}>
                          {ICON[it.source] ?? ICON.chain}
                        </span>
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                            <span className="data" style={{ fontSize: 9.5, letterSpacing: 0.6, textTransform: "uppercase", color: meta.color, fontWeight: it.severity === "high" ? 700 : 600 }}>{meta.label}</span>
                            {it.severity === "high" && <span className="data" style={{ fontSize: 8, letterSpacing: 0.6, color: "var(--iron)", border: "1px solid var(--iron)", borderRadius: 3, padding: "0 4px", lineHeight: 1.5 }}>HOT</span>}
                            <span style={{ flex: 1 }} />
                            <span suppressHydrationWarning className="data" style={{ fontSize: 9.5, color: "var(--ink-30)", flexShrink: 0 }}>{relTime(it.ts)}</span>
                          </span>
                          <span style={{ display: "block", fontSize: 13, lineHeight: 1.35, color: "var(--ink)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</span>
                          {sub && <span style={{ display: "block", fontSize: 11.5, lineHeight: 1.3, color: "var(--ink-50)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</span>}
                        </span>
                      </div>
                    ))}
                  </li>
                );
              })}
            </ul>
          </>
        );
      })()}

      <FeedItemPanel item={panel} onClose={() => setPanel(null)} />
    </section>
  );
}
