// Shared console primitives reused across all section consoles.
// Status strip cells, console header line, intel card, drill-in rail.

import Link from "next/link";
import { ShareButton } from "@/components/share/ShareButton";
import { stampCard } from "@/components/share/stampCard";
import type { SocialCardProps } from "@/components/share/SocialCard";

// Standard page wrapper for every console. Same padding rhythm everywhere.
export function ConsolePage({ children }: { children: React.ReactNode }) {
  return (
    <div className="page" style={{ paddingTop: 16, paddingBottom: 32 }}>
      {children}
    </div>
  );
}

// ConsoleModule: an elevated frame that contains a group of inner cards,
// creating depth (page → module → card). The module sits one step up the
// surface ladder (--paper-2); inner cards stay --paper, reading as darker
// insets, with the module's padding showing as a frame gutter around them.
// Sharp corners, hairline border, to keep the terminal identity.
export function ConsoleModule({
  title,
  meta,
  tools,
  dot,
  lead,
  headingLevel,
  children,
}: {
  title?: string;
  meta?: string;
  tools?: React.ReactNode;
  dot?: string;
  // `lead` marks this module's title as the page's single <h1>. Without it the
  // title renders as <h2> (or the explicit headingLevel) for semantic hierarchy.
  lead?: boolean;
  headingLevel?: 2 | 3;
  children: React.ReactNode;
}) {
  const hasHeader = title || meta || tools;
  const HeadingTag = (lead ? "h1" : `h${headingLevel ?? 2}`) as "h1" | "h2" | "h3";
  return (
    <section
      className="surface"
      style={{
        background: "var(--paper-2)",
        padding: 16,
      }}
    >
      {hasHeader && (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            paddingBottom: 12,
            marginBottom: 14,
            borderBottom: "1px solid var(--ink-10)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {dot && (
              <span
                aria-hidden
                style={{ width: 7, height: 7, borderRadius: "50%", background: dot, boxShadow: `0 0 0 3px color-mix(in srgb, ${dot} 22%, transparent)` }}
              />
            )}
            {title && (
              <HeadingTag
                className="data"
                style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, color: "var(--ink)", margin: 0, display: "inline" }}
              >
                {title}
              </HeadingTag>
            )}
            {meta && (
              <span
                className="data"
                style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)" }}
              >
                {meta}
              </span>
            )}
          </div>
          {tools && <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>{tools}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

// StatusStrip: the bordered cell row at the top of every console page.
// First cell is "auto" width (section label with status dot), the rest
// distribute evenly. Pass 5 to 7 StatusStripCell children.
export function StatusStrip({ children }: { children: React.ReactNode }) {
  const cellCount = Array.isArray(children) ? children.flat().filter(Boolean).length : 1;
  const rest = Math.max(1, cellCount - 1);
  return (
    <div
      className="surface"
      style={{
        background: "var(--paper-2)",
        display: "grid",
        gridTemplateColumns: `auto repeat(${rest}, 1fr)`,
        alignItems: "stretch",
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

// Standard section label cell with a pulsing dot. Always the first cell.
export function SectionLabel({
  label,
  color = "var(--hub)",
  glow = "rgba(59,42,107,0.18)",
}: {
  label: string;
  color?: string;
  glow?: string;
}) {
  return (
    <StatusStripCell label="Section">
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <span
          aria-hidden
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 0 3px ${glow}`,
          }}
        />
        {label}
      </span>
    </StatusStripCell>
  );
}

export function StatusStripCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="console-status-cell">
      <span className="label">{label}</span>
      <span className="value">{children}</span>
    </div>
  );
}

export function ConsoleHeader({
  subtitle,
  meta,
}: {
  subtitle: string;
  meta?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        marginBottom: 12,
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span
          className="data"
          style={{
            fontSize: 10,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            fontWeight: 700,
            color: "var(--hub)",
          }}
        >
          Console
        </span>
        <span
          className="data"
          style={{
            fontSize: 10,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: "var(--ink-60)",
          }}
        >
          {subtitle}
        </span>
      </div>
      {meta && (
        <span
          className="data"
          style={{
            fontSize: 10,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: "var(--ink-40)",
          }}
        >
          {meta}
        </span>
      )}
    </div>
  );
}

export async function IntelCard({
  title,
  meta,
  accent = false,
  share,
  shareFilename,
  children,
}: {
  title: string;
  meta?: string;
  accent?: boolean;
  share?: SocialCardProps;
  shareFilename?: string;
  children: React.ReactNode;
}) {
  const shareCard = await stampCard(share);
  return (
    <div
      className={`surface${accent ? " is-accent" : ""}${share ? " share-host" : ""}`}
      style={{
        background: accent ? "var(--paper-3)" : "var(--paper)",
        padding: "12px 14px",
        height: "100%",
        position: "relative",
        // Flex column so a child with flex:1 can fill the card's remaining
        // height exactly, regardless of how tall the header wraps.
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, rowGap: 4, marginBottom: 8, flexWrap: "wrap" }}>
        <span
          className="data"
          style={{
            fontSize: 10,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            color: accent ? "var(--hub)" : "var(--ink-60)",
            fontWeight: 700,
          }}
        >
          {title}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {meta && (
            <span
              className="data"
              style={{
                fontSize: 9,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: "var(--ink-40)",
              }}
            >
              {meta}
            </span>
          )}
          {shareCard && <ShareButton reveal card={shareCard} filename={shareFilename} />}
        </span>
      </div>
      {/* Children container grows to the card's remaining height so a child
          with flex:1 can pin footers to the true bottom edge. */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  );
}

export function DrillInRail({
  items,
}: {
  items: { href: string; label: string; note: string }[];
}) {
  return (
    <div style={{ marginTop: 20 }}>
      <div
        className="data"
        style={{
          fontSize: 10,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: "var(--ink-60)",
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        Deep reads
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          border: "1px solid var(--ink-20)",
        }}
      >
        {items.map((d, i) => (
          <Link
            key={d.href}
            href={d.href}
            style={{
              display: "block",
              padding: "12px 14px",
              borderLeft: i === 0 ? "none" : "1px solid var(--ink-20)",
              background: "var(--paper)",
              color: "var(--ink)",
              textDecoration: "none",
            }}
            className="drillin"
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: 16,
                letterSpacing: "-0.4px",
              }}
            >
              {d.label}
            </div>
            <div
              className="data"
              style={{
                fontSize: 10,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: "var(--ink-60)",
                marginTop: 4,
              }}
            >
              {d.note}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
