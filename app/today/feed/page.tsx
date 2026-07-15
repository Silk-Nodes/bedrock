// /today/feed · the live Network Activity feed, straight from the Bedrock
// indexer's tip-follower. One row per on-chain event as blocks are processed:
// delegations, undelegations, redelegations, reward claims, transfers.

import { ConsolePage, ConsoleModule, StatusStrip, StatusStripCell, SectionLabel, IntelCard } from "@/components/console/Console";
import { AddressLink } from "@/components/address/AddressLink";
import { getRecentFlows } from "@/lib/indexer";
import { seo } from "@/lib/seo";

export const revalidate = 30;

export const metadata = seo({ title: "Live Feed", description: "The live Cosmos Hub feed: large ATOM transfers, exchange flows, and ecosystem news as they happen, straight from the Bedrock indexer.", path: "/today/feed", keywords: ["Cosmos Hub live feed", "ATOM whale alerts", "Cosmos news feed"] });

const KIND_LABEL: Record<string, string> = {
  delegate: "Delegate",
  undelegate: "Undelegate",
  redelegate: "Redelegate",
  reward_withdraw: "Reward",
  transfer: "Transfer",
  ibc_out: "IBC out",
  ibc_in: "IBC in",
};
function kindColor(kind: string): string {
  if (kind === "delegate" || kind === "ibc_in") return "var(--moss)";
  if (kind === "undelegate" || kind === "transfer" || kind === "ibc_out") return "var(--iron)";
  return "var(--hub)";
}
function atomFromUatom(s: string): string {
  const n = Number(s) / 1e6;
  if (!Number.isFinite(n)) return s;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(2);
}
function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}
function isWallet(a: string): boolean {
  return a.startsWith("cosmos1") && !a.startsWith("cosmosvaloper");
}
function shortAddr(a: string): string {
  if (!a) return "·";
  if (a.startsWith("cosmosvaloper")) return `${a.slice(0, 15)}…`;
  return `${a.slice(0, 10)}…${a.slice(-4)}`;
}

const TIERS = [
  { label: "10+", v: 10 },
  { label: "100+", v: 100 },
  { label: "1k+", v: 1000 },
  { label: "10k+", v: 10000 },
  { label: "100k+", v: 100000 },
];

function AddrCell({ a }: { a: string }) {
  if (isWallet(a)) {
    return <AddressLink addr={a} style={{ color: "var(--ink-80)" }}>{shortAddr(a)}</AddressLink>;
  }
  return <span style={{ color: "var(--ink-60)" }}>{shortAddr(a)}</span>;
}

export default async function TodayFeed({ searchParams }: { searchParams: Promise<{ min?: string }> }) {
  const sp = await searchParams;
  const min = Number(sp?.min) > 0 ? Number(sp.min) : 100;
  const { flows, live } = await getRecentFlows(min, 60);

  return (
    <ConsolePage>
      <ConsoleModule lead title="Today · Live feed" dot="var(--hub)">
      <StatusStrip>
        <SectionLabel label="Feed" color="var(--hub)" glow="rgba(59,42,107,0.18)" />
        <StatusStripCell label="Source">{live ? "Bedrock indexer" : "connecting…"}</StatusStripCell>
        <StatusStripCell label="Events">{flows.length}</StatusStripCell>
        <StatusStripCell label="Min size">{min}+ ATOM</StatusStripCell>
        <StatusStripCell label="Window">recent blocks</StatusStripCell>
      </StatusStrip>

      <div className="console-grid">
        <div className="span-12">
          <IntelCard title="Network activity" meta="live, on-chain">
            {/* Size filter */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              {TIERS.map((t) => (
                <a
                  key={t.v}
                  href={`/today/feed?min=${t.v}`}
                  className="data"
                  style={{
                    fontSize: 10,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    padding: "4px 10px",
                    border: "1px solid var(--ink-20)",
                    color: min === t.v ? "var(--hub)" : "var(--ink-60)",
                    background: min === t.v ? "color-mix(in srgb, var(--hub) 12%, transparent)" : "transparent",
                    textDecoration: "none",
                  }}
                >
                  {t.label} ATOM
                </a>
              ))}
            </div>

            {flows.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--ink-60)", lineHeight: 1.5 }}>
                {live
                  ? `No events above ${min} ATOM in the most recent blocks yet. Lower the threshold or check back in a moment, the indexer captures each new block.`
                  : "Connecting to the indexer…"}
              </div>
            ) : (
              <table className="broadsheet mfit mhide3 mhide4">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>Ago</th>
                    <th style={{ width: 96 }}>Type</th>
                    <th>From</th>
                    <th>To</th>
                    <th style={{ textAlign: "right" }}>ATOM</th>
                  </tr>
                </thead>
                <tbody>
                  {flows.map((f, i) => (
                    <tr key={`${f.tx_hash}-${i}`}>
                      <td className="data" style={{ fontSize: 11, color: "var(--ink-60)" }}>{ago(f.time)}</td>
                      <td>
                        <span className="data" style={{ fontSize: 11, fontWeight: 700, color: kindColor(f.kind), textTransform: "uppercase", letterSpacing: 0.5 }}>
                          {KIND_LABEL[f.kind] ?? f.kind}
                        </span>
                      </td>
                      <td className="data" style={{ fontSize: 12 }}><AddrCell a={f.from} /></td>
                      <td className="data" style={{ fontSize: 12 }}><AddrCell a={f.to} /></td>
                      <td className="num" style={{ fontWeight: 600, color: "var(--ink)" }}>{atomFromUatom(f.amount_uatom)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </IntelCard>
        </div>
      </div>

      <div className="data" style={{ marginTop: 18, fontSize: 11, color: "var(--ink-40)", letterSpacing: 0.4, lineHeight: 1.6 }}>
        Live stream from the Bedrock indexer, one row per on-chain event as blocks are processed. Click any wallet to open its position and activity.
      </div>
          </ConsoleModule>
    </ConsolePage>
  );
}
