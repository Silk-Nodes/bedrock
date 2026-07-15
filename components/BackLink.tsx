import Link from "next/link";

// A compact "← back to <list>" link for detail pages (a proposal, a validator),
// so there's a one-tap return without relying on the browser back button.
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="data"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, letterSpacing: 0.5, color: "var(--ink-50)", textDecoration: "none", marginBottom: 14 }}
    >
      <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>←</span> {label}
    </Link>
  );
}
