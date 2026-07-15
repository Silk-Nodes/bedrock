// /atom · ATOM section landing. Deliberately THIN: a one-line investment thesis,
// the fundamentals in a sentence, and navigation into the subpages. It renders NO
// metric of its own, every number has its canonical home (price/market on
// /atom/market, supply/inflation on /atom/supply, bonded on /stakers, etc.). This
// page only routes you to them.

import { ConsolePage, ConsoleModule } from "@/components/console/Console";
import Link from "next/link";
import { ATOM_TOKEN } from "@/data/atom";
import { getLiveChain } from "@/lib/chain";
import { seo } from "@/lib/seo";

export const metadata = seo({ title: "ATOM", description: "The complete economic picture of ATOM: supply and inflation, distribution, holders, whales, governance, market, and burn, all from Cosmos Hub on-chain data.", path: "/atom", keywords: ["ATOM", "Cosmos Hub ATOM", "ATOM tokenomics", "ATOM supply", "ATOM analytics"] });
export const revalidate = 300;

const SUBPAGES = [
  { href: "/atom/supply", title: "Supply & burn", blurb: "The live ticking supply, issuance vs burn, and ATOM at the market cap of BTC, ETH, SOL and more." },
  { href: "/atom/distribution", title: "Distribution", blurb: "How concentrated ATOM ownership is, and who controls it." },
  { href: "/atom/holders", title: "Holders", blurb: "Who holds ATOM and how the base shifts between retail and whales: tiers, pyramid, leaderboard." },
  { href: "/atom/governance", title: "Governance", blurb: "Proposals, turnout, and how decentralized voting really is." },
  { href: "/atom/market", title: "Market & liquidity", blurb: "Price, market cap, and where ATOM actually trades." },
  { href: "/atom/market/trade", title: "Where to trade", blurb: "The venues with real ATOM liquidity, ranked by verified volume." },
];

export default async function AtomOverview() {
  const chain = await getLiveChain();
  const live = chain.live;

  return (
    <ConsolePage>
      <ConsoleModule lead title="ATOM token" dot="var(--hub-2)" meta={live ? "live" : "snapshot"}>
        {/* Investment thesis: what ATOM is, in one line */}
        <div style={{ padding: "16px 2px 30px", maxWidth: 760 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 25, fontWeight: 600, lineHeight: 1.3, letterSpacing: "-0.01em", color: "var(--ink)" }}>
            ATOM secures the Cosmos Hub and is the reserve asset of the Interchain.
          </div>
          <div style={{ fontSize: 14.5, color: "var(--ink-60)", lineHeight: 1.6, marginTop: 12 }}>
            Its supply is uncapped but inflation is dynamic, tuned to keep the chain well-staked. Most of the supply is
            bonded to validators, and a community tax funds the on-chain treasury. Genesis {ATOM_TOKEN.genesis_date}.
          </div>
        </div>

        <div className="console-grid">
          <div className="span-12">
            <div style={{ fontSize: 13.5, color: "var(--ink-60)", lineHeight: 1.6, padding: "0 2px 8px" }}>
              The economics live on their own pages, each number in exactly one place, price and market on Market &amp; liquidity. Pick a thread below.
            </div>
          </div>

          {/* Navigation into the subpages */}
          {SUBPAGES.map((s) => (
            <div key={s.href} className="span-4">
              <Link href={s.href} style={{ textDecoration: "none", display: "block" }}>
                <div className="surface surface-lift" style={{ padding: "16px 18px", height: "100%" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>{s.title}</div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-60)", lineHeight: 1.55, marginTop: 8 }}>{s.blurb}</div>
                  <div className="data" style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "var(--hub)", marginTop: 12 }}>Open →</div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
