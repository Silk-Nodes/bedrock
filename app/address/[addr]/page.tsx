// /address/[addr] · canonical per-wallet profile. The full-page deep-dive that
// complements the AddressPanel drawer (which stays the quick-peek). It renders
// the exact payload the drawer already assembles from /api/address/[addr]:
// live position, per-validator delegations, reward-claim + exchange-flow
// behaviour, and the recent activity feed. Reusable for ANY wallet, and the
// /whales board links its rows here.
//
// HISTORY DEPTH, STATED NOT HIDDEN: the activity feed and flow summary are
// bounded by the indexer's continuous window (2026-06-08 onward; the 2024-2026
// backfill middle is still filling). Current position is live from chain. The
// page labels the activity window so nobody reads a partial history as a
// lifetime one.

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ConsolePage, ConsoleModule } from "@/components/console/Console";
import { StatCard } from "@/components/console/StatCard";
import { AddressLink } from "@/components/address/AddressLink";
import { CopyButton } from "@/components/CopyButton";
import { WatchStar } from "@/components/WatchStar";
import { seo } from "@/lib/seo";

export const revalidate = 120;

const RE = /^cosmos1[0-9a-z]{38,}$/;

type Deleg = { validator: string; oper: string; atom: number; pct: number };
type Activity = {
  time: string; height: number; tx_hash: string; kind: string;
  amount_uatom: string; counterparty: string; is_ibc: boolean;
  cp_label: string; cp_cat: string;
};
type Profile = {
  address: string; live: boolean; block?: number;
  price_usd?: number; total_atom?: number; total_usd?: number;
  staked?: number; liquid?: number; unbonding?: number; rewards?: number;
  top_validator_pct?: number;
  delegations?: Deleg[];
  activity?: Activity[]; activity_live?: boolean;
  flow_summary?: { received: number; sent: number; net_transfer: number; delegated: number; undelegated: number; claimed: number; moves: number } | null;
  exchange_flow?: { in: number; out: number; net: number } | null;
  label?: string | null; category?: string | null;
  flow_class?: { cls: string; label: string; cex_out: number; cex_in: number } | null;
};

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "127.0.0.1:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

async function getProfile(addr: string): Promise<Profile | null> {
  try {
    const res = await fetch(`${await origin()}/api/address/${addr}`, { next: { revalidate: 120 } });
    if (!res.ok) return null;
    return (await res.json()) as Profile;
  } catch {
    return null;
  }
}

function fmt(n?: number): string {
  return Math.round(n ?? 0).toLocaleString("en-US");
}
function compact(n?: number): string {
  const a = Math.abs(n ?? 0);
  if (a >= 1_000_000) return `${((n ?? 0) / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `${Math.round((n ?? 0) / 1_000)}k`;
  return `${Math.round(n ?? 0)}`;
}
function shortAddr(a: string): string {
  return `${a.slice(0, 12)}…${a.slice(-6)}`;
}

export async function generateMetadata({ params }: { params: Promise<{ addr: string }> }) {
  const { addr } = await params;
  if (!RE.test(addr)) return seo({ title: "Address", description: "ATOM wallet profile on the Cosmos Hub.", path: `/address/${addr}` });
  return seo({
    title: `${shortAddr(addr)} · ATOM wallet`,
    description: `Live Cosmos Hub position for ${shortAddr(addr)}: staked, liquid, rewards, delegations, and recent staking and exchange activity, from the Bedrock indexer.`,
    path: `/address/${addr}`,
    keywords: ["ATOM wallet", "Cosmos Hub address", "track ATOM holder"],
    ogImage: `/og/address/${addr}`,
  });
}

const KIND: Record<string, { label: string; color: string }> = {
  delegate: { label: "Delegated", color: "var(--moss)" },
  unbond: { label: "Unbonded", color: "var(--iron)" },
  redelegate: { label: "Redelegated", color: "var(--hub-2)" },
  reward_withdraw: { label: "Claimed reward", color: "var(--sand)" },
  transfer_in: { label: "Received", color: "var(--moss)" },
  transfer_out: { label: "Sent", color: "var(--iron)" },
};

export default async function AddressProfile({ params }: { params: Promise<{ addr: string }> }) {
  const { addr } = await params;
  if (!RE.test(addr)) notFound();
  const p = await getProfile(addr);

  if (!p || !p.live) {
    return (
      <ConsolePage>
        <ConsoleModule lead title="Wallet" meta={shortAddr(addr)}>
          <div style={{ padding: 24, color: "var(--ink-60)", fontSize: 14 }}>
            No live position found for this address, or the chain is unreachable. It may hold no ATOM.
          </div>
        </ConsoleModule>
      </ConsolePage>
    );
  }

  const isCex = p.category === "cex" || p.category === "cex_ops" || p.category === "cex_custody";
  const acts = p.activity ?? [];

  return (
    <ConsolePage>
      {/* Header */}
      <ConsoleModule lead title={p.label ? p.label : "Wallet"} meta={isCex ? "exchange-controlled · customer ATOM" : "live position · Cosmos Hub"}>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, padding: "4px 2px 18px" }}>
          <span className="data" style={{ fontSize: 13, color: "var(--ink-80)" }}>{addr}</span>
          <CopyButton text={addr} />
          <WatchStar type="address" id={addr} label={p.label ?? undefined} size={15} />
          {p.block ? (
            <span className="data" style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-40)", letterSpacing: 1 }}>
              BLOCK {p.block.toLocaleString("en-US")}
            </span>
          ) : null}
        </div>

        {/* Position */}
        <div className="grid12" style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 }}>
          <div className="span-4" style={{ gridColumn: "span 4" }}>
            <StatCard label="Total ATOM" value={fmt(p.total_atom)} unit="ATOM" sub={p.total_usd ? `$${fmt(p.total_usd)}` : ""} accent="var(--hub)" />
          </div>
          <div className="span-2" style={{ gridColumn: "span 2" }}>
            <StatCard label="Staked" value={compact(p.staked)} sub={p.total_atom ? `${Math.round(((p.staked ?? 0) / p.total_atom) * 100)}% of stack` : ""} accent="var(--moss)" />
          </div>
          <div className="span-2" style={{ gridColumn: "span 2" }}>
            <StatCard label="Liquid" value={compact(p.liquid)} sub="unstaked" accent="var(--sand)" />
          </div>
          <div className="span-2" style={{ gridColumn: "span 2" }}>
            <StatCard label="Unbonding" value={compact(p.unbonding)} sub="21-day queue" accent="var(--iron)" />
          </div>
          <div className="span-2" style={{ gridColumn: "span 2" }}>
            <StatCard label="Rewards" value={compact(p.rewards)} sub="claimable now" accent="var(--hub-2)" />
          </div>
        </div>
      </ConsoleModule>

      {/* Behaviour: reward + exchange, from the indexed window */}
      <ConsoleModule title="Behaviour" meta="recent indexed window · from 2026-06-08">
        <div className="grid12" style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 }}>
          <div className="span-3" style={{ gridColumn: "span 3" }}>
            <StatCard label="Claimed rewards" value={compact(p.flow_summary?.claimed)} unit="ATOM" sub="in window" accent="var(--sand)" />
          </div>
          <div className="span-3" style={{ gridColumn: "span 3" }}>
            <StatCard label="Delegated" value={compact(p.flow_summary?.delegated)} unit="ATOM" sub={`restake + new · ${p.flow_summary?.undelegated ? `${compact(p.flow_summary.undelegated)} unbonded` : "0 unbonded"}`} accent="var(--moss)" />
          </div>
          <div className="span-3" style={{ gridColumn: "span 3" }}>
            <StatCard label="To exchanges" value={compact(p.exchange_flow?.out)} unit="ATOM" sub="sell-side deposits" accent="var(--iron)" />
          </div>
          <div className="span-3" style={{ gridColumn: "span 3" }}>
            <StatCard label="From exchanges" value={compact(p.exchange_flow?.in)} unit="ATOM" sub="withdrawals in" accent="var(--moss)" />
          </div>
        </div>
        {p.flow_class ? (
          <div style={{ marginTop: 12, padding: "10px 14px", border: "1px solid var(--card-line)", background: "var(--paper-2)", borderRadius: 4, fontSize: 13, color: "var(--ink-80)" }}>
            Net-flow read: <strong style={{ color: "var(--ink)" }}>{p.flow_class.label}</strong>
            <span className="data" style={{ marginLeft: 10, color: "var(--ink-40)", fontSize: 11 }}>
              {compact(p.flow_class.cex_out)} to CEX · {compact(p.flow_class.cex_in)} from CEX
            </span>
          </div>
        ) : null}
      </ConsoleModule>

      {/* Staking posture */}
      {p.delegations && p.delegations.length > 0 ? (
        <ConsoleModule title="Staking posture" meta={`${p.delegations.length} validator${p.delegations.length === 1 ? "" : "s"} · top ${p.top_validator_pct ?? 0}%`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {p.delegations.slice(0, 12).map((d) => (
              <div key={d.oper} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 4px", borderBottom: "1px solid var(--card-line)" }}>
                <span style={{ flex: 1, fontSize: 13, color: "var(--ink)" }}>{d.validator}</span>
                <span style={{ width: 90, textAlign: "right", fontSize: 13, color: "var(--ink-80)", fontVariantNumeric: "tabular-nums" }}>{fmt(d.atom)}</span>
                <span className="data" style={{ width: 52, textAlign: "right", fontSize: 11, color: "var(--ink-40)" }}>{d.pct}%</span>
              </div>
            ))}
          </div>
        </ConsoleModule>
      ) : null}

      {/* Activity feed */}
      <ConsoleModule title="Recent activity" meta={acts.length ? `${acts.length} events · newest first` : "no indexed activity yet"}>
        {acts.length ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {acts.slice(0, 60).map((e, i) => {
              const k = KIND[e.kind] ?? { label: e.kind, color: "var(--ink-60)" };
              const amt = Number(e.amount_uatom) / 1e6;
              const cp = e.cp_cat === "validator" || e.cp_label ? e.cp_label : shortAddr(e.counterparty);
              const cpIsAddr = e.counterparty?.startsWith("cosmos1");
              return (
                <div key={`${e.tx_hash}-${i}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 4px", borderBottom: "1px solid var(--card-line)" }}>
                  <span style={{ width: 132, fontSize: 12, fontWeight: 500, color: k.color }}>{k.label}</span>
                  <span style={{ width: 96, textAlign: "right", fontSize: 13, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{compact(amt)}</span>
                  <span style={{ flex: 1, fontSize: 12, color: "var(--ink-60)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {cpIsAddr ? <AddressLink addr={e.counterparty}>{cp}</AddressLink> : cp}
                    {e.is_ibc ? <span className="data" style={{ marginLeft: 6, fontSize: 10, color: "var(--hub-2)" }}>IBC</span> : null}
                  </span>
                  <span className="data" style={{ width: 96, textAlign: "right", fontSize: 10.5, color: "var(--ink-40)" }}>
                    {new Date(e.time).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: 20, color: "var(--ink-60)", fontSize: 13 }}>
            No activity in the indexed window. This wallet&rsquo;s ATOM may predate continuous coverage (from 2026-06-08).
          </div>
        )}
      </ConsoleModule>
    </ConsolePage>
  );
}
