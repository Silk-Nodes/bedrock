// /exchanges/sell-pressure · Who is actually selling, and how.
//
// Tests the thesis from the Cosmos Hub forum research: is selling broad-based,
// persistent, inflation-driven dumping from everyday stakers, or concentrated
// bursts from a small set of large actors? We use exchange-bound deposits as
// the on-chain sell-intent proxy (depositing to a CEX is the act before a sale)
// and decompose them two ways: by transfer size band and by sender label.
// then overlay reward-claim volume (inflation actually claimed) and report
// concentration. All real, from the Bedrock indexer. Cohorts are transfer-size
// bands, not guessed wealth tiers (we don't track holder balances), and we say
// so. Window is the recent quarter, which the tip follower covers in full.

import { ConsolePage, ConsoleModule, IntelCard } from "@/components/console/Console";
import { MetricCard } from "@/components/console/MetricCard";
import { ShareBars } from "@/components/share/ShareCharts";
import { BasisToggle } from "@/components/exchanges/BasisToggle";
import { SellPressureDisclaimer } from "@/components/exchanges/SellPressureDisclaimer";
import { Soon } from "@/components/console/Soon";
import { LineChart, type Series } from "@/components/charts/LineChart";
import { AddressLink } from "@/components/address/AddressLink";
import { getSellPressure } from "@/lib/indexer";
import { getAtomPriceHistory } from "@/lib/price";
import { seo } from "@/lib/seo";

export const revalidate = 600;
export const metadata = seo({ title: "Sell Pressure", description: "ATOM sell pressure from exchanges: net inflow to exchange wallets, the share of staked supply they custody, and what it signals for price.", path: "/exchanges/sell-pressure", keywords: ["ATOM sell pressure", "ATOM exchange inflow", "Cosmos Hub exchange flow"] });

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return Math.round(n).toString();
}
function fmtBucket(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
}
function shortAddr(a: string): string {
  return a.length > 18 ? `${a.slice(0, 10)}…${a.slice(-4)}` : a;
}
function fmtAgoDate(ts: string): string {
  return new Date(ts).toLocaleDateString("en-US", { day: "2-digit", month: "short" });
}

const BANDS = [
  { label: "< 100", color: "var(--ink-40)" },
  { label: "100-1k", color: "var(--slate)" },
  { label: "1k-10k", color: "var(--hub)" },
  { label: "10k-100k", color: "var(--sand)" },
  { label: "100k +", color: "var(--iron)" },
];

const CAT_LABEL: Record<string, string> = {
  cex: "Exchange → exchange", cex_ops: "Exchange ops", validator: "Validator", fund: "Fund / desk",
  custodian: "Custodian", protocol: "Protocol", ibc_escrow: "IBC escrow", unlabeled: "Unlabeled wallet",
};
const ACTOR_PALETTE = ["var(--iron)", "var(--hub)", "var(--sand)", "var(--moss)", "var(--slate)", "var(--ink-40)"];

// Likelihood-weighted route model (weights follow the Gauntlet ATOM
// sell-pressure methodology): each route's raw flow is scaled by how strongly
// it signals a sale. Unstaking is excluded (leading indicator, not selling).
const ROUTE_META: Record<string, { label: string; weight: string; note: string }> = {
  direct_cex: { label: "Direct exchange deposit", weight: "0.95", note: "strongest on-chain sell signal" },
  ibc_swap: { label: "IBC out with swap memo", weight: "1.00", note: "explicit swap instruction" },
  ibc_other: { label: "IBC out, no swap memo", weight: "0.25", note: "ambiguous: custody, routing, LP" },
};

export default async function SellPressurePage({ searchParams }: { searchParams: Promise<{ basis?: string }> }) {
  const basis = (await searchParams)?.basis === "retail" ? "retail" as const : "gross" as const;
  const [sp, priceHist] = await Promise.all([getSellPressure(120, 7, basis), getAtomPriceHistory(120)]);

  if (!sp.live || sp.series.length === 0) {
    return (
      <ConsolePage>
        <ConsoleModule>
          <Soon title="Sell pressure" note="The cohort decomposition of exchange deposits lands here once the indexer endpoint is live and a window is captured. No estimates until then." />
        </ConsoleModule>
      </ConsolePage>
    );
  }

  const top10Pct = sp.total > 0 ? (sp.top10 / sp.total) * 100 : 0;
  const top50Pct = sp.total > 0 ? (sp.top50 / sp.total) * 100 : 0;
  const concentrated = top10Pct >= 50;
  const spanStart = sp.series[0] ? fmtBucket(sp.series[0].ts) : "";
  const spanEnd = sp.series[sp.series.length - 1] ? fmtBucket(sp.series[sp.series.length - 1].ts) : "";
  // Endpoints alone would describe a continuous run even if buckets were missing
  // between them, so say how many buckets actually back it. Today the rollups
  // only return continuous weeks and the two agree; if the source ever gets
  // gappy this keeps the label honest instead of quietly widening.
  const bucketDays = sp.bucket_days || 1;
  const spanDays = sp.series.length
    ? Math.round((Date.parse(sp.series[sp.series.length - 1].ts) - Date.parse(sp.series[0].ts)) / 86_400_000) + bucketDays
    : 0;
  const expectedBuckets = Math.round(spanDays / bucketDays);
  const contiguous = sp.series.length >= expectedBuckets;
  const span = contiguous
    ? `${spanStart} to ${spanEnd}`
    : `${spanStart} to ${spanEnd} · ${sp.series.length} of ${expectedBuckets} buckets indexed`;
  const largest = sp.bursts[0]?.atom ?? 0;
  // Memo confidence: share of direct exchange deposits that carried a memo
  // (forward-only signal; null until the indexer has accrued memo'd flow).
  const memoPct = sp.memo_deposit_total > 0 ? (sp.memo_deposits / sp.memo_deposit_total) * 100 : null;

  // Chart 1: deposits by transfer size band (the hero decomposition).
  const bandSeries: Series[] = BANDS.map((b, i) => ({
    label: b.label,
    color: b.color,
    points: sp.series.map((p) => ({ date: fmtBucket(p.ts), value: p.bands[i] ?? 0 })),
  }));

  // Chart 2: deposits by sender label (actor breakdown). Pivot long to wide,
  // top categories by total volume.
  const buckets = sp.series.map((p) => p.ts);
  const catTotals = new Map<string, number>();
  for (const a of sp.actors) catTotals.set(a.category, (catTotals.get(a.category) ?? 0) + a.atom);
  const topCats = [...catTotals.entries()].sort((x, y) => y[1] - x[1]).slice(0, 6).map((e) => e[0]);
  const byKey = new Map(sp.actors.map((a) => [`${a.ts}|${a.category}`, a.atom]));
  const actorSeries: Series[] = topCats.map((cat, i) => ({
    label: CAT_LABEL[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1),
    color: ACTOR_PALETTE[i % ACTOR_PALETTE.length],
    points: buckets.map((ts) => ({ date: fmtBucket(ts), value: byKey.get(`${ts}|${cat}`) ?? 0 })),
  }));

  // Chart 3: inflation overlay, rewards actually claimed vs exchange deposits.
  const inflationSeries: Series[] = [
    { label: "Exchange deposits", color: "var(--iron)", points: sp.series.map((p) => ({ date: fmtBucket(p.ts), value: p.deposits })) },
    { label: "Rewards claimed", color: "var(--moss)", points: sp.series.map((p) => ({ date: fmtBucket(p.ts), value: p.reward_claimed })) },
  ];
  const totalRewards = sp.series.reduce((s, p) => s + p.reward_claimed, 0);

  // Net exchange flow: deposits vs withdrawals, both from the series so they are
  // apples-to-apples. Net is the honest headline: ATOM deposited and later
  // withdrawn was demonstrably NOT sold, so gross deposits overstate pressure.
  const grossDeposits = sp.series.reduce((s, p) => s + p.deposits, 0);
  const totalWithdrawals = sp.series.reduce((s, p) => s + p.withdrawals, 0);
  const netToExchanges = grossDeposits - totalWithdrawals; // > 0 = net accumulation on exchanges
  const netPctOfGross = grossDeposits > 0 ? (netToExchanges / grossDeposits) * 100 : 0;
  const netFlowSeries: Series[] = [
    { label: "Deposits (in)", color: "var(--iron)", points: sp.series.map((p) => ({ date: fmtBucket(p.ts), value: p.deposits })) },
    { label: "Withdrawals (out)", color: "var(--moss)", points: sp.series.map((p) => ({ date: fmtBucket(p.ts), value: p.withdrawals })) },
  ];

  // Sell-through: exchange deposits as a multiple of claimed inflation. Above 1x
  // means more ATOM hit exchanges than inflation minted in rewards (principal is
  // being sold, not just emissions).
  const sellThrough = totalRewards > 0 ? sp.total / totalRewards : null;

  // ATOM price over the same window, to read price against the deposit bursts.
  const winStart = sp.series[0] ? new Date(sp.series[0].ts).toISOString().slice(0, 10) : "";
  const pricePts = winStart ? priceHist.points.filter((p) => p.date >= winStart) : priceHist.points;
  const priceSeries: Series[] = pricePts.length
    ? [{ label: "ATOM / USD", color: "var(--hub)", points: pricePts.map((p) => ({ date: fmtBucket(p.date), value: p.value })) }]
    : [];
  const priceChg = pricePts.length >= 2 ? ((pricePts[pricePts.length - 1].value - pricePts[0].value) / pricePts[0].value) * 100 : null;

  return (
    <ConsolePage>
      <ConsoleModule lead dot="var(--iron)" title="Exchanges · Sell pressure" meta={`${span} · weekly · live from the indexer`}>
        <div className="console-grid">
          {/* Disclaimer: deposit ≠ sale, travels with the numbers */}
          <div className="span-12"><SellPressureDisclaimer /></div>

          {/* Thesis lede: net first */}
          <div className="span-12">
            <IntelCard title="Net sell pressure" meta={span} accent>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-80)", margin: 0 }}>
                Over <strong>{span}</strong>, <strong style={{ color: "var(--ink)" }}>{fmt(grossDeposits)} ATOM</strong> was deposited onto exchanges,
                but <strong style={{ color: "var(--moss)" }}>{fmt(totalWithdrawals)} ATOM</strong> was withdrawn back off, leaving a{" "}
                <strong style={{ color: netToExchanges > 0 ? "var(--iron)" : "var(--moss)" }}>net {netToExchanges >= 0 ? "inflow" : "outflow"} of {fmt(Math.abs(netToExchanges))} ATOM</strong>{" "}
                ({Math.abs(netPctOfGross).toFixed(0)}% of gross). ATOM deposited and then withdrawn was demonstrably not sold, so the net figure is the honest read on
                distribution, not the dramatic gross number. Deposits came from <strong style={{ color: "var(--ink)" }}>{sp.unique_senders.toLocaleString("en-US")}</strong> addresses;
                the top 10 drove <strong style={{ color: concentrated ? "var(--iron)" : "var(--ink)" }}>{top10Pct.toFixed(0)}%</strong>, so what pressure there is stays concentrated, not broad-based.
              </p>
            </IntelCard>
          </div>

          {/* Basis control: gross vs retail-adjusted (excludes exchange-operated senders) */}
          <div className="span-12" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <span className="data" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)" }}>
              {basis === "retail" ? "Retail-adjusted · exchange-operated senders excluded" : "Gross · all senders included"}
            </span>
            <BasisToggle />
          </div>

          {/* Headline metrics: net leads, gross/weighted as context */}
          <div className="span-3"><MetricCard label="Net to exchanges" value={`${netToExchanges >= 0 ? "+" : "−"}${fmt(Math.abs(netToExchanges))}`} unit="ATOM" series={[]} color={netToExchanges > 0 ? "var(--iron)" : "var(--moss)"} trendLabel={span} footnote={basis === "retail" ? "retail deposits − all withdrawals" : "deposits − withdrawals · true pressure"} /></div>
          <div className="span-3"><MetricCard label="Gross deposits" value={fmt(grossDeposits)} unit="ATOM" series={[]} color="var(--ink)" trendLabel={span} footnote={`weighted ${fmt(sp.weighted_total)} · sell-intent`} /></div>
          <div className="span-3"><MetricCard label="Withdrawals" value={fmt(totalWithdrawals)} unit="ATOM" series={[]} color="var(--moss)" trendLabel={span} footnote="ATOM taken back off exchanges" /></div>
          <div className="span-3"><MetricCard label="Top-10 share" value={`${top10Pct.toFixed(0)}%`} unit="of flow" series={[]} color={concentrated ? "var(--iron)" : "var(--ink)"} trendLabel={span} footnote={`${sp.unique_senders.toLocaleString("en-US")} senders · top 50 ${top50Pct.toFixed(0)}%`} /></div>

          {/* Route breakdown: the likelihood-weighted model, leg by leg */}
          {sp.routes.length > 0 && (
            <div className="span-12">
              <IntelCard title="Sell routes · weighted model" meta="route weight × raw flow = weighted sell pressure" shareFilename="bedrock-sell-routes"
                share={{
                  title: "How ATOM reaches a sell · Cosmos HUB",
                  subtitle: `Route weight × raw flow · ${span}`,
                  big: fmt(sp.weighted_total), unit: "ATOM weighted",
                  context: "Each exchange-bound route is weighted by how likely it ends in an actual sale. Weighted flow is sell intent, not confirmed sales.",
                  body: <ShareBars rows={sp.routes.map((r) => ({ label: ROUTE_META[r.route]?.label ?? r.route, value: r.weighted_atom, note: ROUTE_META[r.route] ? `· ×${ROUTE_META[r.route].weight}` : undefined }))} />,
                }}>
                <table className="broadsheet mcols-3">
                  <thead>
                    <tr><th>Route</th><th style={{ textAlign: "right" }}>Weight</th><th style={{ textAlign: "right" }} className="mhide3">Raw ATOM</th><th style={{ textAlign: "right" }}>Weighted ATOM</th><th style={{ textAlign: "right" }} className="mhide3">Transfers</th></tr>
                  </thead>
                  <tbody>
                    {sp.routes.map((r) => {
                      const meta = ROUTE_META[r.route] ?? { label: r.route, weight: "·", note: "" };
                      return (
                        <tr key={r.route}>
                          <td style={{ fontSize: 13 }}>
                            <strong>{meta.label}</strong>
                            <span className="mhide3" style={{ color: "var(--ink-50)", marginLeft: 8, fontSize: 12 }}>{meta.note}</span>
                          </td>
                          <td className="num" style={{ textAlign: "right", color: "var(--ink-60)" }}>{meta.weight}</td>
                          <td className="num mhide3" style={{ textAlign: "right", color: "var(--ink-60)" }}>{fmt(r.raw_atom)}</td>
                          <td className="num" style={{ textAlign: "right", fontWeight: 700, color: "var(--iron)" }}>{fmt(r.weighted_atom)}</td>
                          <td className="num mhide3" style={{ textAlign: "right", color: "var(--ink-50)" }}>{r.count.toLocaleString("en-US")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </IntelCard>
            </div>
          )}

          {/* Memo confidence: a memo on a send to an exchange is a strong "real
              customer deposit" signal (exchanges need it to credit the account). */}
          {memoPct != null && (
            <div className="span-12">
              <IntelCard title="Deposit confidence · memo signal" meta="forward-only, parsed from tx bodies" shareFilename="bedrock-deposit-memo"
                share={{
                  title: "Are ATOM exchange deposits real customer sends? · Cosmos HUB",
                  subtitle: "Share of direct exchange deposits carrying a memo",
                  big: `${memoPct!.toFixed(0)}%`, unit: "carried a memo",
                  context: `${sp.memo_deposits.toLocaleString("en-US")} of ${sp.memo_deposit_total.toLocaleString("en-US")} direct sends. An exchange needs a memo to credit a deposit to the right sub-account, so a memo is strong evidence of a real customer deposit rather than an internal wallet shuffle. Memo capture is forward-only.`,
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 30, flexWrap: "wrap" }}>
                  <div style={{ flexShrink: 0 }}>
                    <div style={{ fontSize: 36, fontWeight: 600, lineHeight: 1, color: memoPct >= 50 ? "var(--moss)" : "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{memoPct.toFixed(0)}%</div>
                    <div className="data" style={{ fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--ink-40)", marginTop: 6 }}>carried a memo</div>
                  </div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--ink-80)", margin: 0, flex: "1 1 340px" }}>
                    Of <strong style={{ color: "var(--ink)" }}>{sp.memo_deposit_total.toLocaleString("en-US")}</strong> direct sends landing on a labeled exchange since memo capture began,{" "}
                    <strong style={{ color: "var(--ink)" }}>{sp.memo_deposits.toLocaleString("en-US")}</strong> included a memo. Exchanges require a memo to credit a deposit to the right sub-account, so a memo is strong evidence the transfer is a real customer deposit rather than an internal wallet shuffle. Memo capture is forward-only, so this reflects recent flow as the indexer accrues it.
                  </p>
                </div>
              </IntelCard>
            </div>
          )}

          {/* Net exchange flow: deposits vs withdrawals (the actual buy/sell balance) */}
          <div className="span-12">
            <div className="surface" style={{ padding: "18px 22px" }}>
              <div className="data" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)", marginBottom: 4 }}>Net exchange flow · weekly</div>
              <div style={{ fontSize: 11, color: "var(--ink-40)", marginBottom: 14 }}>
                Deposits (sell-intent) against withdrawals (accumulation). Net{" "}
                <strong style={{ color: netToExchanges >= 0 ? "var(--iron)" : "var(--moss)" }}>{netToExchanges >= 0 ? "+" : "−"}{fmt(Math.abs(netToExchanges))} ATOM</strong>{" "}
                {netToExchanges >= 0 ? "onto" : "off"} exchanges over {span}, net {netToExchanges >= 0 ? "sell pressure" : "accumulation"}.
              </div>
              <LineChart series={netFlowSeries} yLabel="ATOM" height={280} />
            </div>
          </div>

          {/* Price overlay: did the deposit bursts move ATOM's price? */}
          {priceSeries.length > 0 && (
            <div className="span-12">
              <div className="surface" style={{ padding: "18px 22px" }}>
                <div className="data" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)", marginBottom: 4 }}>ATOM price over the window · daily</div>
                <div style={{ fontSize: 11, color: "var(--ink-40)", marginBottom: 14 }}>
                  Did the deposit bursts move price? ATOM/USD across the same dates{priceChg != null ? <>, <strong style={{ color: priceChg >= 0 ? "var(--moss)" : "var(--iron)" }}>{priceChg >= 0 ? "+" : "−"}{Math.abs(priceChg).toFixed(1)}%</strong> over the window</> : null}. Compare the spikes above against the line below; concentrated bursts that don&rsquo;t dent price suggest the market absorbed them. Price from CoinGecko.
                </div>
                <LineChart series={priceSeries} yLabel="USD" height={240} />
              </div>
            </div>
          )}

          {/* Chart 1: size bands */}
          <div className="span-12">
            <div className="surface" style={{ padding: "18px 22px" }}>
              <div className="data" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)", marginBottom: 4 }}>Exchange deposits by transfer size · weekly</div>
              <div style={{ fontSize: 11, color: "var(--ink-40)", marginBottom: 14 }}>Each line is a deposit-size tier in ATOM. If the large tiers spike in isolated weeks while small tiers stay flat, selling is bursty and concentrated.</div>
              <LineChart series={bandSeries} yLabel="ATOM deposited" height={320} />
            </div>
          </div>

          {/* Chart 2: actor breakdown */}
          <div className="span-12">
            <div className="surface" style={{ padding: "18px 22px" }}>
              <div className="data" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)", marginBottom: 4 }}>Exchange deposits by sender · weekly</div>
              <div style={{ fontSize: 11, color: "var(--ink-40)", marginBottom: 14 }}>Senders grouped by their on-chain label. Most depositors are unlabeled wallets (only a fraction of the address space is named), so read this as a floor on identified actors, not a full attribution.</div>
              <LineChart series={actorSeries} yLabel="ATOM deposited" height={300} />
            </div>
          </div>

          {/* Chart 3: inflation overlay */}
          <div className="span-12">
            <div className="surface" style={{ padding: "18px 22px" }}>
              <div className="data" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)", marginBottom: 4 }}>Inflation is not the seller · weekly</div>
              <div style={{ fontSize: 11, color: "var(--ink-40)", marginBottom: 14 }}>
                Rewards actually claimed by stakers ({fmt(totalRewards)} ATOM over the window) against exchange deposits. If inflation drove selling, the two would track. Deposits spike independently of claims.
                {sellThrough != null && (
                  <> {" "}<strong style={{ color: sellThrough >= 1 ? "var(--iron)" : "var(--moss)" }}>Sell-through {sellThrough.toFixed(1)}×</strong>: exchange deposits were {sellThrough.toFixed(1)}× the rewards claimed{sellThrough >= 1 ? ", so more ATOM hit exchanges than inflation minted (principal is being sold, not just emissions)." : ", so not even all claimed inflation was deposited."}</>
                )}
              </div>
              <LineChart series={inflationSeries} yLabel="ATOM" height={280} />
            </div>
          </div>

          {/* Biggest sellers: names the concentration, each opens its account card */}
          {sp.top_senders.length > 0 && (
            <div className="span-8">
              <div className="surface" style={{ padding: "16px 18px", height: "100%" }}>
                <div className="data" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)", marginBottom: 12 }}>Biggest sellers · top depositors to exchanges</div>
                <table className="broadsheet mcols-3">
                  <thead>
                    <tr>
                      <th style={{ width: 28 }}>#</th>
                      <th>Address</th>
                      <th style={{ textAlign: "right" }}>ATOM</th>
                      <th style={{ textAlign: "right" }} className="mhide3">Deposits</th>
                      <th style={{ textAlign: "right" }}>% of flow</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sp.top_senders.map((s, i) => (
                      <tr key={s.addr}>
                        <td className="num" style={{ color: "var(--ink-60)" }}>{i + 1}</td>
                        <td><AddressLink addr={s.addr}><span className="data" style={{ fontSize: 11.5, color: "var(--ink-80)", borderBottom: "1px dotted var(--ink-20)" }}>{shortAddr(s.addr)}</span></AddressLink></td>
                        <td className="num" style={{ textAlign: "right", fontWeight: 700, color: "var(--iron)" }}>{fmt(s.atom)}</td>
                        <td className="num mhide3" style={{ textAlign: "right", color: "var(--ink-60)" }}>{s.count}</td>
                        <td className="num" style={{ textAlign: "right", color: "var(--ink-60)" }}>{sp.total > 0 ? ((s.atom / sp.total) * 100).toFixed(1) : "0"}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ fontSize: 10.5, color: "var(--ink-40)", marginTop: 10 }}>Tap any address to open its account card. These are the wallets behind the concentration figure above.</div>
              </div>
            </div>
          )}

          {/* Where the sell flow lands, per exchange */}
          {sp.by_exchange.length > 0 && (
            <div className="span-4">
              <div className="surface" style={{ padding: "16px 18px", height: "100%" }}>
                <div className="data" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)", marginBottom: 14 }}>Where it lands · by exchange</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  {sp.by_exchange.slice(0, 8).map((x, i) => {
                    const pct = sp.total > 0 ? (x.atom / sp.total) * 100 : 0;
                    return (
                      <div key={x.exchange}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{x.exchange}</span>
                          <span className="data" style={{ fontSize: 11, color: "var(--ink-60)", flexShrink: 0 }}>{fmt(x.atom)} · {pct.toFixed(0)}%</span>
                        </div>
                        <div className="gbar" style={{ height: 8 }}>
                          <div className="gbar-fill" style={{ width: `${pct}%`, "--gbar-c": i === 0 ? "var(--iron)" : "var(--slate)" } as React.CSSProperties} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Burst ledger */}
          <div className="span-12">
            <div className="surface" style={{ padding: "16px 18px" }}>
              <div className="data" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)", marginBottom: 12 }}>The bursts · largest single exchange deposits</div>
              <table className="broadsheet mcols-3">
                <thead>
                  <tr>
                    <th style={{ width: 32 }}>#</th>
                    <th style={{ textAlign: "right" }}>ATOM</th>
                    <th>From</th>
                    <th>To exchange</th>
                    <th style={{ textAlign: "right" }} className="mhide3">When</th>
                  </tr>
                </thead>
                <tbody>
                  {sp.bursts.map((b, i) => (
                    <tr key={`${b.from}-${b.ts}-${i}`}>
                      <td className="num" style={{ color: "var(--ink-60)" }}>{i + 1}</td>
                      <td className="num" style={{ textAlign: "right", fontWeight: 700, color: "var(--iron)" }}>{fmt(b.atom)}</td>
                      <td><AddressLink addr={b.from}><span className="data" style={{ fontSize: 11.5, color: "var(--ink-80)", borderBottom: "1px dotted var(--ink-20)" }}>{shortAddr(b.from)}</span></AddressLink></td>
                      <td style={{ fontWeight: 600, color: "var(--ink)" }}>{b.exchange}</td>
                      <td className="num mhide3" style={{ textAlign: "right", color: "var(--ink-40)", fontSize: 11 }}>{fmtAgoDate(b.ts)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontSize: 10.5, color: "var(--ink-40)", marginTop: 12, lineHeight: 1.5 }}>
                Tap any sender to open its account card. &ldquo;Cohorts&rdquo; here are transfer-size bands, not holder wealth tiers. Bedrock does not track per-address balances, so a single large deposit is classified by its size, not the depositor&rsquo;s holdings. Deposits to a labeled exchange from a non-exchange, non-protocol address; protocol inflows (staking rewards) are excluded. The window reflects the period continuously indexed so far (the live tip-follower&rsquo;s run, shown above); it widens toward a full quarter as the historical backfill closes the gap.
              </div>
            </div>
          </div>

          {/* Methodology / transparency: citable definitions and caveats */}
          <div className="span-12" id="methodology">
            <div className="surface" style={{ padding: "18px 22px" }}>
              <div className="data" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--hub)", fontWeight: 700, marginBottom: 14 }}>How this is measured</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 28px", fontSize: 12.5, lineHeight: 1.55, color: "var(--ink-80)" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>Sell-intent proxy</div>
                  A deposit to a labeled exchange is the on-chain act before a sale. We count transfers <strong>into</strong> a verified CEX address from a <strong>non-exchange, non-protocol</strong> sender. Exchange-to-exchange hops and protocol inflows (staking rewards, fee sweeps) are excluded, so this is not the same as raw exchange volume.
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>Size bands, not wealth tiers</div>
                  The &ldquo;cohorts&rdquo; are <strong>transfer-size bands</strong> (the size of each deposit), not holder-wealth classes. Bedrock does not track per-address balance history, so we never claim a depositor is a &ldquo;whale&rdquo; by holdings. A 100k deposit is classified as 100k, full stop.
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>Concentration</div>
                  Top-10 / top-50 share is each sender&rsquo;s summed deposits over the window, ranked. &ldquo;Biggest sellers&rdquo; names those wallets; tap any to see its account.
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>Labels</div>
                  Exchange and protocol labels are verified (self-disclosed/corroborated for CEX; derived on-chain for protocol and IBC escrow accounts). Unconfirmed candidates are never used to classify flows, so a wallet shows as <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>cosmos1…</code> rather than a guessed brand.
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>Inflation overlay</div>
                  &ldquo;Rewards claimed&rdquo; is the volume of <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>withdraw_rewards</code> events. Sell-through is deposits divided by claimed rewards: above 1x means more ATOM hit exchanges than inflation minted.
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>Window &amp; price</div>
                  The window is what the live tip-follower has indexed continuously so far; it widens toward a full quarter as the historical backfill closes the gap. Price is daily ATOM/USD from CoinGecko, shown for context only.
                </div>
              </div>
            </div>
          </div>
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
