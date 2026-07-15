"use client";

// Explore · type any cosmos1 address, get its live on-chain position
// (staked / liquid / unbonding / rewards), delegations, and the indexer
// activity timeline. Reads /api/address/[addr]. URL-driven (?addr=) so any
// lookup is shareable. No Mintscan needed.

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AddressLink } from "@/components/address/AddressLink";

type Deleg = { validator: string; oper: string; atom: number; pct: number };
type Unb = { validator: string; oper: string; atom: number; completion: string };
type Activity = { time: string; height: number; tx_hash: string; kind: string; amount_uatom: string; counterparty: string; is_ibc: boolean };
type AddrData = {
  address: string; live: boolean;
  total_atom?: number; total_usd?: number;
  staked?: number; liquid?: number; unbonding?: number; rewards?: number;
  top_validator_pct?: number;
  delegations?: Deleg[]; unbonding_entries?: Unb[];
  activity?: Activity[]; activity_live?: boolean;
};

const RE = /^cosmos1[0-9a-z]{38,}$/;
function fmtN(n?: number): string { return n === undefined ? "·" : Math.round(n).toLocaleString("en-US"); }
function fmtCompact(n?: number): string {
  if (n === undefined) return "·";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return Math.round(n).toString();
}
const KIND: Record<string, string> = { delegate: "Delegated", unbond: "Undelegated", redelegate: "Redelegated", reward_withdraw: "Claimed reward", transfer_in: "Received", transfer_out: "Sent" };
function kindColor(k: string): string {
  if (k === "delegate" || k === "transfer_in" || k === "reward_withdraw") return "var(--moss)";
  if (k === "unbond" || k === "transfer_out") return "var(--iron)";
  return "var(--hub)";
}
function atomU(s: string): string { const n = Number(s) / 1e6; return Number.isFinite(n) ? (Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(2)) : s; }
function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  if (s < 2592000) return `${Math.round(s / 86400)}d`;
  return `${Math.round(s / 2592000)}mo`;
}
function shortCp(a: string): string {
  if (!a) return "·";
  if (a.startsWith("cosmosvaloper")) return `${a.slice(0, 15)}…`;
  return `${a.slice(0, 10)}…${a.slice(-4)}`;
}

function Tile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: "var(--paper)", padding: "14px 16px" }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, color: color ?? "var(--ink)", letterSpacing: "-0.5px" }}>{value}</span>
        <span className="data" style={{ fontSize: 10, color: "var(--ink-50)" }}>ATOM</span>
      </div>
    </div>
  );
}

export function ExploreClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const initial = sp.get("addr") ?? "";
  const [q, setQ] = useState(initial);
  const [data, setData] = useState<AddrData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const lookup = useCallback((addr: string) => {
    if (!RE.test(addr)) { setErr("Enter a valid cosmos1… address."); setData(null); return; }
    setErr(""); setLoading(true); setData(null);
    fetch(`/api/address/${addr}`)
      .then((r) => r.json())
      .then((d: AddrData) => { setData(d); setLoading(false); })
      .catch(() => { setErr("Lookup failed. Try again."); setLoading(false); });
  }, []);

  useEffect(() => { if (initial) lookup(initial); }, [initial, lookup]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const a = q.trim();
    router.replace(a ? `/explore?addr=${a}` : "/explore");
    lookup(a);
  };

  // Scale delegation bars relative to the largest, so small/even stakes stay readable.
  const maxDel = data?.delegations?.length ? Math.max(...data.delegations.map((d) => d.pct)) : 1;

  return (
    <div>
      {/* Search */}
      <form onSubmit={submit} style={{ display: "flex", gap: 10, marginBottom: 22, maxWidth: 720 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="cosmos1…"
          spellCheck={false}
          className="data"
          style={{ flex: 1, padding: "11px 14px", background: "var(--paper-2)", border: "1px solid var(--ink-20)", color: "var(--ink)", fontSize: 13 }}
        />
        <button type="submit" style={{ padding: "11px 20px", background: "var(--hub)", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", letterSpacing: 0.3 }}>
          Look up
        </button>
      </form>

      {err && <div style={{ color: "var(--iron)", fontSize: 13, marginBottom: 16 }}>{err}</div>}
      {loading && <div style={{ color: "var(--ink-60)", fontSize: 13 }}>Reading on-chain…</div>}

      {!q && !data && !loading && (
        <div style={{ color: "var(--ink-60)", fontSize: 14, lineHeight: 1.6, maxWidth: 640 }}>
          Type any Cosmos Hub address to see its live position, staked, liquid, unbonding, and rewards, the validators it
          delegates to, and its recent on-chain activity from the Bedrock indexer. No third-party explorer needed.
        </div>
      )}

      {data && !data.live && !loading && (
        <div style={{ color: "var(--ink-60)", fontSize: 14 }}>
          No on-chain position found for <span className="data">{data.address}</span>. It may be a fresh or empty account.
        </div>
      )}

      {data && data.live && (
        <div>
          {/* Hero */}
          <div style={{ marginBottom: 20 }}>
            <div className="data" style={{ fontSize: 12, color: "var(--ink-60)", marginBottom: 6, wordBreak: "break-all" }}>{data.address}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 44, letterSpacing: "-0.025em", color: "var(--ink)" }}>{fmtN(data.total_atom)}</span>
              <span className="data" style={{ fontSize: 13, color: "var(--ink-60)" }}>ATOM · ${fmtCompact(data.total_usd)}</span>
            </div>
          </div>

          {/* Buckets */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "var(--ink-15)", border: "1px solid var(--ink-15)", marginBottom: 24 }}>
            <Tile label="Staked" value={fmtCompact(data.staked)} color="var(--hub)" />
            <Tile label="Liquid" value={fmtCompact(data.liquid)} />
            <Tile label="Unbonding" value={fmtCompact(data.unbonding)} color="var(--iron)" />
            <Tile label="Rewards" value={fmtCompact(data.rewards)} color="var(--moss)" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
            {/* Delegations */}
            <div>
              <div className="eyebrow" style={{ marginBottom: 10 }}>Delegations</div>
              {!data.delegations?.length ? (
                <div style={{ fontSize: 13, color: "var(--ink-50)" }}>No active delegations.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.delegations.slice(0, 10).map((d) => (
                    <div key={d.oper}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-80)", marginBottom: 4 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>{d.validator}</span>
                        <span className="data" style={{ color: "var(--ink-50)" }}>{fmtN(d.atom)} · {d.pct}%</span>
                      </div>
                      <div className="gbar" style={{ height: 5 }}><div className="gbar-fill" style={{ width: `${Math.max(4, (d.pct / maxDel) * 100)}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity */}
            <div>
              <div className="eyebrow" style={{ marginBottom: 10 }}>Recent activity</div>
              {!data.activity?.length ? (
                <div style={{ fontSize: 13, color: "var(--ink-50)" }}>
                  {data.activity_live === false ? "Activity index connecting…" : "No indexed activity yet (the indexer is backfilling history)."}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {data.activity.slice(0, 25).map((e, i) => (
                    <div key={`${e.tx_hash}-${i}`} style={{ display: "grid", gridTemplateColumns: "84px 1fr auto auto", alignItems: "center", gap: 10, padding: "7px 0", borderTop: i === 0 ? "none" : "1px solid var(--ink-10)" }}>
                      <span style={{ fontSize: 12, color: kindColor(e.kind), fontWeight: 600 }}>{KIND[e.kind] ?? e.kind}</span>
                      <span className="data" style={{ fontSize: 11, color: "var(--ink-60)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.counterparty.startsWith("cosmos1") && !e.counterparty.startsWith("cosmosvaloper")
                          ? <AddressLink addr={e.counterparty} style={{ color: "var(--ink-60)" }}>{shortCp(e.counterparty)}</AddressLink>
                          : shortCp(e.counterparty)}{e.is_ibc ? " · IBC" : ""}
                      </span>
                      <span className="data" style={{ fontSize: 12, color: "var(--ink-80)", textAlign: "right" }}>{atomU(e.amount_uatom)}</span>
                      <span className="data" style={{ fontSize: 10, color: "var(--ink-40)", textAlign: "right", minWidth: 34 }}>{ago(e.time)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
