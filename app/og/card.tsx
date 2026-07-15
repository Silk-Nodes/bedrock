/* Shared chrome for the OG cards. Plain JSX for satori. */
import { OG } from "./fonts";

const MONO = "Spline Mono";

// Cards render at 2x (2400x1260) and lay out at 1200x630 inside a scale(2)
// wrapper: messengers downscale previews hard (Telegram ~640px wide), and
// supersampling gives their resampler 4x the pixels to work from, so the light
// serif and small mono chrome stay crisp instead of aliasing.
export const OG_DIM = { width: 2400, height: 1260 } as const;

// Wrap a 1200x630 layout for the 2x canvas.
export function Scale2x({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      <div style={{ display: "flex", width: 1200, height: 630, transform: "scale(2)", transformOrigin: "top left" }}>
        {children}
      </div>
    </div>
  );
}

// The official Bedrock wordmark (BrandLockup) as a self-contained SVG data URI,
// with the theme tokens hardcoded for the dark OG card.
const LOGO_URI = (() => {
  const ink = "#F6F8FB";
  const hub = "#9C8DFF";
  const hub2 = "#B7ABFF";
  const wordmark =
    "M93.10 29.60Q102.20 29.60 109.81 33.36Q117.43 37.12 121.89 43.95Q126.35 50.77 126.35 59.17L126.35 59.17Q126.35 81.40 106.23 87.17L106.23 87.17L106.23 87.88Q129.15 93.13 129.15 117.97L129.15 117.97Q129.15 127.42 124.51 134.69Q119.88 141.95 111.83 145.97Q103.78 150 94.15 150L94.15 150L12.95 150L12.95 29.60L93.10 29.60ZM51.63 56.02L51.63 76.50L78.23 76.50Q82.08 76.50 84.61 73.79Q87.15 71.07 87.15 67.05L87.15 67.05L87.15 65.30Q87.15 61.45 84.53 58.74Q81.90 56.02 78.23 56.02L78.23 56.02L51.63 56.02ZM51.63 101.35L51.63 122L81.03 122Q84.88 122 87.41 119.29Q89.95 116.57 89.95 112.55L89.95 112.55L89.95 110.80Q89.95 106.78 87.41 104.06Q84.88 101.35 81.03 101.35L81.03 101.35L51.63 101.35Z M140.10 150L140.10 29.60L244.22 29.60L244.22 58.47L178.77 58.47L178.77 75.10L234.77 75.10L234.77 102.75L178.77 102.75L178.77 121.13L245.45 121.13L245.45 150L140.10 150Z M309.60 29.60Q372.77 29.60 372.77 89.80L372.77 89.80Q372.77 150 309.60 150L309.60 150L257.45 150L257.45 29.60L309.60 29.60ZM296.13 58.47L296.13 121.13L308.90 121.13Q333.22 121.13 333.22 95.05L333.22 95.05L333.22 84.55Q333.22 58.47 308.90 58.47L308.90 58.47L296.13 58.47Z M498.88 66.52Q498.88 77.55 492.92 86.47Q486.98 95.40 475.60 99.60L475.60 99.60L502.38 150L458.97 150L437.63 106.07L423.27 106.07L423.27 150L384.60 150L384.60 29.60L458.27 29.60Q471.22 29.60 480.41 34.59Q489.60 39.57 494.24 48.06Q498.88 56.55 498.88 66.52L498.88 66.52ZM459.50 68.10Q459.50 63.37 456.35 60.22Q453.20 57.07 448.65 57.07L448.65 57.07L423.27 57.07L423.27 79.30L448.65 79.30Q453.20 79.30 456.35 76.06Q459.50 72.82 459.50 68.10L459.50 68.10Z M571.60 27.50Q602.75 27.50 619.72 43.42Q636.70 59.35 636.70 89.80L636.70 89.80Q636.70 120.25 619.72 136.18Q602.75 152.10 571.60 152.10L571.60 152.10Q540.45 152.10 523.56 136.26Q506.67 120.42 506.67 89.80L506.67 89.80Q506.67 59.17 523.56 43.34Q540.45 27.50 571.60 27.50L571.60 27.50ZM571.60 56.37Q559.17 56.37 552.70 63.90Q546.22 71.42 546.22 84.20L546.22 84.20L546.22 95.40Q546.22 108.17 552.70 115.70Q559.17 123.22 571.60 123.22L571.60 123.22Q584.02 123.22 590.59 115.70Q597.15 108.17 597.15 95.40L597.15 95.40L597.15 84.20Q597.15 71.42 590.59 63.90Q584.02 56.37 571.60 56.37L571.60 56.37Z M705.92 27.50Q732.70 27.50 748.27 40.89Q763.85 54.27 763.85 79.13L763.85 79.13L726.92 79.13Q726.92 68.62 721.41 62.50Q715.90 56.37 705.75 56.37L705.75 56.37Q694.02 56.37 688.51 63.72Q683.00 71.07 683.00 84.20L683.00 84.20L683.00 95.40Q683.00 108.35 688.51 115.79Q694.02 123.22 705.40 123.22L705.40 123.22Q716.60 123.22 722.38 117.45Q728.15 111.67 728.15 101.17L728.15 101.17L763.85 101.17Q763.85 125.85 748.71 138.97Q733.57 152.10 705.92 152.10L705.92 152.10Q675.12 152.10 659.29 136.35Q643.45 120.60 643.45 89.80L643.45 89.80Q643.45 59.00 659.29 43.25Q675.12 27.50 705.92 27.50L705.92 27.50Z M814.35 81.05L857.22 29.60L905.17 29.60L861.95 79.13L906.05 150L860.37 150L835.35 105.90L814.35 123.05L814.35 150L775.67 150L775.67 29.60L814.35 29.60L814.35 81.05Z";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 908 232">` +
    `<path d="${wordmark}" fill="${ink}"/>` +
    `<g transform="translate(0,168) scale(1.41875,1)">` +
    `<path d="M0,64 L0,40 L60,28 L120,42 L180,20 L240,36 L300,16 L360,32 L420,12 L480,28 L540,18 L640,32 L640,64 Z" fill="${hub}" fill-opacity="0.35"/>` +
    `<path d="M0,64 L0,48 L66,44 L132,54 L198,30 L264,46 L330,28 L396,42 L462,22 L528,38 L580,30 L640,44 L640,64 Z" fill="${hub}" fill-opacity="0.6"/>` +
    `<path d="M0,64 L0,56 L72,52 L140,60 L208,42 L276,54 L342,40 L408,52 L474,36 L536,48 L584,42 L640,54 L640,64 Z" fill="${ink}"/>` +
    `<polyline points="0,56 72,52 140,60 208,42 276,54 342,40 408,52 474,36 536,48 584,42 640,54" fill="none" stroke="${hub2}" stroke-width="0.846"/>` +
    `</g></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
})();

export function Lockup() {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_URI} width={176} height={45} alt="Bedrock" />
    </div>
  );
}

// Top-right: the site URL in quiet mono. No pill, no dot, just type,
// balancing the wordmark like a masthead.
export function RightChip() {
  // Sized to stay legible after messengers downscale the card to ~640px.
  return (
    <div style={{ display: "flex", fontFamily: MONO, fontSize: 24, letterSpacing: 0.5, color: "#C9CEDA" }}>
      bedrock.silknodes.io
    </div>
  );
}

export function Frame({
  height,
  statusLabel,
  children,
}: {
  height?: string | null;
  statusLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <Scale2x>
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: OG.bg, position: "relative" }}>
      {/* Atmosphere: a soft accent glow bleeding in from the top-right, and a
          faint floor vignette. boxShadow blur gives a real soft falloff (satori
          has no filter: blur), the near-black premium look instead of a flat bar. */}
      <div style={{ position: "absolute", top: 12, right: 150, width: 3, height: 3, borderRadius: 3, display: "flex", boxShadow: `0 0 360px 250px ${OG.glow}` }} />
      <div style={{ position: "absolute", bottom: -120, left: 260, width: 3, height: 3, borderRadius: 3, display: "flex", boxShadow: "0 0 260px 190px rgba(95,224,173,0.05)" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, display: "flex", background: OG.hair }} />

      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "54px 64px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Lockup />
          <RightChip />
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>{children}</div>

        {/* Footer: bottom-left stays empty; bottom-right carries the status
            (e.g. VOTING) or the live block height, tiny faint mono like a
            print colophon / plate number. */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", paddingTop: 24, borderTop: `1px solid ${OG.hair}` }}>
          {statusLabel ? (
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 21, letterSpacing: 3, color: OG.purple }}>{statusLabel}</div>
          ) : (
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 21, letterSpacing: 1.5, color: OG.soft }}>
              BLK {height ? Number(height).toLocaleString("en-US") : "LIVE"}
            </div>
          )}
        </div>
      </div>
    </div>
    </Scale2x>
  );
}

export async function latestBlockHeight(): Promise<string | null> {
  try {
    const r = await fetch(
      "https://cosmos-rest.publicnode.com/cosmos/base/tendermint/v1beta1/blocks/latest",
      { next: { revalidate: 60 } },
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { block?: { header?: { height?: string } } };
    return j.block?.header?.height ?? null;
  } catch {
    return null;
  }
}
