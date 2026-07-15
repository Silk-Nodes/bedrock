// /feedback · community feature-request board. Submit ideas, vote on what
// matters, see status. Data lives in the indexer; this page renders the board.

import { ConsolePage, ConsoleModule, IntelCard } from "@/components/console/Console";
import { FeedbackBoard } from "@/components/feedback/FeedbackBoard";
import { seo } from "@/lib/seo";

export const metadata = seo({
  title: "Feedback",
  description: "Shape Bedrock. Submit a feature request for the Cosmos Hub economic observatory, vote on what matters most, and track what's planned, in progress, and shipped.",
  path: "/feedback",
  keywords: ["Bedrock feedback", "Cosmos Hub feature request", "ATOM analytics roadmap", "suggest a feature"],
});

export const dynamic = "force-dynamic";

export default function FeedbackPage() {
  return (
    <ConsolePage>
      <ConsoleModule lead dot="var(--hub)" title="Feedback · feature requests" meta="submit · vote · track">
        <div className="console-grid">
          <div className="span-12">
            <IntelCard title="Shape Bedrock" meta="the team reviews this board weekly" accent>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-80)", margin: 0 }}>
                Got an idea for the ATOM economic observatory? Submit it below and vote on what matters most. Every request is public, one vote per browser, and we set the status as things move from open to shipped.
              </p>
            </IntelCard>
          </div>
          <div className="span-12">
            <FeedbackBoard />
          </div>
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
