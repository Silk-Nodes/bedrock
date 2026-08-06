// /api - public API documentation and key request.
//
// Endpoint list is hand-maintained against the indexer's router. If you add a
// route in internal/api/api.go, add it here too; there is no generated spec yet
// and a docs page that lies is worse than no docs page.

import { ConsolePage, ConsoleModule } from "@/components/console/Console";
import { ApiKeyRequestForm } from "@/components/api/ApiKeyRequestForm";
import { seo } from "@/lib/seo";

export const metadata = seo({
  title: "API",
  description:
    "Public API for Cosmos Hub on-chain data: staking flows, exchange flows, holders, validators, and governance. Request a key.",
  path: "/api",
  keywords: ["Cosmos Hub API", "ATOM data API", "on-chain data API", "staking API"],
});

export const revalidate = 3600;

const GROUPS: { name: string; rows: [string, string][] }[] = [
  {
    name: "Staking",
    rows: [
      ["/api/v1/staking/netflow?hours=168", "delegations minus unbondings over a window"],
      ["/api/v1/staking/recent?min=1000&limit=50", "recent delegate and unbond events"],
      ["/api/v1/staking/feed?min=1000&type=delegate", "filtered staking event feed"],
      ["/api/v1/stakers/rewards?hours=720", "reward claims"],
      ["/api/v1/stakers/reward-behavior", "what stakers do after claiming, by tier"],
      ["/api/v1/stakers/reward-daily", "daily reward claim totals"],
    ],
  },
  {
    name: "Exchanges",
    rows: [
      ["/api/v1/exchanges/flow", "deposits and withdrawals by venue"],
      ["/api/v1/exchanges/netflow", "net flow per venue"],
      ["/api/v1/exchanges/sell-pressure", "reward-driven sell pressure"],
      ["/api/v1/custody/history", "bonded ATOM custodied per exchange, daily"],
      ["/api/v1/ibc/outbound?hours=168", "where ATOM goes when it leaves over IBC"],
    ],
  },
  {
    name: "Holders and wallets",
    rows: [
      ["/api/v1/holders", "holder distribution by tier"],
      ["/api/v1/holders/whales", "largest holders"],
      ["/api/v1/whales/board?limit=100", "top 100 board with per-wallet flows"],
      ["/api/v1/whales/events", "significant whale movements"],
      ["/api/v1/whales/exchange-holders", "exchange-linked wallets, grouped by venue"],
      ["/api/v1/address/{addr}/summary", "one wallet: balance, staked, first seen"],
      ["/api/v1/address/{addr}/activity?limit=100", "one wallet: event history"],
      ["/api/v1/wallets/flow-class", "wallets classified by flow behaviour"],
    ],
  },
  {
    name: "Validators",
    rows: [
      ["/api/v1/validators/flow?hours=168", "net delegation flow per validator"],
      ["/api/v1/validators/commission-flow?days=30", "commission earned, restaked, and reaching exchanges"],
    ],
  },
  {
    name: "Supply, signals, governance",
    rows: [
      ["/api/v1/issuance/daily", "daily minted ATOM and inflation"],
      ["/api/v1/inflation/realization", "how much new issuance is sold"],
      ["/api/v1/signals/cohort-flows", "net flow per wealth cohort"],
      ["/api/v1/signals/cohort-sell-pressure", "sell pressure per cohort"],
      ["/api/v1/gov/market-risk", "governance-linked market risk"],
      ["/api/v1/governance/{id}/votes", "votes on one proposal"],
      ["/api/v1/flows/recent", "recent large transfers"],
      ["/api/v1/flows/feed", "transfer feed"],
      ["/api/v1/labels", "known address labels"],
      ["/api/v1/news", "Cosmos ecosystem news items"],
      ["/api/v1/status", "indexer height and coverage"],
    ],
  },
];

const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--hub-2)",
  wordBreak: "break-all",
};

export default function ApiDocs() {
  return (
    <ConsolePage>
      <ConsoleModule title="API" meta="public · key required" lead dot="var(--hub)">
        <div style={{ maxWidth: 760, fontSize: 15, lineHeight: 1.7, color: "var(--ink-70)" }}>
          <p style={{ margin: "0 0 14px" }}>
            The same index the site runs on. Every block and every address of the Cosmos Hub, served as JSON.
            Base URL is <code style={mono}>https://bedrock.silknodes.io</code>.
          </p>
          <p style={{ margin: 0 }}>
            Every endpoint needs a key. Requests are GET only. There is no request limit today; if one becomes
            necessary it will be applied per key and stated here before it takes effect.
          </p>
        </div>

        <div style={{ marginTop: 26, maxWidth: 760 }}>
          <div className="data" style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-50)", marginBottom: 10 }}>
            Sending the key
          </div>
          <pre style={{ margin: 0, padding: "14px 16px", background: "var(--paper-2)", border: "1px solid var(--ink-10)", borderRadius: 4, overflowX: "auto", fontFamily: "var(--font-mono)", fontSize: 12.5, lineHeight: 1.7, color: "var(--ink-80)" }}>
{`# .env
BEDROCK_API_KEY=bdrk_your_key_here

# curl
curl -H "X-API-Key: $BEDROCK_API_KEY" \\
  "https://bedrock.silknodes.io/api/v1/staking/netflow?hours=168"

# Authorization: Bearer works too
curl -H "Authorization: Bearer $BEDROCK_API_KEY" \\
  "https://bedrock.silknodes.io/api/v1/validators/commission-flow?days=30"`}
          </pre>
          <p style={{ margin: "12px 0 0", fontSize: 13.5, lineHeight: 1.65, color: "var(--ink-60)" }}>
            A missing or unknown key returns <code style={mono}>401</code>. Keep the key server-side. Anything
            you ship to a browser is readable by whoever holds the page.
          </p>
        </div>
      </ConsoleModule>

      <div style={{ marginTop: 12 }}>
        <ConsoleModule title="Request a key" headingLevel={2} dot="var(--moss)">
          <ApiKeyRequestForm />
        </ConsoleModule>
      </div>

      <div style={{ marginTop: 12 }}>
        <ConsoleModule title="Endpoints" meta={`${GROUPS.reduce((n, g) => n + g.rows.length, 0)} routes`} headingLevel={2} dot="var(--sand)">
          {GROUPS.map((g) => (
            <div key={g.name} style={{ marginBottom: 22 }}>
              <div className="data" style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-50)", marginBottom: 8 }}>
                {g.name}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {g.rows.map(([path, desc]) => (
                  <div key={path} style={{ display: "flex", flexWrap: "wrap", gap: "2px 16px", alignItems: "baseline" }}>
                    <code style={{ ...mono, minWidth: 340 }}>{path}</code>
                    <span style={{ fontSize: 13, color: "var(--ink-60)" }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </ConsoleModule>
      </div>
    </ConsolePage>
  );
}
