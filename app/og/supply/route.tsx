// GET /og/supply , dynamic OG card: ATOM bonded supply, big live number over a
// layered area chart (example-2 style). The number is live; the 90-day shape is
// illustrative until the indexer backfills history.
import { ImageResponse } from "next/og";
import { ogFonts, OG } from "../fonts";
import { Lockup, RightChip, latestBlockHeight, Scale2x, OG_DIM } from "../card";
import { getLiveChain } from "@/lib/chain";

export const runtime = "nodejs";
export const revalidate = 300;

const BLACK = "Fraunces";
const MONO = "Spline Mono";

// Illustrative gently-rising 90d shape (normalized 0..1).
const SHAPE = [
  0.30, 0.34, 0.31, 0.38, 0.42, 0.39, 0.45, 0.43, 0.50, 0.54, 0.49, 0.57,
  0.55, 0.62, 0.60, 0.66, 0.63, 0.70, 0.74, 0.69, 0.77, 0.81, 0.78, 0.85,
  0.83, 0.90, 0.88, 0.95, 1.0,
];

function areaChart(w: number, h: number) {
  const pts = SHAPE.map((v, i) => ({
    x: (i / (SHAPE.length - 1)) * w,
    y: h - (v * h * 0.78) - 8,
  }));
  const seg = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ");
  const area = `M0,${h} L ${seg} L ${w},${h} Z`;
  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  // back layer offset up for a layered look
  const ptsBack = pts.map((p) => ({ x: p.x, y: p.y - 22 }));
  const areaBack = `M0,${h} L ${ptsBack.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ")} L ${w},${h} Z`;
  return { area, areaBack, line };
}

export async function GET() {
  const [chain, height] = await Promise.all([getLiveChain(), latestBlockHeight()]);
  const bonded = chain.bonded.toLocaleString("en-US");
  const W = 1200;
  const CH = 210;
  const { area, areaBack, line } = areaChart(W, CH);

  return new ImageResponse(
    (
      <Scale2x>
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: OG.bg, position: "relative" }}>
        {/* atmosphere: soft accent glow top-right, hairline top edge */}
        <div style={{ position: "absolute", top: 12, right: 150, width: 3, height: 3, borderRadius: 3, display: "flex", boxShadow: `0 0 360px 250px ${OG.glow}` }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, display: "flex", background: OG.hair }} />

        {/* Header + headline (padded) */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "54px 64px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Lockup />
            <RightChip />
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 46 }}>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 19, letterSpacing: 5, color: OG.soft, textTransform: "uppercase" }}>
              ATOM bonded supply · 90 days
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", marginTop: 22 }}>
              <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 128, lineHeight: 1, color: OG.ink, letterSpacing: -2 }}>
                {bonded}
              </div>
              <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 44, color: OG.soft, marginLeft: 26, marginBottom: 10 }}>
                {chain.bonded_ratio_pct}%
              </div>
            </div>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 20, letterSpacing: 1, color: OG.soft, marginTop: 20 }}>
              of circulating supply · {chain.staking_apr_pct}% APR · {chain.live ? "live on-chain" : "snapshot"}
            </div>
          </div>
        </div>

        {/* Full-bleed glowing single-hue curve at the bottom */}
        <svg width={W} height={CH} viewBox={`0 0 ${W} ${CH}`} style={{ display: "flex" }}>
          <path d={areaBack} fill={OG.purple} fillOpacity="0.05" />
          <path d={area} fill={OG.purple} fillOpacity="0.13" />
          <polyline points={line} fill="none" stroke={OG.purple} strokeWidth="5" strokeOpacity="0.25" />
          <polyline points={line} fill="none" stroke={OG.purple} strokeWidth="2" />
        </svg>

        {/* colophon: live block height, bottom-right above the chart */}
        <div style={{ display: "flex", position: "absolute", right: 64, bottom: 18, fontFamily: MONO, fontSize: 21, letterSpacing: 1.5, color: OG.ink }}>
          BLK {height ? Number(height).toLocaleString("en-US") : "LIVE"}
        </div>
      </div>
      </Scale2x>
    ),
    { ...OG_DIM, fonts: ogFonts() },
  );
}
