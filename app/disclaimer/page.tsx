// /disclaimer · what Bedrock is, what it is not, and what "beta" actually means.
//
// Bedrock sells nothing, so this reads as a public-good statement rather than
// legal cover. Every claim here is specific and checkable: the beta section
// quotes the real coverage numbers (static, stamped with COVERAGE.as_of) instead
// of hand-waving at "early software".
//
// Mobile: single column, fluid type, no fixed widths. The prose column caps at
// 78ch on desktop and simply fills the screen below that.

import Link from "next/link";
import { ConsolePage, ConsoleModule } from "@/components/console/Console";
import { COVERAGE, historyPct } from "@/data/methodology";
import { seo } from "@/lib/seo";

export const metadata = seo({
  title: "Disclaimer",
  description:
    "Bedrock is a free public good for the Cosmos Hub community. Informational only, not financial advice. What beta means, what the numbers are and are not.",
  path: "/disclaimer",
  keywords: ["Bedrock disclaimer", "not financial advice", "ATOM analytics beta"],
});

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 44 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
        <span
          className="data"
          style={{ fontSize: 11, letterSpacing: 1.4, color: "var(--hub)", fontWeight: 700 }}
        >
          {n}
        </span>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(19px, 4.4vw, 24px)",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "var(--ink)",
            lineHeight: 1.25,
          }}
        >
          {title}
        </h2>
      </div>
      <div
        style={{
          fontSize: "clamp(14px, 3.6vw, 15px)",
          lineHeight: 1.72,
          color: "var(--ink-70)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {children}
      </div>
    </section>
  );
}

// A labelled point inside a section. Stacks on mobile, no grid tricks.
function Point({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p style={{ margin: 0 }}>
      <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{label}</strong>{" "}
      {children}
    </p>
  );
}

export default function Disclaimer() {
  return (
    <ConsolePage>
      <ConsoleModule
        lead
        title="Disclaimer"
        dot="var(--sand)"
        meta={`free public good · beta · coverage as of ${COVERAGE.as_of}`}
      >
        <div style={{ maxWidth: "78ch", padding: "4px 0 8px" }}>
          <Section n="01" title="What Bedrock is">
            <p style={{ margin: 0 }}>
              Bedrock is a free, public, open-source analytics layer for ATOM on the
              Cosmos Hub, built and paid for by{" "}
              <a
                href="https://silknodes.io"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--hub)" }}
              >
                Silk Nodes
              </a>
              .
            </p>
            <p style={{ margin: 0 }}>
              There is no token. No fees, no ads, no affiliate links, no paid tier, no
              login, no data for sale. Nothing on this site is for sale, and we are not
              asking you for anything. It exists so the on-chain facts about ATOM are
              readable by anyone.
            </p>
          </Section>

          <Section n="02" title="Not financial advice">
            <p style={{ margin: 0 }}>
              Everything here is information, not advice. Nothing on Bedrock is a
              recommendation to buy, sell, hold, stake, unstake, or vote, and nothing
              here is an opinion about what ATOM is worth or where its price is going.
              We publish what the chain records. What you do with it is yours.
            </p>
            <p style={{ margin: 0 }}>
              We are not financial advisors, and Bedrock is not a broker, exchange, or
              custodian. Do your own research.
            </p>
          </Section>

          <Section n="03" title="What beta means">
            <p style={{ margin: 0 }}>
              Bedrock is in beta. Not as a disclaimer reflex: there are four specific
              things you should know.
            </p>
            <Point label="The history is still filling.">
              We index with two cursors. One sits at the chain head and is currently{" "}
              {COVERAGE.tip_lag_blocks} blocks behind it, so recent data is continuous
              since {COVERAGE.continuous_from}. The other walks forward from genesis and
              has reached block {COVERAGE.history_cursor.toLocaleString("en-US")} of{" "}
              {COVERAGE.chain_tip.toLocaleString("en-US")}, about{" "}
              {historyPct().toFixed(0)}% of chain history. The middle years are still
              being written. Charts label the window they actually cover, not the window
              they asked for.
            </Point>
            <Point label="The label set grows.">
              {COVERAGE.labels_active} addresses are labelled today (
              {COVERAGE.labels_certain} certain, {COVERAGE.labels_high} high-confidence,{" "}
              {COVERAGE.labels_inferred} inferred). Flow we cannot attribute stays
              unattributed rather than guessed, and the unattributed share is shown
              rather than hidden. As labels are added, attribution sharpens and numbers
              move. See the live registry at{" "}
              <Link href="/labels" style={{ color: "var(--hub)" }}>
                /labels
              </Link>
              .
            </Point>
            <Point label="Definitions can change.">
              Where a figure is a proxy rather than a measurement, the page says so.
              Where a definition changes, it goes in the{" "}
              <Link href="/methodology#changelog" style={{ color: "var(--hub)" }}>
                changelog
              </Link>
              . Numbers can be restated when a method improves.
            </Point>
            <Point label="There will be bugs.">
              This is software written by a small team and shipped often. If a number
              looks wrong, it might be wrong. That is not a formality: please tell us,
              and we will fix it in public.
            </Point>
          </Section>

          <Section n="04" title="What the numbers are, and are not">
            <Point label="On-chain only.">
              Bedrock reads the Cosmos Hub. Anything that happens off-chain, inside an
              exchange's own books for example, is invisible to it and to every other
              on-chain tool.
            </Point>
            <Point label="Sell pressure is intent, not sales.">
              ATOM moved onto an exchange wallet is the on-chain action that usually
              precedes a sale. It is not a filled order. Whether it was sold, held, or
              withdrawn again happens off-chain. Read those figures as an upper bound on
              possible distribution, never as executed volume.
            </Point>
            <Point label="Attribution is a lower bound.">
              Reward and flow attribution is same-wallet, same-window, and deliberately
              conservative. ATOM moved to a second wallet before selling is not
              attributed. We would rather understate than invent.
            </Point>
            <Point label="Labels are evidence, not certainty.">
              Only documented, verified addresses classify exchange flow. Inferred labels
              are marked as inferred. An address being unlabelled means we have not
              proven it, not that it is innocent.
            </Point>
            <p style={{ margin: 0 }}>
              The full method behind every figure is at{" "}
              <Link href="/methodology" style={{ color: "var(--hub)" }}>
                /methodology
              </Link>
              .
            </p>
          </Section>

          <Section n="05" title="No warranty">
            <p style={{ margin: 0 }}>
              Bedrock is provided as-is, with no warranty of any kind. It may be wrong,
              incomplete, delayed, or unavailable. It is a best-effort public good, not a
              service you are owed. Do not use it as your only input for a decision that
              matters, and do not rely on it as a system of record.
            </p>
            <p style={{ margin: 0 }}>
              The code is MIT-licensed and public, so you can check any of this yourself.
            </p>
          </Section>

          <Section n="06" title="Found something wrong?">
            <p style={{ margin: 0 }}>
              Tell us. Wrong number, broken page, missing label, bad definition, all of it
              welcome. The board is public and every request is visible.
            </p>
            <p style={{ margin: 0, display: "flex", flexWrap: "wrap", gap: 10 }}>
              <Link
                href="/feedback"
                className="pressable"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 15px",
                  border: "1px solid var(--hub)",
                  borderRadius: 6,
                  color: "var(--hub)",
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Open the feedback board →
              </Link>
              <a
                href="https://github.com/Silk-Nodes/bedrock"
                target="_blank"
                rel="noopener noreferrer"
                className="pressable"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 15px",
                  border: "1px solid var(--card-line)",
                  borderRadius: 6,
                  color: "var(--ink-70)",
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Read the source
              </a>
            </p>
          </Section>

          <div
            className="data"
            style={{
              fontSize: 11.5,
              color: "var(--ink-40)",
              lineHeight: 1.7,
              borderTop: "1px solid var(--card-line)",
              paddingTop: 18,
            }}
          >
            Coverage figures on this page are a static snapshot taken {COVERAGE.as_of} and
            will drift as the backfill advances. They are stamped rather than live so you
            can see how old the disclosure is.
          </div>
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
