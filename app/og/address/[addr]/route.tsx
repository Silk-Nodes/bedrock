// GET /og/address/[addr] · dynamic OG card for one wallet, so every
// /address/[addr] profile gets a rich, branded preview when shared. Holdings,
// staked share, claimable rewards, and the recent-window flow read. Pulls the
// same /api/address/[addr] payload the profile page renders, so the card and
// the page never disagree.
import { ImageResponse } from "next/og";
import { ogFonts, OG } from "../../fonts";
import { Frame, OG_DIM } from "../../card";
import { headers } from "next/headers";

export const runtime = "nodejs";
export const revalidate = 300;

const BLACK = "Fraunces";
const MONO = "Spline Mono";
const RE = /^cosmos1[0-9a-z]{38,}$/;

function compact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `${Math.round(n / 1_000)}k`;
  return n === 0 ? "0" : `${Math.round(n)}`;
}

type Profile = {
  live?: boolean; block?: number; label?: string | null; category?: string | null;
  total_atom?: number; staked?: number; rewards?: number;
  flow_summary?: { claimed: number; delegated: number; undelegated: number } | null;
  exchange_flow?: { in: number; out: number; net: number } | null;
};

async function getProfile(addr: string): Promise<Profile | null> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "127.0.0.1:3000";
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
    const res = await fetch(`${proto}://${host}/api/address/${addr}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return (await res.json()) as Profile;
  } catch {
    return null;
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ addr: string }> }) {
  const { addr } = await ctx.params;
  const short = RE.test(addr) ? `${addr.slice(0, 12)}…${addr.slice(-6)}` : addr;
  const p = RE.test(addr) ? await getProfile(addr) : null;

  const total = p?.total_atom ?? 0;
  const staked = p?.staked ?? 0;
  const stakedPct = total > 0 ? Math.round((staked / total) * 100) : 0;
  const toCex = p?.exchange_flow?.out ?? 0;
  const fromCex = p?.exchange_flow?.in ?? 0;
  const claimed = p?.flow_summary?.claimed ?? 0;

  const Stat = ({ v, l, color }: { v: string; l: string; color?: string }) => (
    <div style={{ display: "flex", flexDirection: "column", width: 250 }}>
      <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 60, lineHeight: 1, color: color ?? OG.ink, letterSpacing: -1 }}>{v}</div>
      <div style={{ display: "flex", fontFamily: MONO, fontSize: 17, color: OG.soft, marginTop: 10 }}>{l}</div>
    </div>
  );

  return new ImageResponse(
    (
      <Frame height={p?.block ? String(p.block) : null}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          <div style={{ display: "flex", fontFamily: MONO, fontSize: 19, letterSpacing: 4, color: OG.soft, textTransform: "uppercase" }}>
            {p?.label ? p.label : "ATOM wallet"}
          </div>
          <div style={{ display: "flex", fontFamily: MONO, fontSize: 22, color: OG.faint, marginTop: 8 }}>{short}</div>

          <div style={{ display: "flex", alignItems: "baseline", marginTop: 22 }}>
            <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 118, lineHeight: 1, color: OG.ink, letterSpacing: -3 }}>
              {compact(total)}
            </div>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 26, color: OG.soft, marginLeft: 16 }}>ATOM · {stakedPct}% staked</div>
          </div>

          <div style={{ display: "flex", gap: 44, marginTop: 40 }}>
            <Stat v={compact(claimed)} l="claimed (window)" color={OG.warm} />
            <Stat v={compact(toCex)} l="to exchanges" color={toCex > 0 ? OG.red : OG.soft} />
            <Stat v={compact(fromCex)} l="from exchanges" color={fromCex > 0 ? OG.green : OG.soft} />
          </div>
        </div>

        <div style={{ display: "flex", fontFamily: MONO, fontSize: 20, color: OG.soft, marginBottom: 10 }}>
          {p?.live ? "live position · flows since indexed window" : "position unavailable"} · bedrock.silknodes.io
        </div>
      </Frame>
    ),
    { ...OG_DIM, fonts: ogFonts() },
  );
}
