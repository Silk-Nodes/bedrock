// GET /og/keplr (served as /card/keplr): the social card for /incidents/keplr.
// Same answer and numbers as the page, from the same cached read. If that read
// is not ready within a few seconds (cold after a deploy), the card renders
// without numbers instead of making X's preview fetch time out.
import { ImageResponse } from "next/og";
import { ogFonts, OG } from "../fonts";
import { Lockup, RightChip, Scale2x, OG_DIM } from "../card";
import { getRecoveryWatch, type RecoveryWatch } from "@/lib/recovery";

export const runtime = "nodejs";
// Per request, never at build (the read hits 11 public LCDs); the edge keeps
// each rendered card for 5 minutes.
export const dynamic = "force-dynamic";

const SERIF = "Fraunces";
const MONO = "Spline Mono";
const n = (x: number) => Math.round(x).toLocaleString("en-US");

async function readFast(ms: number): Promise<RecoveryWatch | null> {
  try {
    return await Promise.race([getRecoveryWatch(), new Promise<null>((r) => setTimeout(() => r(null), ms))]);
  } catch {
    return null;
  }
}

export async function GET() {
  const w = await readFast(6000);
  const t = w?.totals;
  const hub = w?.hub ? w.hub.liquidAtom + w.hub.lsmAtom : null;

  // Same rules as the page headline: never an all-clear for an unread wallet.
  const headline = !t
    ? "Is the money Web3Auth recovered still there?"
    : t.outflowChains.length
      ? "Funds have left a Web3Auth recovery wallet."
      : t.returningChains.length
        ? "Web3Auth has started returning funds."
        : t.unreadChains.length
          ? `Nothing has left the ${t.tracked - t.unreadChains.length} recovery wallets we could read.`
          : "Nothing has left Web3Auth's recovery wallets.";
  const tone = t?.outflowChains.length ? OG.red : OG.green;

  const stats = t
    ? [
        { v: n(t.inbound), l: "transfers in" },
        t.returningChains.length || t.outflowChains.length
          ? { v: n(t.returnedTx), l: "returned to owners", c: OG.green }
          : { v: n(t.outbound), l: "sent out", c: tone },
        ...(hub !== null ? [{ v: `${(hub / 1e6).toFixed(2)}M`, l: "ATOM held on the Hub" }] : []),
      ]
    : [];

  return new ImageResponse(
    (
      <Scale2x>
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: OG.bg, position: "relative" }}>
          <div style={{ position: "absolute", top: 12, right: 150, width: 3, height: 3, borderRadius: 3, display: "flex", boxShadow: `0 0 360px 250px ${OG.glow}` }} />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, display: "flex", background: OG.hair }} />

          <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "54px 64px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Lockup />
              <RightChip />
            </div>

            <div style={{ display: "flex", flexDirection: "column", marginTop: 52 }}>
              <div style={{ display: "flex", alignItems: "center", fontFamily: MONO, fontSize: 19, letterSpacing: 5, color: OG.soft, textTransform: "uppercase" }}>
                <div style={{ display: "flex", width: 10, height: 10, borderRadius: 10, background: tone, marginRight: 14 }} />
                Keplr recovery watch · live
              </div>
              <div style={{ display: "flex", fontFamily: SERIF, fontWeight: 300, fontSize: 84, lineHeight: 1.04, letterSpacing: -2, color: OG.ink, marginTop: 22, maxWidth: 960 }}>
                {headline}
              </div>
            </div>

            <div style={{ display: "flex", flex: 1 }} />

            {stats.length > 0 ? (
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                {stats.map((s) => (
                  <div key={s.l} style={{ display: "flex", flexDirection: "column", marginRight: 64 }}>
                    <div style={{ display: "flex", fontFamily: SERIF, fontWeight: 300, fontSize: 56, lineHeight: 1, color: s.c ?? OG.ink, letterSpacing: -1 }}>{s.v}</div>
                    <div style={{ display: "flex", fontFamily: MONO, fontSize: 18, letterSpacing: 1, color: OG.soft, marginTop: 12 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", fontFamily: MONO, fontSize: 22, letterSpacing: 1, color: OG.soft, maxWidth: 760 }}>
                11 recovery wallets, read on chain. Check your address.
              </div>
            )}
          </div>

          <div style={{ display: "flex", position: "absolute", right: 64, bottom: 54, fontFamily: MONO, fontSize: 18, letterSpacing: 1, color: OG.faint }}>
            {t ? `${t.tracked} chains · checked every 10 min` : "checked every 10 min"}
          </div>
        </div>
      </Scale2x>
    ),
    {
      ...OG_DIM,
      fonts: ogFonts(),
      // The numbers-free fallback must never be cached: X keeps whatever card
      // it fetched first for days, and the edge would hand the fallback to it.
      headers: { "Cache-Control": t ? "public, s-maxage=300, stale-while-revalidate=600" : "no-store" },
    },
  );
}
