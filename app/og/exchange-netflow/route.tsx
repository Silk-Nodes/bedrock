// GET /og/exchange-netflow · 30-day exchange net flow. Deposits are sell-side,
// withdrawals are self-custody, and the net is which one won.
//
// NUMBERS COME FROM THE PRODUCTION ROLLUP (the same figures /exchanges renders),
// not an ad-hoc transfer_events query. That distinction matters: a naive
// "sum transfers to any labelled address" pass over the same window returns net
// INFLOW, the opposite sign, because it counts inferred deposit wallets
// forwarding to hot wallets as withdrawals. The rollup uses verified hot wallets
// only and the debugged deposit/withdrawal leg attribution.
//
//   deposits onto    19.94M ATOM
//   withdrawals off  20.33M ATOM
//   net               -394k ATOM  (negative = off exchanges = accumulation)
//   per venue: Binance -432k, Coinbase +12k, Kraken +26k  (sums to -394k)
//
// ONLY ONE VENUE IS NET OFF. Binance alone accounts for the entire outflow;
// Coinbase and Kraken both took net deposits. Saying "most venues are
// accumulating" would be false, so the card says the opposite explicitly.
//
// THESE NUMBERS DRIFT. The window is a rolling 720h, so it slides continuously
// and the public page can serve a render up to ~10 min stale behind the
// indexer (Next revalidate 300 + Cloudflare s-maxage 300). An earlier scrape of
// the cached page read -474k with Coinbase at -7k, i.e. a different magnitude
// AND a different sign for one venue. Re-render and re-verify against
// /api/v1/exchanges/netflow?hours=720 immediately before posting.
//
// SIGN CONVENTION matches the site: net = deposits - withdrawals, so negative
// is ATOM LEAVING exchanges. Green = off (self-custody), red = onto (sell side).
//
// THE COUNTER-EXAMPLE IS ON THE CARD ON PURPOSE. Kraken (+26k) and Coinbase
// (+12k) are both net onto, against a headline that says ATOM is leaving.
// Showing the venues that cut against the claim is what makes it believable,
// and it pre-empts the cherry-pick reply.
//
// SCOPE, STATED NOT HIDDEN: 3 verified venues. Upbit is excluded because its
// flow settles off-book, so counting its on-chain legs would distort the total.
// This is a floor on real coverage, not the whole market.
//
// STATIC BY CHOICE with an AS OF stamp, same vintage contract as COVERAGE in
// data/methodology.ts. Re-render before reuse.
import { ImageResponse } from "next/og";
import { ogFonts, OG } from "../fonts";
import { Frame, OG_DIM } from "../card";

export const runtime = "nodejs";
export const revalidate = 3600;

const BLACK = "Fraunces";
const MONO = "Spline Mono";

// net in thousands of ATOM; negative = off exchanges
const VENUES = [
  { name: "Binance", net: -432 },
  { name: "Kraken", net: 26 },
  { name: "Coinbase", net: 12 },
];

const MAXABS = Math.max(...VENUES.map((v) => Math.abs(v.net)));
const HALF = 150;
const AXIS = 200;

export async function GET() {
  return new ImageResponse(
    (
      <Frame statusLabel="AS OF 23 JUL 2026">
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 520 }}>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 18, letterSpacing: 4, color: OG.soft, textTransform: "uppercase" }}>
              Exchange net flow · last 30 days
            </div>
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 18 }}>
              <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 132, lineHeight: 1, color: OG.green, letterSpacing: -3 }}>
                394k
              </div>
              <div style={{ display: "flex", fontFamily: MONO, fontSize: 26, color: OG.soft, marginLeft: 16 }}>ATOM</div>
            </div>
            <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 36, color: OG.ink, marginTop: 18, letterSpacing: -0.5 }}>
              left exchanges, net
            </div>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 19, color: OG.faint, marginTop: 18, width: 500, lineHeight: 1.5 }}>
              binance alone drove it. coinbase and kraken both took net deposits over the same window.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", width: 470 }}>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 16, letterSpacing: 3, color: OG.faint, textTransform: "uppercase", marginBottom: 18 }}>
              per venue
            </div>
            {VENUES.map((v) => {
              const w = Math.max(3, Math.round((Math.abs(v.net) / MAXABS) * HALF));
              const off = v.net < 0;
              return (
                <div key={v.name} style={{ display: "flex", alignItems: "center", height: 52 }}>
                  <div style={{ display: "flex", width: 118, fontFamily: MONO, fontSize: 18, color: OG.soft }}>{v.name}</div>
                  <div style={{ display: "flex", width: AXIS, justifyContent: "flex-end" }}>
                    {off ? <div style={{ display: "flex", width: w, height: 16, background: OG.green, borderRadius: 2 }} /> : null}
                  </div>
                  <div style={{ display: "flex", width: 1, height: 30, background: OG.hair }} />
                  <div style={{ display: "flex", width: AXIS }}>
                    {!off ? <div style={{ display: "flex", width: w, height: 16, background: OG.red, borderRadius: 2 }} /> : null}
                  </div>
                </div>
              );
            })}
            <div style={{ display: "flex", marginTop: 8 }}>
              <div style={{ display: "flex", width: 118 }} />
              <div style={{ display: "flex", width: AXIS, justifyContent: "flex-end", fontFamily: MONO, fontSize: 15, color: OG.green }}>
                withdrawn ←
              </div>
              <div style={{ display: "flex", width: 1 }} />
              <div style={{ display: "flex", width: AXIS, fontFamily: MONO, fontSize: 15, color: OG.red, paddingLeft: 6 }}>
                → deposited
              </div>
            </div>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 16, color: OG.soft, marginTop: 16, marginLeft: 118 }}>
              −432k · +26k · +12k
            </div>
          </div>
        </div>

        <div style={{ display: "flex", fontFamily: MONO, fontSize: 18, color: OG.soft, marginBottom: 8 }}>
          20.33M withdrawn vs 19.94M deposited · 1 of 3 venues net off · verified wallets only
        </div>
      </Frame>
    ),
    { ...OG_DIM, fonts: ogFonts() },
  );
}
