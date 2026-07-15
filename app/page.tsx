// Bedrock landing (server wrapper). Fetches live chain state, validator count,
// and IBC reach on-chain, and hands them to the client story so the "chain
// today" chapter shows real numbers, never mock. Historical/qualitative facts
// (data/atom-story.ts) are researched structural fact.

import type { Metadata } from "next";
import { StoryLanding } from "@/components/story/StoryLanding";
import { getLiveIbc } from "@/lib/ibc";
import { getLiveChain } from "@/lib/chain";
import { getLiveValidators } from "@/lib/validators";
import { reconstructSupplySeries } from "@/lib/series";

// Homepage keeps the brand default title from the root layout; just pin its own
// canonical so it isn't conflated with deeper routes.
export const metadata: Metadata = { alternates: { canonical: "/" } };

// Live landing: render on request (fetch-level caching still applies via the
// libs' next.revalidate), so the heavy validator/logo/IBC fan-out never blocks
// the build-time static-export budget.
export const dynamic = "force-dynamic";

export default async function Page() {
  const [ibc, chain, vals] = await Promise.all([getLiveIbc(), getLiveChain(), getLiveValidators()]);
  const supplySeries = reconstructSupplySeries(chain, 36).map((p) => ({ date: p.date, value: p.bonded }));

  return (
    <StoryLanding
      ibcConnections={ibc.open_connections}
      ibcChannels={ibc.open_channels}
      ibcLive={ibc.live}
      bonded={chain.bonded}
      bondedRatio={chain.bonded_ratio_pct}
      activeValidators={vals.active}
      stakingApr={chain.staking_apr_pct}
      inflation={chain.inflation_pct}
      realYield={chain.real_yield_pct}
      supplySeries={supplySeries}
    />
  );
}
