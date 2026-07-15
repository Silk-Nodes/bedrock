// /atom/distribution · hl.eco card grid. Supply-denominated ATTRIBUTION: how much
// of the live total supply we can attribute to known on-chain actors (exchange
// custody, the ICF treasury, the community pool), with the honest remainder left
// as "dispersed". The old explainer paragraphs and the scope prose are gone: the
// insight is now a row of data cards over the attribution bar. Composition is a
// point-in-time decomposition (no per-wallet history yet), so the lead cards are
// number-only; the stacked attribution bar carries the breakdown.

import { MetricCard } from "@/components/console/MetricCard";
import { ConsolePage, ConsoleModule, IntelCard } from "@/components/console/Console";
import { getSupplyComposition } from "@/lib/distribution";
import { ShareBars } from "@/components/share/ShareCharts";
import { seo } from "@/lib/seo";

export const revalidate = 600;
export const metadata = seo({ title: "ATOM Distribution", description: "How ATOM is distributed across the Cosmos Hub: holder tiers, concentration, and the share of supply held by the largest wallets and exchanges.", path: "/atom/distribution", keywords: ["ATOM distribution", "ATOM concentration", "ATOM holder tiers"] });

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return Math.round(n).toString();
}

export default async function AtomDistribution() {
  const c = await getSupplyComposition();
  const bondedPct = c.total_supply > 0 ? (c.bonded / c.total_supply) * 100 : 0;
  const liquidPct = c.total_supply > 0 ? (c.liquid / c.total_supply) * 100 : 0;
  const custodyPct = c.total_supply > 0 ? (c.exchange_custody / c.total_supply) * 100 : 0;
  const poolPct = c.total_supply > 0 ? (c.community_pool / c.total_supply) * 100 : 0;

  // Build the stacked attribution bar: each named block, then the dispersed
  // remainder as the final (faded) segment. Widths are share of total supply.
  const segments = [
    ...c.attributed.map((a) => ({ label: a.name, pct: a.pct, color: a.color })),
    { label: "Dispersed", pct: c.dispersed_pct, color: "var(--ink-20)" },
  ];

  return (
    <ConsolePage>
      <ConsoleModule lead title="ATOM · distribution" dot="var(--hub)" meta={c.live ? `${fmtCompact(c.total_supply)} ATOM total · attribution by share of supply · live` : "snapshot"}>
        <div className="console-grid">
          {/* Lead card row: the attribution read, point-in-time (no per-wallet history yet) */}
          <div className="span-3">
            <MetricCard label="Attributable" value={`${c.attributed_pct.toFixed(0)}%`} series={[]} color="var(--hub)" footnote="of supply, to known entities" />
          </div>
          <div className="span-3">
            <MetricCard label="Dispersed" value={`${c.dispersed_pct.toFixed(0)}%`} series={[]} color="var(--ink-40)" footnote="long-tail stakers + holders" />
          </div>
          <div className="span-3">
            <MetricCard label="Largest block" value={`${c.largest.pct.toFixed(1)}%`} series={[]} color="var(--moss)" footnote={c.largest.name} />
          </div>
          <div className="span-3">
            <MetricCard label="Total supply" value={fmtCompact(c.total_supply)} unit="ATOM" series={[]} color="var(--sand)" footnote="no hard cap" />
          </div>

          <div className="span-3">
            <MetricCard label="Bonded" value={`${bondedPct.toFixed(1)}%`} series={[]} color="var(--moss)" footnote={`${fmtCompact(c.bonded)} ATOM staked`} />
          </div>
          <div className="span-3">
            <MetricCard label="Liquid" value={`${liquidPct.toFixed(1)}%`} series={[]} color="var(--hub-2)" footnote={`${fmtCompact(c.liquid)} ATOM unbonded`} />
          </div>
          <div className="span-3">
            <MetricCard label="Exchange custody" value={`${custodyPct.toFixed(1)}%`} series={[]} color="var(--hub)" footnote={`${fmtCompact(c.exchange_custody)} ATOM, customer funds`} />
          </div>
          <div className="span-3">
            <MetricCard label="Community pool" value={`${poolPct.toFixed(2)}%`} series={[]} color="var(--sand)" footnote={`${fmtCompact(c.community_pool)} ATOM on-chain treasury`} />
          </div>

          {/* The attribution bar: one stacked bar over total supply + per-entity breakdown */}
          <div className="span-12">
            <IntelCard
              title="Supply attribution"
              meta={`${fmtCompact(c.total_supply)} ATOM total · each block's share of supply · live`}
              shareFilename="bedrock-atom-distribution"
              share={{
                title: "ATOM supply attribution · Cosmos HUB",
                subtitle: "How much of all ATOM can be attributed to known entities",
                big: `${c.attributed_pct.toFixed(0)}%`,
                unit: "attributable",
                context: "Supply-denominated attribution from verified on-chain holdings. The remainder is dispersed across wallets not yet individually indexed.",
                body: (
                  <ShareBars
                    unit=""
                    maxRows={6}
                    rows={[
                      ...c.attributed.slice(0, 5).map((a) => ({ label: a.name, value: a.pct, color: a.color, display: `${fmtCompact(a.atom)} ATOM`, note: `· ${a.pct.toFixed(1)}%` })),
                      { label: "Dispersed", value: c.dispersed_pct, color: "var(--ink-20)", display: `${fmtCompact(c.dispersed_atom)} ATOM`, note: `· ${c.dispersed_pct.toFixed(1)}%` },
                    ]}
                  />
                ),
              }}
            >
              {/* Stacked bar */}
              <div className="gbar" style={{ display: "flex", height: 26, width: "100%" }}>
                {segments.map((s) => (
                  <div key={s.label} className="gbar-seg" title={`${s.label} · ${s.pct.toFixed(1)}%`} style={{ width: `${Math.max(0.4, s.pct)}%`, "--gbar-c": s.color } as React.CSSProperties} />
                ))}
              </div>

              {/* Legend / breakdown rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
                {c.attributed.map((a) => (
                  <div key={a.name} style={{ display: "grid", gridTemplateColumns: "14px 150px 1fr 150px", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: a.color }} />
                    <span className="data" style={{ fontSize: 12.5, color: "var(--ink)", fontWeight: 600 }}>{a.name}</span>
                    <span className="data" style={{ fontSize: 11, color: "var(--ink-40)", textTransform: "uppercase", letterSpacing: 0.8 }}>{a.basis}</span>
                    <span className="data" style={{ fontSize: 12.5, color: "var(--ink-80)", textAlign: "right" }}>
                      {fmtCompact(a.atom)} ATOM<span style={{ color: "var(--ink-40)" }}> · {a.pct.toFixed(1)}%</span>
                    </span>
                  </div>
                ))}
                {/* Dispersed remainder */}
                <div style={{ display: "grid", gridTemplateColumns: "14px 150px 1fr 150px", alignItems: "center", gap: 12, paddingTop: 8, borderTop: "1px solid var(--ink-10)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--ink-20)" }} />
                  <span className="data" style={{ fontSize: 12.5, color: "var(--ink-60)", fontWeight: 600 }}>Dispersed</span>
                  <span className="data" style={{ fontSize: 11, color: "var(--ink-40)", textTransform: "uppercase", letterSpacing: 0.8 }}>not yet individually indexed</span>
                  <span className="data" style={{ fontSize: 12.5, color: "var(--ink-60)", textAlign: "right" }}>
                    {fmtCompact(c.dispersed_atom)} ATOM<span style={{ color: "var(--ink-40)" }}> · {c.dispersed_pct.toFixed(1)}%</span>
                  </span>
                </div>
              </div>
            </IntelCard>
          </div>

          {/* One tiny methodology link (allowed) */}
          <div className="span-12">
            <div className="data" style={{ fontSize: 11, color: "var(--ink-40)", letterSpacing: 0.4 }}>
              Attribution from verified entity holdings; the dispersed remainder is real ATOM, not an estimate.{" "}
              <a href="/methodology" style={{ color: "var(--hub)", textDecoration: "underline" }}>Methodology</a>
            </div>
          </div>
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
