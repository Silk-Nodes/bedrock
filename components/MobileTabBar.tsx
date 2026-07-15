"use client";

// A fixed bottom tab bar for phones: thumb-zone access to the most-used
// destinations plus Search (command palette) and Menu (the full section sheet).
// Shown only under 820px via the .mobile-tabbar CSS class; replaces the old
// floating "Browse" launcher. Search/Menu fire window events the palette and
// topbar already listen for (bedrock:cmdk / bedrock:menu).
import Link from "next/link";
import { usePathname } from "next/navigation";

const P = { width: 21, height: 21, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const ICONS: Record<string, React.ReactNode> = {
  today: <svg {...P}><path d="M5 12.5a9 9 0 0 1 14 0" /><path d="M8 15.5a5 5 0 0 1 8 0" /><circle cx="12" cy="18.5" r="1" fill="currentColor" stroke="none" /></svg>,
  atom: <svg {...P}><circle cx="12" cy="12" r="2.2" /><ellipse cx="12" cy="12" rx="9" ry="3.6" /><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" /></svg>,
  signals: <svg {...P}><path d="M3 12h3l2.5 6 5-14 2.5 8H21" /></svg>,
  search: <svg {...P}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
  menu: <svg {...P}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
};

const LINKS = [
  { key: "today", label: "Today", href: "/today" },
  { key: "atom", label: "ATOM", href: "/atom" },
  { key: "signals", label: "Signals", href: "/signals" },
];

export function MobileTabBar() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const Cell = ({ on, label, children, onClick, href }: { on: boolean; label: string; children: React.ReactNode; onClick?: () => void; href?: string }) => {
    const inner = (
      <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: on ? "var(--hub)" : "var(--ink-50)" }}>
        {children}
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: 0.4, fontWeight: on ? 700 : 500 }}>{label}</span>
      </span>
    );
    const cellStyle: React.CSSProperties = { flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", height: 54, background: "none", border: 0, cursor: "pointer", padding: 0 };
    return href
      ? <Link href={href} aria-label={label} style={{ ...cellStyle, textDecoration: "none" }}>{inner}</Link>
      : <button type="button" aria-label={label} onClick={onClick} style={cellStyle}>{inner}</button>;
  };

  return (
    <nav
      className="mobile-tabbar"
      aria-label="Primary"
      style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 96,
        background: "color-mix(in srgb, var(--paper) 92%, transparent)",
        backdropFilter: "blur(18px) saturate(160%)", WebkitBackdropFilter: "blur(18px) saturate(160%)",
        borderTop: "1px solid var(--ink-10)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {LINKS.map((l) => <Cell key={l.key} on={active(l.href)} label={l.label} href={l.href}>{ICONS[l.key]}</Cell>)}
      <Cell on={false} label="Search" onClick={() => window.dispatchEvent(new Event("bedrock:cmdk"))}>{ICONS.search}</Cell>
      <Cell on={false} label="Menu" onClick={() => window.dispatchEvent(new Event("bedrock:menu"))}>{ICONS.menu}</Cell>
    </nav>
  );
}
