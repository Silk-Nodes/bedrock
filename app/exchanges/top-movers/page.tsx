// /exchanges/top-movers · the largest exchange deposits and withdrawals in the
// recent window, ranked by size. Reads ?ex and ?dir from the shared filter bar.
// Verified high+ confidence flows only; server-rendered from the indexer.

import { ConsolePage, ConsoleModule, IntelCard } from "@/components/console/Console";
import { MetricCard } from "@/components/console/MetricCard";
import { Soon } from "@/components/console/Soon";
import { AddressLink } from "@/components/address/AddressLink";
import { getFlowFeed, windowLabel } from "@/lib/indexer";
import { ShareBars } from "@/components/share/ShareCharts";
import { seo } from "@/lib/seo";

export const revalidate = 60;
export const metadata = seo({ title: "Top Movers", description: "The largest ATOM exchange movements right now: biggest deposits and withdrawals, ranked, with source and destination labels.", path: "/exchanges/top-movers", keywords: ["ATOM top movers", "largest ATOM transfers", "Cosmos Hub exchange moves"] });

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
}
function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}
function short(a: string): string {
  if (!a) return "·";
  if (a.startsWith("cosmosvaloper")) return `${a.slice(0, 14)}…`;
  return `${a.slice(0, 11)}…${a.slice(-4)}`;
}

export default async function TopMoversPage({ searchParams }: { searchParams: Promise<{ ex?: string; dir?: string; w?: string }> }) {
  const sp = await searchParams;
  const ex = sp?.ex ?? "";
  const dir = sp?.dir === "deposit" || sp?.dir === "withdrawal" ? sp.dir : "";
  const wQ = sp?.w === "24" ? 24 : sp?.w === "168" ? 168 : 720;

  const FEED_LIMIT = 200;
  const { flows, live } = await getFlowFeed({ exchangeOnly: true, entity: ex, direction: dir, minAtom: 100, limit: FEED_LIMIT, hours: wQ });
  // Top movers ranks true customer flow only; reward payouts and internal moves
  // (protocol counterparties) are classified separately and excluded.
  const cutoff = Date.now() - wQ * 3600_000;
  const inWindow = [...flows]
    .filter((f) => f.action === "deposit" || f.action === "withdrawal")
    .filter((f) => new Date(f.time).getTime() >= cutoff);
  const ranked = [...inWindow].sort((a, b) => b.amount_atom - a.amount_atom).slice(0, 30);

  // The feed returns at most FEED_LIMIT rows, newest first. On a busy venue those
  // rows can run out long before the requested window does, so asking for 30d and
  // receiving six hours of flow still printed "last ~30d". When the cap is hit we
  // only ever saw back to the oldest row returned, so that is what gets named;
  // when it is not hit we genuinely saw the whole window.
  const capped = flows.length >= FEED_LIMIT;
  const oldest = inWindow.length ? Math.min(...inWindow.map((f) => new Date(f.time).getTime())) : Date.now();
  const winLabel = capped ? windowLabel((Date.now() - oldest) / 3600_000) : windowLabel(wQ);

  if (!live || ranked.length === 0) {
    return (
      <ConsolePage>
        <ConsoleModule>
          <Soon
            title="Top movers"
            note={live ? "No verified exchange flow above the threshold in the recent window yet. It fills as the indexer processes blocks and more hot wallets are confirmed." : "The largest verified exchange deposits and withdrawals rank here from the Bedrock indexer. Connecting…"}
          />
        </ConsoleModule>
      </ConsolePage>
    );
  }

  const scope = [ex || "all exchanges", dir ? (dir === "deposit" ? "deposits" : "withdrawals") : "all flow", `last ${winLabel}`].join(" · ");
  const totalAtom = ranked.reduce((s, f) => s + f.amount_atom, 0);
  const deps = ranked.filter((f) => f.action === "deposit");
  const wds = ranked.filter((f) => f.action === "withdrawal");
  const depAtom = deps.reduce((s, f) => s + f.amount_atom, 0);
  const wdAtom = wds.reduce((s, f) => s + f.amount_atom, 0);
  const netAtom = depAtom - wdAtom;
  const biggest = ranked[0];

  return (
    <ConsolePage>
      <ConsoleModule lead dot="var(--iron)" title="Top movers" meta={`${scope} · largest ${ranked.length} · recent window · verified labels`}>
        <div className="console-grid">
          <div className="span-3"><MetricCard label="Total ranked" value={fmt(totalAtom)} unit="ATOM" series={[]} color="var(--ink)" footnote={`top ${ranked.length} flows`} /></div>
          <div className="span-3"><MetricCard label="Deposits onto" value={fmt(depAtom)} unit="ATOM" series={[]} color="var(--iron)" footnote={`${deps.length} flows · sell-side`} /></div>
          <div className="span-3"><MetricCard label="Withdrawals off" value={fmt(wdAtom)} unit="ATOM" series={[]} color="var(--moss)" footnote={`${wds.length} flows · accumulation`} /></div>
          {/* No sparkline here: the other three cards in the row have none, and
              a sign-flipping daily-net series also made the auto delta lie. */}
          <div className="span-3"><MetricCard label="Net of ranked" value={`${netAtom >= 0 ? "+" : "−"}${fmt(Math.abs(netAtom))}`} unit="ATOM" series={[]} color={netAtom >= 0 ? "var(--iron)" : "var(--moss)"} footnote={biggest ? `largest single: ${fmt(biggest.amount_atom)} ${biggest.entity}` : "verified flows only"} /></div>

          <div className="span-12">
            <IntelCard title="Largest exchange flows" meta={`${fmt(totalAtom)} ATOM across the top ${ranked.length}`} shareFilename="bedrock-top-movers" share={{ title: "Top exchange movers · Cosmos HUB", subtitle: `Largest verified ATOM deposits and withdrawals · last ${winLabel}`, context: "Verified, high-confidence exchange flows from Bedrock's own indexer. Coral = deposit (sell-side), mint = withdrawal (self-custody).", body: <ShareBars maxRows={7} rows={ranked.slice(0, 7).map((f) => ({ label: f.entity || "Unknown", value: f.amount_atom, color: f.action === "deposit" ? "var(--iron)" : "var(--moss)", display: `${fmt(f.amount_atom)} ATOM`, note: `· ${f.action}` }))} /> }}>
              <table className="broadsheet">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>#</th>
                    <th style={{ width: 104 }}>Action</th>
                    <th>Exchange</th>
                    <th>Counterparty</th>
                    <th style={{ width: 48 }}>Ago</th>
                    <th style={{ textAlign: "right" }}>ATOM</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((f, i) => {
                    const isDep = f.action === "deposit";
                    const tone = isDep ? "var(--iron)" : "var(--moss)";
                    const cp = isDep ? f.from : f.to;
                    const cpLabel = isDep ? f.from_label : f.to_label;
                    return (
                      <tr key={`${f.tx_hash}-${i}`}>
                        <td className="num" style={{ fontSize: 11, color: "var(--ink-40)" }}>{i + 1}</td>
                        <td><span className="data" style={{ fontSize: 11, fontWeight: 700, color: tone, textTransform: "uppercase", letterSpacing: 0.5 }}>{isDep ? "Deposit" : "Withdrawal"}</span></td>
                        <td className="data" style={{ fontSize: 12, color: "var(--ink)", fontWeight: 600 }}>{f.entity || "·"}</td>
                        <td className="data" style={{ fontSize: 12 }}>
                          {cpLabel ? <span style={{ color: "var(--ink-80)" }}>{cpLabel}</span>
                            : cp.startsWith("cosmos1") && !cp.startsWith("cosmosvaloper")
                              ? <AddressLink addr={cp} style={{ color: "var(--ink-60)" }}>{short(cp)}</AddressLink>
                              : <span style={{ color: "var(--ink-60)" }}>{short(cp)}</span>}
                        </td>
                        <td className="data" style={{ fontSize: 11, color: "var(--ink-60)" }}>{ago(f.time)}</td>
                        <td className="num" style={{ fontWeight: 700, color: "var(--ink)" }}>{fmt(f.amount_atom)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </IntelCard>
          </div>
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
