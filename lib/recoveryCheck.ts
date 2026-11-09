// "Was my wallet moved?" for the Keplr recovery watch.
//
// One pasted address becomes that key's address on every chain Web3Auth has a
// recovery wallet on (same 20 bytes, see lib/recoveryCore.ts), and for each
// chain we read: what the address sent since Nov 5 (to the recovery wallet, or
// elsewhere), and anything a recovery wallet sent back to it.
//
// Privacy: pasting an address says "I may be a victim". So the address never
// goes in a URL, is never logged, and every chain read is `cache: "no-store"`,
// which keeps it out of Next's on-disk fetch cache. The finished answer is
// held in memory for 5 minutes, keyed by the address bytes, then dropped.

import { RECOVERY_WALLETS } from "./recoveryAddresses";
import { deriveAddresses, summarizeAddress, describeCoins, bech32Decode, feeCollectorFor, type TxLike } from "./recoveryCore";

export const INCIDENT_SINCE = "2026-11-05T00:00:00Z";
const READ_TIMEOUT_MS = 12_000;
// The edge in front of the site cuts requests at 30s, so the whole check must
// answer well inside that: a chain that is not done by then is "not read".
const DEADLINE_MS = 22_000;

export type ChainCheck = {
  chain: string;
  address: string;
  state: "swept" | "returned" | "elsewhere" | "nothing" | "unread";
  swept: { count: number; first: string | null; amounts: string[] };
  elsewhere: { count: number; recipients: string[]; amounts: string[] };
  returned: { count: number; amounts: string[] };
};

export type CheckResult =
  | { ok: true; injectiveOnly: boolean; chains: ChainCheck[]; checkedAt: string }
  | { ok: false; error: string };

const prefixOf = (addr: string) => addr.slice(0, addr.lastIndexOf("1"));

async function txs(host: string, query: string, limit: number): Promise<TxLike[]> {
  const q = new URLSearchParams({ query, limit: String(limit), page: "1", order_by: "ORDER_BY_DESC" });
  const res = await fetch(`${host}/cosmos/tx/v1beta1/txs?${q}`, { cache: "no-store", signal: AbortSignal.timeout(READ_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return ((await res.json()) as { tx_responses?: TxLike[] }).tx_responses ?? [];
}

async function checkChain(w: (typeof RECOVERY_WALLETS)[number], addr: string): Promise<ChainCheck> {
  const empty: ChainCheck = {
    chain: w.chain, address: addr, state: "unread",
    swept: { count: 0, first: null, amounts: [] }, elsewhere: { count: 0, recipients: [], amounts: [] }, returned: { count: 0, amounts: [] },
  };
  const fees = feeCollectorFor(addr);
  for (const host of w.hosts) {
    try {
      const signed = await txs(host, `message.sender='${addr}'`, 50);
      const back = await txs(host, `transfer.sender='${w.address}' AND transfer.recipient='${addr}'`, 20);
      const s = summarizeAddress(signed, back, addr, w.address, INCIDENT_SINCE, fees);
      const state: ChainCheck["state"] = s.returned.count ? "returned" : s.swept.count ? "swept" : s.elsewhere.count ? "elsewhere" : "nothing";
      return {
        chain: w.chain, address: addr, state,
        swept: { count: s.swept.count, first: s.swept.first, amounts: describeCoins(s.swept.coins) },
        elsewhere: { count: s.elsewhere.count, recipients: s.elsewhere.recipients.slice(0, 3), amounts: describeCoins(s.elsewhere.coins) },
        returned: { count: s.returned.count, amounts: describeCoins(s.returned.coins) },
      };
    } catch {
      // next host
    }
  }
  return empty;
}

const memo = new Map<string, { at: number; result: CheckResult }>();
const MEMO_MS = 5 * 60_000;

export async function checkAddress(input: string): Promise<CheckResult> {
  const prefixes = RECOVERY_WALLETS.map((w) => prefixOf(w.address));
  const d = deriveAddresses(input, prefixes);
  if (!d.ok) return d;
  const key = bech32Decode(input)!.bytes.join(",") + (d.injectiveOnly ? ":inj" : "");
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < MEMO_MS) return hit.result;

  const targets = RECOVERY_WALLETS.filter((w) => d.addresses[prefixOf(w.address)]);
  const deadline = new Promise<"late">((r) => setTimeout(() => r("late"), DEADLINE_MS));
  const chains = await Promise.all(targets.map(async (w) => {
    const addr = d.addresses[prefixOf(w.address)];
    const r = await Promise.race([checkChain(w, addr), deadline]);
    return r === "late"
      ? { chain: w.chain, address: addr, state: "unread" as const, swept: { count: 0, first: null, amounts: [] }, elsewhere: { count: 0, recipients: [], amounts: [] }, returned: { count: 0, amounts: [] } }
      : r;
  }));
  const result: CheckResult = { ok: true, injectiveOnly: d.injectiveOnly, chains, checkedAt: new Date().toISOString() };

  // Do not keep an answer that missed chains: the next try should re-read them.
  if (!chains.some((c) => c.state === "unread")) {
    memo.set(key, { at: Date.now(), result });
    if (memo.size > 500) memo.delete(memo.keys().next().value!);
  }
  return result;
}
