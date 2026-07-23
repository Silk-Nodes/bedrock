// GET /og/staking-conviction · staking participation through a falling market,
// and the one-day drop that is NOT what it looks like.
//
// THE POINT OF THIS CARD IS A CORRECTION.
// Read naively, the bonded-ratio series looks like a collapse: 63.81% on Jul 19
// to 62.07% on Jul 20, the largest single-day fall in the window. It is not
// people unstaking. Cosmostation wound down and its validator left the active
// set, so its ~9.36M ATOM moved from bonded to not-bonded in one step. That
// stake is still delegated, just to a validator outside the set.
//
//   9.36M / 520.94M total supply = 1.80pp expected mechanical drop
//   observed drop 63.81 -> 62.07  = 1.74pp
// The residual is ordinary flow. So the fall is explained almost entirely by
// one operator exiting, and reporting it as delegator capitulation would be
// simply wrong.
//
// THE ACTUAL SIGNAL: across Jun 10 -> Jul 19, ATOM fell from $1.79 to $1.50
// (-16%) and the bonded ratio ROSE 62.50% -> 63.81%, peaking at 64.22% on
// Jul 5. Participation did not follow price down.
//
// SOURCES · bonded ratio and inflation: indexer block_mint (chain's own
// bonded_ratio_pct, not a derived estimate). Price: CoinGecko daily close.
// Supply: bank module, 520,943,234 ATOM.
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

// Daily average bonded ratio, Jun 10 -> Jul 23. The final four points are
// post-Cosmostation and are drawn in a muted tone so the mechanical step is not
// read as part of the trend.
const BONDED = [
  62.5, 62.05, 61.97, 62.28, 62.39, 62.35, 62.37, 62.67, 62.73, 63.4, 63.42,
  63.46, 63.53, 63.77, 63.79, 63.85, 63.89, 63.93, 63.97, 63.89, 64.03, 63.91,
  64.06, 64.18, 64.18, 64.22, 64.13, 64.02, 64.05, 63.69, 63.65, 63.85, 63.84,
  63.82, 63.82, 63.8, 63.81, 63.84, 63.8, 63.81,
];
const AFTER = [62.07, 62.07, 62.14, 62.22];

const W = 480;
const H = 168;
const LO = 61.5;
const HI = 64.6;
const N = BONDED.length + AFTER.length;

const px = (i: number) => (i / (N - 1)) * W;
const py = (v: number) => H - ((v - LO) / (HI - LO)) * H;

export async function GET() {
  const ptsA = BONDED.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
  const ptsB = AFTER.map((v, i) => `${px(BONDED.length + i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
  const xStep = px(BONDED.length - 0.5);
  const peakI = BONDED.indexOf(64.22);

  const chart = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <line x1="${xStep.toFixed(1)}" y1="0" x2="${xStep.toFixed(1)}" y2="${H}" stroke="${OG.faint}" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>
    <polyline points="${ptsA}" fill="none" stroke="${OG.green}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>
    <polyline points="${ptsB}" fill="none" stroke="${OG.faint}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${px(peakI).toFixed(1)}" cy="${py(64.22).toFixed(1)}" r="4.5" fill="${OG.ink}"/>
  </svg>`;
  const chartUri = `data:image/svg+xml;base64,${Buffer.from(chart).toString("base64")}`;

  return new ImageResponse(
    (
      <Frame statusLabel="AS OF 23 JUL 2026">
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 500 }}>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 18, letterSpacing: 4, color: OG.soft, textTransform: "uppercase" }}>
              Price fell 16%. Staking went up.
            </div>
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 18 }}>
              <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 128, lineHeight: 1, color: OG.ink, letterSpacing: -3 }}>
                62.5
              </div>
              <div style={{ display: "flex", fontFamily: MONO, fontSize: 30, color: OG.soft, marginLeft: 14, marginRight: 14 }}>→</div>
              <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 128, lineHeight: 1, color: OG.green, letterSpacing: -3 }}>
                63.8
              </div>
            </div>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 20, color: OG.soft, marginTop: 18 }}>
              % of ATOM staked · jun 10 → jul 19
            </div>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 18, color: OG.faint, marginTop: 16, width: 480, lineHeight: 1.5 }}>
              ATOM went $1.79 → $1.50 over the same stretch. participation peaked at 64.2% on jul 5.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", width: 505 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", fontFamily: MONO, fontSize: 15, letterSpacing: 2, color: OG.faint, textTransform: "uppercase" }}>
                bonded ratio
              </div>
              <div style={{ display: "flex", fontFamily: MONO, fontSize: 15, color: OG.faint }}>64.2% peak</div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={chartUri} width={W} height={H} alt="" />
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 15, color: OG.faint, marginTop: 12, width: W, lineHeight: 1.5 }}>
              the grey step is not unstaking. one validator left the active set, moving 9.36M ATOM out of bonded in a single block.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", fontFamily: MONO, fontSize: 19, color: OG.soft, marginBottom: 8 }}>
          9.36M / 520.9M supply = 1.80pp expected · 1.74pp observed · the drop is mechanical
        </div>
      </Frame>
    ),
    { ...OG_DIM, fonts: ogFonts() },
  );
}
