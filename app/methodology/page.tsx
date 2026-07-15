import Link from "next/link";
import { SectionHead } from "@/components/SectionHead";
import { ConsolePage, ConsoleModule } from "@/components/console/Console";
import { getIndexerStatus } from "@/lib/indexer";
import {
  PRINCIPLES,
  COHORTS,
  COHORT_PRIORITY,
  COVERAGE,
  historyPct,
  CHANGELOG,
} from "@/data/methodology";
import { seo } from "@/lib/seo";

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}
function fmtM(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toString();
}

export const revalidate = 120;

const TOC = [
  { id: "principles",  num: "01", label: "Principles" },
  { id: "cohorts",     num: "02", label: "Cohort definitions" },
  { id: "labels",      num: "03", label: "Label list" },
  { id: "coverage",    num: "04", label: "Coverage" },
  { id: "changelog",   num: "05", label: "Changelog" },
];

export const metadata = seo({ title: "Methodology", description: "How Bedrock measures the Cosmos Hub: data sources, label verification, on-chain definitions, and the accounting principles behind every number.", path: "/methodology", keywords: ["Cosmos Hub methodology", "ATOM data methodology", "on-chain accounting"] });

export default async function MethodologyPage() {
  const idx = await getIndexerStatus();


  return (
    <ConsolePage>
      <ConsoleModule>
      {/* HERO ============================================================ */}
      <section style={{ paddingTop: 32, paddingBottom: 18, maxWidth: 1000 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          Section 06 · How we count · the authoritative reference
        </div>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: 56,
            lineHeight: 0.95,
            letterSpacing: "-0.025em",
            margin: "0 0 14px",
            color: "var(--ink)",
          }}
        >
          Every claim, with its rule.
        </h1>

        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            lineHeight: 1.45,
            color: "var(--ink-80)",
            maxWidth: 800,
          }}
        >
          Every chart on Bedrock links here. This is the document that defines
          how a number is computed. Versioned, dated, reviewable in the public
          GitHub repository.
        </div>

        <div
          className="data"
          style={{ marginTop: 18, color: "var(--ink-60)" }}
        >
          v2.0 · last revised 2026-05-28 ·{" "}
          <a
            href="https://github.com/Silk-Nodes/bedrock"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--hub)", textDecoration: "underline" }}
          >
            github.com/Silk-Nodes/bedrock
          </a>
        </div>
      </section>

      {/* Indexer coverage (live) ======================================== */}
      {idx.live && (
        <section style={{ paddingBottom: 24, maxWidth: 1000 }}>
          <div className="surface" style={{ padding: "20px 24px" }}>
            <div className="eyebrow" style={{ marginBottom: 14, color: "var(--hub)" }}>Indexer coverage · live</div>
            <div className="mgrid-2" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "var(--ink-15)", border: "1px solid var(--ink-15)" }}>
              {[
                { label: "Hub history indexed", value: `${idx.pct.toFixed(1)}%` },
                { label: "Blocks indexed", value: fmtM(idx.last_height) },
                { label: "Remaining", value: fmtM(Math.max(0, idx.tip_height - idx.last_height)) },
                { label: "Tip-follower", value: idx.tip_lag <= 5 ? "live · capturing" : `${fmtM(idx.tip_lag)} behind` },
              ].map((c) => (
                <div key={c.label} style={{ background: "var(--paper)", padding: "14px 16px" }}>
                  <div className="eyebrow" style={{ marginBottom: 6 }}>{c.label}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 21, color: "var(--ink)", letterSpacing: "-0.02em" }}>{c.value}</div>
                </div>
              ))}
            </div>
            <div className="data" style={{ marginTop: 12, fontSize: 11, color: "var(--ink-40)", lineHeight: 1.6 }}>
              Bedrock runs its own indexer: a tip-follower capturing every new block live, plus a genesis backfill filling in history.
              This is the public-accounting layer, built block by block, not borrowed from an explorer.
            </div>
          </div>
        </section>
      )}

      {/* TOC strip ======================================================= */}
      <nav
        aria-label="On this page"
        style={{
          borderTop: "1px solid var(--ink)",
          borderBottom: "1px solid var(--ink)",
          padding: "16px 0",
          marginTop: 48,
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 24,
          overflowX: "auto",
          flexWrap: "wrap",
        }}
      >
        <span
          className="eyebrow"
          style={{ color: "var(--hub)", fontWeight: 600, flexShrink: 0 }}
        >
          On this page
        </span>
        {TOC.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: 0.4,
              color: "var(--ink-80)",
              textTransform: "uppercase",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
            }}
          >
            <span style={{ color: "var(--ink-40)" }}>{t.num}</span> {t.label}
          </a>
        ))}
      </nav>

      {/* SECTION 01 · PRINCIPLES ========================================= */}
      <SectionHead id="principles" title="How to read this page" note="four principles" />
      <div
        className="mgrid-1"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 1,
          background: "var(--ink)",
          border: "1px solid var(--ink)",
        }}
      >
        {PRINCIPLES.map((p, i) => (
          <div
            key={p.title}
            style={{
              background: "var(--paper-2)",
              padding: 32,
              borderTop: "4px solid var(--hub)",
              position: "relative",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 56,
                lineHeight: 0.9,
                letterSpacing: "-2px",
                color: "var(--hub-2)",
                marginBottom: 16,
                opacity: 0.85,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              0{i + 1}
            </div>
            <h3
              className="h3"
              style={{ margin: "0 0 12px", color: "var(--ink)" }}
            >
              {p.title}
            </h3>
            <p
              className="body"
              style={{
                margin: 0,
                color: "var(--ink-80)",
                fontSize: 15,
                lineHeight: 1.6,
              }}
            >
              {p.body}
            </p>
          </div>
        ))}
      </div>

      {/* SECTION 02 · COHORT DEFINITIONS ================================ */}
      <SectionHead
        id="cohorts"
        title="Cohort definitions"
        note="the rule for every cohort"
      />

      <div style={{ marginBottom: 32, maxWidth: 900 }}>
        <p
          className="body"
          style={{ color: "var(--ink-80)", fontSize: 15, lineHeight: 1.6, margin: 0 }}
        >
          Every ATOM address belongs to exactly one cohort at any given height.
          When multiple rules could apply, the higher-priority cohort wins. The
          priority order, highest first:{" "}
          <span style={{ color: "var(--ink)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
            {COHORT_PRIORITY.join(" → ")}
          </span>
          .
        </p>
      </div>

      <table className="broadsheet">
        <thead>
          <tr>
            <th style={{ width: 200 }}>Cohort</th>
            <th>Rule</th>
          </tr>
        </thead>
        <tbody>
          {COHORTS.map((c) => (
            <tr key={c.id}>
              <td
                style={{
                  color: "var(--ink)",
                  fontWeight: 600,
                  verticalAlign: "top",
                  paddingTop: 16,
                }}
              >
                {c.label}
              </td>
              <td
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "var(--ink-80)",
                  paddingTop: 14,
                  paddingBottom: 14,
                  maxWidth: 900,
                  letterSpacing: 0,
                }}
              >
                {c.rule}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* SECTION 03 · LABEL LIST ========================================= */}
      <SectionHead
        id="labels"
        title="Label list"
        note="live registry"
      />

      <div style={{ marginBottom: 32, maxWidth: 900 }}>
        <p
          className="body"
          style={{ color: "var(--ink-80)", fontSize: 15, lineHeight: 1.6, margin: 0 }}
        >
          Every labeled address Bedrock uses for attribution lives in one
          registry, with the source named per row. Only verified labels drive
          flow classification: protocol and IBC accounts are derived on-chain,
          exchange wallets require a self-disclosed or independently corroborated
          source, and anything unconfirmed is left unlabeled rather than guessed.
          The registry is served live from the indexer, not a static list, so it
          stays current as new addresses clear the bar.
        </p>
        <Link
          href="/labels"
          className="data"
          style={{
            display: "inline-block", marginTop: 16, fontSize: 12, letterSpacing: 1,
            textTransform: "uppercase", color: "var(--hub)", borderBottom: "1px solid var(--hub)",
            paddingBottom: 2,
          }}
        >
          Open the live label registry →
        </Link>
      </div>

      {/* SECTION 04 · COVERAGE =========================================== */}
      <SectionHead
        id="coverage"
        title="Index coverage"
        note={`what we have, what we don't · as of ${COVERAGE.as_of}`}
      />

      <div
        className="mgrid-1"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 1,
          background: "var(--ink)",
          border: "1px solid var(--ink)",
          marginBottom: 40,
        }}
      >
        <div style={{ background: "var(--paper-2)", padding: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Live at the tip</div>
          <div className="d3" style={{ color: "var(--moss)", marginBottom: 8 }}>
            {COVERAGE.tip_lag_blocks}
          </div>
          <div className="data" style={{ color: "var(--ink-60)" }}>
            blocks behind the head · continuous since {COVERAGE.continuous_from}
          </div>
        </div>
        <div style={{ background: "var(--paper-2)", padding: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>History backfilled</div>
          <div className="d3" style={{ color: "var(--ink)", marginBottom: 8 }}>
            {pct(historyPct())}
          </div>
          <div className="data" style={{ color: "var(--ink-60)" }}>
            genesis → block {(COVERAGE.history_cursor / 1_000_000).toFixed(2)}M of{" "}
            {(COVERAGE.chain_tip / 1_000_000).toFixed(2)}M · still walking
          </div>
        </div>
        <div style={{ background: "var(--paper-2)", padding: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Labels active</div>
          <div className="d3" style={{ color: "var(--ink)", marginBottom: 8 }}>
            {COVERAGE.labels_active}
          </div>
          <div className="data" style={{ color: "var(--ink-60)" }}>
            {COVERAGE.labels_certain} certain · {COVERAGE.labels_high} high ·{" "}
            {COVERAGE.labels_inferred} inferred
          </div>
        </div>
      </div>

      {/* Range strip */}
      <div
        style={{
          background: "var(--paper-2)",
          border: "1px solid var(--ink)",
          padding: 24,
          marginBottom: 40,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 32,
        }}
        className="mgrid-1"
      >
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Two cursors</div>
          <div
            className="data"
            style={{ color: "var(--ink)", fontSize: 16, marginBottom: 4 }}
          >
            Genesis {COVERAGE.genesis_height.toLocaleString("en-US")} → block{" "}
            {COVERAGE.history_cursor.toLocaleString("en-US")}
          </div>
          <div className="data" style={{ color: "var(--ink-60)" }}>
            One cursor walks forward from genesis. A second sits at the chain head
            ({COVERAGE.chain_tip.toLocaleString("en-US")}), so recent data is
            continuous while history fills in behind it.
          </div>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>The gap</div>
          <div
            className="data"
            style={{ color: "var(--sand)", fontSize: 16, marginBottom: 4 }}
          >
            Roughly 2022 → 2025, still being written
          </div>
          <div className="data" style={{ color: "var(--ink-60)" }}>
            Anything spanning that window is incomplete, and every chart labels the
            window it actually covers rather than the one it asked for.{" "}
            <span style={{ color: "var(--moss)" }}>Indexer healthy.</span>
          </div>
        </div>
      </div>

      {/* Volume coverage breakdown (last 30d) */}
      <div
        className="eyebrow"
        style={{ marginBottom: 12, marginTop: 24 }}
      >
        Volume breakdown · last 30 days
      </div>
      <div
        className="gbar"
        style={{
          display: "flex",
          height: 64,
          marginBottom: 12,
        }}
      >
        <div
          className="gbar-seg"
          style={{
            width: `${COVERAGE.pct_volume_labeled_30d}%`,
            "--gbar-c": "var(--hub)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--paper)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: 0.4,
          } as React.CSSProperties}
        >
          {pct(COVERAGE.pct_volume_labeled_30d)} labeled both sides
        </div>
        <div
          className="gbar-seg"
          style={{
            width: `${COVERAGE.pct_volume_unknown_one_side_30d}%`,
            "--gbar-c": "var(--hub-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--paper)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: 0.4,
          } as React.CSSProperties}
        >
          {pct(COVERAGE.pct_volume_unknown_one_side_30d)} one side unknown
        </div>
        <div
          className="gbar-seg"
          style={{
            width: `${COVERAGE.pct_volume_unknown_both_sides_30d}%`,
            "--gbar-c": "var(--ink-20)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: 0.4,
          } as React.CSSProperties}
        >
          {pct(COVERAGE.pct_volume_unknown_both_sides_30d)} both sides unknown
        </div>
      </div>
      <p
        className="data"
        style={{ color: "var(--ink-60)", fontSize: 12, maxWidth: 800, lineHeight: 1.55 }}
      >
        Of every ATOM transfer in the last 30 days, this is how much we can
        trace to named entities. The unknown share grows as flows pass through
        unlabeled addresses. As the label set expands, the indigo block widens.
      </p>

      {/* SECTION 05 · CHANGELOG ========================================== */}
      <SectionHead id="changelog" title="Changelog" note="every revision, dated" />

      <table className="broadsheet" style={{ marginBottom: 32 }}>
        <thead>
          <tr>
            <th style={{ width: 130 }}>Date</th>
            <th style={{ width: 100 }}>Version</th>
            <th>Summary</th>
          </tr>
        </thead>
        <tbody>
          {CHANGELOG.map((c) => (
            <tr key={c.version}>
              <td style={{ color: "var(--ink-60)", verticalAlign: "top", paddingTop: 14 }}>
                {c.date}
              </td>
              <td
                style={{
                  color: "var(--hub)",
                  fontWeight: 600,
                  verticalAlign: "top",
                  paddingTop: 14,
                }}
              >
                v{c.version}
              </td>
              <td
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "var(--ink-80)",
                  paddingTop: 12,
                  paddingBottom: 12,
                  letterSpacing: 0,
                }}
              >
                {c.summary}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* CLOSER ========================================================== */}
      <section
        style={{
          marginTop: 80,
          padding: 40,
          background: "var(--ink)",
          color: "var(--paper)",
        }}
      >
        <div
          className="eyebrow"
          style={{ color: "color-mix(in srgb, var(--paper) 60%, var(--ink))", marginBottom: 16 }}
        >
          Bedrock is open source
        </div>
        <h2
          className="h2"
          style={{ margin: "0 0 24px", color: "var(--paper)", maxWidth: 800 }}
        >
          Every query, every schema, every label. Read the source.
        </h2>
        <div
          className="body"
          style={{
            color: "color-mix(in srgb, var(--paper) 84%, var(--ink))",
            maxWidth: 800,
            lineHeight: 1.65,
            fontSize: 15,
          }}
        >
          <p style={{ margin: "0 0 16px" }}>
            Bedrock is built and operated by{" "}
            <a
              href="https://silknodes.io"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--paper)",
                textDecoration: "underline",
                textUnderlineOffset: 4,
              }}
            >
              Silk Nodes
            </a>
            , an active validator on the Cosmos HUB, and licensed under MIT.
            The repository contains every SQL query behind every chart, the
            indexer code, the database schema, the label list, and this
            methodology page itself.
          </p>
          <p style={{ margin: 0 }}>
            <a
              href="https://github.com/Silk-Nodes/bedrock"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--paper)",
                textDecoration: "underline",
                textUnderlineOffset: 4,
              }}
            >
              github.com/Silk-Nodes/bedrock →
            </a>
          </p>
        </div>
      </section>
      </ConsoleModule>
    </ConsolePage>
  );
}
