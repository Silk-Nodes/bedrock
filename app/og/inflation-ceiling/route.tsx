// GET /og/inflation-ceiling · ATOM inflation against its own 10% cap, and the
// staking shortfall that keeps it pinned there.
//
// THE MECHANISM (verified against live mint params, not folklore):
//   inflation_max = 0.10, inflation_min = 0.07, goal_bonded = 0.67
//   Cosmos mint moves inflation UP when the bonded ratio is below goal_bonded
//   and DOWN when it is above. Bonded is ~62%, below the 67% goal, so inflation
//   is pushed to the ceiling and stays there. Current inflation reads exactly
//   0.100000000000000000 from /cosmos/mint/v1beta1/inflation.
//
// THE HISTORY comes from the indexer's block_mint table (12.9M blocks since
// 2021): inflation climbed 7.98% (Dec 2021) to a peak of 16.10% (Apr 2023),
// then dropped to exactly 10.00% in Dec 2023 when Prop 848 cut inflation_max
// from 20% to 10%. It has printed 10.00% every month we have since.
//
// COVERAGE, SHOWN NOT HIDDEN: the monthly series has a real hole between
// Apr 2024 and May 2026 because the historical backfill has not reached it yet.
// The sparkline therefore plots only months we actually hold, and the gap is
// LABELLED on the card rather than interpolated across. Drawing a smooth line
// through 26 missing months would invent data.
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

// Monthly average inflation from block_mint. Split into the two contiguous runs
// we actually hold, so the missing stretch renders as a gap, not a line.
const RUN_A = [
  7.98, 8.91, 9.48, 9.94, 10.45, 11.08, 11.7, 12.28, 12.66, 12.8, 12.9, 13.25,
  13.85, 14.46, 15.05, 15.83, 16.1, 15.78, 15.36, 14.91, 14.51, 14.25, 14.16,
  13.52, 10.0, 10.0, 10.0, 10.0,
];
const RUN_B = [10.0, 10.0];

const PEAK = 16.1;
const W = 470;
const H = 150;
const MAXV = 17;
// RUN_A occupies its true share of the timeline; the gap is the empty middle.
const SPAN_A = 0.72;
const GAP = 0.14;

const x = (i: number, n: number, from: number, to: number) =>
  from * W + (n <= 1 ? 0 : (i / (n - 1)) * (to - from) * W);
const y = (v: number) => H - (v / MAXV) * H;

export async function GET() {
  const ptsA = RUN_A.map((v, i) => `${x(i, RUN_A.length, 0, SPAN_A).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const ptsB = RUN_B.map((v, i) => `${x(i, RUN_B.length, SPAN_A + GAP, 1).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const peakIdx = RUN_A.indexOf(PEAK);

  // The cap line must NOT span the whole chart. Until Prop 848 (Dec 2023) the
  // ceiling was 20%, not 10%, so drawing a 10% cap across 2021-2023 would
  // assert a limit that did not exist and make the pre-848 climb look capped.
  // Each ceiling is drawn only over the period it actually governed.
  const p848 = RUN_A.indexOf(10.0);
  const xP848 = x(p848, RUN_A.length, 0, SPAN_A);
  const chart = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <line x1="0" y1="${y(20).toFixed(1)}" x2="${xP848.toFixed(1)}" y2="${y(20).toFixed(1)}" stroke="${OG.faint}" stroke-width="1.5" stroke-dasharray="6 5" opacity="0.7"/>
    <line x1="${xP848.toFixed(1)}" y1="${y(10).toFixed(1)}" x2="${W}" y2="${y(10).toFixed(1)}" stroke="${OG.red}" stroke-width="1.5" stroke-dasharray="6 5" opacity="0.9"/>
    <line x1="${xP848.toFixed(1)}" y1="0" x2="${xP848.toFixed(1)}" y2="${H}" stroke="${OG.faint}" stroke-width="1" opacity="0.45"/>
    <polyline points="${ptsA}" fill="none" stroke="${OG.purple}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>
    <polyline points="${ptsB}" fill="none" stroke="${OG.purple}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${x(peakIdx, RUN_A.length, 0, SPAN_A).toFixed(1)}" cy="${y(PEAK).toFixed(1)}" r="5" fill="${OG.ink}"/>
  </svg>`;
  const chartUri = `data:image/svg+xml;base64,${Buffer.from(chart).toString("base64")}`;

  return new ImageResponse(
    (
      <Frame statusLabel="AS OF 23 JUL 2026">
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 520 }}>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 18, letterSpacing: 4, color: OG.soft, textTransform: "uppercase" }}>
              ATOM inflation
            </div>
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 16 }}>
              <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 140, lineHeight: 1, color: OG.ink, letterSpacing: -3 }}>
                10.00%
              </div>
            </div>
            <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 33, color: OG.ink, marginTop: 16, letterSpacing: -0.5 }}>
              pinned at its own ceiling
            </div>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 18, color: OG.faint, marginTop: 16, width: 500, lineHeight: 1.5 }}>
              staking sits at 62.2%, below the 67% the protocol wants. so the mint pushes inflation up until it hits the cap, and holds it there.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", width: 500 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", fontFamily: MONO, fontSize: 15, letterSpacing: 2, color: OG.faint, textTransform: "uppercase" }}>
                2021 → today
              </div>
              <div style={{ display: "flex", fontFamily: MONO, fontSize: 15, color: OG.red }}>cap: 20% → 10%</div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={chartUri} width={W} height={H} alt="" />
            <div style={{ display: "flex", justifyContent: "space-between", width: W, marginTop: 8 }}>
              <div style={{ display: "flex", fontFamily: MONO, fontSize: 14, color: OG.faint }}>peak 16.1% · apr 2023</div>
              <div style={{ display: "flex", fontFamily: MONO, fontSize: 14, color: OG.faint }}>line = prop 848 · gap = backfill</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", fontFamily: MONO, fontSize: 19, color: OG.soft, marginBottom: 8 }}>
          52.1M ATOM minted per year · 142,724 per day · 24.9M more staked would end the cap
        </div>
      </Frame>
    ),
    { ...OG_DIM, fonts: ogFonts() },
  );
}
