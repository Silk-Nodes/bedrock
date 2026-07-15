// GET /og/default , neutral brand OG card, used as the site-wide fallback
// for pages without a metric-specific card.
import { ImageResponse } from "next/og";
import { ogFonts, OG } from "../fonts";
import { Frame, latestBlockHeight , OG_DIM } from "../card";

export const runtime = "nodejs";
export const revalidate = 3600;

const BLACK = "Fraunces";
const MONO = "Spline Mono";

export async function GET() {
  const height = await latestBlockHeight();
  return new ImageResponse(
    (
      <Frame height={height}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 80, lineHeight: 1.12, color: OG.ink, maxWidth: 1020 }}>
            The on-chain source of truth for ATOM.
          </div>
          <div style={{ display: "flex", fontFamily: MONO, fontSize: 21, letterSpacing: 1, color: OG.soft, marginTop: 30 }}>
            Live economic intelligence for the Cosmos Hub · since genesis
          </div>
        </div>
      </Frame>
    ),
    { ...OG_DIM, fonts: ogFonts() },
  );
}
