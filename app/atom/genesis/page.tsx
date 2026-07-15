// /atom/genesis · "The 984" - the cosmoshub-1 mainnet-launch holders (genesis
// 2019-03-13), cross-referenced to their state today. The OG-wallet analysis:
// who still holds their 2019 ATOM, who staked it, and who fully exited. The
// genesis allocation is a static fact (the genesis file); current state is a
// dated snapshot of each original address (data/genesis-holders.json).

import { MetricCard } from "@/components/console/MetricCard";
import { ConsolePage, ConsoleModule, IntelCard } from "@/components/console/Console";
import { AddressLink } from "@/components/address/AddressLink";
import { HoverTip } from "@/components/HoverTip";
import { seo } from "@/lib/seo";
import genesis from "@/data/genesis-holders.json";

export const metadata = seo({
  title: "The 984 · ATOM Genesis Holders",
  description:
    "The 984 wallets that held ATOM at Cosmos Hub mainnet genesis (March 2019), cross-referenced to today: who still holds and stakes their original ATOM, and who fully exited.",
  path: "/atom/genesis",
  keywords: ["ATOM genesis holders", "Cosmos Hub genesis", "OG ATOM wallets", "ATOM 2019 allocation", "original ATOM holders"],
});
export const revalidate = 3600;

type H = { a: string; gen: number; liq: number; st: number; unb: number };

function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return Math.round(n).toLocaleString("en-US");
}
function short(a: string): string {
  return `${a.slice(0, 11)}…${a.slice(-4)}`;
}

export default function GenesisHolders() {
  const holders = (genesis.holders as H[]).map((h) => ({ ...h, now: h.liq + h.st + h.unb }));
  const genTotal = genesis.genesis_total;
  const nowTotal = holders.reduce((s, h) => s + h.now, 0);

  const survivors = holders.filter((h) => h.now >= 1);
  const exited = holders.filter((h) => h.now < 1);
  const accumulated = holders.filter((h) => h.now > h.gen * 1.001);
  const stakedTotal = holders.reduce((s, h) => s + h.st, 0);

  // Leaderboard: still-holding wallets, by current ATOM.
  const topSurvivors = survivors.slice().sort((a, b) => b.now - a.now).slice(0, 40);
  // Biggest fully-exited genesis wallets (the "sold / moved" story).
  const topExits = exited.slice().sort((a, b) => b.gen - a.gen).slice(0, 12);

  return (
    <ConsolePage>
      <ConsoleModule lead dot="var(--hub)" title="ATOM · Genesis holders" meta={`the 984 · genesis ${genesis.genesis_date} · then vs now`}>
      <div className="console-grid">
        
        <div className="span-12">
          <IntelCard title="The 984" meta={`genesis ${genesis.genesis_date} · as of ${genesis.snapshot}`} accent>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-80)", margin: 0 }}>
              At Cosmos Hub mainnet launch on {genesis.genesis_date}, <strong style={{ color: "var(--ink)" }}>{genesis.count}</strong> wallets
              held <strong style={{ color: "var(--ink)" }}>{compact(genTotal)}</strong> ATOM, the entire genesis supply.
              Every one is a <code style={{ fontSize: 12 }}>cosmos1…</code> address, unchanged since 2019, so we can read each straight through to today.{" "}
              <strong style={{ color: "var(--moss)" }}>{survivors.length}</strong> of them still hold from that original address
              (<strong style={{ color: "var(--ink)" }}>{(nowTotal / genTotal * 100).toFixed(1)}%</strong> of all genesis ATOM),
              and <strong style={{ color: "var(--iron)" }}>{exited.length}</strong> have fully left.
              Balances are the current on-chain state of each 2019 address; ATOM that moved to a new wallet reads here as an exit.
            </p>
          </IntelCard>
        </div>

        {/* Headline economics */}
        <div className="span-3"><MetricCard label="Genesis wallets" value={String(genesis.count)} series={[]} color="var(--hub)" footnote={`launch ${genesis.genesis_date}`} /></div>
        <div className="span-3"><MetricCard label="Genesis ATOM" value={compact(genTotal)} unit="ATOM" series={[]} color="var(--hub-2)" footnote="entire supply at launch" /></div>
        <div className="span-3"><MetricCard label="Still in original wallets" value={`${(nowTotal / genTotal * 100).toFixed(1)}`} unit="%" series={[]} color="var(--moss)" footnote={`${compact(nowTotal)} ATOM held on`} /></div>
        <div className="span-3"><MetricCard label="OG survivors" value={String(survivors.length)} series={[]} color="var(--sand)" footnote={`${((survivors.length / genesis.count) * 100).toFixed(0)}% of the 984 still hold`} /></div>

        <div className="span-3"><MetricCard label="Fully exited" value={String(exited.length)} series={[]} color="var(--iron)" footnote="original address drained" /></div>
        <div className="span-3"><MetricCard label="Accumulated since" value={String(accumulated.length)} series={[]} color="var(--moss)" footnote="hold more than at genesis" /></div>
        <div className="span-3"><MetricCard label="OG ATOM staked" value={compact(stakedTotal)} unit="ATOM" series={[]} color="var(--hub)" footnote="bonded by original wallets" /></div>
        <div className="span-3"><MetricCard label="Held vs exited" value={`${survivors.length} / ${exited.length}`} series={[]} color="var(--slate)" footnote="survivors / exits" /></div>

        {/* Retention bar */}
        <div className="span-12">
          <IntelCard title="Where the genesis ATOM sits today" meta="share of the 236.2M genesis supply">
            {(() => {
              const heldStaked = holders.reduce((s, h) => s + h.st, 0);
              const heldLiquid = holders.reduce((s, h) => s + h.liq + h.unb, 0);
              const gone = genTotal - nowTotal;
              const seg = [
                { label: "Staked by original wallets", v: heldStaked, c: "var(--moss)" },
                { label: "Liquid in original wallets", v: heldLiquid, c: "var(--hub)" },
                { label: "Left the original wallet", v: gone, c: "var(--iron)" },
              ];
              return (
                <>
                  <div style={{ display: "flex", height: 26, borderRadius: 3, overflow: "hidden", marginBottom: 14 }}>
                    {seg.map((s) => (
                      <div key={s.label} style={{ width: `${(s.v / genTotal) * 100}%`, background: s.c }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
                    {seg.map((s) => (
                      <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 2, background: s.c }} />
                        <span className="data" style={{ fontSize: 11.5, color: "var(--ink-60)" }}>
                          {s.label} <strong style={{ color: "var(--ink)" }}>{compact(s.v)}</strong> ({(s.v / genTotal * 100).toFixed(1)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </IntelCard>
        </div>

        {/* Survivors leaderboard */}
        <div className="span-12">
          <IntelCard title="OG survivors" meta="genesis wallets still holding, largest first">
            <div style={{ overflowX: "auto" }}>
              <table className="broadsheet mcols-4" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--ink-40)", fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase" }}>
                    <th style={{ padding: "8px 10px" }}>#</th>
                    <th style={{ padding: "8px 10px" }}>Genesis wallet</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>2019</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Now</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Retained</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Staked</th>
                  </tr>
                </thead>
                <tbody>
                  {topSurvivors.map((h, i) => {
                    const ret = h.gen > 0 ? (h.now / h.gen) * 100 : 0;
                    const stPct = h.now > 0 ? (h.st / h.now) * 100 : 0;
                    const retColor = ret >= 99 ? "var(--moss)" : ret >= 50 ? "var(--sand)" : "var(--iron)";
                    return (
                      <tr key={h.a} style={{ borderTop: "1px solid var(--ink-10)" }}>
                        <td style={{ padding: "9px 10px", color: "var(--ink-40)", fontVariantNumeric: "tabular-nums" }}>{i + 1}</td>
                        <td style={{ padding: "9px 10px", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <HoverTip tip="A cosmoshub-1 genesis wallet, unchanged since 2019. Click to open its live on-chain position." sub={h.a}>
                            <AddressLink addr={h.a} style={{ color: "var(--ink-80)" }}>{short(h.a)}</AddressLink>
                          </HoverTip>
                        </td>
                        <td style={{ padding: "9px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ink-50)" }}>{compact(h.gen)}</td>
                        <td style={{ padding: "9px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{compact(h.now)}</td>
                        <td style={{ padding: "9px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: retColor, fontWeight: 600 }}>{ret >= 999 ? "999+" : ret.toFixed(0)}%</td>
                        <td style={{ padding: "9px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ink-50)" }}>{stPct.toFixed(0)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--ink-40)" }}>Retained = current holding vs 2019 allocation. Over 100% means the wallet accumulated more ATOM since genesis.</div>
          </IntelCard>
        </div>

        {/* Biggest exits */}
        <div className="span-12">
          <IntelCard title="Biggest genesis exits" meta="largest 2019 wallets now fully drained">
            <div style={{ overflowX: "auto" }}>
              <table className="broadsheet mcols-3" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--ink-40)", fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase" }}>
                    <th style={{ padding: "8px 10px" }}>#</th>
                    <th style={{ padding: "8px 10px" }}>Genesis wallet</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Held at genesis</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Now</th>
                  </tr>
                </thead>
                <tbody>
                  {topExits.map((h, i) => (
                    <tr key={h.a} style={{ borderTop: "1px solid var(--ink-10)" }}>
                      <td style={{ padding: "9px 10px", color: "var(--ink-40)", fontVariantNumeric: "tabular-nums" }}>{i + 1}</td>
                      <td style={{ padding: "9px 10px", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <HoverTip tip="A genesis wallet whose original address is now empty. The ATOM was staked-out, sold, or moved to a new address." sub={h.a}>
                          <AddressLink addr={h.a} style={{ color: "var(--ink-60)" }}>{short(h.a)}</AddressLink>
                        </HoverTip>
                      </td>
                      <td style={{ padding: "9px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ink-80)" }}>{compact(h.gen)}</td>
                      <td style={{ padding: "9px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--iron)" }}>0</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--ink-40)" }}>
              Full pre-Stargate transaction history (2019 to 2021) is not yet indexed, so an exit shows the original wallet is empty but not where the ATOM went. That breadcrumb trail lands with the cosmoshub-1/2/3 backfill.
            </div>
          </IntelCard>
        </div>
      </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
