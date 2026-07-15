// /exchanges/destinations · Where ATOM goes when it leaves the Hub over IBC,
// by destination chain. Real, verified data from the Bedrock indexer (the IBC
// escrow / fungible-token-packet flow). This is cross-chain outflow, which is
// distinct from exchange withdrawals (those need verified hot wallets, in
// progress). Framed honestly so the two are never confused.

import { ConsolePage, ConsoleModule, IntelCard } from "@/components/console/Console";
import { MetricCard } from "@/components/console/MetricCard";
import { Soon } from "@/components/console/Soon";
import { getIbcOutbound } from "@/lib/indexer";
import { ShareBars } from "@/components/share/ShareCharts";
import { seo } from "@/lib/seo";

export const revalidate = 300;
export const metadata = seo({ title: "Withdrawal Destinations", description: "Where ATOM goes when it leaves exchanges: the validators, wallets, and protocols that receive withdrawn ATOM on the Cosmos Hub.", path: "/exchanges/destinations", keywords: ["ATOM withdrawals", "Cosmos Hub exchange outflow", "ATOM destinations"] });

const CHAIN: Record<string, string> = {
  osmo: "Osmosis", neutron: "Neutron", noble: "Noble", stars: "Stargaze", akash: "Akash",
  inj: "Injective", kava: "Kava", juno: "Juno", stride: "Stride", umee: "Umee", secret: "Secret",
  quasar: "Quasar", saga: "Saga", dym: "Dymension", terra: "Terra", band: "Band", cosmos: "Cosmos Hub",
  crc: "Cronos", zig: "ZIGChain", mantra: "MANTRA", omniflix: "OmniFlix", carbon: "Carbon",
};
function chainName(p: string): string {
  return CHAIN[p] ?? (p ? p.charAt(0).toUpperCase() + p.slice(1) : "Unknown");
}
function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return Math.round(n).toString();
}

export default async function DestinationsPage() {
  const ibc = await getIbcOutbound(168, 14);

  if (!ibc.live || ibc.dests.length === 0) {
    return (
      <ConsolePage>
        <ConsoleModule>
          <Soon
            title="Where ATOM goes"
            note="The Hub's IBC outflow by destination chain loads here from the Bedrock indexer. Connecting…"
          />
        </ConsoleModule>
      </ConsolePage>
    );
  }

  const max = ibc.dests[0]?.total_atom ?? 1;
  const top = ibc.dests[0];
  const second = ibc.dests[1];
  const topShare = ibc.total_atom > 0 ? (top.total_atom / ibc.total_atom) * 100 : 0;
  const days = ibc.window_start && ibc.window_end
    ? Math.max(1, Math.round((new Date(ibc.window_end).getTime() - new Date(ibc.window_start).getTime()) / 86400000))
    : 7;
  const avgPerTransfer = ibc.events > 0 ? ibc.total_atom / ibc.events : 0;

  return (
    <ConsolePage>
      <ConsoleModule lead dot="var(--hub)" title="Where it goes · IBC outflow" meta={`ATOM leaving the Hub over IBC · last ~${days}d · from the Bedrock indexer`}>
        <div className="console-grid">
          {/* Exactly four cards: a fifth orphans onto its own row and leaves a
              hole. The runner-up destination lives in the breakdown below. */}
          <div className="span-3"><MetricCard label="ATOM out over IBC" value={fmt(ibc.total_atom)} unit="ATOM" series={[]} color="var(--iron)" footnote={`last ~${days} days`} /></div>
          <div className="span-3"><MetricCard label="Top destination" value={topShare.toFixed(0)} unit="% of outflow" series={[]} color="var(--sand)" footnote={`${chainName(top.dst)} · primary DEX venue`} /></div>
          <div className="span-3"><MetricCard label="Transfers" value={fmt(ibc.events)} series={[]} color="var(--hub-2)" footnote={`~${fmt(avgPerTransfer)} ATOM avg`} /></div>
          <div className="span-3"><MetricCard label="Destination chains" value={String(ibc.dests.length)} series={[]} color="var(--slate)" footnote="app-chains receiving ATOM" /></div>

          <div className="span-12">
            <IntelCard
              title="Where ATOM leaves the Hub"
              meta="by destination chain · IBC outbound"
              shareFilename="bedrock-ibc-destinations"
              share={{
                title: "Where ATOM goes · Cosmos HUB",
                subtitle: `IBC outflow by destination chain · last ~${days}d`,
                big: fmt(ibc.total_atom),
                unit: "ATOM out over IBC",
                context: "Cross-chain ATOM outflow from Bedrock's own indexer. Distinct from exchange withdrawals.",
                body: (
                  <ShareBars
                    maxRows={6}
                    rows={ibc.dests.map((d) => ({
                      label: chainName(d.dst),
                      value: d.total_atom,
                      color: "var(--hub)",
                      display: `${fmt(d.total_atom)} ATOM`,
                      note: ibc.total_atom > 0 ? `· ${((d.total_atom / ibc.total_atom) * 100).toFixed(0)}%` : undefined,
                    }))}
                  />
                ),
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "4px 0" }}>
                {ibc.dests.map((d) => {
                  const share = ibc.total_atom > 0 ? (d.total_atom / ibc.total_atom) * 100 : 0;
                  return (
                    <div key={d.dst} style={{ display: "grid", gridTemplateColumns: "130px 1fr 150px", alignItems: "center", gap: 14 }}>
                      <span className="data" style={{ fontSize: 12.5, color: "var(--ink)", fontWeight: 600 }}>{chainName(d.dst)}</span>
                      <div className="gbar" style={{ height: 16 }}>
                        <div className="gbar-fill" style={{ width: `${Math.max(1.5, (d.total_atom / max) * 100)}%`, "--gbar-c": "var(--hub)" } as React.CSSProperties} />
                      </div>
                      <span className="data" style={{ fontSize: 12, color: "var(--ink-80)", textAlign: "right" }}>
                        {fmt(d.total_atom)} <span style={{ color: "var(--ink-40)" }}>· {share.toFixed(0)}%</span>
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: "var(--ink-40)" }}>Cross-chain IBC outflow, not exchange withdrawals (those classify separately as hot wallets are verified).</div>
            </IntelCard>
          </div>
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
