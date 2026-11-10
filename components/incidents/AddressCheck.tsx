"use client";

// "Was my wallet moved?" on /incidents/keplr. Posts the address to
// /api/incidents/keplr/check (never a URL), shows the answer, keeps nothing.

import { useState } from "react";

type ChainCheck = {
  chain: string;
  address: string;
  state: "swept" | "returned" | "elsewhere" | "nothing" | "unread";
  swept: { count: number; first: string | null; amounts: string[] };
  elsewhere: { count: number; recipients: string[]; amounts: string[] };
  returned: { count: number; amounts: string[] };
  staking: {
    rewardsTo: "recovery" | "self" | "other" | null;
    unstakes: { count: number; first: string | null; amounts: string[] };
    unbonding: { amounts: string[]; completes: string | null };
    staked: string[];
  } | null;
};
type Result = { ok: true; injectiveOnly: boolean; chains: ChainCheck[]; checkedAt: string } | { ok: false; error: string };

const day = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} ${d.getUTCDate()}`;
};
const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}` : xs[0] ?? "");

// The finding gets one line in its colour; caveats ("check that you made
// them", "not who signed it") are notes in neutral ink, never in the
// reassuring green of the finding.
type Note = { text: string; warn?: boolean };
function summary(r: Extract<Result, { ok: true }>): { lead: string; notes: Note[]; tone: string } {
  const swept = r.chains.filter((c) => c.swept.count > 0).map((c) => c.chain);
  const returned = r.chains.filter((c) => c.returned.count > 0).map((c) => c.chain);
  const elsewhere = r.chains.filter((c) => c.elsewhere.count > 0).map((c) => c.chain);
  const unread = r.chains.filter((c) => c.state === "unread").map((c) => c.chain);
  const parts: string[] = [];
  const notes: Note[] = [];
  let tone = "var(--ink)";
  if (swept.length) {
    parts.push(`Web3Auth moved funds from this address into its recovery wallet on ${list(swept)}.`);
    tone = "var(--moss-text)";
  }
  if (returned.length) parts.push(`Some has come back to you on ${list(returned)}.`);
  if (elsewhere.length) {
    if (swept.length) notes.push({ text: `There were also transfers to other addresses since Nov 5 on ${list(elsewhere)}. Check that you made them.` });
    else {
      parts.push(`There were transfers from this address to other addresses since Nov 5 on ${list(elsewhere)}. Check that you made them.`);
      tone = "var(--sand)";
    }
  }
  const unstaked = r.chains.filter((c) => (c.staking?.unstakes.count ?? 0) > 0).map((c) => c.chain);
  if (unstaked.length) notes.push({ text: `An unstake was started on ${list(unstaked)} since Nov 5. The chain shows it happened, not who signed it.` });
  const strangerRewards = r.chains.filter((c) => c.staking?.rewardsTo === "other").map((c) => c.chain);
  if (strangerRewards.length) {
    notes.push({ text: `On ${list(strangerRewards)} staking rewards are set to go to an address that is neither yours nor the recovery wallet.`, warn: true });
  }
  if (!parts.length) parts.push(unread.length ? "Nothing has moved from this address since Nov 5 on the chains we could read." : "Nothing has moved from this address since Nov 5 on any chain we checked.");
  if (unread.length) notes.push({ text: `${list(unread)} could not be read right now, try again in a minute.`, warn: true });
  return { lead: parts.join(" "), notes, tone };
}

// `inline`: sits in the page's answer column, so no rule or top margin of its own.
export function AddressCheck({ inline = false }: { inline?: boolean }) {
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim() || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/incidents/keplr/check", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: address.trim() }),
      });
      setResult((await res.json()) as Result);
    } catch {
      setResult({ ok: false, error: "The check could not reach Bedrock. Try again in a moment." });
    } finally {
      setBusy(false);
    }
  };

  // A chain is worth a row if something moved, or its staking changed:
  // rewards redirected, an unstake, or tokens unbonding right now.
  const stakingNews = (c: ChainCheck) =>
    !!c.staking && (c.staking.rewardsTo === "recovery" || c.staking.rewardsTo === "other" || c.staking.unstakes.count > 0 || c.staking.unbonding.amounts.length > 0);
  const shown = result?.ok ? result.chains.filter((c) => c.state !== "nothing" || stakingNews(c)) : [];
  const s = result?.ok ? summary(result) : null;

  return (
    <section style={inline ? { marginTop: 28 } : { marginTop: 28, paddingTop: 22, borderTop: "1px solid var(--ink-10)" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: inline ? 22 : 24, letterSpacing: "-0.01em", margin: 0, color: "var(--ink)" }}>Was my wallet moved?</h2>
      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-60)", margin: "6px 0 14px", maxWidth: 720 }}>
        Paste your Keplr address. One address covers every chain, because a social login key has the same address on all of them. For Injective, paste your inj1 address.
      </p>
      <form onSubmit={submit} style={{ display: "flex", flexWrap: "wrap", gap: 8, maxWidth: 720 }}>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="cosmos1… or osmo1…"
          aria-label="Wallet address"
          spellCheck={false}
          autoComplete="off"
          className="data"
          style={{ flex: "1 1 200px", minWidth: 0, fontSize: 13, padding: "10px 12px", borderRadius: 4, border: "1px solid var(--ink-20)",
            background: "var(--paper)", color: "var(--ink)", outline: "none" }}
        />
        <button
          type="submit"
          disabled={busy || !address.trim()}
          // Empty field: an outline, not a grey slab. Ready: solid ink.
          style={{ flex: "none", padding: "10px 18px", borderRadius: 4, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
            border: `1px solid ${address.trim() ? "var(--ink)" : "var(--ink-20)"}`,
            background: address.trim() ? "var(--ink)" : "transparent",
            color: address.trim() ? "var(--paper)" : "var(--ink-60)",
            cursor: busy ? "wait" : address.trim() ? "pointer" : "default", opacity: busy ? 0.7 : 1 }}
        >
          {busy ? "Checking" : "Check"}
        </button>
      </form>
      <p style={{ fontSize: 12, color: "var(--ink-40)", margin: "8px 0 0" }}>
        {busy ? "Reading every chain, this takes up to 20 seconds." : "Read live from the chains. Bedrock does not store the address."}
      </p>

      {result && !result.ok && <p style={{ fontSize: 13.5, color: "var(--sand)", margin: "14px 0 0" }}>{result.error}</p>}

      {result?.ok && s && (
        <div style={{ marginTop: 16, maxWidth: 720 }} aria-live="polite">
          <p style={{ fontSize: 15, lineHeight: 1.55, color: s.tone, margin: 0 }}>{s.lead}</p>
          {s.notes.map((n) => (
            <p key={n.text} style={{ fontSize: 13.5, lineHeight: 1.55, color: n.warn ? "var(--sand)" : "var(--ink-60)", margin: "6px 0 0" }}>{n.text}</p>
          ))}
          {shown.length > 0 && (
            <table className="broadsheet" style={{ display: "table", width: "100%", whiteSpace: "normal", marginTop: 14 }}>
              <thead>
                <tr><th style={{ width: 110 }}>Chain</th><th>What happened</th></tr>
              </thead>
              <tbody>
                {shown.map((c) => (
                  <tr key={c.chain}>
                    <td style={{ fontSize: 13, verticalAlign: "top" }}>{c.chain}</td>
                    <td style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink-80)" }}>
                      {c.state === "unread" && <span style={{ color: "var(--sand)" }}>Could not be read right now.</span>}
                      {c.swept.count > 0 && (
                        <div>Moved to the Web3Auth recovery wallet{c.swept.first ? ` on ${day(c.swept.first)}` : ""}: {c.swept.amounts.join(", ") || "tokens"}.</div>
                      )}
                      {c.returned.count > 0 && (
                        <div style={{ color: "var(--moss-text)" }}>Returned to you: {c.returned.amounts.join(", ") || "tokens"}.</div>
                      )}
                      {c.staking?.rewardsTo === "recovery" && (
                        <div style={{ color: "var(--ink-60)" }}>Staking rewards now go to the Web3Auth recovery wallet.</div>
                      )}
                      {c.staking?.rewardsTo === "other" && (
                        <div style={{ color: "var(--sand)" }}>Staking rewards go to another address, not this one and not the recovery wallet.</div>
                      )}
                      {c.staking && c.staking.unstakes.count > 0 && (
                        <div style={{ color: "var(--ink-60)" }}>Unstake started{c.staking.unstakes.first ? ` on ${day(c.staking.unstakes.first)}` : ""}: {c.staking.unstakes.amounts.join(", ")}.</div>
                      )}
                      {c.staking && c.staking.unbonding.amounts.length > 0 && (
                        <div style={{ color: "var(--ink-60)" }}>Unbonding now: {c.staking.unbonding.amounts.join(", ")}{c.staking.unbonding.completes ? `, done on ${day(c.staking.unbonding.completes)}` : ""}.</div>
                      )}
                      {c.staking && c.staking.staked.length > 0 && stakingNews(c) && (
                        <div style={{ color: "var(--ink-60)" }}>Still staked on this address: {c.staking.staked.join(", ")}.</div>
                      )}
                      {c.elsewhere.count > 0 && (
                        <div style={{ color: "var(--ink-60)" }}>
                          {c.elsewhere.count} other transfer{c.elsewhere.count === 1 ? "" : "s"} out since Nov 5 ({c.elsewhere.amounts.join(", ") || "tokens"}), to{" "}
                          {c.elsewhere.recipients.map((r, i) => (
                            <span key={r} className="data" style={{ fontSize: 12, wordBreak: "break-all" }}>{i ? ", " : ""}{r.slice(0, 12)}…{r.slice(-6)}</span>
                          ))}
                          .
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}
