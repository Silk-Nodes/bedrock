// GET /og/whales , dynamic OG card: top-100 whale-intelligence summary. A big
// light-serif count of diamond-hand stakers over a restrained hairline stat row
// (genesis-era, net sellers, sent to exchanges). All numbers live from the
// indexer's whale endpoint.
import { ImageResponse } from "next/og";
import { ogFonts, OG } from "../fonts";
import { Frame, latestBlockHeight , OG_DIM } from "../card";
import { getWhaleIntel } from "@/lib/indexer";

export const runtime = "nodejs";
export const revalidate = 600;

const SERIF = "Fraunces"; // use with fontWeight 300 for the light display cut
const BODY = "Hanken";
const MONO = "Spline Mono";

const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : `${Math.round(n)}`;

export async function GET() {
  const [wi, height] = await Promise.all([getWhaleIntel(100), latestBlockHeight()]);
  const rows = wi.rows;
  const diamond = rows.filter((r) => r.atom > 0 && r.staked_atom / r.atom >= 0.9).length;
  const genesis = rows.filter((r) => r.account_number != null && r.account_number < 5000).length;
  const sellers = rows.filter((r) => r.atom > 0 && r.sent_cex_atom / r.atom >= 0.25).length;
  const sentCex = rows.reduce((s, r) => s + r.sent_cex_atom, 0);

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
      <div style={{ display: "flex", fontFamily: SERIF, fontWeight: 300, fontSize: 66, lineHeight: 1, color: accent ?? OG.ink }}>{value}</div>
    </div>
  );

  return new ImageResponse(
    (
      <Frame height={height}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          {/* eyebrow */}
          <div style={{ display: "flex", fontFamily: MONO, fontSize: 19, letterSpacing: 5, color: OG.soft, marginBottom: 30 }}>
            ATOM · WHALE INTELLIGENCE
          </div>

          {/* hero: big light-serif number + quiet descriptor */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 40 }}>
            <div style={{ display: "flex", fontFamily: SERIF, fontWeight: 300, fontSize: 216, lineHeight: 0.86, color: OG.ink }}>
              {rows.length ? diamond : "—"}
            </div>
            <div style={{ display: "flex", fontFamily: BODY, fontWeight: 400, fontSize: 34, lineHeight: 1.3, color: OG.soft, maxWidth: 500, marginBottom: 30 }}>
              of the top 100 holders keep nearly all their ATOM staked
            </div>
          </div>

          {/* hairline stat row , one restrained accent (sent to exchanges) */}
          <div style={{ display: "flex", marginTop: 50, paddingTop: 32, borderTop: `1px solid ${OG.hair}` }}>
            <Stat label="GENESIS-ERA" value={`${genesis}`} first />
            <Stat label="NET SELLERS" value={`${sellers}`} />
            <Stat label="SENT TO EXCHANGES" value={compact(sentCex)} accent={OG.warm} />
          </div>
        </div>
      </Frame>
    ),
    { ...OG_DIM, fonts: ogFonts() },
  );
}
