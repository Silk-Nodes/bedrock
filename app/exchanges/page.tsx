// /exchanges · exchange flows from the Bedrock indexer, label-driven.
// Every labeled address carries a documented source (see lib/labels.ts and the
// indexer's address_labels seed). The Binance cluster now spans the 2021 wallets
// AND the current hot/withdrawal wallets (migrations 0016/0017), traced by
// chain-of-custody once the backfill crossed Binance's May-2022 migration.
// No estimates, no unverified attributions.
//
// hl.eco card grid: the old prose blocks (net-flow explainer, custody
// "governance voting power" paragraph, cost-of-custodial-staking prose) are now
// data cards. Each Binance metric carries its own live daily timeline; the
// custody / commission cards lead the bars that still carry the per-exchange
// detail. Less text, more data.

import { MetricCardLive } from "@/components/console/MetricCardLive";
import { MetricCard } from "@/components/console/MetricCard";
import { FilterableMetricCard } from "@/components/console/FilterableMetricCard";
import { ConsolePage, ConsoleModule, IntelCard } from "@/components/console/Console";
import { ChartCard } from "@/components/console/ChartCard";
import { Soon } from "@/components/console/Soon";
import { LineChart, type Series } from "@/components/charts/LineChart";
import { getExchangeFlow, getExchangeNetFlow } from "@/lib/indexer";
import { getExchangeCustody } from "@/lib/exchanges";
import { getLiveChain } from "@/lib/chain";
import { ShareBars, ShareLineChart } from "@/components/share/ShareCharts";
import { seo } from "@/lib/seo";

export const revalidate = 1800;

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return Math.round(n).toString();
}
function fmtSigned(n: number): string {
  return (n >= 0 ? "+" : "−") + fmtCompact(Math.abs(n));
}

export const metadata = seo({ title: "Exchanges", description: "ATOM on exchanges: how much each centralized exchange custodies and stakes, net deposit vs withdrawal flow, and the sell-pressure it implies.", path: "/exchanges", keywords: ["ATOM exchange flows", "Cosmos Hub exchanges", "ATOM exchange balances", "ATOM sell pressure"] });

// Brand tint per exchange for the custody bars.
const ENTITY_COLOR: Record<string, string> = {
  Coinbase: "var(--hub)",
  Kraken: "var(--hub-2)",
  Binance: "var(--iron)",
  Upbit: "var(--moss)",
  OKX: "var(--slate)",
};

export default async function Exchanges({ searchParams }: { searchParams: Promise<{ ex?: string; dir?: string; w?: string }> }) {
  const sp = await searchParams;
  // Shared filter bar state (?ex, ?dir, ?w), validated.
  const exQ = sp?.ex && ["Coinbase", "Kraken", "Binance", "Upbit", "OKX", "Coinone"].includes(sp.ex) ? sp.ex : "";
  const dirQ = sp?.dir === "deposit" || sp?.dir === "withdrawal" ? sp.dir : "";
  const wQ = sp?.w === "24" ? 24 : sp?.w === "168" ? 168 : 720;
  const winLabel = wQ === 24 ? "24h" : wQ === 168 ? "7d" : "~30d";

  const [flow, custody, netflow, chain] = await Promise.all([getExchangeFlow(0), getExchangeCustody(), getExchangeNetFlow(wQ), getLiveChain()]);
  const binance = flow.rows.filter((r) => r.entity === "Binance");

  const hasFlows = flow.live && binance.length > 0;

  // ── Net flow section (deposits minus withdrawals, last 30d) ──────────────
  // Scoped by the filter bar: ?ex narrows to one exchange, ?dir switches the
  // bars and lead card between net, deposits-only, and withdrawals-only.
  // >= 1 ATOM keeps dust rows (Coinone/Upbit register fractions of a uatom)
  // from rendering as meaningless "0 ATOM" bars.
  const nfRows = netflow.rows
    .filter((r) => r.deposit_atom >= 1 || r.withdraw_atom >= 1)
    .filter((r) => !exQ || r.entity === exQ);
  const nfMetric = (r: (typeof nfRows)[number]) =>
    dirQ === "deposit" ? r.deposit_atom : dirQ === "withdrawal" ? r.withdraw_atom : r.net_atom;
  const netTotal = nfRows.reduce((s, r) => s + r.net_atom, 0);
  const maxAbsNet = Math.max(1, ...nfRows.map((r) => Math.abs(nfMetric(r))));
  const totalDepNf = nfRows.reduce((s, r) => s + r.deposit_atom, 0);
  const totalWdNf = nfRows.reduce((s, r) => s + r.withdraw_atom, 0);
  const ontoCount = nfRows.filter((r) => r.net_atom > 0).length;
  const offCount = nfRows.filter((r) => r.net_atom < 0).length;
  const scopeNote = [exQ || "all exchanges", dirQ ? `${dirQ}s only` : "net"].join(" · ");
  // A filtered-to-empty result must explain itself, never vanish: the module
  // stays, with an honest note about the selected venue's (lack of) flow.
  const netFlowSection = netflow.live && nfRows.length === 0 && exQ ? (
    <ConsoleModule lead dot="var(--slate)" title="Exchanges · net flow" meta={`deposits minus withdrawals · last ${winLabel} · ${scopeNote}`}>
      <div className="console-grid">
        <div className="span-12">
          <div style={{ padding: "22px 4px", fontSize: 13.5, color: "var(--ink-60)", lineHeight: 1.6 }}>
            No verified {exQ} hot-wallet flow above 1 ATOM in the selected window.
            {" "}{exQ === "OKX" || exQ === "Coinone" || exQ === "Upbit"
              ? "This venue's hot wallets are still being confirmed by the label pipeline; its staked custody below is already verified on-chain."
              : "Flow appears here as soon as the indexer sees it."}
          </div>
        </div>
      </div>
    </ConsoleModule>
  ) : netflow.live && nfRows.length > 0 ? (
    <ConsoleModule
      lead
      dot={netTotal >= 0 ? "var(--iron)" : "var(--moss)"}
      title="Exchanges · net flow"
      meta={`deposits minus withdrawals · last ${winLabel} · verified wallets only · ${scopeNote}`}
    >
      <div className="console-grid">
        <div className="span-3">
          {dirQ === "deposit" ? (
            <MetricCard label={`Deposits · ${winLabel}`} value={fmtCompact(totalDepNf)} unit="ATOM" series={[]} color="var(--iron)" footnote={`onto ${exQ || "exchanges"} · sell-side flow`} />
          ) : dirQ === "withdrawal" ? (
            <MetricCard label={`Withdrawals · ${winLabel}`} value={fmtCompact(totalWdNf)} unit="ATOM" series={[]} color="var(--moss)" footnote={`off ${exQ || "exchanges"} · self-custody`} />
          ) : (
            <MetricCard label={`Net flow · ${winLabel}`} value={fmtSigned(netTotal)} unit="ATOM" series={[]} color={netTotal >= 0 ? "var(--iron)" : "var(--moss)"} footnote={netTotal >= 0 ? "net onto exchanges · sell-side" : "net off exchanges · accumulation"} />
          )}
        </div>
        <div className="span-3">
          <MetricCard label="Deposits onto" value={fmtCompact(totalDepNf)} unit="ATOM" series={[]} color="var(--iron)" footnote={`${ontoCount} exchange${ontoCount === 1 ? "" : "s"} net onto`} />
        </div>
        <div className="span-3">
          <MetricCard label="Withdrawals off" value={fmtCompact(totalWdNf)} unit="ATOM" series={[]} color="var(--moss)" footnote={`${offCount} exchange${offCount === 1 ? "" : "s"} net off`} />
        </div>
        <div className="span-3">
          <MetricCard label="Tracked venues" value={String(nfRows.length)} series={[]} color="var(--hub-2)" footnote="verified hot wallets only" />
        </div>

        <div className="span-12">
          <IntelCard
            title={dirQ === "deposit" ? "Deposits per exchange" : dirQ === "withdrawal" ? "Withdrawals per exchange" : "Net flow per exchange"}
            meta={`${dirQ === "deposit" ? "ATOM onto each venue" : dirQ === "withdrawal" ? "ATOM off each venue" : "deposits (onto) vs withdrawals (off)"} · last ${winLabel}`}
            shareFilename="bedrock-exchange-netflow"
            share={{
              title: "Net exchange flow · Cosmos HUB",
              subtitle: `ATOM onto vs off exchanges, last ${winLabel}`,
              context: dirQ ? "Verified, high-confidence exchange flows from Bedrock's own indexer." : "Coral = net onto exchanges (sell-side) · mint = net off (self-custody / staking). Verified flows from Bedrock's own indexer.",
              body: (
                <ShareBars
                  rows={nfRows.slice().sort((a, b) => nfMetric(b) - nfMetric(a)).map((r) => ({
                    label: r.entity,
                    value: nfMetric(r),
                    ...(dirQ ? { color: dirQ === "deposit" ? "var(--iron)" : "var(--moss)", display: `${fmtCompact(nfMetric(r))} ATOM` } : {}),
                  }))}
                  diverging={!dirQ}
                />
              ),
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "4px 0" }}>
              {nfRows.slice().sort((a, b) => nfMetric(b) - nfMetric(a)).map((r) => {
                const v = nfMetric(r);
                if (dirQ) {
                  // One-sided bars when a single direction is selected.
                  const c = dirQ === "deposit" ? "var(--iron)" : "var(--moss)";
                  return (
                    <div key={r.entity} style={{ display: "grid", gridTemplateColumns: "110px 1fr 150px", alignItems: "center", gap: 14 }}>
                      <span className="data" style={{ fontSize: 12.5, color: "var(--ink)", fontWeight: 600 }}>{r.entity}</span>
                      <div className="gbar" style={{ height: 16 }}>
                        <div className="gbar-fill" style={{ width: `${Math.max(0.5, (v / maxAbsNet) * 100)}%`, "--gbar-c": c } as React.CSSProperties} />
                      </div>
                      <span className="data" style={{ fontSize: 12, color: c, textAlign: "right", fontWeight: 600 }}>
                        {fmtCompact(v)} ATOM
                      </span>
                    </div>
                  );
                }
                const onto = v >= 0;
                const w = (Math.abs(v) / maxAbsNet) * 50; // half-width = center-out
                return (
                  <div key={r.entity} style={{ display: "grid", gridTemplateColumns: "110px 1fr 150px", alignItems: "center", gap: 14 }}>
                    <span className="data" style={{ fontSize: 12.5, color: "var(--ink)", fontWeight: 600 }}>{r.entity}</span>
                    <div className="gbar" style={{ height: 16 }}>
                      <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, background: "var(--ink-20)", zIndex: 1 }} />
                      <div className="gbar-fill" style={{ position: "absolute", top: 0, bottom: 0, height: "100%", left: onto ? "50%" : `${50 - w}%`, width: `${Math.max(0.5, w)}%`, "--gbar-c": onto ? "var(--iron)" : "var(--moss)" } as React.CSSProperties} />
                    </div>
                    <span className="data" style={{ fontSize: 12, color: onto ? "var(--iron)" : "var(--moss)", textAlign: "right", fontWeight: 600 }}>
                      {fmtSigned(v)} ATOM
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: "var(--ink-40)" }}>
              {dirQ === "deposit" ? "Deposits onto exchange hot wallets read as sell-side flow." : dirQ === "withdrawal" ? "Withdrawals off exchanges read as self-custody / staking intent." : "Coral = net onto (sell pressure) · mint = net off (self-custody / staking)."}
            </div>
          </IntelCard>
        </div>
      </div>
    </ConsoleModule>
  ) : null;

  if (!hasFlows && !custody.live) {
    return (
      <ConsolePage>
        <ConsoleModule>
          <Soon
            title="Exchange flows"
            note="Label-driven exchange flows land here from the Bedrock indexer. Only verified addresses with documented sources classify flows. No estimates."
          />
        </ConsoleModule>
      </ConsolePage>
    );
  }

  // ── Custody footprint section (live from chain, verified on-chain) ────────
  const maxBonded = custody.byEntity[0]?.bonded_atom ?? 1;
  const topCustody = custody.byEntity[0];
  // Filter card: pick any exchange to read its staked custody, fee, and share.
  const custodyOptions = custody.byEntity.map((e) => ({
    key: e.entity,
    label: e.entity,
    value: fmtCompact(e.bonded_atom),
    unit: "ATOM",
    points: [] as { date: string; value: number }[],
    color: "var(--moss)",
    footnote: `${e.commission_pct.toFixed(0)}% fee · ${custody.network_bonded_atom > 0 ? `${((e.bonded_atom / custody.network_bonded_atom) * 100).toFixed(1)}% of all stake` : "live"}`,
  }));
  // When the filter bar narrows to one exchange, the hero cards speak about
  // that venue instead of the all-CEX aggregates (which read as "filter broken").
  const exCustody = exQ ? custody.byEntity.find((e) => e.entity === exQ) : undefined;
  const custodySection = custody.live ? (
    <ConsoleModule
      dot="var(--hub)"
      title={exQ ? `${exQ} · custody on the Hub` : "Exchanges · custody on the Hub"}
      meta={exCustody
        ? `${fmtCompact(exCustody.bonded_atom)} ATOM staked via ${exQ}'s validator(s) · live, on-chain`
        : `${fmtCompact(custody.total_atom)} ATOM staked${custody.share_pct > 0 ? ` · ${custody.share_pct.toFixed(1)}% of all staked ATOM` : ""} · live, on-chain`}
    >
      <div className="console-grid">
        {exCustody ? (
          <>
            <div className="span-3">
              <MetricCard label={`${exQ} staked custody`} value={fmtCompact(exCustody.bonded_atom)} unit="ATOM" series={[]} color="var(--hub-2)" footnote="customer ATOM on its own validator(s)" />
            </div>
            <div className="span-3">
              <MetricCard label="Share of all stake" value={custody.network_bonded_atom > 0 ? ((exCustody.bonded_atom / custody.network_bonded_atom) * 100).toFixed(1) : "n/a"} unit={custody.network_bonded_atom > 0 ? "%" : undefined} series={[]} color="var(--hub)" footnote="of network bonded = same share of governance votes" />
            </div>
            <div className="span-3">
              <MetricCard label="Validator fee" value={exCustody.commission_pct.toFixed(0)} unit="%" series={[]} color="var(--moss)" footnote={exCustody.commission_pct >= 99.5 ? "settles rewards off-chain" : "commission on staked customer ATOM"} />
            </div>
            <div className="span-3">
              <MetricCard label="Network bonded" value={custody.network_bonded_atom > 0 ? fmtCompact(custody.network_bonded_atom) : "n/a"} unit={custody.network_bonded_atom > 0 ? "ATOM" : undefined} series={[]} color="var(--sand)" footnote="all staked ATOM, network-wide" />
            </div>
          </>
        ) : (
          <>
            <div className="span-3">
              <MetricCard label="CEX share of stake" value={custody.share_pct > 0 ? custody.share_pct.toFixed(1) : "n/a"} unit={custody.share_pct > 0 ? "%" : undefined} series={[]} color="var(--hub)" footnote="of all staked ATOM = same share of governance votes" />
            </div>
            <div className="span-3">
              <MetricCard label="CEX staked custody" value={fmtCompact(custody.total_atom)} unit="ATOM" series={[]} color="var(--hub-2)" footnote={`across ${custody.byEntity.length} exchanges`} />
            </div>
            <div className="span-3">
              <FilterableMetricCard options={custodyOptions} prefix="" />
            </div>
            <div className="span-3">
              <MetricCard label="Network bonded" value={custody.network_bonded_atom > 0 ? fmtCompact(custody.network_bonded_atom) : "n/a"} unit={custody.network_bonded_atom > 0 ? "ATOM" : undefined} series={[]} color="var(--sand)" footnote="all staked ATOM, network-wide" />
            </div>
          </>
        )}

        <div className="span-12">
          <IntelCard
            title="ATOM staked per exchange"
            meta="each exchange's own validator(s), bonded total · live"
            shareFilename="bedrock-exchange-custody"
            share={{
              title: "Exchange custody on Cosmos HUB",
              subtitle: "ATOM staked via each exchange's own validator",
              context: "Verified on-chain: operator addresses are the exchanges' self-declared validator identities; figures are live bonded totals.",
              body: (
                <ShareBars
                  rows={custody.byEntity.filter((e) => !exQ || e.entity === exQ).map((e) => ({
                    label: e.entity,
                    value: e.bonded_atom,
                    color: ENTITY_COLOR[e.entity] ?? "var(--hub)",
                    display: `${fmtCompact(e.bonded_atom)} ATOM`,
                    note: custody.network_bonded_atom > 0 ? `· ${((e.bonded_atom / custody.network_bonded_atom) * 100).toFixed(1)}%` : undefined,
                  }))}
                />
              ),
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "4px 0" }}>
              {custody.byEntity.filter((e) => !exQ || e.entity === exQ).map((e) => (
                <div key={e.entity} style={{ display: "grid", gridTemplateColumns: "120px 1fr 168px", alignItems: "center", gap: 14 }}>
                  <span className="data" style={{ fontSize: 13, color: "var(--ink)", fontWeight: 600 }}>{e.entity}</span>
                  <div className="gbar" style={{ height: 18 }}>
                    <div className="gbar-fill" style={{ width: `${Math.max(2, (e.bonded_atom / maxBonded) * 100)}%`, "--gbar-c": ENTITY_COLOR[e.entity] ?? "var(--hub)" } as React.CSSProperties} />
                  </div>
                  <span className="data" style={{ fontSize: 13, color: "var(--ink-80)", textAlign: "right" }}>
                    {fmtCompact(e.bonded_atom)} ATOM
                    {custody.network_bonded_atom > 0 && <span style={{ color: "var(--ink-40)" }}> · {((e.bonded_atom / custody.network_bonded_atom) * 100).toFixed(1)}%</span>}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: "var(--ink-40)" }}>Staked custody (customer ATOM on each exchange&apos;s own validator), distinct from hot-wallet flow below.</div>
          </IntelCard>
        </div>
      </div>
    </ConsoleModule>
  ) : null;

  // ── Cost of custodial staking ────────────────────────────────────────────
  // Gross APR ≈ inflation × (1 − community tax) ÷ bonded ratio. An exchange keeps
  // a commission on top, so the customer earns gross net of that cut.
  const grossApr = chain.bonded_ratio_pct > 0
    ? (chain.inflation_pct * (1 - chain.community_tax_pct / 100)) / (chain.bonded_ratio_pct / 100)
    : 0;
  // Exchanges at ~100% on-chain commission settle rewards off their own books, so
  // an on-chain net yield doesn't describe what those customers earn; list them
  // separately. Threshold tolerates float error from the bonded-weighted average.
  const OFFCHAIN_MIN = 99.5;
  // All comparable venues (unscoped): the single-exchange view still compares
  // against the market's best rate.
  const commAll = custody.byEntity
    .filter((e) => e.commission_pct > 0 && e.commission_pct < OFFCHAIN_MIN)
    .map((e) => ({ entity: e.entity, commission_pct: e.commission_pct, net_apr: grossApr * (1 - e.commission_pct / 100) }))
    .sort((a, b) => b.net_apr - a.net_apr); // best yield for the customer first
  const commRows = commAll.filter((e) => !exQ || e.entity === exQ);
  const offChainEntities = custody.byEntity.filter((e) => e.commission_pct >= OFFCHAIN_MIN).map((e) => e.entity);
  const bestNet = commRows[0];
  const worstNet = commRows[commRows.length - 1];
  const spread = bestNet && worstNet ? bestNet.net_apr - worstNet.net_apr : 0;
  const marketBest = commAll[0];
  const exOnly = exQ && commRows.length === 1 ? commRows[0] : undefined;

  const economicsSection = custody.live && grossApr > 0 && commRows.length === 0 && exQ ? (
    // The selected venue runs ~100% on-chain commission and settles customer
    // rewards off its own books, so an on-chain net yield does not exist for it.
    <ConsoleModule dot="var(--slate)" title={`${exQ} · the cost of custodial staking`} meta="live, on-chain">
      <div className="console-grid">
        <div className="span-12">
          <div style={{ padding: "22px 4px", fontSize: 13.5, color: "var(--ink-60)", lineHeight: 1.6 }}>
            {exQ} runs its validator at effectively 100% commission and settles staking rewards off-chain,
            on its own books. There is no on-chain net yield to show; the gross network reward is {grossApr.toFixed(1)}%.
          </div>
        </div>
      </div>
    </ConsoleModule>
  ) : custody.live && grossApr > 0 && commRows.length > 0 ? (
    <ConsoleModule
      dot="var(--moss)"
      title={exQ ? `${exQ} · the cost of custodial staking` : "Exchanges · the cost of custodial staking"}
      meta={exQ ? `what ${exQ} charges on staked customer ATOM · live` : "commission each exchange charges on staked customer ATOM · live"}
    >
      <div className="console-grid">
        <div className="span-3">
          <MetricCard label="Gross staking reward" value={grossApr.toFixed(1)} unit="%" series={[]} color="var(--moss)" footnote="Hub pays this to every delegator" />
        </div>
        {exOnly ? (
          <>
            {/* Single-exchange view: best/worst/spread collapse into that venue
                vs the market's best rate, so the cards never repeat themselves. */}
            <div className="span-3">
              <MetricCard label="Net to customer" value={exOnly.net_apr.toFixed(1)} unit="%" series={[]} color="var(--hub)" footnote={`after ${exOnly.commission_pct.toFixed(0)}% fee`} />
            </div>
            <div className="span-3">
              <MetricCard label="Market best" value={marketBest ? marketBest.net_apr.toFixed(1) : "n/a"} unit={marketBest ? "%" : undefined} series={[]} color="var(--sand)" footnote={marketBest ? `${marketBest.entity} · ${marketBest.commission_pct.toFixed(0)}% fee` : "live"} />
            </div>
            <div className="span-3">
              <MetricCard label="Gap to best" value={marketBest ? Math.max(0, marketBest.net_apr - exOnly.net_apr).toFixed(1) : "n/a"} unit={marketBest ? "pts" : undefined} series={[]} color={marketBest && marketBest.net_apr - exOnly.net_apr > 0.05 ? "var(--iron)" : "var(--moss)"} footnote={marketBest && marketBest.entity === exOnly.entity ? "this is the best CEX rate" : "yield left on the table"} />
            </div>
          </>
        ) : (
          <>
        <div className="span-3">
          <MetricCard label="Best net to customer" value={bestNet ? bestNet.net_apr.toFixed(1) : "n/a"} unit={bestNet ? "%" : undefined} series={[]} color="var(--hub)" footnote={bestNet ? `${bestNet.entity} · ${bestNet.commission_pct.toFixed(0)}% fee` : "live"} />
        </div>
        <div className="span-3">
          <MetricCard label="Worst net to customer" value={worstNet ? worstNet.net_apr.toFixed(1) : "n/a"} unit={worstNet ? "%" : undefined} series={[]} color="var(--iron)" footnote={worstNet ? `${worstNet.entity} · ${worstNet.commission_pct.toFixed(0)}% fee` : "live"} />
        </div>
        <div className="span-3">
          <MetricCard label="Yield spread" value={spread.toFixed(1)} unit="pts" series={[]} color="var(--sand)" footnote="best vs worst on the same rewards" />
        </div>
          </>
        )}

        <div className="span-12">
          <IntelCard
            title="Net yield passed to customers"
            meta="bar = yield kept by the customer · faded = commission cut · live"
            shareFilename="bedrock-exchange-commission"
            share={{
              title: "What exchanges charge to stake your ATOM · Cosmos HUB",
              subtitle: "Commission and net staking yield per exchange",
              context: `Each exchange's commission is self-declared on-chain. Net yield is the Hub's gross ${grossApr.toFixed(1)}% staking reward minus that commission.`,
              body: (
                <ShareBars
                  rows={commRows.map((e) => ({
                    label: e.entity,
                    value: e.net_apr,
                    color: ENTITY_COLOR[e.entity] ?? "var(--moss)",
                    display: `${e.net_apr.toFixed(2)}% net`,
                    note: `· fee ${e.commission_pct.toFixed(0)}%`,
                  }))}
                />
              ),
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "4px 0" }}>
              {commRows.map((e) => {
                const netW = (e.net_apr / grossApr) * 100;
                return (
                  <div key={e.entity} style={{ display: "grid", gridTemplateColumns: "120px 1fr 188px", alignItems: "center", gap: 14 }}>
                    <span className="data" style={{ fontSize: 13, color: "var(--ink)", fontWeight: 600 }}>{e.entity}</span>
                    <div className="gbar" style={{ height: 18 }}>
                      <div className="gbar-fill" style={{ width: `${Math.max(2, netW)}%`, "--gbar-c": ENTITY_COLOR[e.entity] ?? "var(--moss)" } as React.CSSProperties} />
                      <div style={{ position: "absolute", top: 0, bottom: 0, left: `${netW}%`, right: 0, background: "var(--iron)", opacity: 0.22 }} />
                    </div>
                    <span className="data" style={{ fontSize: 13, color: "var(--ink-80)", textAlign: "right" }}>
                      {e.net_apr.toFixed(1)}% net
                      <span style={{ color: "var(--ink-40)" }}> · {e.commission_pct.toFixed(0)}% fee</span>
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: "var(--ink-40)", lineHeight: 1.5 }}>
              Staking directly keeps the full {grossApr.toFixed(1)}% (less your validator&apos;s fee).
              {offChainEntities.length > 0 && ` Excluded: ${offChainEntities.join(", ")} (100% on-chain, settled off-book).`}
            </div>
          </IntelCard>
        </div>
      </div>
    </ConsoleModule>
  ) : null;

  if (!hasFlows) {
    return (
      <ConsolePage>
        {custodySection}
        {economicsSection}
        {netFlowSection}
        <ConsoleModule>
          <Soon
            title="Historical deposit / withdrawal series"
            note="The Binance historical cluster appears here once the indexer serves it; Coinbase and Kraken customer hot wallets are traced from their custody clusters as the backfill advances. The live exchange flow feed is on the Recent flows tab."
          />
        </ConsoleModule>
      </ConsolePage>
    );
  }

  const totalDep = binance.reduce((s, r) => s + r.deposit_atom, 0);
  const totalWd = binance.reduce((s, r) => s + r.withdraw_atom, 0);
  const net = totalDep - totalWd;
  const firstDay = binance[0].day;
  const lastDay = binance[binance.length - 1].day;
  const txCount = binance.reduce((s, r) => s + r.deposit_count + r.withdraw_count, 0);

  const series: Series[] = [
    { label: "Deposits (onto Binance)", color: "var(--iron)", points: binance.map((r) => ({ date: r.day, value: Math.round(r.deposit_atom) })) },
    { label: "Withdrawals (off Binance)", color: "var(--moss)", points: binance.map((r) => ({ date: r.day, value: Math.round(r.withdraw_atom) })) },
  ];

  // Per-metric daily timelines for the MetricCards, derived from the same indexed rows.
  const depositPts = binance.map((r) => ({ date: r.day, value: Math.round(r.deposit_atom) }));
  const withdrawPts = binance.map((r) => ({ date: r.day, value: Math.round(r.withdraw_atom) }));
  const netPts = binance.map((r) => ({ date: r.day, value: Math.round(r.deposit_atom - r.withdraw_atom) }));
  // Cumulative net builds a real running-position timeline from the same rows.
  let run = 0;
  const cumNetPts = binance.map((r) => { run += r.deposit_atom - r.withdraw_atom; return { date: r.day, value: Math.round(run) }; });

  return (
    <ConsolePage>
      {custodySection}
      {economicsSection}
      {netFlowSection}
      {/* Binance-specific module: hidden when the filter narrows to another venue. */}
      {(!exQ || exQ === "Binance") && (
      <ConsoleModule
        dot="var(--iron)"
        title="Exchanges · Binance flows"
        meta={`${firstDay} → ${lastDay} · ${fmtCompact(txCount)} transfers · from the Bedrock indexer`}
      >
        {/* These are cumulative era totals (and a sign-flipping net), not
            period-over-period metrics, so the auto first-vs-last delta badge is
            meaningless here; sparklines keep the shape, delta is suppressed. */}
        <div className="console-grid">
          <div className="span-3">
            <MetricCardLive label="Deposits" value={fmtCompact(totalDep)} unit="ATOM" points={depositPts} delta={false} color="var(--iron)" footnote="cumulative, indexed era" />
          </div>
          <div className="span-3">
            <MetricCardLive label="Withdrawals" value={fmtCompact(totalWd)} unit="ATOM" points={withdrawPts} delta={false} color="var(--moss)" footnote="cumulative, indexed era" />
          </div>
          <div className="span-3">
            <MetricCardLive label="Net flow" value={fmtSigned(net)} unit="ATOM" points={netPts} delta={false} color={net >= 0 ? "var(--iron)" : "var(--moss)"} footnote={net >= 0 ? "net onto the exchange" : "net off the exchange"} />
          </div>
          <div className="span-3">
            <MetricCardLive label="Cumulative position" value={fmtSigned(net)} unit="ATOM" points={cumNetPts} delta={false} color="var(--hub)" footnote="running net over the era" />
          </div>

          <div className="span-12">
            <ChartCard
              title="Daily deposits vs withdrawals · Binance"
              meta="verified cluster · 2021 wallets + current hot wallet, chain-of-custody"
              accentColor="var(--iron)"
              shareFilename="bedrock-binance-flows"
              share={{
                title: "Binance ATOM flows · Cosmos HUB",
                subtitle: "Daily deposits vs withdrawals over the past year, from Bedrock's own indexer",
                context: "Label-driven flows: only addresses verified by chain-of-custody and documented sources classify as exchange flow.",
                body: <ShareLineChart series={series} unit="ATOM/day" takeLast={365} height={240} />,
              }}
            >
              <LineChart series={series} yLabel="ATOM / DAY" height={300} />
            </ChartCard>
          </div>

          <div className="span-12">
            <div className="data" style={{ fontSize: 11, color: "var(--ink-40)", lineHeight: 1.6 }}>
              Flows classify only by chain-of-custody-verified addresses (the 2021 cluster plus the current hot wallet traced through its 2022 migration); no estimates.
              <a href="/methodology" style={{ color: "var(--hub)", textDecoration: "underline", marginLeft: 6 }}>Methodology</a>
            </div>
          </div>
        </div>
      </ConsoleModule>
      )}
    </ConsolePage>
  );
}
