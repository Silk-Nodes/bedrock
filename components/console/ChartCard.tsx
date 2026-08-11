// ChartCard · hl.eco-grade chart container. Unlike the dense IntelCard panel,
// this gives the chart room to breathe: generous padding, a refined floating
// header (serif title, quiet meta on the right, optional big current value),
// a faint top hairline, and the chart as the dominant element. Used for hero
// and secondary charts in the hl.eco layout grammar.

import { ShareButton } from "@/components/share/ShareButton";
import { stampCard } from "@/components/share/stampCard";
import type { SocialCardProps } from "@/components/share/SocialCard";

export async function ChartCard({
  title,
  meta,
  value,
  valueUnit,
  accentColor = "var(--hub)",
  share,
  shareFilename,
  children,
}: {
  title: string;
  meta?: string;
  value?: string;       // optional big current figure, hl.eco-style
  valueUnit?: string;
  accentColor?: string;
  share?: SocialCardProps;
  shareFilename?: string;
  children: React.ReactNode;
}) {
  const shareCard = await stampCard(share);
  return (
    <div
      className={`surface${share ? " share-host" : ""}`}
      style={{ background: "var(--paper)", padding: "22px 24px 18px", position: "relative" }}
    >
      <div className="chartcard-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)" }}>{title}</div>
          {/* The current value lives on the metric card above; the chart shows the
              trajectory only, so it never restates the number (no duplication). */}
        </div>
        <span className="chartcard-meta" style={{ display: "inline-flex", alignItems: "center", gap: 10, flexShrink: 0, paddingTop: 2 }}>
          {meta && (
            <span className="data" style={{ fontSize: 9.5, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)" }}>{meta}</span>
          )}
          {shareCard && <ShareButton card={shareCard} filename={shareFilename} />}
        </span>
      </div>
      <div>{children}</div>
    </div>
  );
}
