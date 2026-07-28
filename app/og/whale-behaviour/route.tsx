// GET /og/whale-behaviour · what the top 100 real ATOM holders actually did
// over the continuous window: rewards, net staking, and exchange direction.
//
// STATIC BY CHOICE with an AS OF stamp (Frame statusLabel, not a block height):
// this is a dated 50-day study, not a live ticker. Same vintage contract as
// COVERAGE in data/methodology.ts. Re-render before reuse.
//
// WINDOW 2026-06-08 to 2026-07-28 (continuous indexer coverage).
// POPULATION: top 100 holders AFTER removing exchange-linked wallets. A July
// 2026 sweep found 15 exchange wallets holding 38.5M ATOM inside the apparent
// top 100 (custody shards staking 100% to an exchange validator, and hot wallets
// with exchange-scale counterparty fan-out — one had 127,309 distinct
// counterparties). Without that filter every number here is wrong.
//
// THE NUMBERS
//   delegated        7,480,758      unbonded 4,027,267   => net +3,453,492
//   claimed rewards  2,400,502      (55 of 100 wallets, 9,703 claims)
//   sent to CEX      2,431,200      recv from CEX 3,626,479 => net +1,195,279
//   net staking positive        7 of 8 weeks
//   net withdrawing from CEX    8 of 8 weeks
//
// NET STAKED EXCEEDS REWARDS by ~1.05M ATOM. Even if every claimed reward were
// restaked, the position still grew beyond it — that is new capital entering,
// not yield recycling. This is the load-bearing claim on the card.
//
// THE REWARD SPLIT is deliberately NOT on this card. Direct-transfer analysis
// says 8% of rewards reach an exchange; multi-hop tracing (proportional
// attribution, validated to 1 ATOM against a hand-traced case) raises it to
// 38.1%, and 27% is still unresolved inside a deep routing network. A single
// percentage would imply a precision we do not have.
import { ImageResponse } from "next/og";
import { ogFonts, OG } from "../fonts";
import { Frame, OG_DIM } from "../card";

export const runtime = "nodejs";
export const revalidate = 3600;

const BLACK = "Fraunces";
const MONO = "Spline Mono";

// Weekly net staking, ATOM. One negative week (Jul 06) is kept on the card on
// purpose: showing the week that cuts against the headline is what makes the
// headline credible.
const WEEKS = [
  { w: "Jun 08", net: 36697 },
  { w: "Jun 15", net: 936901 },
  { w: "Jun 22", net: 696532 },
  { w: "Jun 29", net: 1417487 },
  { w: "Jul 06", net: -840283 },
  { w: "Jul 13", net: 401882 },
  { w: "Jul 20", net: 463302 },
  { w: "Jul 27", net: 340974 },
];

const W = 470;
const H = 132;
const MAXV = Math.max(...WEEKS.map((x) => Math.abs(x.net)));

export async function GET() {
  const band = W / WEEKS.length;
  const zeroY = H * (MAXV / (MAXV * 2));
  const bars = WEEKS.map((x, i) => {
    const h = Math.max(2, Math.round((Math.abs(x.net) / MAXV) * (H / 2 - 6)));
    const y = x.net >= 0 ? zeroY - h : zeroY;
    const cx = i * band + band / 2 - band * 0.3;
    return `<rect x="${cx.toFixed(1)}" y="${y.toFixed(1)}" width="${(band * 0.6).toFixed(1)}" height="${h}" rx="2" fill="${x.net >= 0 ? OG.green : OG.red}"/>`;
  }).join("");
  const chart = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bars}<line x1="0" y1="${zeroY.toFixed(1)}" x2="${W}" y2="${zeroY.toFixed(1)}" stroke="${OG.hair}" stroke-width="1"/></svg>`;
  const chartUri = `data:image/svg+xml;base64,${Buffer.from(chart).toString("base64")}`;

  // The sign is set in Hanken, NEVER Fraunces: the light display cut has no "+"
  // glyph and satori renders a notdef bar, which turns "+3.45M" into what reads
  // as "-3.45M" and inverts the whole card. Numerals stay in Fraunces.
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
      <Frame statusLabel="50 DAYS · TO 28 JUL 2026">
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", paddingTop: 4 }}>
          <div style={{ display: "flex", fontFamily: MONO, fontSize: 18, letterSpacing: 4, color: OG.soft, textTransform: "uppercase" }}>
            The top 100 ATOM holders · exchange wallets removed
          </div>
          <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 50, lineHeight: 1.05, color: OG.ink, letterSpacing: -1.2, marginTop: 14 }}>
            They are adding, not just compounding.
          </div>

          <div style={{ display: "flex", gap: 22, marginTop: 30 }}>
            <Stat sign="+" v="3.45M" l="net ATOM staked" c={OG.green} />
            <Stat v="2.40M" l="rewards claimed" c={OG.warm} />
            <Stat sign="+" v="1.20M" l="net off exchanges" c={OG.green} />
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", marginTop: 26 }}>
            <div style={{ display: "flex", flexDirection: "column", width: 300 }}>
              <div style={{ display: "flex", fontFamily: MONO, fontSize: 17, color: OG.faint, width: 290, lineHeight: 1.5 }}>
                net staked exceeds rewards by 1.05M — new capital, not recycled yield
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 18 }}>
              <div style={{ display: "flex", fontFamily: MONO, fontSize: 14, letterSpacing: 2, color: OG.faint, textTransform: "uppercase", marginBottom: 6 }}>
                net staking by week
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={chartUri} width={W} height={H} alt="" />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", fontFamily: MONO, fontSize: 17, color: OG.soft, marginBottom: 8 }}>
          net staking positive 7 of 8 weeks · net off exchanges all 8 · 15 exchange wallets excluded
        </div>
      </Frame>
    ),
    { ...OG_DIM, fonts: ogFonts() },
  );
}
