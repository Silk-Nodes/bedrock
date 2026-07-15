// GET /og/page?e=<eyebrow>&t=<title> , the dynamic OG template card used by
// every page that has no bespoke data card. Renders the page's section eyebrow
// and title in the premium chrome (light serif, hairlines, glow), so all 40+
// routes get a page-specific social card from one template. Wired automatically
// by lib/seo.ts; params are sanitized and length-capped here.
import { ImageResponse } from "next/og";
import { ogFonts, OG } from "../fonts";
import { Frame, latestBlockHeight , OG_DIM } from "../card";

export const runtime = "nodejs";

const SERIF = "Fraunces";
const MONO = "Spline Mono";

// Keep only characters we expect in titles/eyebrows; collapse the rest.
function clean(s: string, max: number): string {
  const t = s
    .replace(/[^\p{L}\p{N} ·&\-+%/,.'’]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eyebrow = clean(searchParams.get("e") ?? "COSMOS HUB", 42).toUpperCase();
  const title = clean(searchParams.get("t") ?? "Bedrock", 64);
  const height = await latestBlockHeight();

  // Adaptive display size so short titles feel monumental and long ones still fit.
  const size = title.length <= 14 ? 132 : title.length <= 26 ? 104 : title.length <= 40 ? 84 : 66;

  return new ImageResponse(
    (
      <Frame height={height}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          <div style={{ display: "flex", fontFamily: MONO, fontSize: 19, letterSpacing: 5, color: OG.soft, marginBottom: 30 }}>
            {eyebrow}
          </div>
          {/* No text glow here: soft shadows turn to mush when messengers
              downscale the 1200px card to ~640px and recompress. Crisp type
              survives; the Frame's corner glow supplies the atmosphere. */}
          <div style={{ display: "flex", fontFamily: SERIF, fontWeight: 300, fontSize: size, lineHeight: 1.06, color: OG.ink, maxWidth: 1040 }}>
            {title}
          </div>
          <div style={{ display: "flex", fontFamily: MONO, fontSize: 22, letterSpacing: 1, color: OG.soft, marginTop: 34 }}>
            live on-chain · verified labels · since genesis
          </div>
        </div>
      </Frame>
    ),
    { ...OG_DIM, fonts: ogFonts() },
  );
}
