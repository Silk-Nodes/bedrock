// /rich-list/activity · the whale activity feed. Significant recent moves by the
// top real holders, newest first: big exchange deposits (sell signal) and
// withdrawals (accumulation), large delegations, unbondings, and reward claims.
// Each event is sized relative to the wallet, so what shows up actually mattered
// for that wallet. Conduits (market makers) are excluded upstream.
//
// Poll-based, not push: the indexer recomputes the window on request and the
// page revalidates every couple of minutes. WINDOW: last 14 days of continuous
// coverage.

import { ConsolePage, ConsoleModule } from "@/components/console/Console";
import { AddressLink } from "@/components/address/AddressLink";
import { getWhaleEvents, type WhaleEvent } from "@/lib/indexer";
import { seo } from "@/lib/seo";

export const revalidate = 120;
export const metadata = seo({
  title: "Rich List · Activity",
  description:
    "Significant recent moves by the top ATOM holders on the Cosmos Hub: large exchange deposits and withdrawals, delegations, unbondings, and reward claims, newest first. Each event is sized relative to the wallet. From the Bedrock indexer.",
  path: "/rich-list/activity",
  keywords: ["ATOM whale alerts", "large ATOM moves", "Cosmos Hub whale activity", "ATOM exchange deposits"],
});

const KIND: Record<string, { label: string; color: string; sign: string }> = {
  cex_deposit: { label: "Deposited to exchange", color: "var(--iron)", sign: "→" },
  cex_withdraw: { label: "Withdrew from exchange", color: "var(--moss)", sign: "←" },
  delegate: { label: "Delegated", color: "var(--moss)", sign: "+" },
  unbond: { label: "Unbonded", color: "var(--iron)", sign: "−" },
  reward_withdraw: { label: "Claimed rewards", color: "var(--sand)", sign: "•" },
};

function compact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${Math.round(n)}`;
}
function ago(ts: string): string {
  const ms = Date.now() - new Date(ts).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return `${Math.max(1, Math.floor(ms / 60_000))}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function shortAddr(a: string): string {
  return `${a.slice(0, 12)}…${a.slice(-6)}`;
}

export default async function ActivityPage() {
  const feed = await getWhaleEvents(14, 80);

  return (
    <ConsolePage>
      <ConsoleModule
        lead
        title="Whale activity"
        meta={`significant moves by top holders · last ${feed.days}d · newest first${feed.live ? "" : " · indexer endpoint pending"}`}
      >
        {feed.rows.length === 0 ? (
          <div style={{ padding: 22, color: "var(--ink-60)", fontSize: 14 }}>
            No significant whale moves in the window, or the indexer endpoint is not yet live.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {feed.rows.map((e: WhaleEvent, i) => {
              const k = KIND[e.kind] ?? { label: e.kind, color: "var(--ink-60)", sign: "" };
              return (
                <div key={`${e.txHash}-${i}`} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 4px", borderBottom: "1px solid var(--card-line)" }}>
                  <span style={{ width: 190, fontSize: 13, fontWeight: 500, color: k.color }}>{k.label}</span>
                  <span style={{ width: 120, textAlign: "right", fontFamily: "var(--font-serif)", fontSize: 22, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
                    {compact(e.atom)}
                    <span className="data" style={{ marginLeft: 5, fontSize: 10, color: "var(--ink-40)" }}>ATOM</span>
                  </span>
                  <span className="data" style={{ width: 64, textAlign: "right", fontSize: 11, color: "var(--ink-40)" }}>
                    {e.pctHeld >= 0.1 ? `${e.pctHeld.toFixed(1)}%` : ""}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.label ? <span style={{ color: "var(--ink)", fontWeight: 500 }}>{e.label}</span> : null}
                    <AddressLink addr={e.address}>
                      <span className="data" style={{ marginLeft: e.label ? 8 : 0, fontSize: 11, color: e.label ? "var(--ink-40)" : "var(--hub-2)" }}>{shortAddr(e.address)}</span>
                    </AddressLink>
                  </span>
                  <span className="data" style={{ width: 74, textAlign: "right", fontSize: 11, color: "var(--ink-40)" }}>{ago(e.ts)}</span>
                </div>
              );
            })}
          </div>
        )}
      </ConsoleModule>
    </ConsolePage>
  );
}
