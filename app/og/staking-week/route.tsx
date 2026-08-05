// GET /og/staking-week · chain-wide delegations vs undelegations over the last
// seven days, with the daily net as diverging bars.
//
// STATIC BY CHOICE with an AS OF stamp: this is a dated weekly study, not a live
// ticker. Re-render before reuse.
//
// WINDOW: seven COMPLETE UTC days, 2026-07-22 00:00 to 2026-07-29 00:00.
// Complete days on purpose. A rolling "now() - 7 days" window cuts the first and
// last day mid-stream, which renders a half-day as if it were a full one and
// quietly understates both ends. That bug already shipped once on the cohorts
// page. The daily bars below sum to exactly 1,735,949, matching the headline net.
//
// THE NUMBERS (chain-wide, all delegators, all validators)
//   delegated   4,007,158 ATOM   14,050 delegations
//   unbonded    2,271,208 ATOM    2,848 unbondings
//   net           +1,735,949     across 10,231 distinct wallets
//   ratio            1.76x in vs out by amount, 4.9x by event count
//   prior 7 complete days (Jul 15 to Jul 22) net was +627,907, so 2.8x
//
// WHAT THIS IS NOT: this is the sum of delegate and unbond events, NOT the
// change in bonded supply. Bonded supply also moves on redelegations, LSM
// tokenization, and validators entering or leaving the active set, and over
// this window it moved by a materially different amount. Never label this card
// "staked supply grew by X". It measures flow, not the pool.
//
// The Jul 26 negative day is kept on the chart deliberately: showing the day
// that cuts against the headline is what makes the headline credible.
import { ImageResponse } from "next/og";
import { ogFonts, OG } from "../fonts";
import { Frame, OG_DIM } from "../card";

export const runtime = "nodejs";
export const revalidate = 3600;

const BLACK = "Fraunces";
const MONO = "Spline Mono";

// Daily net staking (delegated minus unbonded), ATOM, complete UTC days.
const DAYS = [
  { d: "22", net: 158431 },
  { d: "23", net: 205461 },
  { d: "24", net: 122169 },
  { d: "25", net: 112437 },
  { d: "26", net: -26303 },
  { d: "27", net: 217944 },
  { d: "28", net: 945810 },
];

// The bottom row is left text (300) + gutter (18) + chart, and it must span the
// full content width: 1200 minus the Frame's 64px side padding = 1072. So the
// chart is exactly 1072 - 318. Anything narrower leaves a dead band on the right.
const W = 754;
const H = 150;
const MAXV = Math.max(...DAYS.map((x) => Math.abs(x.net)));

export async function GET() {
  const band = W / DAYS.length;
  // Six of seven days are positive and the one negative day is tiny (2.8% of the
  // max), so the axis sits low: just enough room below for that bar plus the
  // date labels, and everything else goes to the upside.
  const zeroY = H - 38;
  const upRoom = zeroY - 4;
  const downRoom = 20;
  const bars = DAYS.map((x, i) => {
    const room = x.net >= 0 ? upRoom : downRoom;
    const h = Math.max(3, Math.round((Math.abs(x.net) / MAXV) * room));
    const y = x.net >= 0 ? zeroY - h : zeroY;
    const cx = i * band + band * 0.2;
    return (
      `<rect x="${cx.toFixed(1)}" y="${y.toFixed(1)}" width="${(band * 0.6).toFixed(1)}" height="${h}" rx="2" fill="${x.net >= 0 ? OG.green : OG.red}"/>` +
      `<text x="${(cx + band * 0.3).toFixed(1)}" y="${H - 2}" font-family="monospace" font-size="12" fill="${OG.faint}" text-anchor="middle">${x.d}</text>`
    );
  }).join("");
  const chart = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bars}<line x1="0" y1="${zeroY.toFixed(1)}" x2="${W}" y2="${zeroY.toFixed(1)}" stroke="${OG.hair}" stroke-width="1"/></svg>`;
  const chartUri = `data:image/svg+xml;base64,${Buffer.from(chart).toString("base64")}`;

  // The sign is set in Hanken, NEVER Fraunces: the light display cut has no "+"
  // glyph and satori renders a notdef bar, which turns "+1.74M" into what reads
  // as "-1.74M" and inverts the whole card. Numerals stay in Fraunces.
  const Stat = ({ sign, v, l, c }: { sign?: string; v: string; l: string; c?: string }) => (
    <div style={{ display: "flex", flexDirection: "column", width: 232 }}>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        {sign ? (
          <div style={{ display: "flex", fontFamily: "Hanken", fontWeight: 600, fontSize: 42, lineHeight: 1, color: c ?? OG.ink, marginRight: 5 }}>{sign}</div>
        ) : null}
        <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 56, lineHeight: 1, color: c ?? OG.ink, letterSpacing: -1 }}>{v}</div>
      </div>
      <div style={{ display: "flex", fontFamily: MONO, fontSize: 16, color: OG.soft, marginTop: 9 }}>{l}</div>
    </div>
  );

  return new ImageResponse(
    (
      <Frame statusLabel="7 DAYS · TO 28 JUL 2026">
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", paddingTop: 4 }}>
          <div style={{ display: "flex", fontFamily: MONO, fontSize: 18, letterSpacing: 4, color: OG.soft, textTransform: "uppercase" }}>
            Cosmos Hub · staking flow · last 7 days
          </div>
          <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 50, lineHeight: 1.05, color: OG.ink, letterSpacing: -1.2, marginTop: 14 }}>
            1.76x more ATOM staked than unstaked.
          </div>

          <div style={{ display: "flex", gap: 22, marginTop: 30 }}>
            <Stat v="4.01M" l="delegated" c={OG.green} />
            <Stat v="2.27M" l="unbonded" c={OG.red} />
            <Stat sign="+" v="1.74M" l="net ATOM staked" c={OG.green} />
          </div>

          {/* alignItems stretch, and BOTH columns carry content at their top and
              bottom edge, so the pair aligns on both baselines. Bottom-aligning
              alone left a void above the left text. */}
          <div style={{ display: "flex", alignItems: "stretch", marginTop: 26 }}>
            <div style={{ display: "flex", flexDirection: "column", width: 300, justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontFamily: MONO, fontSize: 14, letterSpacing: 2, color: OG.faint, textTransform: "uppercase", marginBottom: 8 }}>
                  biggest day
                </div>
                <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 34, lineHeight: 1, color: OG.green, letterSpacing: -0.5 }}>
                  945,810
                </div>
                <div style={{ display: "flex", fontFamily: MONO, fontSize: 15, color: OG.soft, marginTop: 7 }}>
                  net staked on 28 Jul
                </div>
              </div>
              <div style={{ display: "flex", fontFamily: MONO, fontSize: 17, color: OG.faint, width: 290, lineHeight: 1.5 }}>
                14,050 delegations against 2,848 exits. 4.9 stakers in for every one out.
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 18, justifyContent: "space-between" }}>
              <div style={{ display: "flex", fontFamily: MONO, fontSize: 14, letterSpacing: 2, color: OG.faint, textTransform: "uppercase" }}>
                net staking by day · july
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={chartUri} width={W} height={H} alt="" />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", fontFamily: MONO, fontSize: 17, color: OG.soft, marginTop: 22, marginBottom: 8 }}>
          10,231 wallets · positive 6 of 7 days · 2.8x the prior week&apos;s net
        </div>
      </Frame>
    ),
    { ...OG_DIM, fonts: ogFonts() },
  );
}
