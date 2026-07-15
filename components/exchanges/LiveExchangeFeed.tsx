"use client";

// Live exchange flow ticker. Polls the public flow-feed proxy every 15s and
// renders recent deposits (into an exchange) and withdrawals (out of one),
// classified only by VERIFIED exchange labels. New rows flash in. Honest by
// construction: a flow is shown as a deposit/withdrawal only when one side is a
// verified exchange wallet; until more hot wallets are confirmed, that set is
// the verified custody/ops/historical clusters.

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AddressLink } from "@/components/address/AddressLink";
import type { LabeledFlow } from "@/lib/indexer";

function fmtAtom(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(2);
}
function ago(iso: string, now: number): string {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}
function short(a: string): string {
  if (!a) return "·";
  if (a.startsWith("cosmosvaloper")) return `${a.slice(0, 15)}…`;
  return `${a.slice(0, 10)}…${a.slice(-4)}`;
}
function flowKey(f: LabeledFlow): string {
  return `${f.tx_hash}-${f.from}-${f.to}-${f.amount_atom}`;
}

const POLL_MS = 15_000;

export function LiveExchangeFeed({ exchangeOnly = true }: { exchangeOnly?: boolean }) {
  const sp = useSearchParams();
  const ex = sp.get("ex") ?? "";
  const dir = sp.get("dir") ?? "";
  const min = sp.get("min") ?? "100";

  const [flows, setFlows] = useState<LabeledFlow[]>([]);
  const [live, setLive] = useState<boolean | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const seen = useRef<Set<string>>(new Set());
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    // Reset the "seen" set when filters change so flash highlighting is correct.
    seen.current = new Set();
    async function pull() {
      try {
        const params = new URLSearchParams({ exchange: exchangeOnly ? "1" : "0", min, limit: "80" });
        if (ex) params.set("entity", ex);
        if (dir) params.set("dir", dir);
        const res = await fetch(`/api/flows/feed?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) { if (alive) setLive(false); return; }
        const j = (await res.json()) as { live: boolean; flows: LabeledFlow[] };
        if (!alive) return;
        setLive(j.live);
        const newKeys = new Set<string>();
        for (const f of j.flows) {
          const k = flowKey(f);
          if (!seen.current.has(k)) { newKeys.add(k); seen.current.add(k); }
        }
        setFlows(j.flows);
        if (newKeys.size && seen.current.size > newKeys.size) {
          setFresh(newKeys);
          setTimeout(() => alive && setFresh(new Set()), 1800);
        }
      } catch {
        if (alive) setLive(false);
      }
    }
    pull();
    const poll = setInterval(pull, POLL_MS);
    const tick = setInterval(() => alive && setNow(Date.now()), 1000);
    return () => { alive = false; clearInterval(poll); clearInterval(tick); };
  }, [exchangeOnly, min, ex, dir]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span
          aria-hidden
          style={{
            width: 7, height: 7, borderRadius: "50%",
            background: live ? "var(--moss)" : "var(--ink-40)",
            boxShadow: live ? "0 0 8px var(--moss)" : "none",
            animation: live ? "pulse 2s ease-in-out infinite" : "none",
          }}
        />
        <span className="data" style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "var(--ink-60)" }}>
          {live === null ? "Connecting…" : live ? "Live · refreshes every 15s" : "Indexer unreachable"}
        </span>
      </div>

      {flows.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--ink-60)", lineHeight: 1.6, maxWidth: 720 }}>
          {live === false
            ? "Connecting to the indexer…"
            : "No verified exchange flow in the recent window yet. The feed classifies a transfer as a deposit or withdrawal only when one side is a verified exchange wallet, so it fills out as more hot wallets are confirmed and as the indexer processes new blocks."}
        </div>
      ) : (
        <table className="broadsheet">
          <thead>
            <tr>
              <th style={{ width: 48 }}>Ago</th>
              <th style={{ width: 104 }}>Action</th>
              <th>Exchange</th>
              <th>Counterparty</th>
              <th style={{ textAlign: "right" }}>ATOM</th>
            </tr>
          </thead>
          <tbody>
            {flows.map((f) => {
              const isDep = f.action === "deposit";
              const isWd = f.action === "withdrawal";
              const isReward = f.action === "reward";
              const inflow = isDep || isReward; // counterparty is the sender
              const tone = isDep ? "var(--iron)" : isWd ? "var(--moss)" : isReward ? "var(--hub)" : "var(--ink-60)";
              const actionLabel = isDep ? "Deposit" : isWd ? "Withdrawal" : isReward ? "Reward" : f.action === "internal" ? "Internal" : f.kind;
              const counterparty = inflow ? f.from : f.to;
              const cpLabel = inflow ? f.from_label : f.to_label;
              const k = flowKey(f);
              return (
                <tr
                  key={k}
                  style={{
                    background: fresh.has(k) ? "color-mix(in srgb, var(--hub) 10%, transparent)" : "transparent",
                    transition: "background 1.4s ease",
                  }}
                >
                  <td className="data" style={{ fontSize: 11, color: "var(--ink-60)" }}>{ago(f.time, now)}</td>
                  <td>
                    <span className="data" style={{ fontSize: 11, fontWeight: 700, color: tone, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {actionLabel}
                    </span>
                  </td>
                  <td className="data" style={{ fontSize: 12, color: "var(--ink)", fontWeight: 600 }}>{f.entity || "·"}</td>
                  <td className="data" style={{ fontSize: 12 }}>
                    {cpLabel ? (
                      <span style={{ color: "var(--ink-80)" }}>{cpLabel}</span>
                    ) : counterparty.startsWith("cosmos1") && !counterparty.startsWith("cosmosvaloper") ? (
                      <AddressLink addr={counterparty} style={{ color: "var(--ink-60)" }}>{short(counterparty)}</AddressLink>
                    ) : (
                      <span style={{ color: "var(--ink-60)" }}>{short(counterparty)}</span>
                    )}
                  </td>
                  <td className="num" style={{ fontWeight: 600, color: "var(--ink)" }}>{fmtAtom(f.amount_atom)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
