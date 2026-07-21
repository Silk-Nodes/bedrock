// GET /og/staking-flow · dynamic OG card: net ATOM staked over the trailing
// 30 days, with the delegated / unbonded split that produces it.
//
// The window is labelled from what the indexer ACTUALLY returned
// (window_start/end), never from the 720h we asked for, so a partially
// covered window reads honestly instead of overclaiming 30 days.
import { ImageResponse } from "next/og";
import { ogFonts, OG } from "../fonts";
import { Frame, latestBlockHeight, OG_DIM } from "../card";
import { getStakingNetFlow } from "@/lib/indexer";

export const runtime = "nodejs";
export const revalidate = 300;

const BLACK = "Fraunces";
const MONO = "Spline Mono";

// 6_606_581 -> "6.61M". Two significant decimals at M/k scale, no rounding
// into a precision we do not have.
function compact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return Math.round(n).toLocaleString("en-US");
}

function spanDays(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return Math.round(ms / 86_400_000);
}

export async function GET() {
  const [flow, height] = await Promise.all([getStakingNetFlow(720), latestBlockHeight()]);

  const net = flow.net_atom;
  const pos = net >= 0;
  const accent = pos ? OG.green : OG.red;

  // Label the window we have, not the one we asked for.
  const days = spanDays(flow.window_start, flow.window_end);
  const windowLabel = days ? `last ${days} days` : "recent window";

  const ratio = flow.unbond_atom > 0 ? flow.delegate_atom / flow.unbond_atom : 0;

  // Bars share one scale so the two volumes are visually comparable.
  const maxLeg = Math.max(flow.delegate_atom, flow.unbond_atom, 1);
  const BAR_MAX = 300;
  const delW = Math.max(2, Math.round((flow.delegate_atom / maxLeg) * BAR_MAX));
  const unbW = Math.max(2, Math.round((flow.unbond_atom / maxLeg) * BAR_MAX));

  const Leg = ({ label, value, width, color }: { label: string; value: string; width: number; color: string }) => (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", fontFamily: MONO, fontSize: 17, letterSpacing: 3, color: OG.faint, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 10 }}>
        <div style={{ display: "flex", width, height: 18, background: color, borderRadius: 2 }} />
        <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 400, fontSize: 34, color: OG.ink, marginLeft: 18 }}>
          {value}
        </div>
      </div>
    </div>
  );

  return new ImageResponse(
    (
      <Frame height={height}>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 19, letterSpacing: 5, color: OG.soft, textTransform: "uppercase" }}>
              Net ATOM staked · {windowLabel}
            </div>
            {/* The sign is set in Hanken, not Fraunces: the light display cut of
                Fraunces has no "+" glyph and satori renders a bare notdef bar,
                which turned a positive flow into an apparent minus. Tinting it
                with the accent also carries the direction at a glance. */}
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 26 }}>
              <div style={{ display: "flex", fontFamily: "Hanken", fontWeight: 600, fontSize: 96, lineHeight: 1, color: accent, marginRight: 10 }}>
                {pos ? "+" : "-"}
              </div>
              <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 150, lineHeight: 1, color: OG.ink, letterSpacing: -2 }}>
                {compact(Math.abs(net))}
              </div>
            </div>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 23, color: accent, marginTop: 22 }}>
              {ratio > 0 ? `${ratio.toFixed(2)}× more flowing in than out` : "net flow"}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 34, paddingRight: 8 }}>
            <Leg label="Delegated" value={compact(flow.delegate_atom)} width={delW} color={OG.green} />
            <Leg label="Unbonded" value={compact(flow.unbond_atom)} width={unbW} color={OG.red} />
          </div>
        </div>

        <div style={{ display: "flex", fontFamily: MONO, fontSize: 24, color: OG.soft, marginBottom: 10 }}>
          {compact(flow.delegate_atom)} delegated vs {compact(flow.unbond_atom)} unbonded ·{" "}
          {flow.events.toLocaleString("en-US")} events · {flow.live ? "live from the indexer" : "snapshot"}
        </div>
      </Frame>
    ),
    { ...OG_DIM, fonts: ogFonts() },
  );
}
