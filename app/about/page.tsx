import { SectionHead } from "@/components/SectionHead";
import { Mark } from "@/components/Mark";
import { ConsolePage, ConsoleModule } from "@/components/console/Console";
import { seo } from "@/lib/seo";

export const metadata = seo({ title: "About", description: "About Bedrock: the open-source on-chain source of truth for ATOM, live economic intelligence for the Cosmos Hub, built and operated by Silk Nodes.", path: "/about", keywords: ["about Bedrock", "Silk Nodes", "Cosmos Hub analytics", "ATOM on-chain data"] });

export default function AboutPage() {
  return (
    <ConsolePage>
      <ConsoleModule>
      {/* HERO ============================================================ */}
      <section style={{ paddingTop: 32, paddingBottom: 18, maxWidth: 1000 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          Colophon · the project
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
          A public good for ATOM.
        </h1>

        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            lineHeight: 1.45,
            color: "var(--ink-80)",
            maxWidth: 760,
          }}
        >
          Bedrock is the public receipts layer for ATOM. Every flow, every cohort,
          every block, from Cosmos HUB genesis to the present. Built and operated
          by Silk Nodes, an active validator on the Cosmos HUB.
        </div>
      </section>

      {/* SECTION 01 · WHAT THIS IS ======================================= */}
      <SectionHead title="What this is" note="three paragraphs" />
      <div className="mgrid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 48, marginBottom: 24 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>The artifact</div>
          <p className="body" style={{ margin: 0, color: "var(--ink-80)", fontSize: 15, lineHeight: 1.65 }}>
            A public web dashboard, public read-only API, and continuously
            running on-chain indexer. Every chart is reproducible from the
            public repository. Every label has a source.
          </p>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>The product promise</div>
          <p className="body" style={{ margin: 0, color: "var(--ink-80)", fontSize: 15, lineHeight: 1.65 }}>
            Facts, not narrative. No projections, no recommendations, no
            opinion panels. The unknown share is shown alongside the labeled
            share. Methodology-first by design.
          </p>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>The role</div>
          <p className="body" style={{ margin: 0, color: "var(--ink-80)", fontSize: 15, lineHeight: 1.65 }}>
            Complements vendor research reports rather than competing with
            them. Vendor reports produce narrative interpretation. Bedrock
            produces continuously updating raw receipts.
          </p>
        </div>
      </div>

      {/* SECTION 02 · WHO BUILDS IT ====================================== */}
      <SectionHead title="Who builds it" note="Silk Nodes" />
      <div className="mgrid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 64, alignItems: "start" }}>
        <div>
          <Mark variant="hv1" size={200} radius={4} />
          <div className="data" style={{ marginTop: 16, color: "var(--ink-60)", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" }}>
            Operator · active validator on Cosmos HUB
          </div>
        </div>
        <div>
          <p className="body-l" style={{ margin: "0 0 20px", color: "var(--ink-80)", maxWidth: 720 }}>
            <a href="https://silknodes.io" target="_blank" rel="noopener noreferrer" style={{ color: "var(--ink)", borderBottom: "1px solid var(--hub)", paddingBottom: 2 }}>
              Silk Nodes
            </a>{" "}
            operates validator infrastructure and public analytics products across multiple blockchain networks.
          </p>
          <p className="body" style={{ margin: "0 0 16px", color: "var(--ink-80)", fontSize: 15, lineHeight: 1.65, maxWidth: 720 }}>
            Bedrock is Silk Nodes' first dedicated Cosmos analytics product. It
            extends a proven shipping capability (two public analytics
            products in production today) to the Cosmos HUB specifically,
            with an ATOM-only focus and the methodology-first design ethos
            that distinguishes Bedrock from generalist multi-chain dashboards.
          </p>
          <div style={{ marginTop: 32, display: "flex", gap: 32, flexWrap: "wrap" }}>
            <ProductCard
              href="https://tx.silknodes.io"
              title="tx.silknodes.io"
              tagline="TX Network analytics"
            />
            <ProductCard
              href="https://pev.silknodes.io"
              title="pev.silknodes.io"
              tagline="Monad Parallel Execution Visualizer"
            />
            <ProductCard
              href="https://silknodes.io"
              title="silknodes.io"
              tagline="Validator profile"
            />
          </div>
        </div>
      </div>

      {/* SECTION 03 · OPEN SOURCE ======================================== */}
      <SectionHead title="Open source" note="MIT · contribute" />
      <div className="mgrid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>License</div>
          <h3 className="h3" style={{ margin: "0 0 12px", color: "var(--ink)" }}>
            MIT, from day one
          </h3>
          <p className="body" style={{ margin: 0, color: "var(--ink-80)", fontSize: 15, lineHeight: 1.65 }}>
            Bedrock is released under the MIT license. Fork it, run your own
            instance, ship a fork that does something different. No CLA, no
            contributor friction. The repository is published from the first
            day of development, not at launch.
          </p>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Contributing</div>
          <h3 className="h3" style={{ margin: "0 0 12px", color: "var(--ink)" }}>
            Pull requests welcome
          </h3>
          <p className="body" style={{ margin: 0, color: "var(--ink-80)", fontSize: 15, lineHeight: 1.65 }}>
            Especially for the address label list. Every accepted label
            appears in the repo with attribution. The label CSV lives at{" "}
            <code style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink)" }}>labels/labels.csv</code>.
          </p>
        </div>
      </div>

      <div style={{ marginTop: 32, padding: 24, border: "1px solid var(--ink)", background: "var(--paper-2)" }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Repository</div>
        <a
          href="https://github.com/Silk-Nodes/bedrock"
          target="_blank"
          rel="noopener noreferrer"
          className="display"
          style={{ fontSize: 28, color: "var(--ink)", letterSpacing: "-0.04em" }}
        >
          github.com/Silk-Nodes/bedrock
        </a>
      </div>

      {/* SECTION 04 · ROADMAP ============================================ */}
      <SectionHead title="Roadmap" note="what comes after v1" />
      <table className="broadsheet">
        <thead>
          <tr>
            <th style={{ width: 130 }}>Window</th>
            <th>Milestone</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ color: "var(--hub)", fontWeight: 600, verticalAlign: "top", paddingTop: 14 }}>v1</td>
            <td style={{ fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1.6, color: "var(--ink-80)", paddingTop: 12 }}>
              Public site live at bedrock.silknodes.io with Overview, Stakers, Exchanges, Validators, ETF and Methodology pages. Public GitHub repository. CSV exports.
            </td>
          </tr>
          <tr>
            <td style={{ color: "var(--hub)", fontWeight: 600, verticalAlign: "top", paddingTop: 14 }}>v1.1</td>
            <td style={{ fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1.6, color: "var(--ink-80)", paddingTop: 12 }}>
              DEX / DeFi / IBC outbound section. Whales and top-address explorer. Per-address deep dive. Label set expanded to ~50 entities.
            </td>
          </tr>
          <tr>
            <td style={{ color: "var(--hub)", fontWeight: 600, verticalAlign: "top", paddingTop: 14 }}>v1.x</td>
            <td style={{ fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1.6, color: "var(--ink-80)", paddingTop: 12 }}>
              Public read-only API documented. Monthly written data digest. Community label PR process formalized.
            </td>
          </tr>
          <tr>
            <td style={{ color: "var(--hub)", fontWeight: 600, verticalAlign: "top", paddingTop: 14 }}>v2</td>
            <td style={{ fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1.6, color: "var(--ink-80)", paddingTop: 12 }}>
              Downstream chain indexing (where ATOM lands after leaving the Hub via IBC). Governance overlay. Validator behavior in governance.
            </td>
          </tr>
        </tbody>
      </table>

      {/* SECTION 05 · ACKNOWLEDGMENTS ==================================== */}
      <SectionHead title="Acknowledgments" note="credit where due" />
      <div className="body" style={{ color: "var(--ink-80)", maxWidth: 800, fontSize: 15, lineHeight: 1.7 }}>
        <p style={{ margin: "0 0 12px" }}>
          The Cosmos HUB validator set, for keeping the chain running for over six years.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          <a href="https://citizenweb3.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--ink)", textDecoration: "underline" }}>Citizen Web3</a>{" "}
          for the open-source chain-data-indexer reference and for running publicly accessible archive infrastructure.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          <a href="https://github.com/cosmos/chain-registry" target="_blank" rel="noopener noreferrer" style={{ color: "var(--ink)", textDecoration: "underline" }}>The Cosmos chain registry</a>{" "}
          for the canonical reference of IBC channels and module accounts.
        </p>
        <p style={{ margin: 0 }}>
          Validators, exchanges, custodians, and ETP issuers that publish their addresses with sources. Transparency works.
        </p>
      </div>

      {/* SECTION 06 · CONTACT ============================================ */}
      <SectionHead title="Contact" note="reach the team" />
      <div className="mgrid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 32 }}>
        <ContactRow label="Operator" value="Silk Nodes" href="https://silknodes.io" />
        <ContactRow label="GitHub" value="@Silk-Nodes" href="https://github.com/Silk-Nodes" />
        <ContactRow label="Telegram" value="t.me/silknodes" href="https://t.me/silknodes" />
      </div>
      </ConsoleModule>
    </ConsolePage>
  );
}

function ProductCard({ href, title, tagline }: { href: string; title: string; tagline: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        background: "var(--paper-2)",
        border: "1px solid var(--ink)",
        padding: 16,
        minWidth: 200,
        display: "block",
        textDecoration: "none",
      }}
    >
      <div
        className="display"
        style={{ fontSize: 16, letterSpacing: "-0.04em", marginBottom: 4, color: "var(--ink)" }}
      >
        {title}
      </div>
      <div className="data" style={{ fontSize: 11, color: "var(--ink-60)" }}>
        {tagline}
      </div>
    </a>
  );
}

function ContactRow({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <div style={{ borderTop: "1px solid var(--ink-20)", paddingTop: 16 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>{label}</div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="data"
        style={{ fontSize: 16, color: "var(--ink)", letterSpacing: 0.4 }}
      >
        {value}
      </a>
    </div>
  );
}
