// GET /og/icf-flows · what the Interchain Foundation's wallets actually did,
// traced hop by hop, against a claim that they are dumping ATOM on exchanges.
//
// THE CLAIM, ANSWERED HONESTLY. This exists because someone asserted the ICF
// would "load up the exchanges and dump it for USD". Some ATOM did reach a
// Coinbase wallet, and the card says so plainly, because denying it is
// falsifiable in one explorer lookup. What the card adds is the scale, and the
// correction that the destination is not a sell-side wallet.
//
// THE TRACE (indexed transfer_events, exact timestamps, final leg tx
// 88BABAFF52739B2F8BFEE6F0B25C6699CAFA3881F7261A73779E04A697EB4DE9):
//   12:13:04  ICF "Prev treasury 1" -> intermediary A   25,000.004 ATOM
//   12:21:55  intermediary A        -> intermediary B   20,000.000 ATOM
//   12:23:22  intermediary B        -> Coinbase         19,999.980 ATOM
// TWO intermediaries, three transfers, 10 minutes 18 seconds end to end. An
// earlier draft of this card said "one hop, 87 seconds"; 87s is only the final
// leg. Do not reintroduce that.
//
// ATTRIBUTION IS SOLID, and this is why. Intermediary A's complete history is
// 3 inbound / 10 outbound with ZERO staking events, so no rewards complicate
// the balance. Working back from its live balance (469.15 ATOM):
//   prior = 469.150 - (33,379.328 in - 36,517.579 out) = ~3,607 ATOM
// It held ~3,607 before the ICF transfer, so it could NOT have sent 20,000
// without it. The coins are traceable, not merely coincident in time.
//
// THE DESTINATION IS NOT A SALE. cosmos1t5u0jfg3ljs… is labelled Coinbase
// `cex_ops`, and our own source note records that it "directly funds Coinbase01
// custody shards" — Coinbase01 being Coinbase's validator. So this is custody /
// staking-ops movement. Calling it a sale would be unsupported, and would be the
// easiest thing on this card for someone to disprove.
//
// EXCLUDED ON PURPOSE: the other ~13.4k ATOM went into a high-volume address
// (5.67M ATOM over 2,122 transfers) that does send to Binance. Those coins are
// commingled, so attributing them to the ICF is unsupportable. Only the clean
// leg is counted. Also excluded: 146 dust transfers totalling 1.02 ATOM from
// "Delegation 1" to the fee collector, which are gas, not movements.
//
// ADDRESS PROVENANCE: the four ICF wallets come from lib/icf.ts and were
// confirmed by the operator. Corroborated on-chain: "Delegation program 1"
// delegates across 73 distinct validators over 219 events, which is what a
// foundation delegation program looks like.
//
// WINDOW: 2026-06-08 to 2026-07-23, the continuous-coverage window. The card
// says "six weeks", never "ever" or "never", because the historical backfill
// has not reached the middle years.
//
// STATIC BY CHOICE with an AS OF stamp, same vintage contract as COVERAGE in
// data/methodology.ts. Re-render before reuse.
import { ImageResponse } from "next/og";
import { ogFonts, OG } from "../fonts";
import { Frame, OG_DIM } from "../card";

export const runtime = "nodejs";
export const revalidate = 3600;

const BLACK = "Fraunces";
const MONO = "Spline Mono";

const HOLDINGS = "15.05M";
const PCT = "0.13%";

const STEPS = [
  { t: "12:13:04", label: "ICF treasury wallet", atom: "25,000", end: false },
  { t: "12:21:55", label: "intermediary", atom: "20,000", end: false },
  { t: "12:23:22", label: "Coinbase staking ops", atom: "19,999", end: true },
];

export async function GET() {
  return new ImageResponse(
    (
      <Frame statusLabel="AS OF 23 JUL 2026">
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 505 }}>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 18, letterSpacing: 4, color: OG.soft, textTransform: "uppercase" }}>
              Is the ICF dumping ATOM?
            </div>
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 16 }}>
              <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 124, lineHeight: 1, color: OG.ink, letterSpacing: -3 }}>
                {PCT}
              </div>
            </div>
            <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 31, color: OG.ink, marginTop: 14, letterSpacing: -0.5 }}>
              of the treasury reached an exchange
            </div>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 17, color: OG.faint, marginTop: 16, width: 490, lineHeight: 1.5 }}>
              20,000 of {HOLDINGS} ATOM in six weeks. 91.7% is still delegated.
            </div>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 17, color: OG.green, marginTop: 14, width: 490, lineHeight: 1.5 }}>
              and it landed on coinbase&rsquo;s staking-ops wallet, not a sell-side one.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", width: 505 }}>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 16, letterSpacing: 3, color: OG.faint, textTransform: "uppercase", marginBottom: 14 }}>
              the trace · 16 jun 2026
            </div>
            {STEPS.map((s) => (
              <div key={s.t} style={{ display: "flex", alignItems: "baseline", marginBottom: 12 }}>
                <div style={{ display: "flex", fontFamily: MONO, fontSize: 16, color: OG.purple, width: 88 }}>{s.t}</div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontFamily: MONO, fontSize: 17, color: s.end ? OG.red : OG.soft }}>{s.label}</div>
                  <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 400, fontSize: 24, color: OG.ink }}>{s.atom} ATOM</div>
                </div>
              </div>
            ))}
            <div style={{ display: "flex", width: 430, height: 1, background: OG.hair, marginTop: 2, marginBottom: 10 }} />
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 16, color: OG.soft, width: 440, lineHeight: 1.5 }}>
              two intermediaries, ten minutes. traceable, because the first held only 3.6k before it.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", fontFamily: MONO, fontSize: 17, color: OG.soft, marginBottom: 8 }}>
          33,379 ATOM left ICF wallets in six weeks · we label the treasury now, either way
        </div>
      </Frame>
    ),
    { ...OG_DIM, fonts: ogFonts() },
  );
}
