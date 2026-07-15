"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { BrandLockup } from "./BrandLockup";

type Section = {
  label: string;
  href: string;
  color: string;
  children?: { label: string; href: string; soon?: boolean }[];
};

const SECTIONS: Section[] = [
  {
    label: "Today",
    href: "/today",
    color: "var(--hub)",
    children: [
      { label: "Overview", href: "/today" },
      { label: "Feed", href: "/today/feed" },
    ],
  },
  {
    label: "Signals",
    href: "/signals",
    color: "var(--hub-2)",
    children: [
      { label: "Board", href: "/signals" },
      { label: "Whales", href: "/signals/whales" },
      { label: "Accumulation vs distribution", href: "/signals/cohorts" },
    ],
  },
  {
    label: "ATOM",
    href: "/atom",
    color: "var(--hub-2)",
    children: [
      { label: "Supply & burn", href: "/atom/supply" },
      { label: "Distribution", href: "/atom/distribution" },
      { label: "Holders", href: "/atom/holders" },
      { label: "Genesis · the 984", href: "/atom/genesis" },
      { label: "Whale intelligence", href: "/atom/whales" },
      { label: "Governance", href: "/atom/governance" },
      { label: "Market & liquidity", href: "/atom/market" },
      { label: "Where to trade", href: "/atom/market/trade" },
      { label: "Relative performance", href: "/atom/market/relative" },
    ],
  },
  {
    label: "Stakers",
    href: "/stakers",
    color: "var(--moss)",
    children: [
      { label: "Delegation flow", href: "/stakers/delegation" },
      { label: "Unbonding queue", href: "/stakers/unbonding" },
      { label: "Rewards", href: "/stakers/rewards" },
      { label: "Population & cohorts", href: "/stakers/population" },
    ],
  },
  {
    label: "Exchanges",
    href: "/exchanges",
    color: "var(--iron)",
    children: [
      { label: "Sell pressure", href: "/exchanges/sell-pressure" },
      { label: "Where it goes", href: "/exchanges/destinations" },
      { label: "Per exchange", href: "/exchanges/per-exchange" },
      { label: "Top movers", href: "/exchanges/top-movers" },
      { label: "Recent flows", href: "/exchanges/recent" },
      { label: "Balance trend", href: "/exchanges/balance-trend" },
    ],
  },
  {
    label: "Validators",
    href: "/validators",
    color: "var(--slate)",
    children: [
      { label: "Set", href: "/validators/set" },
      { label: "Concentration", href: "/validators/concentration" },
      { label: "Commission", href: "/validators/commission" },
    ],
  },
];

function sectionActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

// One compact line-icon per section, hl.eco-style. Keyed by section href.
function SectionIcon({ href }: { href: string }) {
  const p = { width: 17, height: 17, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, style: { display: "block" } };
  switch (href) {
    case "/today": return <svg {...p}><path d="M5 12.5a9 9 0 0 1 14 0" /><path d="M8 15.5a5 5 0 0 1 8 0" /><circle cx="12" cy="18.5" r="1" fill="currentColor" stroke="none" /></svg>;
    case "/signals": return <svg {...p}><path d="M3 12h3l2.5 6 5-14 2.5 8H21" /></svg>;
    case "/atom": return <svg {...p}><circle cx="12" cy="12" r="2.4" /><ellipse cx="12" cy="12" rx="9" ry="3.6" /><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" /></svg>;
    case "/stakers": return <svg {...p}><path d="M12 3 3 7.5l9 4.5 9-4.5L12 3Z" /><path d="m3 12 9 4.5L21 12" /><path d="m3 16.5 9 4.5 9-4.5" /></svg>;
    case "/exchanges": return <svg {...p}><path d="M4 8h13l-3-3" /><path d="M20 16H7l3 3" /></svg>;
    case "/validators": return <svg {...p}><path d="M12 3l7 3v5c0 4-3 6.5-7 8-4-1.5-7-4-7-8V6l7-3Z" /><path d="m9 11.5 2 2 4-4" /></svg>;
    default: return <svg {...p}><circle cx="12" cy="12" r="8" /></svg>;
  }
}

export function Topbar() {
  const pathname = usePathname();
  const active = SECTIONS.find((s) => sectionActive(s.href, pathname));
  const children = active?.children ?? [];
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Which section is being previewed in the sheet (its sub-pages show below).
  // Tapping a card selects it here instead of navigating, hl.eco-style.
  const [sheetSel, setSheetSel] = useState<string | null>(null);

  // Open the sheet with the current section pre-selected for preview.
  const openSheet = useCallback(() => {
    setSheetSel(active?.href ?? SECTIONS[0].href);
    setMenuOpen(true);
  }, [active]);

  // Close the mobile menu whenever the route changes (a link was tapped).
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // The bottom tab bar's "Menu" opens the section sheet via this window event.
  useEffect(() => {
    const onMenu = () => openSheet();
    window.addEventListener("bedrock:menu", onMenu);
    return () => window.removeEventListener("bedrock:menu", onMenu);
  }, [openSheet]);

  // Lock body scroll while the full-screen mobile menu is open.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [menuOpen]);

  // Align the sub-nav branch under the active primary chip (connected feel),
  // clamped so a right-side section's sub-row doesn't overflow the page.
  const activeChipRef = useRef<HTMLAnchorElement>(null);
  const subPageRef = useRef<HTMLDivElement>(null);
  const subInnerRef = useRef<HTMLDivElement>(null);
  const [subPad, setSubPad] = useState(0);

  const recomputeSubPad = useCallback(() => {
    const chip = activeChipRef.current;
    const page = subPageRef.current;
    const inner = subInnerRef.current;
    if (!chip || !page) return;
    const cs = getComputedStyle(page);
    const padL = parseFloat(cs.paddingLeft) || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    const contentLeft = page.getBoundingClientRect().left + padL;
    const contentWidth = page.clientWidth - padL - padR;
    const innerW = inner ? inner.scrollWidth : 0;
    const raw = chip.getBoundingClientRect().left - contentLeft;
    const maxPad = Math.max(0, contentWidth - innerW);
    setSubPad(Math.max(0, Math.min(raw, maxPad)));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    recomputeSubPad();
    const r = requestAnimationFrame(recomputeSubPad); // after layout/fonts settle
    window.addEventListener("resize", recomputeSubPad);
    return () => {
      cancelAnimationFrame(r);
      window.removeEventListener("resize", recomputeSubPad);
    };
  }, [pathname, recomputeSubPad]);

  return (
    <header
      style={{
        // Transparent sticky shell: the visible bar is a floating capsule inside,
        // so content drifts beneath and around it (hl.eco-style island).
        position: "sticky",
        top: 0,
        zIndex: 100,
        // Opaque page-colored shell so scrolling content is hidden behind the
        // bar (no bleed-through). The capsule below floats on this dark strip.
        background: "var(--bg)",
        paddingTop: 10,
        paddingBottom: 8,
      }}
    >
      {/* Row A: floating frosted capsule , brand + primary nav + tools.
          Nested inside .page so its edges align with the body content.
          position/zIndex keep it above the full-screen mobile menu so the
          close (X) button stays tappable while the menu is open. */}
      <div className="page" style={{ position: "relative", zIndex: 101 }}>
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          height: 56,
          padding: "0 20px",
          borderRadius: 4,
          border: `1px solid ${scrolled ? "var(--ink-20)" : "var(--ink-10)"}`,
          background: scrolled
            ? "color-mix(in srgb, var(--paper) 84%, transparent)"
            : "color-mix(in srgb, var(--paper) 68%, transparent)",
          backdropFilter: "blur(20px) saturate(165%)",
          WebkitBackdropFilter: "blur(20px) saturate(165%)",
          boxShadow: scrolled
            ? "0 10px 34px color-mix(in srgb, var(--ink) 20%, transparent), inset 0 1px 0 color-mix(in srgb, #fff 10%, transparent)"
            : "0 6px 24px color-mix(in srgb, var(--ink) 13%, transparent), inset 0 1px 0 color-mix(in srgb, #fff 7%, transparent)",
          transition: "background-color 200ms ease, border-color 200ms ease, box-shadow 200ms ease",
        }}
      >
        {/* Brand */}
        <Link
          href="/"
          aria-label="Bedrock home"
          style={{
            display: "inline-flex",
            alignItems: "center",
            paddingRight: 20,
          }}
        >
          <BrandLockup height={38} />
        </Link>

        {/* Primary nav: clean text, single violet active marker */}
        <nav className="topo-primary">
          {SECTIONS.map((s) => {
            const isActive = sectionActive(s.href, pathname);
            return (
              <Link
                key={s.href}
                href={s.href}
                ref={isActive ? activeChipRef : undefined}
                className={`topo-node ${isActive ? "active" : ""}`}
              >
                {s.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />

        {/* Search → opens the command palette */}
        <button
          type="button"
          className="topbar-mobile-hide"
          onClick={() => window.dispatchEvent(new Event("bedrock:cmdk"))}
          style={{
            display: "inline-flex",
            alignItems: "center",
            alignSelf: "center",
            border: "1px solid var(--ink-10)",
            background: "color-mix(in srgb, var(--paper-2) 55%, transparent)",
            paddingLeft: 10,
            paddingRight: 6,
            height: 30,
            minWidth: 240,
            gap: 8,
            cursor: "pointer",
          }}
        >
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            style={{ color: "var(--ink-60)", flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span style={{ flex: 1, textAlign: "left", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-60)", letterSpacing: 0.3 }}>
            Jump to anything
          </span>
          <kbd
            style={{
              fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
              color: "var(--ink-60)", background: "var(--paper)",
              border: "1px solid var(--ink-20)", padding: "1px 5px", flexShrink: 0, lineHeight: 1.2,
            }}
          >
            ⌘K
          </kbd>
        </button>

        {/* Beta pill · links to the disclaimer, which says what beta actually means.
            NOT topbar-mobile-hide: beta is a disclosure, so it has to survive on
            mobile. Below 900px the label drops and the dot alone carries it
            (.topbar-beta-label), same pattern as the Feedback CTA. */}
        <Link
          href="/disclaimer"
          className="topbar-beta pressable"
          aria-label="Beta — what this means"
          style={{
            display: "inline-flex", alignItems: "center", alignSelf: "center",
            marginLeft: 12, gap: 7, padding: "4px 9px", textDecoration: "none",
            border: "1px solid var(--hub)", background: "var(--paper)", flexShrink: 0,
          }}
        >
          <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--hub)", boxShadow: "0 0 0 3px rgba(59,42,107,0.15)" }} />
          <span className="data topbar-beta-label" style={{ fontSize: 10, letterSpacing: 1.5, fontWeight: 700, textTransform: "uppercase", color: "var(--hub)" }}>
            Beta
          </span>
        </Link>

        {/* Feedback CTA: quick path to the community request board. Always in
            the topbar: full button on desktop, icon-only chip under 900px
            (.topbar-feedback-label hides via CSS). */}
        <Link
          href="/feedback"
          className="topbar-feedback pressable"
          aria-label="Feedback: submit and vote on ideas"
          style={{
            display: "inline-flex", alignItems: "center", alignSelf: "center",
            marginLeft: 10, gap: 6, padding: "5px 11px", flexShrink: 0,
            border: "1px solid var(--card-line)", background: "var(--paper-2)",
            textDecoration: "none", borderRadius: 6,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--ink-60)", display: "block" }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="data topbar-feedback-label" style={{ fontSize: 11, letterSpacing: 0.6, fontWeight: 600, color: "var(--ink-70)" }}>Feedback</span>
        </Link>

        {/* Mobile menu trigger, shown only on narrow screens (CSS) */}
        <button
          type="button"
          className="topbar-menu-btn"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => (menuOpen ? setMenuOpen(false) : openSheet())}
          style={{
            display: "none", // base; .topbar-menu-btn media query flips to inline-flex
            alignItems: "center", justifyContent: "center", alignSelf: "center",
            width: 40, height: 40, marginLeft: 10, flexShrink: 0,
            border: "1px solid var(--ink-20)", background: "var(--paper-2)", cursor: "pointer",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--ink)", display: "block" }}>
            {menuOpen ? <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></> : <><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></>}
          </svg>
        </button>

        <ThemeToggle />
      </div>
      </div>

      {/* Row B: connected sub-page branch for the active section */}
      {children.length > 0 && active && (
        <div className="page" ref={subPageRef} style={{ marginTop: 8 }}>
          <div className="topo-sub" style={{ marginLeft: 0, paddingLeft: subPad }}>
            <div ref={subInnerRef} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="topo-sub-elbow" aria-hidden style={{ color: active.color }} />
              {children.map((c) => {
                const childActive = pathname === c.href;
                return (
                  <Link
                    key={c.href}
                    href={c.href}
                    className={`topo-sub-node ${childActive ? "active" : ""}`}
                  >
                    {c.label}
                    {c.soon && <span className="topo-soon">soon</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile navigation · a bottom sheet of section cards (hl.eco-style).
          Thumb-reachable, slides up over a blurred backdrop. */}
      {menuOpen && (
        <>
          {/* Blurred scrim, tap to dismiss */}
          <div
            className="sheet-scrim"
            onClick={() => setMenuOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 98,
              background: "color-mix(in srgb, var(--bg) 55%, transparent)",
              backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
            }}
          />
          <div
            className="mobile-sheet"
            role="dialog"
            aria-label="Sections"
            style={{
              position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 99,
              maxHeight: "86vh", overflowY: "auto", WebkitOverflowScrolling: "touch",
              background: "var(--paper)",
              borderTop: "1px solid var(--ink-10)",
              borderTopLeftRadius: 18, borderTopRightRadius: 18,
              boxShadow: "0 -20px 50px color-mix(in srgb, var(--ink) 40%, transparent)",
              padding: "10px 16px calc(20px + env(safe-area-inset-bottom))",
            }}
          >
            {/* Grab handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "4px 0 14px" }}>
              <span aria-hidden style={{ width: 38, height: 4, borderRadius: 4, background: "var(--ink-20)" }} />
            </div>

            <div className="data" style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--ink-40)", marginBottom: 12 }}>
              Sections
            </div>

            {/* 2-column grid of section cards. Tapping a card SELECTS it
                (previews its sub-pages below) rather than navigating. The
                section you're currently on keeps a live dot; the selected
                card glows. */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {SECTIONS.map((s) => {
                const onPage = sectionActive(s.href, pathname);
                const selected = sheetSel === s.href;
                return (
                  <button
                    key={s.href}
                    type="button"
                    onClick={() => setSheetSel(s.href)}
                    style={{
                      display: "flex", alignItems: "center", gap: 11, minHeight: 56,
                      padding: "0 14px", textAlign: "left", cursor: "pointer", font: "inherit",
                      border: "1px solid", borderColor: selected ? "var(--glow)" : "var(--ink-10)",
                      borderRadius: 10, background: selected ? "color-mix(in srgb, var(--glow) 9%, var(--paper-2))" : "var(--paper-2)",
                      boxShadow: selected ? "0 0 0 1px var(--glow), 0 0 16px color-mix(in srgb, var(--glow) 28%, transparent)" : "none",
                      color: "var(--ink)",
                      position: "relative",
                    }}
                  >
                    <span aria-hidden style={{ color: selected ? "var(--glow)" : "var(--ink-60)", flexShrink: 0 }}>
                      <SectionIcon href={s.href} />
                    </span>
                    <span style={{ fontSize: 15.5, fontWeight: 500, letterSpacing: -0.1 }}>{s.label}</span>
                    {onPage && (
                      <span aria-hidden title="current section" style={{ position: "absolute", right: 12, width: 7, height: 7, borderRadius: "50%", background: "var(--glow)", boxShadow: "0 0 8px var(--glow)" }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected section's sub-pages, updates as you tap cards above.
                The header opens the section landing; the pills open sub-pages. */}
            {(() => {
              const sel = SECTIONS.find((s) => s.href === sheetSel) ?? active;
              if (!sel) return null;
              return (
                <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--ink-10)" }}>
                  <Link
                    href={sel.href}
                    className="data"
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12, textDecoration: "none" }}
                  >
                    <span style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: sel.color, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <SectionIcon href={sel.href} />
                      {sel.label}
                    </span>
                    <span style={{ fontSize: 9.5, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--ink-40)" }}>Open →</span>
                  </Link>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {(sel.children ?? []).map((c) => {
                      const childActive = pathname === c.href;
                      return (
                        <Link
                          key={c.href}
                          href={c.href}
                          className="data"
                          style={{
                            display: "inline-flex", alignItems: "center", minHeight: 38,
                            padding: "8px 13px", fontSize: 11, letterSpacing: 1, textTransform: "uppercase",
                            border: "1px solid", borderColor: childActive ? "var(--glow)" : "var(--ink-20)", borderRadius: 8,
                            background: childActive ? "color-mix(in srgb, var(--glow) 12%, transparent)" : "transparent",
                            color: childActive ? "var(--ink)" : "var(--ink-60)", textDecoration: "none",
                          }}
                        >
                          {c.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      )}

      {/* Floating "Browse" launcher, persistent thumb-zone entry on phones */}
      <button
        type="button"
        className="mobile-browse-btn"
        aria-label="Browse sections"
        onClick={openSheet}
        style={{
          display: "none", // .mobile-browse-btn media query flips to inline-flex
          position: "fixed", left: "50%", transform: "translateX(-50%)",
          bottom: "calc(16px + env(safe-area-inset-bottom))", zIndex: 90,
          alignItems: "center", gap: 9, padding: "12px 22px",
          border: "1px solid var(--ink-10)", borderRadius: 999,
          background: "color-mix(in srgb, var(--paper) 88%, transparent)",
          backdropFilter: "blur(18px) saturate(160%)", WebkitBackdropFilter: "blur(18px) saturate(160%)",
          boxShadow: "0 8px 30px color-mix(in srgb, var(--ink) 30%, transparent), 0 0 0 1px color-mix(in srgb, var(--glow) 16%, transparent)",
          cursor: "pointer", color: "var(--ink)",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--glow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
          <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, letterSpacing: 0.6, fontWeight: 600 }}>Browse</span>
      </button>
    </header>
  );
}
