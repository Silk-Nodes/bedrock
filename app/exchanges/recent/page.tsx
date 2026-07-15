// /exchanges/recent · the live exchange flow feed. Recent deposits and
// withdrawals, classified ONLY by verified exchange labels, auto-refreshing
// from the Bedrock indexer's tip-follower. The unlabeled all-events network
// feed lives at /today/feed; this is the exchange-attributed view.

import { ConsolePage, ConsoleModule, IntelCard } from "@/components/console/Console";
import { LiveExchangeFeed } from "@/components/exchanges/LiveExchangeFeed";
import { seo } from "@/lib/seo";

export const metadata = seo({ title: "Recent Flows", description: "The live feed of ATOM exchange deposits and withdrawals on the Cosmos Hub, label-verified from the Bedrock indexer.", path: "/exchanges/recent", keywords: ["ATOM exchange flows", "recent ATOM transfers", "Cosmos Hub flow feed"] });

export default function RecentPage() {
  return (
    <ConsolePage>
      <ConsoleModule
        lead
        dot="var(--moss)"
        title="Exchanges · live flow"
        meta="recent deposits and withdrawals · verified labels only"
      >
        <div className="console-grid">
          <div className="span-12">
            <IntelCard title="Live exchange flow" meta="from the Bedrock indexer tip-follower">
              <LiveExchangeFeed exchangeOnly />
            </IntelCard>
          </div>
          <div className="span-12">
            <div className="data" style={{ fontSize: 11, color: "var(--ink-40)", lineHeight: 1.6 }}>
              Tagged deposit/withdrawal only when one side is a verified exchange wallet. Full network stream on{" "}
              <a href="/today/feed" style={{ color: "var(--hub)" }}>Today → Feed</a>.
            </div>
          </div>
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
