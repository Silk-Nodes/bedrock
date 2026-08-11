// Premium KPI card: a floating surface with soft elevation, a corner bloom and
// glowing baseline in the metric's accent color, and a big light serif number.
// Reads clean without needing a sparkline. Shared across the ATOM holder pages.

import { ShareButton } from "@/components/share/ShareButton";
import { stampCard } from "@/components/share/stampCard";
import type { SocialCardProps } from "@/components/share/SocialCard";

export async function StatCard({
  label,
  value,
  unit,
  sub,
  accent,
  share,
  shareFilename,
}: {
  label: string;
  value: string;
  unit?: string;
  sub: string;
  accent: string;
  share?: SocialCardProps;
  shareFilename?: string;
}) {
  const shareCard = await stampCard(share);
  return (
    <div
      className={share ? "share-host" : undefined}
      style={{
        position: "relative",
        overflow: "hidden",
        height: "100%",
        background: "var(--paper-2)",
        border: "1px solid var(--card-line)",
        borderRadius: 16,
        padding: "18px 20px 20px",
        boxShadow: "var(--elev-1), var(--card-glow)",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute", top: -46, right: -46, width: 130, height: 130, borderRadius: "50%",
          background: `radial-gradient(circle, ${accent} 0%, transparent 68%)`, opacity: 0.16, pointerEvents: "none",
        }}
      />
      {shareCard && (
        <span style={{ position: "absolute", top: 8, right: 8, zIndex: 2 }}>
          <ShareButton card={shareCard} filename={shareFilename} />
        </span>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16, whiteSpace: "nowrap" }}>
        <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: accent, boxShadow: `0 0 8px ${accent}`, flexShrink: 0 }} />
        <span className="data" style={{ fontSize: 9.5, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--ink-40)" }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, whiteSpace: "nowrap" }}>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 40, fontWeight: 400, lineHeight: 0.95, letterSpacing: "-0.015em", color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
        {unit ? <span style={{ fontSize: 12.5, color: "var(--ink-40)" }}>{unit}</span> : null}
      </div>
      <div style={{ marginTop: 11, fontSize: 11, color: "var(--ink-50)" }}>{sub}</div>
      <div
        aria-hidden
        style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.55,
        }}
      />
    </div>
  );
}
