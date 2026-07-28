// /rich-list · the Rich List. Every top real-holder ATOM wallet in one sortable
// board, with a summary read above it of what the top 100 are collectively
// doing. Click any column header to re-sort; click any wallet for its profile.
//
// CONDUIT HANDLING (the important bit): "real holders only" (excluding labeled
// exchanges) does NOT catch unlabeled market makers — wallets that push far more
// ATOM through exchanges than they hold. Left in, two such wallets turned a
// roughly-flat exchange picture into a fake -3.3M "selling" headline. So we flag
// any wallet whose exchange throughput exceeds its balance as a conduit, tag it
// in the table, and EXCLUDE it from the buy/sell verdict card. Holdings/staking
// cards keep all 100 (conduits do hold their balance).
//
// WINDOW: continuous coverage from 2026-06-08, labeled, never lifetime.

import { ConsolePage, ConsoleModule } from "@/components/console/Console";
import { StatCard } from "@/components/console/StatCard";
import { RichListTable } from "@/components/richlist/RichListTable";
import { ExchangeHoldersTable } from "@/components/richlist/ExchangeHoldersTable";
import { getWhaleBoard, getExchangeHolders } from "@/lib/indexer";
import { isConduit, type WhaleBoardRow } from "@/lib/whaleBoardFixture";
import { seo } from "@/lib/seo";

export const revalidate = 300;
export const metadata = seo({
  title: "Rich List",
  description:
    "The top 100 real ATOM holders on the Cosmos Hub in one sortable board, with a summary of what they are collectively doing: total held, staked, net staking, and whether they are net accumulating or distributing. Market-maker wallets are flagged and excluded from the verdict. Click any wallet for its full profile. From the Bedrock indexer.",
  path: "/rich-list",
  keywords: ["ATOM rich list", "Cosmos Hub top holders", "largest ATOM wallets", "are ATOM whales selling", "ATOM holder profiles"],
  ogImage: "/og/rich-list",
});

const SUPPLY_M = 520.94;

function compact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${Math.round(n)}`;
}
function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

const EXPLAINER =
  "The largest non-exchange ATOM holders and what each is doing over the window. " +
  "Click a column to sort by it; click a wallet for its full profile. Green columns are " +
  "accumulation-side (delegating, withdrawing from exchanges), rust is distribution-side " +
  "(unbonding, depositing to exchanges). Exchange, treasury and protocol accounts are " +
  "excluded, so # is rank among real holders. Wallets moving more through exchanges than " +
  "they hold are tagged conduit (market makers) and left out of the buy/sell verdict.";

// How exchange wallets get filtered, and what is still unresolved. Stated on the
// page because the list is only as honest as its label coverage.
const FILTERING =
  "Exchange wallets are removed three ways: disclosed and chain-of-custody-verified labels; " +
  "wallets staking ~100% to an exchange-run validator (custody shards); and wallets with " +
  "exchange-scale counterparty fan-out (one had 127,309 distinct counterparties across 534,728 " +
  "transfers, which no individual holder has). A July 2026 sweep found 15 such wallets holding " +
  "38.5M ATOM inside the apparent top 100. Coverage is not complete: wallets holding ATOM with no " +
  "staking and few counterparties are indistinguishable from cold self-custody on-chain, so some " +
  "may remain.";

export default async function RichListPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const sp = await searchParams;
  const view = sp?.view === "exchange" ? "exchange" : "real";
  const [board, ex] = await Promise.all([getWhaleBoard(100), getExchangeHolders()]);
  const rows: WhaleBoardRow[] = board.rows.map((r) => ({ ...r, conduit: isConduit(r) }));

  const sum = (arr: WhaleBoardRow[], k: keyof WhaleBoardRow) => arr.reduce((s, r) => s + (r[k] as number), 0);
  const held = sum(rows, "held");
  const staked = sum(rows, "staked");
  const netStake = sum(rows, "delegated") - sum(rows, "undelegated");

  // Buy/sell verdict EXCLUDES conduits so market-maker churn can't fake it.
  const real = rows.filter((r) => !r.conduit);
  const nConduit = rows.length - real.length;
  const netCex = sum(real, "fromCex") - sum(real, "toCex"); // + = net accumulating (withdrawing)
  const verdict =
    Math.abs(netCex) < 0.15e6 ? { label: "roughly flat", color: "var(--ink-60)" }
      : netCex > 0 ? { label: "net accumulating", color: "var(--moss)" }
        : { label: "net distributing", color: "var(--iron)" };
  const stakePct = held > 0 ? Math.round((staked / held) * 100) : 0;

  return (
    <ConsolePage>
      <ConsoleModule
        lead
        title="Rich List"
        meta={view === "exchange"
          ? `${ex.wallets} exchange-linked wallets · ${ex.venues.length} venues · snapshot ${ex.day || "unavailable"}`
          : `top ${rows.length} real holders · flows since ${fmtDate(board.since)}${board.live ? "" : " · STATIC SNAPSHOT (Jul 23) · live feed unavailable"}`}
      >
        {/* View toggle. URL-driven (?view=) so both views stay server-rendered,
            linkable and cacheable — no client state to desync. */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {([["real", "Real holders"], ["exchange", "Exchange-linked"]] as const).map(([k, label]) => (
            <a
              key={k}
              href={k === "real" ? "/rich-list" : "/rich-list?view=exchange"}
              style={{
                padding: "5px 12px", borderRadius: 4, fontSize: 12.5, textDecoration: "none",
                border: `1px solid ${view === k ? "var(--hub-2)" : "var(--card-line)"}`,
                color: view === k ? "var(--hub-2)" : "var(--ink-60)",
                background: view === k ? "color-mix(in srgb, var(--hub-2) 10%, transparent)" : "transparent",
              }}
            >
              {label}
            </a>
          ))}
        </div>

        {view === "exchange" ? (
          <>
            <div className="grid12" style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12, marginBottom: 14 }}>
              <div className="span-4" style={{ gridColumn: "span 4" }}>
                <StatCard label="Exchange-linked ATOM" value={compact(ex.total)} unit="ATOM" sub={`${(ex.total / 1e6 / SUPPLY_M * 100).toFixed(1)}% of supply · custodied, not owned`} accent="var(--iron)" />
              </div>
              <div className="span-4" style={{ gridColumn: "span 4" }}>
                <StatCard label="Staked by exchanges" value={compact(ex.totalStaked)} unit="ATOM" sub={ex.total > 0 ? `${Math.round((ex.totalStaked / ex.total) * 100)}% of what they hold` : ""} accent="var(--moss)" />
              </div>
              <div className="span-4" style={{ gridColumn: "span 4" }}>
                <StatCard label="Venues" value={`${ex.venues.length}`} sub={`${ex.wallets} identified wallets`} accent="var(--hub)" />
              </div>
            </div>

            <p style={{ margin: "0 2px 14px", fontSize: 12.5, color: "var(--ink-60)", lineHeight: 1.55, maxWidth: 780 }}>
              <strong style={{ color: "var(--ink-80)" }}>This is custodied ATOM, not exchange-owned.</strong>{" "}
              These wallets hold customer deposits the venue controls the keys to. The staked column is the
              interesting one: it shows which exchanges stake customer ATOM (earning the yield) and which
              leave it idle. Click a venue to see its individual wallets. Attribution is chain-of-custody
              inference, not disclosure, so treat venue names as high-confidence rather than certain.
            </p>

            {ex.live && ex.venues.length > 0 ? (
              <ExchangeHoldersTable venues={ex.venues} total={ex.total} />
            ) : (
              <div style={{ padding: 20, fontSize: 13, color: "var(--ink-60)" }}>
                Exchange holder data is unavailable right now.
              </div>
            )}
          </>
        ) : (
        <>
        <div className="grid12" style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12, marginBottom: 18 }}>
          <div className="span-3" style={{ gridColumn: "span 3" }}>
            <StatCard label="Total held" value={compact(held)} unit="ATOM" sub={`${(held / 1e6 / SUPPLY_M * 100).toFixed(1)}% of supply`} accent="var(--hub)" />
          </div>
          <div className="span-3" style={{ gridColumn: "span 3" }}>
            <StatCard label="Staked" value={compact(staked)} unit="ATOM" sub={`${stakePct}% of their holdings`} accent="var(--moss)" />
          </div>
          <div className="span-3" style={{ gridColumn: "span 3" }}>
            <StatCard label="Net staking" value={`${netStake >= 0 ? "+" : "−"}${compact(Math.abs(netStake))}`} unit="ATOM" sub={netStake >= 0 ? "growing their stake" : "reducing their stake"} accent={netStake >= 0 ? "var(--moss)" : "var(--iron)"} />
          </div>
          <div className="span-3" style={{ gridColumn: "span 3" }}>
            <StatCard label="Exchange stance" value={verdict.label} sub={`net ${netCex >= 0 ? "+" : "−"}${compact(Math.abs(netCex))} · ${nConduit} conduit${nConduit === 1 ? "" : "s"} excluded`} accent={verdict.color} />
          </div>
        </div>

        {/* Native disclosure instead of a hover tooltip: a floating tip anchored
            to the top-left title kept colliding with the sticky nav. <details>
            needs no positioning and works on touch. */}
        <details style={{ margin: "0 2px 12px" }}>
          <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--ink-50)", userSelect: "none" }}>
            How to read this board
          </summary>
          <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--ink-60)", lineHeight: 1.55, maxWidth: 760 }}>{EXPLAINER}</p>
          <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--ink-60)", lineHeight: 1.55, maxWidth: 760 }}>{FILTERING}</p>
        </details>

        <RichListTable rows={rows} />

        <p style={{ marginTop: 14, fontSize: 12.5, color: "var(--ink-50)" }}>
          This is the live activity board: what the top holders are doing now.{" "}
          <a href="/rich-list/activity" style={{ color: "var(--hub-2)" }}>See the activity feed</a>{" "}
          for their significant moves as they land, or{" "}
          <a href="/atom/whales" style={{ color: "var(--hub-2)" }}>Whale intelligence</a>{" "}
          for holder vintage and genesis-era character.
        </p>
        </>
        )}
      </ConsoleModule>
    </ConsolePage>
  );
}
