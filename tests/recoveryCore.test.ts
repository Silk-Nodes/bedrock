// Unit tests for lib/recoveryCore.ts. No test framework needed:
//   node --test tests/
// (Node 22+ runs TypeScript directly.) Excluded from tsconfig because the
// import needs the .ts extension that Node requires and Next does not.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  summarizeStaking, memoHint, bech32Decode, bech32Encode, deriveAddresses, feeCollectorFor, FEE_COLLECTOR_BYTES, parseCoins, transfersIn, summarizeAddress, classifyOutflows, describeCoins, type TxLike,
} from "../lib/recoveryCore.ts";

const HUB_REC = "cosmos1atuap9kfnt6y8ykvn3437e7j3z8qffh3qtnmwu";
const FEE = new Set(["cosmos17xpfvakm2amg962yls6f84z3kell8c5lserqta"]);
const SINCE = "2026-11-05T00:00:00Z";

// Synthetic accounts: valid bech32 built from fixed bytes, not real users.
const user = bech32Encode("cosmos", Array.from({ length: 20 }, (_, i) => i + 1));
const stranger = bech32Encode("cosmos", Array.from({ length: 20 }, (_, i) => 200 - i));

const tx = (timestamp: string, transfers: [string, string, string][]): TxLike => ({
  timestamp,
  events: transfers.map(([sender, recipient, amount]) => ({
    type: "transfer",
    attributes: [{ key: "recipient", value: recipient }, { key: "sender", value: sender }, { key: "amount", value: amount }],
  })),
});

test("bech32 round trip and the published recovery wallets share one key", () => {
  const d = bech32Decode(HUB_REC)!;
  assert.equal(d.hrp, "cosmos");
  assert.equal(bech32Encode("cosmos", d.bytes), HUB_REC);
  // Web3Auth's published Osmosis and Agoric wallets are the same 20 bytes.
  assert.equal(bech32Encode("osmo", d.bytes), "osmo1atuap9kfnt6y8ykvn3437e7j3z8qffh3gsqtcw");
  assert.equal(bech32Encode("agoric", d.bytes), "agoric1atuap9kfnt6y8ykvn3437e7j3z8qffh3jk3y72");
});

test("bad checksums and non-wallet lengths are rejected", () => {
  assert.equal(bech32Decode(HUB_REC.slice(0, -1) + "q"), null);
  assert.equal(deriveAddresses("hello", ["cosmos"]).ok, false);
  const contract = bech32Encode("cosmos", Array.from({ length: 32 }, () => 7));
  const r = deriveAddresses(contract, ["cosmos"]);
  assert.equal(r.ok, false);
});

test("one address derives to every chain, Injective only on its own", () => {
  const r = deriveAddresses(HUB_REC, ["cosmos", "osmo", "noble", "inj"]);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.addresses.noble, "noble1atuap9kfnt6y8ykvn3437e7j3z8qffh3ggxnkj");
  assert.equal(r.addresses.inj, undefined);
  const inj = deriveAddresses("inj1lqmdmuczn5rxn5jkc34wwrqdeh70etpf5wvt7g", ["cosmos", "inj"]);
  assert.ok(inj.ok && inj.injectiveOnly && Object.keys(inj.addresses).join() === "inj");
});

test("coins parse, including multi-coin, LSM and IBC denoms", () => {
  const c = parseCoins("12uatom,5000cosmosvaloper1abc/42,7ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2");
  assert.deepEqual(c.map((x) => x.denom), ["uatom", "cosmosvaloper1abc/42", "ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2"]);
  assert.equal(c[1].amount, BigInt(5000));
});

test("fees are not transfers", () => {
  const t = tx("2026-11-06T21:00:00Z", [[user, "cosmos17xpfvakm2amg962yls6f84z3kell8c5lserqta", "12918uatom"], [user, HUB_REC, "5000000uatom"]]);
  assert.equal(transfersIn(t, FEE).length, 1);
});

test("a sweep to the recovery wallet, a transfer elsewhere, and an old tx", () => {
  const signed = [
    tx("2026-11-06T21:00:00Z", [[user, HUB_REC, "5000000uatom,2000000cosmosvaloper1abc/9"], [user, "cosmos17xpfvakm2amg962yls6f84z3kell8c5lserqta", "5000uatom"]]),
    tx("2026-11-05T01:05:00Z", [[user, stranger, "1000000uatom"]]),
    tx("2026-10-01T00:00:00Z", [[user, stranger, "9999uatom"]]), // before the incident: ignored
  ];
  const r = summarizeAddress(signed, [], user, HUB_REC, SINCE, FEE);
  assert.equal(r.swept.count, 1);
  assert.equal(r.swept.first, "2026-11-06T21:00:00Z");
  assert.deepEqual(describeCoins(r.swept.coins), ["5 ATOM", "2 staked ATOM, as LSM shares"]);
  assert.equal(r.elsewhere.count, 1);
  assert.deepEqual(r.elsewhere.recipients, [stranger]);
  assert.equal(r.returned.count, 0);
});

test("a return shows up for the address it went back to", () => {
  const returns = [tx("2026-11-20T10:00:00Z", [[HUB_REC, user, "4990000uatom"]])];
  const r = summarizeAddress([], returns, user, HUB_REC, SINCE, FEE);
  assert.equal(r.returned.count, 1);
  assert.deepEqual(describeCoins(r.returned.coins), ["4.99 ATOM"]);
});

test("outflows: back to a former sender is a return, anything else is not", () => {
  const former = new Set([user]);
  const out = [
    tx("2026-11-20T10:00:00Z", [[HUB_REC, user, "4990000uatom"]]),
    tx("2026-11-20T11:00:00Z", [[HUB_REC, stranger, "1000000uatom"]]),
    tx("2026-11-20T12:00:00Z", [[HUB_REC, user, "1uatom"], [HUB_REC, stranger, "1uatom"]]), // mixed: not a return
  ];
  const c = classifyOutflows(out, HUB_REC, (a) => former.has(a), FEE);
  assert.equal(c.classified, 3);
  assert.equal(c.returnedTx, 1);
  assert.equal(c.elsewhereTx, 2);
  assert.equal(c.returnedTo, 1);
  assert.equal(c.elsewhereTo, 1);
});

test("unknown tokens are counted, not guessed", () => {
  const m = new Map([["ibc/ABC", BigInt(5)], ["factory/x/y", BigInt(1)], ["uosmo", BigInt(1500000)]]);
  assert.deepEqual(describeCoins(m), ["1.5 OSMO", "2 other tokens"]);
});

test("fee collector bytes are sha256(fee_collector)[:20], the known Hub module account", () => {
  assert.deepEqual(FEE_COLLECTOR_BYTES, [...createHash("sha256").update("fee_collector").digest().subarray(0, 20)]);
  assert.ok(feeCollectorFor(HUB_REC).has("cosmos17xpfvakm2amg962yls6f84z3kell8c5lserqta"));
  // the Hub's fee market collector, seen as the recipient of a sweep fee on Nov 9
  assert.ok(feeCollectorFor(HUB_REC).has("cosmos13pxn9n3qw79e03844rdadagmg0nshmwf7qvuye"));
});

test("a fee named in the tx event is dropped wherever it was paid to", () => {
  const t: TxLike = {
    timestamp: "2026-11-06T21:00:00Z",
    events: [
      { type: "tx", attributes: [{ key: "fee", value: "300uosmo" }, { key: "fee_payer", value: user }] },
      { type: "transfer", attributes: [{ key: "recipient", value: stranger }, { key: "sender", value: user }, { key: "amount", value: "300uosmo" }] },
      { type: "transfer", attributes: [{ key: "recipient", value: HUB_REC }, { key: "sender", value: user }, { key: "amount", value: "300uosmo" }] },
    ],
  };
  const ts = transfersIn(t, new Set());
  assert.equal(ts.length, 1);           // only one 300uosmo was the fee
  assert.equal(ts[0].recipient, HUB_REC);
});

test("staking: rewards redirected, an unstake, what is still unbonding and staked", () => {
  const signed: TxLike[] = [
    { timestamp: "2026-11-10T06:45:00Z", tx: { body: { messages: [{ "@type": "/cosmos.staking.v1beta1.MsgUndelegate", amount: { denom: "uatom", amount: "898000000" } }] } } } as TxLike,
    { timestamp: "2026-10-01T00:00:00Z", tx: { body: { messages: [{ "@type": "/cosmos.staking.v1beta1.MsgUndelegate", amount: { denom: "uatom", amount: "1" } }] } } } as TxLike, // before Nov 5
  ];
  const s = summarizeStaking({
    signed, withdrawAddress: HUB_REC,
    unbonding: [{ entries: [{ balance: "898000000", completion_time: "2026-12-01T06:45:00Z" }, { balance: "0", completion_time: "2026-12-02T00:00:00Z" }] }],
    delegations: [{ balance: { denom: "uatom", amount: "2500000" } }, { balance: { denom: "uatom", amount: "0" } }],
  }, user, HUB_REC, SINCE, "uatom");
  assert.equal(s.rewardsTo, "recovery");
  assert.equal(s.unstakes.count, 1);
  assert.equal(s.unstakes.first, "2026-11-10T06:45:00Z");
  assert.deepEqual(describeCoins(s.unbonding.coins), ["898 ATOM"]);
  assert.equal(s.unbonding.completes, "2026-12-01T06:45:00Z");
  assert.deepEqual(describeCoins(s.staked), ["2.5 ATOM"]);
});

test("staking: rewards to self or to a stranger are told apart", () => {
  const base = { signed: [], unbonding: [], delegations: [] };
  assert.equal(summarizeStaking({ ...base, withdrawAddress: user }, user, HUB_REC, SINCE, "uatom").rewardsTo, "self");
  assert.equal(summarizeStaking({ ...base, withdrawAddress: stranger }, user, HUB_REC, SINCE, "uatom").rewardsTo, "other");
  assert.equal(summarizeStaking({ ...base, withdrawAddress: null }, user, HUB_REC, SINCE, "uatom").rewardsTo, null);
});

test("memos: wallet apps, the recovery batch memo, and everything else", () => {
  const m = (memo: string) => memoHint({ tx: { body: { memo } } });
  assert.deepEqual(m("Ledger Live"), { memo: "Ledger Live", source: "wallet-app", app: "Ledger Live" });
  assert.equal(m("Stake via Trust Wallet")?.app, "Trust Wallet");
  assert.equal(m("lsm recovery batch")?.source, "recovery");
  assert.equal(m("gm")?.source, "other");
  assert.equal(m("   "), null);
});

test("an unstake keeps its memo, so a Ledger Live unstake reads as the owner's", () => {
  const signed: TxLike[] = [{ timestamp: "2026-11-10T19:04:00Z", tx: { body: { memo: "Ledger Live", messages: [{ "@type": "/cosmos.staking.v1beta1.MsgUndelegate", amount: { denom: "uatom", amount: "1000000" } } as { "@type": string }] } } }];
  const s = summarizeStaking({ signed, withdrawAddress: user, unbonding: [], delegations: [] }, user, HUB_REC, SINCE, "uatom");
  assert.equal(s.unstakes.count, 1);
  assert.equal(s.unstakes.memos[0].app, "Ledger Live");
});

test("module accounts are named, not checked like wallets", () => {
  // The Hub distribution module, which looked "swept" because it pays the
  // redirected rewards into the recovery wallet.
  const r = deriveAddresses("cosmos1jv65s3grqf6v6jl3dp4t6c9t9rk99cd88lyufl", ["cosmos"]);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /distribution/);
  for (const name of ["distribution", "bonded_tokens_pool", "fee_collector", "feemarket-fee-collector", "gov", "mint"]) {
    const bytes = [...createHash("sha256").update(name).digest().subarray(0, 20)];
    assert.equal(deriveAddresses(bech32Encode("osmo", bytes), ["cosmos"]).ok, false, name);
  }
});
