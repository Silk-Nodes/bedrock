// GET /og/validator-exodus · a jailed validator winding down, the stake still
// trapped in it, and where the stake that already left has gone.
//
// STATIC BY CHOICE with an explicit AS OF stamp. This is a fast-moving event
// card (1.03M ATOM moved on the deadline day alone), so it carries its vintage
// via Frame's statusLabel rather than a block height, and must be re-rendered
// before reuse. Same contract as COVERAGE in data/methodology.ts.
//
// AS OF 2026-07-20. Sources:
//   tokens / jailed / status  -> cosmos staking REST, validator endpoint
//   outflow + destinations    -> Bedrock indexer, staking_events (redelegate)
//
// DELIBERATELY NO WALLET COUNT ON THE OUTFLOW. Cosmos redelegate events carry
// no delegator attribute, so counting distinct delegators on redelegations
// returns a meaningless number (the raw query reports 9 for 495 moves). Moves
// is the only honest unit here.
import { ImageResponse } from "next/og";
import { ogFonts, OG } from "../fonts";
import { Frame, OG_DIM } from "../card";

export const runtime = "nodejs";
export const revalidate = 3600;

const BLACK = "Fraunces";
const MONO = "Spline Mono";

const STUCK = "9.36M";
const OUT_TOTAL = "1.58M";
const OUT_TODAY = "1.03M";
const MOVES = 495;

// Redelegation destinations, last 10 days. Shown including competitors: the
// card is only credible if it reports where the stake actually went.
const DEST = [
  { name: "Gate Earn", atom: 644_374, moves: 5 },
  { name: "Allnodes", atom: 337_188, moves: 43 },
  { name: "Keplr", atom: 89_313, moves: 164 },
  { name: "Stakecito Labs", atom: 80_402, moves: 9 },
  { name: "Lavender.Five", atom: 80_153, moves: 9 },
  { name: "SG-1", atom: 63_346, moves: 43 },
];

const MAXD = Math.max(...DEST.map((d) => d.atom));
const TRACK = 210;

export async function GET() {
  return new ImageResponse(
    (
      <Frame statusLabel="AS OF 20 JUL 2026">
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between", paddingTop: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 560 }}>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 18, letterSpacing: 4, color: OG.soft, textTransform: "uppercase" }}>
              Still delegated to a jailed validator
            </div>
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 20 }}>
              <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 138, lineHeight: 1, color: OG.ink, letterSpacing: -3 }}>
                {STUCK}
              </div>
              <div style={{ display: "flex", fontFamily: MONO, fontSize: 26, color: OG.soft, marginLeft: 18 }}>ATOM</div>
            </div>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 24, color: OG.red, marginTop: 20 }}>
              earning zero rewards
            </div>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 19, color: OG.faint, marginTop: 14, width: 520, lineHeight: 1.45 }}>
              a jailed validator sits outside the active set, so it pays nothing
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", width: 490 }}>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 17, letterSpacing: 3, color: OG.faint, textTransform: "uppercase", marginBottom: 16 }}>
              Where the stake went
            </div>
            {DEST.map((d) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", height: 38 }}>
                <div style={{ display: "flex", width: 168, fontFamily: MONO, fontSize: 18, color: OG.soft }}>{d.name}</div>
                <div style={{ display: "flex", width: Math.max(3, Math.round((d.atom / MAXD) * TRACK)), height: 12, background: OG.purple, borderRadius: 2 }} />
                <div style={{ display: "flex", flex: 1, justifyContent: "flex-end", fontFamily: BLACK, fontWeight: 400, fontSize: 22, color: OG.ink }}>
                  {Math.round(d.atom / 1000)}k
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", fontFamily: MONO, fontSize: 20, color: OG.soft, marginBottom: 8 }}>
          {OUT_TOTAL} ATOM redelegated out since Jul 16 across {MOVES} moves · {OUT_TODAY} of it on the final day
        </div>
      </Frame>
    ),
    { ...OG_DIM, fonts: ogFonts() },
  );
}
