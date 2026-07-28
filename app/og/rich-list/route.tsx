// GET /og/rich-list · OG card for the Rich List board. A summary of what the
// top real holders are doing right now: how many are accumulating vs
// distributing, total held, and the single biggest reward-claimer. Live from
// the same getWhaleBoard the page uses, so the card can't drift from the page.
import { ImageResponse } from "next/og";
import { ogFonts, OG } from "../fonts";
import { Frame, latestBlockHeight, OG_DIM } from "../card";
import { getWhaleBoard } from "@/lib/indexer";

export const runtime = "nodejs";
export const revalidate = 600;

const BLACK = "Fraunces";
const MONO = "Spline Mono";

function compact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${Math.round(n)}`;
}

function stanceOf(r: { delegated: number; undelegated: number; toCex: number; fromCex: number; claimed: number; held: number }): "acc" | "dist" | "dormant" | "active" {
  const netStake = r.delegated - r.undelegated;
  const netCex = r.fromCex - r.toCex;
  const active = r.delegated + r.undelegated + r.toCex + r.fromCex + r.claimed;
  if (active < 1) return "dormant";
  if (netCex < -0.05 * r.held || r.toCex > Math.max(1, r.fromCex) * 1.5) return "dist";
  if (netStake > 0 || netCex > 0) return "acc";
  return "active";
}

export async function GET() {
  const [board, height] = await Promise.all([getWhaleBoard(100), latestBlockHeight()]);
  const rows = board.rows;
  const held = rows.reduce((s, r) => s + r.held, 0);
  const acc = rows.filter((r) => stanceOf(r) === "acc").length;
  const dist = rows.filter((r) => stanceOf(r) === "dist").length;
  const dormant = rows.filter((r) => stanceOf(r) === "dormant").length;
  const topClaim = rows.reduce((m, r) => (r.claimed > m ? r.claimed : m), 0);

  const Stat = ({ v, l, color }: { v: string; l: string; color?: string }) => (
    <div style={{ display: "flex", flexDirection: "column", width: 210 }}>
      <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 62, lineHeight: 1, color: color ?? OG.ink, letterSpacing: -1 }}>{v}</div>
      <div style={{ display: "flex", fontFamily: MONO, fontSize: 17, color: OG.soft, marginTop: 10 }}>{l}</div>
    </div>
  );

  return new ImageResponse(
    (
      <Frame height={height}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          <div style={{ display: "flex", fontFamily: MONO, fontSize: 19, letterSpacing: 5, color: OG.soft, textTransform: "uppercase" }}>
            The Rich List · top {rows.length} ATOM holders
          </div>
          <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 58, lineHeight: 1.05, color: OG.ink, letterSpacing: -1.5, marginTop: 16 }}>
            What the biggest holders are doing
          </div>

          <div style={{ display: "flex", gap: 40, marginTop: 40 }}>
            <Stat v={compact(held)} l="ATOM held, combined" />
            <Stat v={`${acc}`} l="accumulating" color={OG.green} />
            <Stat v={`${dist}`} l="distributing" color={OG.red} />
            <Stat v={`${dormant}`} l="dormant" />
          </div>
        </div>

        <div style={{ display: "flex", fontFamily: MONO, fontSize: 22, color: OG.soft, marginBottom: 10 }}>
          real holders only · exchange & treasury excluded · biggest claimer {compact(topClaim)} ATOM · since {new Date(board.since).toLocaleDateString("en-US", { day: "2-digit", month: "short" })}
        </div>
      </Frame>
    ),
    { ...OG_DIM, fonts: ogFonts() },
  );
}
