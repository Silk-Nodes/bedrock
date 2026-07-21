// GET /og/rewards-behavior · what stakers do with claimed ATOM rewards,
// broken down by how much the wallet claimed.
//
// STATIC BY CHOICE, so it carries its own vintage (same contract as COVERAGE in
// data/methodology.ts). This is a fixed 40-day study, not a live ticker: the
// indexer exposes no aggregate endpoint for the claim/restake/exchange join, and
// a dated study window is the honest unit here. Frame gets `statusLabel` rather
// than a block height for exactly that reason, so the card never implies "live".
//
// WINDOW · 2026-06-09 to 2026-07-18, 40 complete days.
//   Continuous indexer coverage begins 2026-06-08 09:00 and there is NO data
//   before it, so a "last 2 months" framing would have been silently partial.
//   Verified: the only empty hours in the window are the 9 consecutive ones at
//   the start where indexing began (corroborated against transfer_events).
//
// METHOD
//   claimed   = sum(staking_events.reward_withdraw) per delegator in window
//   compound  = delegated >= 50% of claimed in the same window
//   sell      = transferred >= 50% of claimed to a known exchange address
//   exchange set = address_labels {cex, cex_custody, cex_ops} + inferred_exchange_addrs.
//     cex_validator is EXCLUDED: delegating to an exchange's validator is
//     staking, not selling.
//
// TWO CORRECTIONS BAKED IN, both of which changed the result:
//   1. Exchange-OWNED wallets are excluded as claimers (Kraken and Coinbase
//      custody rank in the top 15 claimers because they stake customer ATOM).
//      Leaving them in made exchanges shuffling their own hot wallets look like
//      users selling, and inflated the 10K+ sell rate from 12.5% to 21.3%.
//   2. With that fixed the sell ladder is NOT monotonic. It rises 1.3% -> 13.1%
//      across five tiers and then plateaus at 12.5%. The card says "then flattens"
//      instead of claiming a clean monotonic rise, which was a contamination artifact.
//
// The sell share is a FLOOR: it rests on ~109 labeled exchange addresses, so
// unlabeled CEX deposit wallets, DEX routes and IBC exits are not counted.
import { ImageResponse } from "next/og";
import { ogFonts, OG } from "../fonts";
import { Frame, OG_DIM } from "../card";

export const runtime = "nodejs";
export const revalidate = 3600;

const BLACK = "Fraunces";
const MONO = "Spline Mono";

const WINDOW = "JUN 9 - JUL 18 2026";
const WALLETS = 69_175;
const CLAIMED_M = "4.41M";

const TIERS = [
  { label: "< 1", compound: 25.8, sell: 1.3 },
  { label: "1 - 10", compound: 48.5, sell: 2.9 },
  { label: "10 - 100", compound: 53.4, sell: 5.0 },
  { label: "100 - 1K", compound: 50.3, sell: 9.9 },
  { label: "1K - 10K", compound: 40.2, sell: 13.1 },
  { label: "10K +", compound: 41.7, sell: 12.5 },
];

// One shared scale for both series so the bars stay honestly comparable:
// restaking genuinely dwarfs selling, and rescaling the sell bars to fill the
// row would hide the single most important fact on the card.
const SCALE_MAX = 60;
const TRACK = 300;
const w = (pct: number) => Math.max(2, Math.round((pct / SCALE_MAX) * TRACK));

export async function GET() {
  const Row = ({ label, compound, sell }: { label: string; compound: number; sell: number }) => (
    <div style={{ display: "flex", alignItems: "center", height: 37 }}>
      <div style={{ display: "flex", width: 112, fontFamily: MONO, fontSize: 19, color: OG.soft, justifyContent: "flex-end", paddingRight: 20 }}>
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", width: TRACK + 4 }}>
        <div style={{ display: "flex", width: w(compound), height: 11, background: OG.green, borderRadius: 2 }} />
        <div style={{ display: "flex", width: w(sell), height: 11, background: OG.red, borderRadius: 2, marginTop: 5 }} />
      </div>
      <div style={{ display: "flex", width: 76, fontFamily: BLACK, fontWeight: 400, fontSize: 24, color: OG.ink, justifyContent: "flex-end" }}>
        {compound.toFixed(1)}%
      </div>
      <div style={{ display: "flex", width: 72, fontFamily: BLACK, fontWeight: 400, fontSize: 24, color: OG.red, justifyContent: "flex-end" }}>
        {sell.toFixed(1)}%
      </div>
    </div>
  );

  return new ImageResponse(
    (
      <Frame statusLabel={WINDOW}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", paddingTop: 14 }}>
          <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 42, lineHeight: 1.05, color: OG.ink, letterSpacing: -1 }}>
            Small stakers compound. Large stakers cash out.
          </div>

          {/* Legend doubles as the column header: rows are ATOM claimed per wallet. */}
          <div style={{ display: "flex", alignItems: "center", marginTop: 16, marginBottom: 10 }}>
            <div style={{ display: "flex", width: 112, fontFamily: MONO, fontSize: 15, letterSpacing: 2, color: OG.faint, justifyContent: "flex-end", paddingRight: 20 }}>
              ATOM
            </div>
            <div style={{ display: "flex", width: 11, height: 11, background: OG.green, borderRadius: 2 }} />
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 16, color: OG.soft, marginLeft: 9, marginRight: 26 }}>restaked</div>
            <div style={{ display: "flex", width: 11, height: 11, background: OG.red, borderRadius: 2 }} />
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 16, color: OG.soft, marginLeft: 9 }}>sent to an exchange</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {TIERS.map((t) => (
              <Row key={t.label} label={t.label} compound={t.compound} sell={t.sell} />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", fontFamily: MONO, fontSize: 18, color: OG.soft, marginBottom: 8 }}>
          {WALLETS.toLocaleString("en-US")} wallets · {CLAIMED_M} ATOM · 40 days · CEX-owned excluded · sell share is a floor
        </div>
      </Frame>
    ),
    { ...OG_DIM, fonts: ogFonts() },
  );
}
