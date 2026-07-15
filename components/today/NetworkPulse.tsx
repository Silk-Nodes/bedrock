// A compact, navigable sidebar for Today: clickable destination rows so the page
// is a launchpad, not a wall of text. Each row carries a live value teaser.
import Link from "next/link";

const ICON: Record<string, React.ReactNode> = {
  stakers: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 17 10 5 10-5M2 12l10 5 10-5" /></svg>,
  holders: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="3.2" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 3.5a3.2 3.2 0 0 1 0 7M18 20a6.5 6.5 0 0 0-4-6" /></svg>,
  whales: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12s3-7 9-7 9 7 9 7-3 7-9 7c-2 0-3.8-.8-5.2-1.9" /><path d="M3 12c0 2 1 4 1 4M7 18c-2 0-3 2-3 2" /><circle cx="11" cy="11" r="1.2" fill="currentColor" /></svg>,
  gov: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V10M19 21V10M12 21V10M3 10l9-7 9 7" /></svg>,
  exchanges: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h13l-3-3M17 17H4l3 3" /></svg>,
  market: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l5-5 4 4 8-8" /><path d="M21 8v5h-5" /></svg>,
};

export type PulseRow = { key: string; href: string; label: string; value: string; color: string };

export function NetworkPulse({ rows }: { rows: PulseRow[] }) {
  return (
    <section className="surface" style={{ padding: "16px 18px", height: "100%" }}>
      <div className="data" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)", marginBottom: 12 }}>
        Explore the Hub
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((r) => (
          <Link key={r.key} href={r.href} className="pulse-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 11px", borderRadius: 11, border: "1px solid var(--card-line)", textDecoration: "none" }}>
            <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: `color-mix(in srgb, ${r.color} 14%, transparent)`, color: r.color }}>
              {ICON[r.key]}
            </span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{r.label}</span>
              <span style={{ display: "block", fontSize: 11, color: "var(--ink-50)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.value}</span>
            </span>
            <span style={{ color: "var(--ink-30)", fontSize: 16, flexShrink: 0 }}>&rsaquo;</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
