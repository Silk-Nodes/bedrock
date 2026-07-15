// /atom/supply · hl.eco card grid. A dense bento of self-contained data cards,
// each its own number + glowing chart + range toggle (via MetricCardLive), plus
// two feature charts. No prose: the old "supply pressure" paragraphs are now
// three data cards (staking APR, real yield staked, real yield holding) that
// carry the same insight as live series instead of text. Less text, more data.

import { MetricCardLive } from "@/components/console/MetricCardLive";
import { MetricCard } from "@/components/console/MetricCard";
import { ChartCard } from "@/components/console/ChartCard";
import { ConsolePage, ConsoleModule, IntelCard } from "@/components/console/Console";
import { LineChart, type Series } from "@/components/charts/LineChart";
import { getLiveChain } from "@/lib/chain";
import { getIssuance, getInflationRealization } from "@/lib/indexer";
import { getLiveBurn } from "@/lib/burn";
import { getMarketComparison } from "@/lib/compare";
import { SupplyTicker } from "@/components/atom/SupplyTicker";
import { TipCard } from "@/components/charts/TipCard";
import { BurnChart } from "@/components/atom/BurnChart";
import { BURN_SUMMARY, BURN_DAILY, BURN_CUMULATIVE, BURN_ADDRESS } from "@/data/atom-burn";
import { reconstructSupplySeries, reconstructInflationSeries } from "@/lib/series";
import { ShareLineChart, ShareBars, ShareStack } from "@/components/share/ShareCharts";
import { seo } from "@/lib/seo";

export const revalidate = 300;

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toString();
}

export const metadata = seo({ title: "ATOM Supply & Burn", description: "ATOM supply live: the ticking on-chain supply, issuance vs burn, real yield, and ATOM at the market cap of BTC, ETH, SOL, HYPE and more.", path: "/atom/supply", keywords: ["ATOM supply", "ATOM burn", "ATOM inflation", "ATOM market cap comparison", "ATOM circulating supply"], ogImage: "/card/supply" });

export default async function AtomSupply() {
  const [chain, issuance, ir, burn, cmp] = await Promise.all([
    getLiveChain(), getIssuance(120, 1), getInflationRealization(12), getLiveBurn(), getMarketComparison(),
  ]);

  // Burn series recency: the daily burn data is a periodic snapshot (Smart Stake
  // export), so derive the trailing windows from it and label the through-date.
  // The all-time total stays live (the on-chain burn-address balance), and any
  // burns since the snapshot show up as a reconciliation line, never dropped.
  const burnThrough = BURN_DAILY.length ? BURN_DAILY[BURN_DAILY.length - 1].d : "";
  const burn30d = BURN_DAILY.slice(-30).reduce((a, x) => a + x.v, 0);
  const burn1y = BURN_DAILY.slice(-365).reduce((a, x) => a + x.v, 0);
  const seriesTotal = BURN_CUMULATIVE.length ? BURN_CUMULATIVE[BURN_CUMULATIVE.length - 1].v : 0;
  const sinceSnapshot = Math.max(0, burn.total_atom - seriesTotal);

  // Live tick rates: the mint module's annual provisions spread per second
  // (ATOM mints every ~6s block), and the trailing burn pace. Net = the honest
  // "supply is changing right now" number.
  const mintPerSec = chain.annual_provisions > 0 ? chain.annual_provisions / 31_557_600 : 0;
  const burnPerSec = BURN_SUMMARY.last_30d / (30 * 86_400);
  const fetchedAt = chain.fetched_at || new Date().toISOString();

  // Reward-realization KPIs (Gauntlet-style): how much newly-liquid reward
  // ATOM enters circulation per week, and how much of it reaches sell-like
  // routes. Weekly averages over the indexed window, against current supply.
  const irWeeks = Math.max(1, ir.weeks.length);
  const claimedPct = chain.total_supply > 0 ? (ir.withdrawn / irWeeks / chain.total_supply) * 100 : 0;
  const soldPct = chain.total_supply > 0 ? (ir.sold / irWeeks / chain.total_supply) * 100 : 0;
  const soldShare = ir.withdrawn > 0 ? (ir.sold / ir.withdrawn) * 100 : 0;
  const restakedShare = ir.withdrawn > 0 ? (ir.restaked / ir.withdrawn) * 100 : 0;
  const liquidShare = ir.withdrawn > 0 ? (ir.liquid / ir.withdrawn) * 100 : 0;
  const supply = reconstructSupplySeries(chain, 36);
  const inflation = reconstructInflationSeries(chain, 36);
  const tax = chain.community_tax_pct / 100;

  // Real indexed issuance from block_mint (actual ATOM minted per day), when the
  // endpoint is live. Falls back to the reconstructed model otherwise.
  const issLive = issuance.live && issuance.series.length > 1;
  const realIssuancePts = issuance.series.map((p) => ({ date: p.ts.slice(0, 10), value: Math.round(p.minted_atom) }));
  const realInflationPts = issuance.series.map((p) => ({ date: p.ts.slice(0, 10), value: +p.inflation_pct.toFixed(2) }));

  // Per-card live series, so every card carries its own timeline + hover + range.
  const supplyPts = supply.map((d) => ({ date: d.date, value: d.total }));
  const inflationPts = issLive ? realInflationPts : inflation.map((d) => ({ date: d.date, value: d.value }));
  const issuancePts = issLive ? realIssuancePts : supply.map((d, i) => ({ date: d.date, value: Math.round((d.total * (inflation[i]?.value ?? 0)) / 100) }));
  const aprPts = supply.map((d, i) => {
    const br = d.total > 0 ? d.bonded / d.total : 0;
    const infl = inflation[i]?.value ?? 0;
    return { date: d.date, value: br > 0 ? +((infl * (1 - tax)) / br).toFixed(2) : 0 };
  });
  const realStakedPts = aprPts.map((d, i) => ({ date: d.date, value: +(d.value - (inflation[i]?.value ?? 0)).toFixed(2) }));
  const realHoldPts = inflation.map((d) => ({ date: d.date, value: +(-d.value).toFixed(2) }));

  // Headline current values (derived from the same live chain state).
  const annualIssuance = (chain.total_supply * chain.inflation_pct) / 100;
  const stakingApr = chain.bonded_ratio_pct > 0 ? (chain.inflation_pct * (1 - tax)) / (chain.bonded_ratio_pct / 100) : 0;
  const stakerReal = stakingApr - chain.inflation_pct;

  const supplySeries: Series[] = [
    { label: "Total supply", color: "var(--hub)", points: supply.map((d) => ({ date: d.date, value: d.total })) },
    { label: "Bonded", color: "var(--moss)", points: supply.map((d) => ({ date: d.date, value: d.bonded })) },
  ];
  const inflationSeries: Series[] = [{ label: "Inflation %", color: "var(--hub-2)", points: inflation }];
  // Real daily issuance feature chart (block_mint), when live.
  const issuanceSeries: Series[] = [{ label: "ATOM minted / day", color: "var(--sand)", points: realIssuancePts }];

  return (
    <ConsolePage>
      <ConsoleModule lead title="Supply & burn" dot="var(--hub-2)" meta={`band ${chain.inflation_min_pct}-${chain.inflation_max_pct}% · target ${chain.goal_bonded_pct}% · tax ${chain.community_tax_pct.toFixed(1)}%`}>
        <div className="console-grid">
          {/* Live hero: the supply is changing right now. Base values are real
              on-chain reads; the tick advances at the live mint rate. */}
          <div className="span-6">
            <IntelCard title="Total supply · live" meta={`minting ${mintPerSec.toFixed(2)} ATOM/sec · ${fmtCompact(chain.annual_provisions)} ATOM/yr`} accent shareFilename="bedrock-atom-total-supply"
              share={{
                title: "ATOM total supply · Cosmos HUB",
                subtitle: `Minting ${mintPerSec.toFixed(2)} ATOM per second · no hard cap`,
                big: fmtCompact(chain.total_supply), unit: "ATOM",
                context: `Every ~6s block mints about ${(mintPerSec * 6).toFixed(1)} ATOM · inflation ${chain.inflation_pct.toFixed(1)}% · ${fmtCompact(chain.annual_provisions)} ATOM a year. Read live from the chain's bank module.`,
              }}>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
                <div>
                  <SupplyTicker base={chain.total_supply} ratePerSec={mintPerSec} fetchedAt={fetchedAt} fontSize={44} />
                  <span className="data" style={{ fontSize: 12, letterSpacing: 1, color: "var(--ink-40)", marginLeft: 10 }}>ATOM</span>
                </div>
                <div className="data" style={{ fontSize: 11.5, color: "var(--ink-60)", marginTop: 12 }}>
                  every ~6s block mints ≈ {(mintPerSec * 6).toFixed(1)} ATOM · inflation {chain.inflation_pct.toFixed(1)}% · no hard cap
                </div>
              </div>
            </IntelCard>
          </div>
          <div className="span-6">
            <IntelCard title="Burned · live" meta={`burn pace ${(burnPerSec * 86_400).toFixed(0)} ATOM/day · 30d avg`} shareFilename="bedrock-atom-burned-live"
              share={{
                title: "ATOM burned · Cosmos HUB",
                subtitle: `Burn pace ${(burnPerSec * 86_400).toFixed(0)} ATOM/day · 30-day average`,
                big: fmtCompact(burn.total_atom), unit: "ATOM removed forever",
                context: `Issuance outpaces burn by roughly ${(mintPerSec / Math.max(burnPerSec, 1e-6)).toFixed(0)}×, so supply still grows about ${fmtCompact(chain.annual_provisions - burnPerSec * 31_557_600)} ATOM a year. Total is the live on-chain balance of the burn address.`,
              }}>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
                <div>
                  <SupplyTicker base={burn.total_atom} ratePerSec={burnPerSec} fetchedAt={fetchedAt} fontSize={44} color="var(--iron)" />
                  <span className="data" style={{ fontSize: 12, letterSpacing: 1, color: "var(--ink-40)", marginLeft: 10 }}>ATOM removed forever</span>
                </div>
                <div className="data" style={{ fontSize: 11.5, color: "var(--ink-60)", marginTop: 12 }}>
                  issuance outpaces burn ≈ {(mintPerSec / Math.max(burnPerSec, 0.000001)).toFixed(0)}× · net supply grows {fmtCompact(chain.annual_provisions - burnPerSec * 31_557_600)} ATOM/yr
                </div>
              </div>
            </IntelCard>
          </div>

          {/* Six data cards, each its own timeline (3M/6M/1Y/ALL) + hover */}
          <div className="span-4">
            <MetricCardLive label="Total supply" value={fmtCompact(chain.total_supply)} unit="ATOM" points={supplyPts} color="var(--hub)" footnote="no hard cap" />
          </div>
          <div className="span-4">
            <MetricCardLive label="Inflation" value={`${chain.inflation_pct.toFixed(1)}%`} points={inflationPts} color="var(--hub-2)" footnote={`band ${chain.inflation_min_pct}-${chain.inflation_max_pct}%`} />
          </div>
          <div className="span-4">
            <MetricCardLive label="Annual issuance" value={fmtCompact(annualIssuance)} unit="ATOM/yr" points={issuancePts} color="var(--sand)" footnote={issLive ? "live · minted/day" : "new supply"} />
          </div>
          <div className="span-4">
            <MetricCardLive label="Staking APR" value={`${stakingApr.toFixed(1)}%`} points={aprPts} color="var(--moss)" footnote="paid to bonded stake" />
          </div>
          <div className="span-4">
            <MetricCardLive label="Real yield · staked" value={`${stakerReal >= 0 ? "+" : ""}${stakerReal.toFixed(1)}%`} points={realStakedPts} color={stakerReal >= 0 ? "var(--moss)" : "var(--iron)"} footnote="APR minus inflation" />
          </div>
          <div className="span-4">
            <MetricCardLive label="Real yield · holding" value={`−${chain.inflation_pct.toFixed(1)}%`} points={realHoldPts} color="var(--iron)" footnote="diluted by full inflation" />
          </div>

          {/* Reward realization: how much inflation becomes liquid, and where it
              goes. Same-wallet same-week attribution (a conservative lower
              bound); weekly averages over the indexed window vs current supply. */}
          {ir.live && ir.withdrawn > 0 && (
            <>
              <div className="span-4">
                <MetricCard label="Claimed / supply" value={`${claimedPct.toFixed(3)}%`} unit="/wk" series={[]} color="var(--sand)" footnote={`${fmtCompact(ir.withdrawn / irWeeks)} ATOM claimed weekly · ${irWeeks}w avg`} />
              </div>
              <div className="span-4">
                <MetricCard label="Sold / supply" value={`${soldPct.toFixed(3)}%`} unit="/wk" series={[]} color="var(--iron)" footnote="reward-sourced, same-wallet same-week" />
              </div>
              <div className="span-4">
                <MetricCard label="Rewards re-staked" value={`${restakedShare.toFixed(0)}%`} unit="of claimed" series={[]} color="var(--moss)" footnote={`sold ${soldShare.toFixed(0)}% · liquid ${liquidShare.toFixed(0)}%`} />
              </div>
              <div className="span-12">
                <IntelCard title="Where claimed rewards go" meta={`last ${irWeeks} indexed weeks · same-wallet same-week attribution`} shareFilename="bedrock-reward-destination"
                  share={{
                    title: "Where claimed ATOM rewards go · Cosmos HUB",
                    subtitle: `Last ${irWeeks} indexed weeks · same-wallet, same-week attribution`,
                    big: `${restakedShare.toFixed(0)}%`, unit: "re-staked",
                    context: "Sold means a likelihood-weighted sell route from the same wallet in the same week it claimed. That is sell intent and a conservative lower bound, not a confirmed sale.",
                    body: <ShareStack rows={[{ label: "", segments: [
                      { label: `re-staked · ${fmtCompact(ir.restaked)}`, value: ir.restaked, color: "var(--moss)" },
                      { label: `sell routes · ${fmtCompact(ir.sold)}`, value: ir.sold, color: "var(--iron)" },
                      { label: `liquid · ${fmtCompact(ir.liquid)}`, value: ir.liquid, color: "var(--slate)" },
                    ] }]} />,
                  }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", height: 12, borderRadius: 2, overflow: "hidden", border: "1px solid var(--card-line)" }}>
                      <div style={{ width: `${soldShare}%`, background: "var(--iron)" }} />
                      <div style={{ width: `${restakedShare}%`, background: "var(--moss)" }} />
                      <div style={{ width: `${liquidShare}%`, background: "var(--slate)" }} />
                    </div>
                    <div className="data" style={{ display: "flex", gap: 22, flexWrap: "wrap", fontSize: 12, color: "var(--ink-60)" }}>
                      <span><span style={{ color: "var(--iron)", fontWeight: 700 }}>{soldShare.toFixed(1)}%</span> reached sell routes ({fmtCompact(ir.sold)} ATOM)</span>
                      <span><span style={{ color: "var(--moss)", fontWeight: 700 }}>{restakedShare.toFixed(1)}%</span> re-staked ({fmtCompact(ir.restaked)} ATOM)</span>
                      <span><span style={{ color: "var(--slate)", fontWeight: 700 }}>{liquidShare.toFixed(1)}%</span> liquid, unsold ({fmtCompact(ir.liquid)} ATOM)</span>
                    </div>
                    <p style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--ink-50)", margin: 0 }}>
                      Sold means a likelihood-weighted sell route (direct exchange deposit ×0.95, IBC out with swap memo ×1.00, without ×0.25)
                      from the same wallet in the same week it withdrew, capped at the amount withdrawn. Conservative lower bound: rewards moved
                      to another wallet before selling are not attributed.
                    </p>
                  </div>
                </IntelCard>
              </div>
            </>
          )}

          {/* ATOM at the market cap of X (hypeburn-style comparison chips) */}
          {cmp.live && cmp.atom && (
            <div className="span-12">
              <IntelCard title="ATOM at the market cap of…" meta={`implied ATOM price · ATOM mcap $${(cmp.atom.mcap / 1e9).toFixed(2)}B · hover for FDV`} shareFilename="bedrock-atom-mcap-of"
                share={{
                  title: "ATOM at the market cap of… · Cosmos HUB",
                  subtitle: `Implied ATOM price · ATOM market cap $${(cmp.atom.mcap / 1e9).toFixed(2)}B`,
                  context: "The price ATOM would trade at if it held each asset's market cap today, at ATOM's current supply. A comparison, not a forecast.",
                  body: <ShareBars unit="" rows={cmp.coins.slice(0, 6).map((c) => ({ label: c.symbol, value: c.mcap / cmp.atom!.mcap, display: `$${(cmp.atom!.price * (c.mcap / cmp.atom!.mcap)).toFixed(2)}`, note: `· ${(c.mcap / cmp.atom!.mcap).toFixed(2)}×` }))} />,
                }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
                  {cmp.coins.map((c) => {
                    const mult = c.mcap / cmp.atom!.mcap;
                    const implied = cmp.atom!.price * mult;
                    const fdvMult = c.fdv / cmp.atom!.fdv;
                    const up = mult >= 1;
                    const col = up ? "var(--moss)" : "var(--iron)";
                    return (
                      <div key={c.id} className="tipwrap surface" style={{ padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <TipCard title={`ATOM with ${c.symbol}'s valuation`} rows={[
                          { label: `${c.symbol} mcap`, value: `$${(c.mcap / 1e9).toFixed(2)}B` },
                          { label: "implied ATOM", value: `$${implied >= 100 ? implied.toFixed(0) : implied.toFixed(2)}`, valueColor: col },
                          { label: "mcap multiple", value: `${mult >= 1 ? "+" : ""}${mult.toFixed(2)}×`, valueColor: col },
                          { label: "FDV multiple", value: `${fdvMult.toFixed(2)}×`, total: true },
                        ]} />
                        <span className="data" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>{c.symbol}</span>
                        <span className="data" style={{ fontSize: 12.5, textAlign: "right" }}>
                          <span style={{ color: "var(--ink)" }}>${implied >= 1000 ? fmtCompact(implied) : implied.toFixed(2)}</span>{" "}
                          <span style={{ color: col, fontWeight: 700 }}>{up ? "▲" : "▼"}{mult.toFixed(mult >= 10 ? 0 : 2)}×</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </IntelCard>
            </div>
          )}

          {/* Burn history (merged from /atom/burn): the removal side of supply */}
          <div className="span-3">
            <MetricCardLive label="Total burned" value={fmtCompact(burn.total_atom)} unit="ATOM" points={BURN_CUMULATIVE.map((d) => ({ date: d.d, value: d.v }))} color="var(--iron)" footnote={burn.live ? (sinceSnapshot > 1 ? `live · +${fmtCompact(sinceSnapshot)} since ${burnThrough}` : "live · on-chain burn address") : "snapshot"} />
          </div>
          <div className="span-3">
            <MetricCardLive label="Burned · 30d" value={burn30d.toLocaleString("en-US", { maximumFractionDigits: 0 })} unit="ATOM" points={BURN_DAILY.map((d) => ({ date: d.d, value: d.v }))} color="var(--iron)" footnote={`30d through ${burnThrough}`} />
          </div>
          <div className="span-3">
            <MetricCardLive label="Burned · 1y" value={fmtCompact(burn1y)} unit="ATOM" points={BURN_DAILY.map((d) => ({ date: d.d, value: d.v }))} color="var(--iron)" footnote={`1y through ${burnThrough}`} />
          </div>
          <div className="span-3">
            <MetricCardLive label="Burn vs issuance" value={`${((burnPerSec * 31_557_600 / Math.max(1, chain.annual_provisions)) * 100).toFixed(2)}%`} points={BURN_DAILY.map((d) => ({ date: d.d, value: +((d.v / Math.max(1, chain.annual_provisions / 365)) * 100).toFixed(3) }))} color="var(--iron)" footnote={`of new supply removed · burn addr ${BURN_ADDRESS.slice(0, 12)}…`} />
          </div>
          <div className="span-12">
            <ChartCard title="Daily burn" meta={`ATOM removed per day · daily detail through ${burnThrough}`} accentColor="var(--iron)" shareFilename="bedrock-atom-burn"
              share={{ title: "ATOM burn · Cosmos HUB", subtitle: "ATOM permanently removed from supply", context: "Issuance still outpaces burn by orders of magnitude; net supply grows.", body: <ShareLineChart series={[{ label: "Cumulative burn", color: "var(--iron)", points: BURN_CUMULATIVE.map((d) => ({ date: d.d, value: d.v })) }]} unit="ATOM" /> }}>
              <BurnChart daily={BURN_DAILY} cumulative={BURN_CUMULATIVE} />
            </ChartCard>
          </div>

          {/* Two feature charts, side by side, each with its own range pickers */}
          <div className="span-6">
            <ChartCard title="Supply over time" meta="36mo · reconstructed to live" accentColor="var(--hub)" shareFilename="bedrock-atom-supply"
              share={{ title: "ATOM supply over time · Cosmos HUB", subtitle: "Total ATOM supply across 36 months", context: "ATOM has no hard cap. Supply growth is governed by dynamic inflation that steps down as more supply is bonded.", body: <ShareLineChart series={supplySeries} unit="ATOM" height={260} /> }}>
              <LineChart series={supplySeries} yLabel="ATOM" height={300} />
            </ChartCard>
          </div>
          <div className="span-6">
            {issLive ? (
              <ChartCard title="ATOM issued per day" meta="live from the indexer · real block_mint" accentColor="var(--sand)" shareFilename="bedrock-atom-issuance"
                share={{ title: "ATOM issued per day · Cosmos HUB", subtitle: "Actual ATOM minted per day, from on-chain mint events", context: "Real issuance indexed block by block from the chain's mint event, not a modeled inflation curve.", body: <ShareLineChart series={issuanceSeries} unit="ATOM/day" height={260} /> }}>
                <LineChart series={issuanceSeries} yLabel="ATOM / DAY" height={300} />
              </ChartCard>
            ) : (
              <ChartCard title="Inflation rate" meta="36mo · Prop 848 step-down" accentColor="var(--hub-2)" shareFilename="bedrock-atom-inflation"
                share={{ title: "ATOM inflation rate · Cosmos HUB", subtitle: "Dynamic inflation over 36 months, with the Prop 848 step-down", context: "Governance Prop 848 cut the inflation ceiling from 14% to 10% in 2023. The step-down is visible in the curve.", body: <ShareLineChart series={inflationSeries} suffix="%" height={260} /> }}>
                <LineChart series={inflationSeries} yLabel="INFLATION %" height={300} />
              </ChartCard>
            )}
          </div>
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
