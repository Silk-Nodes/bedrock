import Link from "next/link";
import { BrandLockup } from "./BrandLockup";

// Footer · floating frosted capsule, mirroring the top banner so the page is
// bracketed by matching glass islands at the same width and radius.
// Row 1: identity + links. Row 2: hairline attribution.

const LINKS = [
  { href: "/methodology",                          label: "Methodology", external: false },
  { href: "/labels",                               label: "Labels",      external: false },
  { href: "/methodology#changelog",                label: "Changelog",   external: false },
  { href: "/disclaimer",                           label: "Disclaimer",  external: false },
  { href: "/feedback",                             label: "Feedback",    external: false },
  { href: "https://github.com/Silk-Nodes/bedrock",  label: "GitHub",      external: true  },
];

const linkStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  color: "var(--ink-80)",
  fontWeight: 500,
};

export function Footer() {
  return (
    <footer style={{ background: "var(--bg)", marginTop: 28, paddingBottom: 12 }}>
      {/* Floating capsule , nested in .page so it aligns with the body + top bar */}
      <div className="page">
      <div
        style={{
          borderRadius: 4,
          border: "1px solid var(--ink-10)",
          background: "color-mix(in srgb, var(--paper) 68%, transparent)",
          backdropFilter: "blur(20px) saturate(165%)",
          WebkitBackdropFilter: "blur(20px) saturate(165%)",
          boxShadow:
            "0 6px 24px color-mix(in srgb, var(--ink) 13%, transparent), inset 0 1px 0 color-mix(in srgb, #fff 7%, transparent)",
          overflow: "hidden",
          padding: "0 20px",
        }}
      >
        {/* Single row · brand | attribution (center) | links */}
        <div
          className="footer-row"
          style={{
            padding: "13px 0",
            display: "flex",
            alignItems: "center",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div className="footer-brand" style={{ display: "inline-flex", alignItems: "center" }}>
            <BrandLockup height={32} />
          </div>

          <span
            className="footer-attr"
            style={{
              flex: 1,
              minWidth: 200,
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: 1.5,
              color: "var(--ink-60)",
              textTransform: "uppercase",
            }}
          >
            Built by Silk Nodes · a public good for ATOM community
          </span>

          <nav
            className="footer-links"
            aria-label="Footer navigation"
            style={{ display: "inline-flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}
          >
            {LINKS.map((l) =>
              l.external ? (
                <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                  {l.label}
                </a>
              ) : (
                <Link key={l.href} href={l.href} style={linkStyle}>
                  {l.label}
                </Link>
              ),
            )}
          </nav>

          {/* Tiny credit shown only on phones, where the brand mark + tagline are hidden */}
          <span className="footer-credit-sm">Silk Nodes · public good for ATOM</span>
        </div>

        {/* Permanent disclaimer line. Always visible, every page, every width:
            we sell nothing, so this is a public-good statement, not legal cover. */}
        <div className="footer-disclaimer">
          Free public good · informational only, not financial advice · Bedrock is in
          beta and still indexing.{" "}
          <Link href="/disclaimer" className="footer-disclaimer-link">
            Read the disclaimer
          </Link>
        </div>
      </div>
      </div>
    </footer>
  );
}
