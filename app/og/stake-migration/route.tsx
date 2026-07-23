// GET /og/stake-migration · where stake went when a genesis validator wound
// down, and how concentrated the destinations were.
//
// STATIC BY CHOICE with an explicit AS OF stamp (Frame's statusLabel, not a
// block height): this is a dated 30-day study of a one-off event, not a live
// ticker. Same vintage contract as COVERAGE in data/methodology.ts.
//
// AS OF 2026-07-22 · window: trailing 30 days · source: Bedrock indexer,
// staking_events (type='redelegate'), netted per validator (gained - lost).
//
// THE NUMBERS
//   2,881,504 ATOM redelegated across the whole Hub in the window
//   2,570,190 of it (89.2%) left ONE validator, Cosmostation, which wound down
//   911,794 (31.6% of all redelegation) landed on exchange-run validators
//   66.3% of inflow landed in just 5 destinations, out of 86 that received any
//
// WHY "EXCHANGE-RUN" IS NARROW ON PURPOSE
//   Only validators operated by a centralized exchange are counted: Gate Earn,
//   Binance Node, Coinbase01, OKXEarn. Staking providers and wallet validators
//   (Allnodes, Keplr, Kiln, stake.fish, Lavender.Five) are NOT counted as
//   exchanges even though several are custodial-adjacent, because lumping them
//   in would inflate the headline. The 31.6% is therefore a floor.
//
// NO WALLET COUNTS ANYWHERE IN THIS CARD. Cosmos redelegate events carry no
// delegator attribute, so any "distinct wallets" figure over redelegations is
// meaningless (the raw query returns 9 for hundreds of moves). Moves and ATOM
// are the only honest units.
import { ImageResponse } from "next/og";
import { ogFonts, OG } from "../fonts";
import { Frame, OG_DIM } from "../card";

export const runtime = "nodejs";
export const revalidate = 3600;

const BLACK = "Fraunces";
const MONO = "Spline Mono";

const CEX_PCT = "31.6%";
const TOTAL = "2.88M";

// Top destinations by ATOM gained. `cex` drives the accent color, and is true
// only for validators operated by a centralized exchange (see note above).
const DEST = [
  { name: "Gate Earn", atom: 649_777, cex: true },
  { name: "Allnodes", atom: 531_758, cex: false },
  { name: "Keplr", atom: 467_124, cex: false },
  { name: "Binance Node", atom: 131_552, cex: true },
  { name: "SG-1", atom: 130_272, cex: false },
  { name: "Coinbase01", atom: 127_272, cex: true },
  { name: "Stakecito Labs", atom: 83_338, cex: false },
];

const MAXD = Math.max(...DEST.map((d) => d.atom));
const TRACK = 250;

export async function GET() {
  return new ImageResponse(
    (
      <Frame statusLabel="30D · AS OF 22 JUL 2026">
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between", paddingTop: 6 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 540 }}>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 18, letterSpacing: 4, color: OG.soft, textTransform: "uppercase" }}>
              A genesis validator wound down
            </div>
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 18 }}>
              <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 132, lineHeight: 1, color: OG.ink, letterSpacing: -3 }}>
                {CEX_PCT}
              </div>
            </div>
            <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 34, color: OG.ink, marginTop: 18, letterSpacing: -0.5 }}>
              of the stake it released went
            </div>
            <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 34, color: OG.red, letterSpacing: -0.5 }}>
              to exchange-run validators
            </div>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 18, color: OG.faint, marginTop: 20, width: 520, lineHeight: 1.45 }}>
              {TOTAL} ATOM redelegated on the hub in 30 days. 89% of it left one operator.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", width: 500 }}>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 16, letterSpacing: 3, color: OG.faint, textTransform: "uppercase", marginBottom: 14 }}>
              Where it landed
            </div>
            {DEST.map((d) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", height: 40 }}>
                <div style={{ display: "flex", width: 176, fontFamily: MONO, fontSize: 17, color: d.cex ? OG.red : OG.soft }}>
                  {d.name}
                </div>
                <div style={{ display: "flex", width: Math.max(3, Math.round((d.atom / MAXD) * TRACK)), height: 12, background: d.cex ? OG.red : OG.purple, borderRadius: 2 }} />
                <div style={{ display: "flex", flex: 1, justifyContent: "flex-end", fontFamily: BLACK, fontWeight: 400, fontSize: 21, color: OG.ink }}>
                  {Math.round(d.atom / 1000)}k
                </div>
              </div>
            ))}
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 15, color: OG.red, marginTop: 12, marginLeft: 176 }}>
              red = run by a centralized exchange
            </div>
          </div>
        </div>

        <div style={{ display: "flex", fontFamily: MONO, fontSize: 19, color: OG.soft, marginBottom: 8 }}>
          66% of it landed in 5 destinations · 86 validators received any at all
        </div>
      </Frame>
    ),
    { ...OG_DIM, fonts: ogFonts() },
  );
}
