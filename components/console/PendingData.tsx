// PendingData · an honest, on-brand "not yet, here's why" panel for pages whose
// metric genuinely needs history the indexer is still backfilling. Instead of a
// bare placeholder it shows the LIVE indexing progress, states plainly what the
// page will show and why it can't yet, and points to what is live now. No
// estimates, ever, this is the integrity guarantee made visible.

import { getIndexerStatus } from "@/lib/indexer";
import Link from "next/link";

function fmtM(n: number): string {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n.toLocaleString("en-US");
}

export async function PendingData({
  title,
  what,
  needs,
  liveNow,
}: {
  title: string;
  what: string;
  needs: string;
  liveNow?: { label: string; href: string };
}) {
  const status = await getIndexerStatus();
  const pct = status.live ? Math.max(0, Math.min(100, status.pct)) : 0;
  // Once the backfill has met tip_start the chain is fully indexed, and the
  // blocks above it belong to the tip-follower. Saying "31.5M of 32.4M blocks"
  // then reads as 900k missing when nothing is missing at all.
  const done = status.backfill_complete;

  return (
    <div className="surface" style={{ padding: "26px 28px", maxWidth: 880 }}>
      <div className="data" style={{ fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--hub)" }}>
        {done ? "History indexed" : "Indexing in progress"}
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)", marginTop: 8 }}>
        {title}
      </div>
      <div style={{ fontSize: 13.5, color: "var(--ink-80)", lineHeight: 1.6, marginTop: 10 }}>{what}</div>

      {/* Live backfill progress */}
      {status.live && (
        <div style={{ marginTop: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
            <span className="data" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)" }}>Hub history indexed</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 400, letterSpacing: "-0.02em", color: "var(--hub)" }}>{pct.toFixed(1)}%</span>
          </div>
          <div className="gbar" style={{ height: 8 }}>
            <div className="gbar-fill" style={{ width: `${pct}%`, ["--gbar-c"]: "var(--hub)" } as React.CSSProperties} />
          </div>
          <div className="data" style={{ fontSize: 10.5, color: "var(--ink-40)", marginTop: 7 }}>
            {done
              ? `genesis to block ${fmtM(status.last_height)}, then the tip-follower live on every block since`
              : `${fmtM(status.last_height)} of ${fmtM(status.tip_height)} blocks · the tip-follower stays live on new blocks`}
          </div>
        </div>
      )}

      <div style={{ fontSize: 12.5, color: "var(--ink-60)", lineHeight: 1.6, marginTop: 20 }}>{needs}</div>

      {liveNow && (
        <Link href={liveNow.href} style={{ textDecoration: "none" }}>
          <div className="surface-lift" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 18, padding: "9px 14px", border: "1px solid var(--ink-10)", borderRadius: 4 }}>
            <span className="data" style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "var(--ink-40)" }}>Live now</span>
            <span style={{ fontSize: 13, color: "var(--hub)", fontWeight: 600 }}>{liveNow.label} →</span>
          </div>
        </Link>
      )}
    </div>
  );
}
