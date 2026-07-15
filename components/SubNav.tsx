"use client";

// SubNav · secondary navigation that lives below the topbar on a per-page basis.
// Items can be either real Next.js routes OR in-page anchors.
// Active state derived from pathname; anchors default to first item current.
//
// Pattern inspired by hl.eco's domain-level sub-tabs (real routes like /burns/detailed).

import Link from "next/link";
import { usePathname } from "next/navigation";

export type SubNavItem = {
  label: string;
  href: string;            // e.g. "/exchanges/destinations" or "#flow"
  matchExact?: boolean;    // if true, only highlight when pathname matches exactly
};

export function SubNav({
  items,
  label,
}: {
  items: SubNavItem[];
  label?: string;
}) {
  const pathname = usePathname();

  return (
    <div
      style={{
        background: "var(--paper-2)",
        borderBottom: "1px solid var(--ink-20)",
        position: "sticky",
        top: 63,                       // clears the topbar (64 - 1 to align borders)
        zIndex: 50,
      }}
    >
      <div
        className="page"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "10px 40px",
          flexWrap: "wrap",
        }}
      >
        {label && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: "var(--hub)",
              fontWeight: 600,
              flexShrink: 0,
              marginRight: 6,
            }}
          >
            {label}
          </span>
        )}
        {items.map((item, i) => {
          const isAnchor = item.href.startsWith("#");
          let isCurrent = false;

          if (isAnchor) {
            // For anchor links, no built-in current detection; first item visually current
            isCurrent = i === 0;
          } else if (item.matchExact) {
            isCurrent = pathname === item.href;
          } else {
            // Longest match wins for nested routes
            isCurrent = pathname === item.href;
          }

          const style: React.CSSProperties = {
            display: "inline-flex",
            alignItems: "center",
            minHeight: 34,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            fontWeight: isCurrent ? 600 : 500,
            color: isCurrent ? "var(--ink)" : "var(--ink-60)",
            padding: "5px 12px",
            border: "1px solid",
            borderColor: isCurrent ? "var(--ink)" : "var(--ink-20)",
            background: isCurrent ? "var(--paper)" : "transparent",
            textDecoration: "none",
            transition: "color 120ms, border-color 120ms",
          };
          if (isAnchor) {
            return (
              <a key={item.href} href={item.href} style={style}>
                {item.label}
              </a>
            );
          }
          return (
            <Link key={item.href} href={item.href} style={style}>
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
