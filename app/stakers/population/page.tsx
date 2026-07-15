// /stakers/population · the single home for the per-address staker views that all
// need the indexer's historical backfill: how many stakers, their size cohorts,
// and their loyalty/bond-age. Merged here (from three separate stubs) because none
// can show data until the backfill crosses enough history. Honest pending panel.

import { ConsolePage, ConsoleModule } from "@/components/console/Console";
import { PendingData } from "@/components/console/PendingData";
import { seo } from "@/lib/seo";

export const revalidate = 300;
export const metadata = seo({ title: "Staker Population", description: "How many wallets stake ATOM on the Cosmos Hub, how that population has grown, and how stake is spread across cohorts of delegators.", path: "/stakers/population", keywords: ["ATOM stakers count", "Cosmos Hub delegators", "ATOM staking population"] });

export default function StakersPopulation() {
  return (
    <ConsolePage>
      <ConsoleModule lead dot="var(--moss)" title="Stakers · population & cohorts" meta="per-address, backfilling">
        <PendingData
          title="Population, cohorts & loyalty"
          what="This page will count unique staking addresses over time (new, churned, retained), split the base into size cohorts (whales, mid, the long tail), and show loyalty, how long stakers stay bonded and what share holds through drawdowns."
          needs="All three need a per-address balance snapshot for every delegator over time, which the indexer builds as it backfills history. Until that history exists, counting or splitting the staker base would mean estimating, which Bedrock never does."
          liveNow={{ label: "Delegation flow", href: "/stakers/delegation" }}
        />
      </ConsoleModule>
    </ConsolePage>
  );
}
