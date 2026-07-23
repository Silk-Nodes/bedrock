// GET /og/what-is-bedrock · the product map. What Bedrock actually covers,
// rather than one statistic pulled out of it.
//
// This card sells the tool, so the claims on it have to be exactly true:
//   41 pages          find app -name page.tsx | wc -l  (counted, not estimated)
//   143M events       118,122,083 transfer_events + 25,191,306 staking_events
//   since genesis     min(staking_events.ts) = 2019-03-13, cosmoshub-1 launch day
//   13.0M blocks      block_mint row count
//   104 labels        address_labels row count
//
// The section list mirrors the real route tree, so every line is a page that
// exists. If routes are added or removed, update SECTIONS or the card starts
// advertising pages that 404.
//
// STATIC BY CHOICE with an AS OF stamp, same vintage contract as COVERAGE in
// data/methodology.ts. Re-render when the site's shape changes.
import { ImageResponse } from "next/og";
import { ogFonts, OG } from "../fonts";
import { Frame, OG_DIM } from "../card";

export const runtime = "nodejs";
export const revalidate = 3600;

const BLACK = "Fraunces";
const MONO = "Spline Mono";

const SECTIONS: { title: string; items: string[] }[] = [
  { title: "ATOM", items: ["supply & burn", "distribution", "holders", "genesis"] },
  { title: "Stakers", items: ["delegation flow", "rewards", "unbonding queue", "population"] },
  { title: "Validators", items: ["the full set", "commission", "concentration", "profiles"] },
  { title: "Exchanges", items: ["net flows", "sell pressure", "destinations", "per venue"] },
  { title: "Market", items: ["price & mcap", "relative perf", "trade venues", "watchlist"] },
  { title: "Signals", items: ["cohort flows", "whale moves", "live feed", "labels"] },
];

export async function GET() {
  const Col = ({ s }: { s: { title: string; items: string[] } }) => (
    <div style={{ display: "flex", flexDirection: "column", width: 336 }}>
      <div style={{ display: "flex", fontFamily: MONO, fontSize: 16, letterSpacing: 3, color: OG.purple, textTransform: "uppercase" }}>
        {s.title}
      </div>
      <div style={{ display: "flex", width: 300, height: 1, background: OG.hair, marginTop: 7, marginBottom: 9 }} />
      {s.items.map((it) => (
        <div key={it} style={{ display: "flex", fontFamily: MONO, fontSize: 17, color: OG.soft, marginBottom: 3 }}>
          {it}
        </div>
      ))}
    </div>
  );

  return new ImageResponse(
    (
      <Frame statusLabel="41 PAGES">
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", paddingTop: 4 }}>
          <div style={{ display: "flex", fontFamily: BLACK, fontWeight: 300, fontSize: 46, lineHeight: 1.05, color: OG.ink, letterSpacing: -1.5 }}>
            Every ATOM question, one place.
          </div>

          <div style={{ display: "flex", marginTop: 22 }}>
            {SECTIONS.slice(0, 3).map((s) => <Col key={s.title} s={s} />)}
          </div>
          <div style={{ display: "flex", marginTop: 18 }}>
            {SECTIONS.slice(3).map((s) => <Col key={s.title} s={s} />)}
          </div>
        </div>

        <div style={{ display: "flex", fontFamily: MONO, fontSize: 19, color: OG.soft, marginBottom: 8 }}>
          143M on-chain events · 13.0M blocks · indexed since genesis, march 2019
        </div>
      </Frame>
    ),
    { ...OG_DIM, fonts: ogFonts() },
  );
}
