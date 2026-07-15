// GET /og/staking , dynamic OG card: ATOM bonded to the Cosmos Hub (live).
import { ImageResponse } from "next/og";
import { ogFonts, OG } from "../fonts";
import { Frame, latestBlockHeight , OG_DIM } from "../card";
import { getLiveChain } from "@/lib/chain";

export const runtime = "nodejs";
export const revalidate = 300;

const BLACK = "Fraunces";
const MONO = "Spline Mono";

export async function GET() {
  const [chain, height] = await Promise.all([getLiveChain(), latestBlockHeight()]);
  const bonded = chain.bonded.toLocaleString("en-US");

  return new ImageResponse(
    (
      <Frame height={height}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          <div style={{ display: "flex", fontFamily: MONO, fontSize: 19, letterSpacing: 5, color: OG.soft, textTransform: "uppercase" }}>
            ATOM bonded to the Cosmos Hub
          </div>
          <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 150, lineHeight: 1, color: OG.ink, letterSpacing: -2, marginTop: 26 }}>
            {bonded}
          </div>
        </div>

        <div style={{ display: "flex", fontFamily: MONO, fontSize: 24, color: OG.soft, marginBottom: 10 }}>
          {chain.bonded_ratio_pct}% of supply · {chain.staking_apr_pct}% APR · {chain.live ? "live on-chain" : "snapshot"}
        </div>
      </Frame>
    ),
    { ...OG_DIM, fonts: ogFonts() },
  );
}
