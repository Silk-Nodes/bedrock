// /signals/whales · the big-movers board: the largest recent on-chain moves
// across every dimension, live from the Bedrock indexer. Biggest delegations,
// undelegations, transfers, and exchange deposits, each row clickable into the
// account or validator card. Real data, no mock.

import { ConsolePage, ConsoleModule, IntelCard } from "@/components/console/Console";
import { MetricCard } from "@/components/console/MetricCard";
import { AddressLink } from "@/components/address/AddressLink";
import { ValidatorLink } from "@/components/validator/ValidatorLink";
import { ValidatorAvatar } from "@/components/console/ValidatorAvatar";
import { Soon } from "@/components/console/Soon";
import { WhaleWindow } from "@/components/signals/WhaleWindow";
import { ShareBars } from "@/components/share/ShareCharts";
import { getFlowFeed, getStakingRecent, getSellPressure, windowLabel } from "@/lib/indexer";
import { getLiveValidators, getValidatorLogoMap } from "@/lib/validators";
import { seo } from "@/lib/seo";

// Time window for the two intel cards (depositors + largest transfers), driven
// by the ?w query (hours). 30D is the default and the current depth of indexed
// exchange history; longer ranges open up as the backfill deepens.
// No `label` here on purpose: this resolves what we ASK the indexer for, and a
// ready-made label sitting next to it is what got reused as if it described the
// answer. Labels are derived from the returned data below.
function resolveWindow(w: string): { days: number; hours: number } {
  if (w === "24") return { days: 1, hours: 24 };
  if (w === "168") return { days: 7, hours: 168 };
  return { days: 30, hours: 720 };
}

export const revalidate = 30;

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
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
function AddrCell({ a }: { a: string }) {
  if (isWallet(a)) return <AddressLink addr={a} style={{ color: "var(--ink-80)" }}>{shortAddr(a)}</AddressLink>;
  return <span style={{ color: "var(--ink-60)" }}>{shortAddr(a)}</span>;
}

export const metadata = seo({ title: "Whale Signals", description: "Track the largest ATOM wallets in real time: accumulation, distribution, and exchange-bound transfers from the top Cosmos Hub holders.", path: "/signals/whales", keywords: ["ATOM whales", "Cosmos Hub whale tracker", "large ATOM transfers"] });

type StakeRow = { delegator: string; validator: string; valName: string; logo: string | null; atom: number; time: string };

function StakeTable({ title, rows, accent, verb }: { title: string; rows: StakeRow[]; accent: string; verb: string }) {
  return (
    <IntelCard
      title={title}
      meta="largest, recent"
      shareFilename={`bedrock-${verb.toLowerCase().replace(/\s+/g, "-")}`}
      share={rows.length ? {
        title: `${title} · Cosmos HUB`,
        subtitle: `Largest recent ${verb.toLowerCase()} moves`,
        big: fmtCompact(rows.reduce((s, r) => s + r.atom, 0)),
        unit: "ATOM",
        context: "Largest recent staking moves, live from the Bedrock indexer.",
        body: <ShareBars rows={rows.slice(0, 8).map((r) => ({ label: shortAddr(r.delegator), value: r.atom, color: accent, note: `· ${r.valName}` }))} />,
      } : undefined}
    >
      <table className="broadsheet mcols-3">
        <thead>
          <tr>
            <th style={{ width: 44 }}>Ago</th>
            <th>Wallet</th>
            <th>{verb}</th>
            <th style={{ textAlign: "right" }}>ATOM</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.delegator}-${r.time}-${i}`}>
              <td className="data" style={{ fontSize: 11, color: "var(--ink-40)" }}>{ago(r.time)}</td>
              <td className="data" style={{ fontSize: 12 }}><AddrCell a={r.delegator} /></td>
              <td>
                <ValidatorLink oper={r.validator} className="cp-click" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 600, color: "var(--ink)", borderRadius: 3 }}>
                  <ValidatorAvatar operator={r.validator} logo={r.logo} moniker={r.valName} size={16} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderBottom: "1px dotted var(--ink-20)" }}>{r.valName}</span>
                </ValidatorLink>
              </td>
              <td className="num" style={{ fontWeight: 700, color: accent, textAlign: "right" }}>{fmtCompact(r.atom)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </IntelCard>
  );
}

export default async function SignalsWhales({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const win = resolveWindow((await searchParams)?.w ?? "");
  const FEED_LIMIT = 250;
  const [{ flows, live }, staking, sp, vals, logos] = await Promise.all([
    getFlowFeed({ minAtom: 10000, limit: FEED_LIMIT, hours: win.hours }),
    getStakingRecent(1000, 200),
    getSellPressure(win.days, win.days >= 30 ? 7 : 1),
    getLiveValidators(0),
    getValidatorLogoMap(),
  ]);

  // Both labels below name what came back, not what ?w= asked for.
  //
  // The feed is capped at FEED_LIMIT rows, newest first, so during a busy spell
  // it can run out well before the window does. When the cap is hit we only saw
  // back to the oldest row; when it is not, we saw the whole window.
  const feedCapped = flows.length >= FEED_LIMIT;
  const feedOldest = flows.length ? Math.min(...flows.map((f) => new Date(f.time).getTime())) : Date.now();
  const feedLabel = feedCapped ? windowLabel((Date.now() - feedOldest) / 3600_000) : windowLabel(win.hours);

  // Sell pressure returns whole buckets only, so its real depth is the buckets
  // it returned, which is fewer than requested while the backfill is open.
  const spDays = sp.series.length * (sp.bucket_days || 1);
  const spLabel = spDays > 0 ? windowLabel(spDays * 24) : "no window";

  const metaByOper = new Map(vals.validators.map((v) => [v.operator, v.moniker]));
  const label = (oper: string) => metaByOper.get(oper) ?? `${oper.slice(0, 14)}…`;

  // Both intel cards render the same number of rows so the two boxes stay the
  // same height (symmetric side by side).
  const WHALE_ROWS = 10;
  const top = [...flows].sort((a, b) => b.amount_atom - a.amount_atom).slice(0, WHALE_ROWS);

  const toStakeRows = (type: "delegate" | "unbond") =>
    staking.events
      .filter((e) => e.type === type)
      .sort((a, b) => b.amount_atom - a.amount_atom)
      .slice(0, 10)
      .map((e) => ({ delegator: e.delegator, validator: e.validator, valName: label(e.validator), logo: logos[e.validator] ?? null, atom: e.amount_atom, time: e.time }));
  const delegations = toStakeRows("delegate");
  const undelegations = toStakeRows("unbond");

  const largest = top.length ? top[0].amount_atom : 0;
  const totalVol = flows.reduce((s, f) => s + f.amount_atom, 0);
  const avg = flows.length ? totalVol / flows.length : 0;

  const anything = top.length > 0 || delegations.length > 0 || undelegations.length > 0 || sp.top_senders.length > 0;

  return (
    <ConsolePage>
      <ConsoleModule lead dot="var(--hub-2)" title="Signals · Whales" meta="biggest movers · live from the indexer">
        <div className="console-grid">
          <div className="span-4"><MetricCard label="Largest transfer" value={fmtCompact(largest)} unit="ATOM" series={[]} color="var(--hub)" footnote="biggest single flow" /></div>
          <div className="span-4"><MetricCard label="Whale moves" value={String(flows.length)} series={[]} color="var(--hub-2)" footnote={`≥ 10k ATOM · last ${feedLabel}`} /></div>
          <div className="span-4"><MetricCard label="Avg move" value={fmtCompact(avg)} unit="ATOM" series={[]} color="var(--sand)" footnote="mean captured size" /></div>

          {!anything && (
            <div className="span-12">
              <Soon title="Whale watch" note={live ? "No large moves in the most recent blocks yet. The indexer captures each block; whales surface here as they happen." : "Connecting to the indexer…"} />
            </div>
          )}

          {/* Biggest staking moves */}
          {delegations.length > 0 && (
            <div className="span-6"><StakeTable title="Biggest delegations" rows={delegations} accent="var(--moss)" verb="Staked to" /></div>
          )}
          {undelegations.length > 0 && (
            <div className="span-6"><StakeTable title="Biggest undelegations" rows={undelegations} accent="var(--iron)" verb="Unstaked from" /></div>
          )}

          {/* Window control for the two intel cards below (depositors + transfers) */}
          <div className="span-12" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, borderTop: "1px solid var(--card-line)", paddingTop: 16, marginTop: 4 }}>
            <span className="data" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ink-40)" }}>Exchange deposits &amp; largest transfers</span>
            <WhaleWindow />
          </div>

          {/* Biggest exchange depositors (sell-intent), from the sell-pressure rollup */}
          {sp.top_senders.length > 0 && (
            <div className="span-6">
              <IntelCard title="Biggest exchange depositors" meta={`sell-intent · last ${spLabel}`} shareFilename="bedrock-whale-depositors"
                share={{
                  title: "Biggest ATOM exchange depositors · Cosmos HUB",
                  subtitle: `Sell intent · last ${spLabel}`,
                  big: fmtCompact(sp.top_senders.slice(0, WHALE_ROWS).reduce((acc, x) => acc + x.atom, 0)),
                  unit: `ATOM across the top ${Math.min(WHALE_ROWS, sp.top_senders.length)}`,
                  context: "Depositing to an exchange is the act before a sale, so this is sell intent, not a confirmed sale.",
                  body: <ShareBars rows={sp.top_senders.slice(0, 8).map((x) => ({ label: shortAddr(x.addr), value: x.atom, color: "var(--iron)", note: `· ${x.count} deposits` }))} />,
                }}>
                <table className="broadsheet mcols-3">
                  <thead>
                    <tr><th style={{ width: 28 }}>#</th><th>Wallet</th><th style={{ textAlign: "right" }} className="mhide3">Deposits</th><th style={{ textAlign: "right" }}>ATOM</th></tr>
                  </thead>
                  <tbody>
                    {sp.top_senders.slice(0, WHALE_ROWS).map((s, i) => (
                      <tr key={s.addr}>
                        <td className="num" style={{ color: "var(--ink-40)" }}>{i + 1}</td>
                        <td className="data" style={{ fontSize: 12 }}><AddrCell a={s.addr} /></td>
                        <td className="num mhide3" style={{ textAlign: "right", color: "var(--ink-60)" }}>{s.count}</td>
                        <td className="num" style={{ textAlign: "right", fontWeight: 700, color: "var(--iron)" }}>{fmtCompact(s.atom)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </IntelCard>
            </div>
          )}

          {/* Largest transfers */}
          {top.length > 0 && (
            <div className="span-6">
              <IntelCard title="Largest transfers" meta={`≥ 10k ATOM · last ${feedLabel}`} shareFilename="bedrock-whale-transfers"
                share={{
                  title: "Largest ATOM transfers · Cosmos HUB",
                  subtitle: `10k ATOM or more · last ${feedLabel}`,
                  big: String(flows.length), unit: "whale moves",
                  context: "Every transfer of 10k ATOM or more the indexer captured in the window it actually covers.",
                  body: <ShareBars rows={top.slice(0, 8).map((f) => ({ label: shortAddr(f.from), value: f.amount_atom, note: `· → ${shortAddr(f.to)}` }))} />,
                }}>
                <table className="broadsheet mcols-3">
                  <thead>
                    <tr><th style={{ width: 44 }}>Ago</th><th>From</th><th>To</th><th style={{ textAlign: "right" }}>ATOM</th></tr>
                  </thead>
                  <tbody>
                    {top.map((f, i) => (
                      <tr key={`${f.tx_hash}-${i}`}>
                        <td className="data" style={{ fontSize: 11, color: "var(--ink-40)" }}>{ago(f.time)}</td>
                        <td className="data" style={{ fontSize: 12 }}><AddrCell a={f.from} /></td>
                        <td className="data" style={{ fontSize: 12 }}><AddrCell a={f.to} /></td>
                        <td className="num" style={{ fontWeight: 700, color: "var(--ink)", textAlign: "right" }}>{fmtCompact(f.amount_atom)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </IntelCard>
            </div>
          )}
        </div>
      </ConsoleModule>
    </ConsolePage>
  );
}
