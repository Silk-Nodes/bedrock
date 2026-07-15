// /explore · look up any Cosmos Hub wallet, live position + activity. The
// search/render is client-side (ExploreClient); this server wrapper provides
// the console frame and the Suspense boundary useSearchParams needs.

import { Suspense } from "react";
import { ConsolePage, ConsoleModule } from "@/components/console/Console";
import { ExploreClient } from "@/components/explore/ExploreClient";
import { seo } from "@/lib/seo";

export const metadata = seo({ title: "Wallet Explorer", description: "Look up any Cosmos Hub address: live ATOM balance, staking, delegations, and transaction flow, with labels for known exchanges and validators.", path: "/explore", keywords: ["Cosmos Hub explorer", "ATOM address lookup", "ATOM wallet explorer", "cosmos1 address"] });

export default function Explore() {
  return (
    <ConsolePage>
      <ConsoleModule lead dot="var(--hub)" title="Explore · any wallet" meta="live position + activity, from the chain and the Bedrock indexer">
        <Suspense fallback={null}>
          <ExploreClient />
        </Suspense>
      </ConsoleModule>
    </ConsolePage>
  );
}
