// GET /og/holders , dynamic OG card: ATOM holder base summary. Big live holder
// count over a stat row (whales, mega-holders, top-100 concentration). All
// numbers live from the indexer's holder snapshot.
import { ImageResponse } from "next/og";
import { ogFonts, OG } from "../fonts";
import { Frame, latestBlockHeight , OG_DIM } from "../card";
import { getHolders } from "@/lib/indexer";

export const runtime = "nodejs";
export const revalidate = 600;

const BLACK = "Fraunces";
const BODY = "Hanken";
const MONO = "Spline Mono";

const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : `${Math.round(n)}`;

export async function GET() {
  const [h, height] = await Promise.all([getHolders(), latestBlockHeight()]);
  const L = h.latest;
  const total = L ? L.holders_total : 0;
  const whales = L ? L.tiers.t10k : 0;
  const mega = L ? L.tiers.t1m : 0;
  const top100Pct = L && L.total_atom > 0 ? (L.top100_atom / L.total_atom) * 100 : 0;

  const Stat = ({ label, value, accent, first }: { label: string; value: string; accent?: string; first?: boolean }) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 13,
        flex: 1,
        paddingLeft: first ? 0 : 40,
        borderLeft: first ? "none" : `1px solid ${OG.hair}`,
      }}
    >
      <div style={{ display: "flex", fontFamily: MONO, fontSize: 16, letterSpacing: 2.5, color: OG.faint }}>{label}</div>
      <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 66, lineHeight: 1, color: accent ?? OG.ink }}>{value}</div>
    </div>
  );

  return new ImageResponse(
    (
      <Frame height={height}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          <div style={{ display: "flex", fontFamily: MONO, fontSize: 19, letterSpacing: 5, color: OG.soft, marginBottom: 30 }}>
            ATOM · HOLDERS
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 40 }}>
            <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 190, color: OG.ink, lineHeight: 0.9 }}>{compact(total)}</div>
            <div style={{ display: "flex", fontFamily: BODY, fontWeight: 400, fontSize: 34, color: OG.soft, marginBottom: 22 }}>wallets hold ATOM</div>
          </div>
          <div style={{ display: "flex", marginTop: 50, paddingTop: 32, borderTop: `1px solid ${OG.hair}` }}>
            <Stat label="WHALES 10K+" value={whales.toLocaleString("en-US")} first />
            <Stat label="MEGA 1M+" value={`${mega}`} />
            <Stat label="TOP 100 HOLD" value={`${top100Pct.toFixed(0)}%`} accent={OG.warm} />
          </div>
        </div>
      </Frame>
    ),
    { ...OG_DIM, fonts: ogFonts() },
  );
}
